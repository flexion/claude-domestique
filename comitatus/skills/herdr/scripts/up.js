#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');

const MODELS = {
  claude: { glyph: '◆', argv: () => 'claude' },
  codex: { glyph: '◇', argv: () => 'codex' },
  opencode: { glyph: '⬨', argv: (model) => `opencode -m ${model}` },
};

function makeAgent(model, value) {
  if (model === 'opencode') {
    const i = value.indexOf(':');
    const handle = i >= 0 ? value.slice(0, i) : '';
    const ocModel = i >= 0 ? value.slice(i + 1) : '';
    if (!handle || !ocModel) {
      throw new Error(`--opencode needs <handle>:<model> (got "${value}")`);
    }
    return { model, handle, runArgv: MODELS.opencode.argv(ocModel), glyph: MODELS.opencode.glyph };
  }
  return { model, handle: value, runArgv: MODELS[model].argv(), glyph: MODELS[model].glyph };
}

function parseArgs(argv) {
  const out = { branch: undefined, base: 'origin/main', timeout: 45000, agents: [] };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const need = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`missing value for ${flag}`);
      return v;
    };
    switch (flag) {
      case '--branch': out.branch = need(); break;
      case '--base': out.base = need(); break;
      case '--timeout': out.timeout = Number(need()); break;
      case '--claude': out.agents.push(makeAgent('claude', need())); break;
      case '--codex': out.agents.push(makeAgent('codex', need())); break;
      case '--opencode': out.agents.push(makeAgent('opencode', need())); break;
      default: throw new Error(`unknown flag: ${flag}`);
    }
  }
  if (!out.branch) throw new Error('--branch is required');
  if (out.agents.length === 0) {
    throw new Error('at least one agent flag is required (--claude/--codex/--opencode)');
  }
  const handles = out.agents.map((a) => a.handle);
  const dup = handles.find((h, i) => handles.indexOf(h) !== i);
  if (dup) throw new Error(`duplicate handle in request: ${dup}`);
  return out;
}

function up(argv, deps) {
  const run = deps.run;
  const cfg = parseArgs(argv);

  // pre-flight: reject a handle that already exists anywhere (herdr enforces
  // global uniqueness, but only after the worktree is built — fail early).
  const list = JSON.parse(run('herdr', ['agent', 'list']));
  const taken = ((list.result && list.result.agents) || [])
    .map((a) => a && a.name).filter(Boolean);
  for (const a of cfg.agents) {
    if (taken.includes(a.handle)) throw new Error(`handle already taken: ${a.handle}`);
  }

  // refresh the local base ref before worktree create resolves it
  const baseBranch = cfg.base.replace(/^origin\//, '');
  run('git', ['fetch', 'origin', baseBranch]);

  const wt = JSON.parse(run('herdr',
    ['worktree', 'create', '--branch', cfg.branch, '--base', cfg.base, '--no-focus', '--json']));
  const path = wt.result.worktree.path;
  const workspace = wt.result.worktree.open_workspace_id;
  const rootPane = wt.result.root_pane.pane_id;
  const rootTab = wt.result.tab.tab_id;

  const agents = [];
  cfg.agents.forEach((a, i) => {
    let pane;
    let tab;
    if (i === 0) {
      pane = rootPane;
      tab = rootTab;
      run('herdr', ['tab', 'rename', tab, `${a.handle} ${a.glyph}`]);
    } else {
      const tc = JSON.parse(run('herdr',
        ['tab', 'create', '--workspace', workspace, '--cwd', path,
          '--label', `${a.handle} ${a.glyph}`, '--no-focus']));
      pane = tc.result.root_pane.pane_id;
      tab = tc.result.tab.tab_id;
    }
    run('herdr', ['pane', 'run', pane, a.runArgv]);
    run('herdr', ['wait', 'agent-status', pane, '--status', 'idle', '--timeout', String(cfg.timeout)]);
    run('herdr', ['agent', 'rename', pane, a.handle]);
    agents.push({ handle: a.handle, model: a.model, pane_id: pane, tab });
  });

  return { worktree: { path, workspace_id: workspace }, agents };
}

function defaultRun(file, args) {
  return execFileSync(file, args, { encoding: 'utf8' });
}

module.exports = { makeAgent, parseArgs, up, defaultRun };
