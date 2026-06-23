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

function defaultRun(file, args) {
  return execFileSync(file, args, { encoding: 'utf8' });
}

module.exports = { makeAgent, parseArgs, defaultRun };
