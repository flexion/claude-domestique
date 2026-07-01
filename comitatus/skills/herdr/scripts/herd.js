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

function resolveSelf(data, override, env = process.env) {
  if (override) return override;
  // The executing pane is the identity source: focus is a global that drifts
  // on any human click, which mislabels scripted sends (misroutes replies).
  const mine = env.HERDR_PANE_ID
    && agentList(data).find((x) => x && x.pane_id === env.HERDR_PANE_ID && x.name);
  if (mine) return mine.name;
  const a = agentList(data).find((x) => x && x.focused && x.name); // legacy fallback
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
    const self = resolveSelf(data, fromOverride, deps.env);
    if (!self) throw new Error('cannot resolve sender handle (pass --from <self>)');
    body = stampPrefix(message, self, reply ? 'reply' : 'fyi');
  }

  deps.run('herdr', ['agent', 'send', handle, body]);
  const submitted = submitWithVerify(p, handle, deps);
  return { result: { type: 'ok' }, pane: p, sent: body, submitted };
}

// A blind Enter races the recipient TUI's ingest of the just-typed text: slow
// composers (codex) swallow it and the message sits unsubmitted while the
// sender sees ok. Fire the model-aware submit keys (#138), then verify via the
// agent_status transition — the composer buffer lags the status flip, so
// status, not a pane read, is the reliable signal — and resend on a miss.
// Returns false if still unconfirmed after all attempts (the message may be
// sitting unsubmitted). A recipient already `working` at entry is ambiguous —
// our submit is indistinguishable from its in-flight turn, so the result is
// optimistic there; don't send to a working peer.
function submitWithVerify(p, handle, deps, opts = {}) {
  const attempts = opts.attempts || 3;
  const polls = opts.polls || 4;
  const pollMs = opts.pollMs || 750;
  const before = status(loadAgentList({}, deps), handle);
  for (let a = 0; a < attempts; a++) {
    const data = loadAgentList({}, deps);
    for (const k of submitKeys(data, handle)) deps.run('herdr', ['pane', 'send-keys', p, k]);
    for (let i = 0; i < polls; i++) {
      deps.sleep(pollMs);
      const now = status(loadAgentList({}, deps), handle);
      if (now === 'working') return true; // started our turn
      if (before !== 'working' && now !== before && now !== 'unknown') return true; // fast turn, e.g. idle->done
    }
  }
  return false;
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

function usage() {
  return [
    'usage: herd.js <verb> [args]',
    '',
    'stdin verbs (pipe `herdr agent list` in, or let the helper fetch it):',
    '  pane <handle>                    pane_id for a handle',
    '  status <handle|pane>             agent_status',
    '  members [--workspace <ws>]       handles, optionally per workspace',
    '  field <dot.path>                 extract a field from piped JSON',
    '  submit-keys <handle|pane>        model-correct submit gesture',
    '',
    'action verbs (run herdr themselves):',
    '  wait <handle> [--status a,b] [--timeout ms] [--interval ms]',
    '      poll until status matches; comma lists work HERE only -',
    '      the native `herdr wait agent-status` takes exactly one status',
    '  send <handle> <msg> [--reply|--fyi] [--from <self>]',
    '      type, submit, verify; result reports "submitted":true|false',
    '  send-wait-read <handle> <msg> [--timeout ms] [--lines n]',
    '  agent <model> <handle> --workspace <ws> --cwd <dir> [--timeout ms] [--label s]',
    '  up [...]                         one-shot worktree + herd launcher',
  ].join('\n');
}

function dispatch(argv, data, deps) {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === '--help' || cmd === '-h' || rest[0] === '--help') return usage();
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
  // help never needs stdin; answer before readStdin so an interactive
  // `herd.js send --help` doesn't sit waiting for EOF
  if (!argv[0] || argv[0] === '--help' || argv[0] === '-h' || argv[1] === '--help') {
    process.stdout.write(usage() + '\n');
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
  submitWithVerify,
  sendWaitReadCmd,
  agentCmd,
  defaultDeps,
  getField,
  dispatch,
  format,
  usage,
};
