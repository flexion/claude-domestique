#!/usr/bin/env node
'use strict';

function getField(obj, dotPath) {
  return String(dotPath).split('.').reduce(
    (o, k) => (o == null ? undefined : o[k]), obj);
}

function agentList(data) {
  return (data && data.result && data.result.agents) || [];
}

function findAgent(data, handleOrPane) {
  return agentList(data).find(
    (x) => x && (x.name === handleOrPane || x.pane_id === handleOrPane));
}

function pane(data, handle) {
  const a = agentList(data).find((x) => x && x.name === handle);
  return a ? a.pane_id : undefined;
}

function status(data, handleOrPane) {
  const a = findAgent(data, handleOrPane);
  return a ? a.agent_status : undefined;
}

function members(data, workspaceId) {
  return agentList(data)
    .filter((x) => x && x.name && (workspaceId ? x.workspace_id === workspaceId : true))
    .map((x) => x.name);
}

function field(data, dotPath) {
  return getField(data, dotPath);
}

function submitKeys(data, handleOrPane) {
  const a = findAgent(data, handleOrPane);
  if (!a) return [];
  return a.agent === 'codex' ? ['Enter', 'Enter'] : ['Enter'];
}

function hasAgents(data) {
  return !!(data && data.result && Array.isArray(data.result.agents));
}

function loadAgentList(data, deps) {
  if (hasAgents(data)) return data;
  if (deps && deps.run) return JSON.parse(deps.run('herdr', ['agent', 'list']));
  return data; // no stdin, no runner: leave as-is (pure callers)
}

function parseWait(args) {
  const out = { handle: args[0], statuses: ['idle'], timeout: 45000, interval: 1000 };
  for (let i = 1; i < args.length; i++) {
    const v = () => args[++i];
    if (args[i] === '--status') out.statuses = v().split(',').filter(Boolean);
    else if (args[i] === '--timeout') out.timeout = Number(v());
    else if (args[i] === '--interval') out.interval = Number(v());
  }
  return out;
}

function waitCmd(args, deps) {
  const cfg = parseWait(args);
  const deadline = deps.now() + cfg.timeout;
  for (;;) {
    const st = status(loadAgentList({}, deps), cfg.handle);
    if (cfg.statuses.includes(st)) return st;
    if (deps.now() >= deadline) {
      throw new Error(`wait timeout: ${cfg.handle} is ${st}, want ${cfg.statuses.join(',')}`);
    }
    deps.sleep(cfg.interval);
  }
}

function resolveSelf(data, override) {
  if (override) return override;
  const a = agentList(data).find((x) => x && x.focused && x.name);
  return a ? a.name : undefined;
}

function stampPrefix(message, self, flag) {
  if (/^\s*\[from /.test(message)) return message; // caller already prefixed
  return `[from ${self} ${flag}] ${message}`;
}

function sendCmd(args, deps) {
  const handle = args[0];
  const message = args[1];
  const reply = args.includes('--reply');
  const fyi = args.includes('--fyi');
  const fromI = args.indexOf('--from');
  if (fromI >= 0 && (args[fromI + 1] === undefined || args[fromI + 1].startsWith('--'))) {
    throw new Error('--from needs a value');
  }
  const fromOverride = fromI >= 0 ? args[fromI + 1] : undefined;

  const data = loadAgentList({}, deps);
  const p = pane(data, handle);
  if (!p) throw new Error(`no agent: ${handle}`);

  let body = message;
  if (reply || fyi) {
    const self = resolveSelf(data, fromOverride);
    if (!self) throw new Error('cannot resolve sender handle (pass --from <self>)');
    body = stampPrefix(message, self, reply ? 'reply' : 'fyi');
  }

  deps.run('herdr', ['agent', 'send', handle, body]);
  // model-aware submit (codex needs two Enters; #138 submitKeys)
  for (const k of submitKeys(data, handle)) deps.run('herdr', ['pane', 'send-keys', p, k]);
  return { result: { type: 'ok' }, pane: p, sent: body };
}

function sendWaitReadCmd(args, deps) {
  const handle = args[0];
  const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
  const timeout = String(Number(opt('--timeout', '60000')));
  const lines = String(Number(opt('--lines', '40')));

  const { pane: p } = sendCmd(args, deps); // parses handle/message/--reply/--fyi/--from itself
  waitCmd([handle, '--status', 'idle,done', '--timeout', timeout], deps);
  return deps.run('herdr', ['pane', 'read', p, '--source', 'recent', '--lines', lines]);
}

function agentCmd(args, deps) {
  const { makeAgent } = require('./up.js'); // lazy: keep the stdin verbs independent of the launcher
  const [model, handleVal] = args;
  const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
  const ws = opt('--workspace');
  const cwd = opt('--cwd');
  if (!ws || !cwd) throw new Error('--workspace and --cwd are required');
  const timeout = String(Number(opt('--timeout', '45000')));
  const a = makeAgent(model, handleVal); // validates model / opencode handle:model

  // preflight: herdr enforces global handle uniqueness, but only after the tab
  // is built. Fail before creating anything.
  if (members(loadAgentList({}, deps)).includes(a.handle)) {
    throw new Error(`handle already taken: ${a.handle}`);
  }

  const label = opt('--label', `${a.handle} ${a.glyph}`);
  const tc = JSON.parse(deps.run('herdr',
    ['tab', 'create', '--workspace', ws, '--cwd', cwd, '--label', label, '--no-focus']));
  const paneId = tc.result.root_pane.pane_id;
  const tab = tc.result.tab.tab_id;
  deps.run('herdr', ['pane', 'run', paneId, a.runArgv]);
  deps.run('herdr', ['wait', 'agent-status', paneId, '--status', 'idle', '--timeout', timeout]);
  deps.run('herdr', ['agent', 'rename', paneId, a.handle]);
  return { handle: a.handle, model: a.model, pane_id: paneId, tab };
}

function dispatch(argv, data, deps) {
  const [cmd, ...rest] = argv;
  switch (cmd) {
    case 'pane':
      return pane(loadAgentList(data, deps), rest[0]);
    case 'status':
      return status(loadAgentList(data, deps), rest[0]);
    case 'members': {
      const i = rest.indexOf('--workspace');
      return members(loadAgentList(data, deps), i >= 0 ? rest[i + 1] : undefined);
    }
    case 'field':
      return field(data, rest[0]);
    case 'submit-keys':
      return submitKeys(data, rest[0]);
    case 'wait':
      return waitCmd(rest, deps);
    case 'send':
      return sendCmd(rest, deps);
    case 'send-wait-read':
      return sendWaitReadCmd(rest, deps);
    case 'agent':
      return agentCmd(rest, deps);
    default:
      throw new Error(`unknown command: ${cmd}`);
  }
}

function format(value) {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join('\n');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function defaultDeps() {
  const { defaultRun } = require('./up.js'); // lazy: stdin verbs stay independent of the launcher
  return {
    run: defaultRun,
    // Block synchronously without a subprocess: no dependency on a `sleep` binary,
    // and no busy-loop if one were missing. Atomics.wait is permitted on Node's
    // main thread; the buffer is never signalled, so it always waits the full ms.
    sleep: (ms) => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(0, ms)); },
    now: () => Date.now(),
  };
}

async function readStdin() {
  let s = '';
  for await (const chunk of process.stdin) s += chunk;
  return s;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === 'up') {
    try {
      const { up, defaultRun } = require('./up.js');
      const result = up(argv.slice(1), { run: defaultRun });
      process.stdout.write(JSON.stringify(result) + '\n');
    } catch (e) {
      process.stderr.write(`herd up: ${e.message}\n`);
      process.exit(1);
    }
    return;
  }
  const raw = await readStdin();
  let data;
  try {
    data = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    process.stderr.write('herd: invalid JSON on stdin\n');
    process.exit(1);
  }
  let out;
  try {
    out = dispatch(argv, data, defaultDeps());
  } catch (e) {
    process.stderr.write(`herd: ${e.message}\n`);
    process.exit(1);
  }
  const text = format(out);
  if (text) process.stdout.write(text + '\n');
}

if (require.main === module) main();

module.exports = {
  pane,
  status,
  members,
  field,
  submitKeys,
  loadAgentList,
  parseWait,
  waitCmd,
  resolveSelf,
  stampPrefix,
  sendCmd,
  sendWaitReadCmd,
  agentCmd,
  defaultDeps,
  getField,
  dispatch,
  format,
};
