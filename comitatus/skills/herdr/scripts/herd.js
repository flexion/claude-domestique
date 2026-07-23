#!/usr/bin/env node
'use strict';

// Every verb is self-contained: it fetches herdr state itself and never reads
// stdin. Harnesses commonly keep a child's stdin open with no EOF (the Claude
// Code Bash tool, for one), so a helper that reads stdin hangs before it ever
// dispatches — this file must stay stdin-free.

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

function fetchAgents(deps) {
  return JSON.parse(deps.run('herdr', ['agent', 'list']));
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

// Comma-status OR ("idle,done") is why this exists: the native
// `herdr wait agent-status` takes exactly one status.
function waitCmd(args, deps) {
  const cfg = parseWait(args);
  const deadline = deps.now() + cfg.timeout;
  for (;;) {
    const st = status(fetchAgents(deps), cfg.handle);
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

  const data = fetchAgents(deps);
  if (!findAgent(data, handle)) throw new Error(`no agent: ${handle}`);

  let body = message;
  if (reply || fyi) {
    const self = resolveSelf(data, fromOverride, deps.env);
    if (!self) throw new Error('cannot resolve sender handle (pass --from <self>)');
    body = stampPrefix(message, self, reply ? 'reply' : 'fyi');
  }

  // herdr 0.7.5 `agent prompt --wait --until working` types, submits, AND waits
  // for the turn to start in one kind-aware socket call (it knows codex needs two
  // Enters and observes the state change from the moment of submission - no
  // client-side gap where a fast working blip is missed). The prompt is submitted
  // even if the wait then times out, so the fallback never resends.
  const before = status(data, handle);
  const submitted = verifyTurn(handle, before, body, deps);
  return { result: { type: 'ok' }, pane: pane(data, handle), sent: body, submitted };
}

// Atomic submit+wait: `agent prompt --wait --until working` returns 0 the instant
// the recipient's turn starts. On timeout it exits non-zero but has STILL
// submitted the prompt, so we never resend (that would duplicate it); instead we
// fall back to a status delta for a turn too fast to catch as `working` (idle ->
// done). The wait's own "observed state change" detector has a ~5s floor, so the
// timeout must clear it (6000) or it reports timeout before the window elapses. A
// recipient already `working` at entry is ambiguous - our prompt is
// indistinguishable from its in-flight turn - so the result is optimistic there;
// don't send to a working peer.
function verifyTurn(handle, before, body, deps) {
  try {
    deps.run('herdr', ['agent', 'prompt', handle, body,
      '--wait', '--until', 'working', '--timeout', '6000']);
    return true;
  } catch {
    const now = status(fetchAgents(deps), handle);
    if (before !== 'working' && now !== before && now !== 'unknown') return true; // fast turn, e.g. idle->done
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
  const { makeAgent, launchAgent } = require('./up.js'); // lazy: keep plain verbs independent of the launcher
  const [model, handleVal] = args;
  const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
  const ws = opt('--workspace');
  const cwd = opt('--cwd');
  if (!ws || !cwd) throw new Error('--workspace and --cwd are required');
  const a = makeAgent(model, handleVal); // validates model / opencode handle:model

  // preflight: herdr rejects a duplicate handle at agent start, but only after
  // the tab is built. Fail before creating anything.
  if (members(fetchAgents(deps)).includes(a.handle)) {
    throw new Error(`handle already taken: ${a.handle}`);
  }

  return launchAgent(a,
    { workspace: ws, cwd, timeout: opt('--timeout', 45000), label: opt('--label') }, deps);
}

function usage() {
  return [
    'usage: herd.js <verb> [args]',
    '',
    'verbs are self-contained - each runs herdr itself:',
    '  status <handle|pane>             agent_status',
    '  members [--workspace <ws>]       handles, optionally per workspace',
    '  wait <handle> [--status a,b] [--timeout ms] [--interval ms]',
    '      poll agent list until status matches; a single-call comma set',
    '      (idle,done) - the native `herdr agent wait` needs one --until each',
    '  send <handle> <msg> [--reply|--fyi] [--from <self>]',
    '      submit via `herdr agent prompt` (kind-aware type+submit),',
    '      then confirm the turn started; result reports "submitted":true|false',
    '  send-wait-read <handle> <msg> [--timeout ms] [--lines n]',
    '  agent <model> <handle> --workspace <ws> --cwd <dir> [--timeout ms] [--label s]',
    '  up [...]                         one-shot worktree + herd launcher',
  ].join('\n');
}

function dispatch(argv, deps) {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === '--help' || cmd === '-h' || rest[0] === '--help') return usage();
  switch (cmd) {
    case 'status':
      return status(fetchAgents(deps), rest[0]);
    case 'members': {
      const i = rest.indexOf('--workspace');
      return members(fetchAgents(deps), i >= 0 ? rest[i + 1] : undefined);
    }
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
  const { defaultRun } = require('./up.js'); // lazy: plain verbs stay independent of the launcher
  return {
    run: defaultRun,
    // Block synchronously without a subprocess: no dependency on a `sleep` binary,
    // and no busy-loop if one were missing. Atomics.wait is permitted on Node's
    // main thread; the buffer is never signalled, so it always waits the full ms.
    sleep: (ms) => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(0, ms)); },
    now: () => Date.now(),
  };
}

function main() {
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
  let out;
  try {
    out = dispatch(argv, defaultDeps());
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
  fetchAgents,
  parseWait,
  waitCmd,
  resolveSelf,
  stampPrefix,
  sendCmd,
  verifyTurn,
  sendWaitReadCmd,
  agentCmd,
  defaultDeps,
  dispatch,
  format,
  usage,
};
