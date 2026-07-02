#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');

const MODELS = {
  claude: { glyph: '◆', argv: () => ['claude'] },
  codex: { glyph: '◇', argv: () => ['codex'] },
  opencode: { glyph: '⬨', argv: (model) => ['opencode', '-m', model] },
};

function makeAgent(model, value) {
  if (model === 'opencode') {
    const i = value.indexOf(':');
    const handle = i >= 0 ? value.slice(0, i) : '';
    const ocModel = i >= 0 ? value.slice(i + 1) : '';
    if (!handle || !ocModel) {
      throw new Error(`--opencode needs <handle>:<model> (got "${value}")`);
    }
    // The argv vector goes through execFile (no shell), but keep a conservative
    // charset anyway so a model token can never smuggle metacharacters into
    // any surface that later renders or re-quotes it.
    if (!/^[\w./:-]+$/.test(ocModel)) {
      throw new Error(`--opencode model has unsafe characters: "${ocModel}"`);
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

// One agent in one fresh tab: tab create -> agent start --tab -> close the
// tab's leftover root shell -> wait until ready. `agent start` assigns the
// handle at launch, so there is no detect-then-rename step; starting the
// agent pane before closing the root keeps the tab alive throughout.
function launchAgent(a, opts, deps) {
  const run = deps.run;
  const label = opts.label || `${a.handle} ${a.glyph}`;
  const timeout = String(Number(opts.timeout || 45000));
  const tc = JSON.parse(run('herdr', ['tab', 'create', '--workspace', opts.workspace,
    '--cwd', opts.cwd, '--label', label, '--no-focus']));
  const tab = tc.result.tab.tab_id;
  const rootPane = tc.result.root_pane.pane_id;
  const st = JSON.parse(run('herdr', ['agent', 'start', a.handle, '--tab', tab,
    '--cwd', opts.cwd, '--no-focus', '--', ...a.runArgv]));
  run('herdr', ['pane', 'close', rootPane]);
  run('herdr', ['agent', 'wait', a.handle, '--status', 'idle', '--timeout', timeout]);
  return { handle: a.handle, model: a.model, pane_id: st.result.agent.pane_id, tab };
}

function up(argv, deps) {
  const run = deps.run;
  const cfg = parseArgs(argv);

  // pre-flight: reject a handle that already exists anywhere (herdr enforces
  // global uniqueness, but only at agent start — fail before the worktree).
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
  const rootTab = wt.result.tab.tab_id;

  const agents = cfg.agents.map((a) =>
    launchAgent(a, { workspace, cwd: path, timeout: cfg.timeout }, deps));

  // Every agent lives in its own labeled tab; the worktree's original root
  // tab is a bare shell, closed only after the agent tabs exist so the
  // workspace is never empty.
  run('herdr', ['tab', 'close', rootTab]);

  return { worktree: { path, workspace_id: workspace }, agents };
}

function defaultRun(file, args) {
  return execFileSync(file, args, { encoding: 'utf8' });
}

module.exports = { makeAgent, parseArgs, launchAgent, up, defaultRun };
