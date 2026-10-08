#!/usr/bin/env node
'use strict';

// Every verb is self-contained: it fetches herdr state itself and never reads
// stdin. Harnesses commonly keep a child's stdin open with no EOF (the Claude
// Code Bash tool, for one), so a helper that reads stdin hangs before it ever
// dispatches — this file must stay stdin-free.

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

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

// Block synchronously without a subprocess: no dependency on a `sleep` binary,
// and no busy-loop if one were missing. Atomics.wait is permitted on Node's
// main thread; the buffer is never signalled, so it always waits the full ms.
function defaultSleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(0, ms));
}

// Verbs are called with hand-built dep objects in tests; default the clock and
// the sleep so a caller only has to inject what it actually wants to control.
function sleeper(deps) { return (deps && deps.sleep) || defaultSleep; }
function clock(deps) { return (deps && deps.now) || Date.now; }

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

// ---------------------------------------------------------------------------
// per-recipient send lock
//
// Two senders addressing one recipient type into the SAME composer, and their
// keystrokes interleave into one garbled prompt. mkdir is the atomic primitive
// that prevents it: it either creates the directory or fails EEXIST, with no
// check-then-act window a second sender can slip through.
//
// A waiter NEVER breaks a lock on age alone. A slow-but-live sender and a
// crashed one look identical by mtime, and stealing the lock mid-keystrokes
// produces exactly the interleaving the lock exists to prevent. We break only
// when the recorded pid is provably gone; otherwise we wait, then give up and
// report — losing a message is recoverable, corrupting one silently is not.
// ---------------------------------------------------------------------------

const LOCK_WAIT_MS = 20000;
const LOCK_POLL_MS = 100;

// Per-user, because a shared tmpdir root created by one user is unwritable by
// the next: a herd would fail every send on an EACCES from mkdir. POSIX gives
// us a uid; Windows does not, so hash its username + home rather than exposing
// either in the temp-directory name. Senders that must exclude each other are
// the same user's agents, so this still covers every relevant pair.
function lockRoot(deps) {
  if (deps && deps.lockDir) return deps.lockDir;
  deps = deps || {};
  const platform = deps.platform || process.platform;
  const pathImpl = deps.path || path;
  const tmpdir = (deps.tmpdir || os.tmpdir)();
  let identity;
  if (platform !== 'win32' && typeof process.getuid === 'function') {
    identity = String(process.getuid());
  } else {
    try {
      const info = (deps.userInfo || os.userInfo)();
      identity = crypto.createHash('sha1')
        .update(`${info.username || ''}\0${info.homedir || ''}`)
        .digest('hex')
        .slice(0, 16);
    } catch {
      // os.tmpdir() is normally user-scoped on Windows. Keep a usable fallback
      // for stripped-down environments where os.userInfo() cannot resolve.
      identity = 'shared';
    }
  }
  return pathImpl.join(tmpdir, `herd-send-locks-${identity}`);
}

// A handle reaches us from argv, so it can be any string. Keep readable names
// readable for debugging and hash anything that could escape the directory.
function lockPath(root, handle) {
  root = root || lockRoot({});
  const safe = /^[A-Za-z0-9_-]{1,64}$/.test(handle)
    ? handle
    : crypto.createHash('sha1').update(String(handle)).digest('hex').slice(0, 16);
  return path.join(root, `${safe}.lock`);
}

// EPERM means the pid exists but belongs to another user — alive, not stale.
function holderAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return !!(e && e.code === 'EPERM');
  }
}

function readHolder(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, 'owner.json'), 'utf8'));
  } catch {
    return undefined; // not written yet, or unreadable — treat as live and wait
  }
}

function releaseLock(dir, deps) {
  try {
    const fileSystem = (deps && deps.fs) || fs;
    // Windows can report EBUSY/EPERM briefly while handles or virus scanners
    // release a directory. Recursive rm only retries when maxRetries is set.
    fileSystem.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch { /* the lock is advisory; a failed cleanup must not fail the send */ }
}

// Returns the lock directory on success; throws only if the filesystem itself
// fails. A busy lock returns undefined so the caller can report it as an
// undeliverable outcome rather than an exception.
function acquireLock(handle, deps, timeoutMs = LOCK_WAIT_MS) {
  const dir = lockPath(lockRoot(deps), handle);
  const now = clock(deps);
  const sleep = sleeper(deps);
  const deadline = now() + timeoutMs;
  fs.mkdirSync(lockRoot(deps), { recursive: true });
  // Bounded by BOTH the clock and the poll count: an injected clock that never
  // advances must not turn a contended lock into an infinite loop.
  for (let waited = 0; ; waited += LOCK_POLL_MS) {
    try {
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, 'owner.json'), JSON.stringify({
        pid: process.pid,
        pane: (deps.env || process.env).HERDR_PANE_ID,
        at: now(),
      }));
      return dir;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      const holder = readHolder(dir);
      if (holder && !holderAlive(holder.pid)) {
        releaseLock(dir, deps); // the holder is provably gone — reclaim, then retry
        if (!fs.existsSync(dir)) continue;
      }
      if (now() >= deadline || waited >= timeoutMs) return undefined;
      sleep(LOCK_POLL_MS);
    }
  }
}

// ---------------------------------------------------------------------------
// delivery
//
// Three outcomes, never collapsed into a boolean:
//
//   observed      herdr accepted the prompt AND we saw evidence the recipient
//                 took it: a turn start, or the message id echoed in its pane.
//   accepted      herdr typed and submitted, but nothing corroborated it. This
//                 is UNKNOWN, not "undelivered" — resending may duplicate.
//   undeliverable herdr refused before typing anything. Nothing was sent.
//
// herdr has no mailbox, inbox, or ack primitive: `agent list|get|read|prompt|
// wait|send-keys` is the whole surface. So even `observed` proves the text
// reached the recipient's pane, never that the recipient processed it. Only a
// reply is end-to-end proof.
//
// The old boolean `submitted` is removed rather than redefined. One field had
// to answer two questions — "did herdr submit it" and "did we see the
// recipient take it" — and either answer misleads a caller asking the other.
// Read as "did it submit", it hid genuinely refused sends; read as "was it
// observed", a `working` recipient produced false negatives that told callers
// to resend a message that had already landed. `delivery` says which.
// ---------------------------------------------------------------------------

const PROMPT_TIMEOUT_MS = 6000;
const ECHO_TRIES = 3;
const ECHO_INTERVAL_MS = 700;
const ECHO_LINES = '60';

// herdr refused BEFORE typing, and the refusal is transient — retrying cannot
// duplicate anything because nothing was submitted. Every other failure mode
// is assumed to have submitted (see submitPrompt).
const RETRY_SAFE = new Set(['agent_pane_busy', 'agent_not_ready']);

// A herdr error envelope may land on stdout or stderr depending on the runner.
// A nonempty-but-non-JSON stdout must not mask a valid JSON error on stderr,
// so try each independently.
function parseEnvelope(e) {
  for (const stream of [e && e.stderr, e && e.stdout]) {
    if (!stream) continue;
    try {
      return JSON.parse(String(stream));
    } catch { /* try the next stream */ }
  }
  return undefined;
}

// A fresh token per send. It is what makes echo detection sound: a value that
// has never existed before cannot appear in pre-existing scrollback, so a hit
// can only come from this message. It doubles as an idempotency key for the
// recipient — the same id arriving twice is a duplicate to ignore.
function newId(deps) {
  return (deps && deps.nonce) ? deps.nonce() : crypto.randomBytes(3).toString('hex');
}

function stampPrefix(message, self, flag, id) {
  if (/^\s*\[from /.test(message)) return message; // caller already prefixed
  return id ? `[from ${self} ${flag} #${id}] ${message}` : `[from ${self} ${flag}] ${message}`;
}

function idIn(body) {
  const m = /^\s*\[from \S+ \S+ #([A-Za-z0-9]+)\]/.exec(String(body || ''));
  return m ? m[1] : undefined;
}

// `agent prompt --wait --until working` types, submits, AND waits for the turn
// to start in one kind-aware socket call (it knows codex needs two Enters and
// observes the state change from the moment of submission).
//
// The critical asymmetry: on timeout it exits non-zero but has STILL submitted
// the prompt. Resending there duplicates a delivered message, so we only ever
// retry codes that mean herdr never typed.
function submitPrompt(handle, body, deps) {
  const sleep = sleeper(deps);
  const args = ['agent', 'prompt', handle, body,
    '--wait', '--until', 'working', '--timeout', String(PROMPT_TIMEOUT_MS)];
  for (let attempts = 1; ; attempts++) {
    try {
      deps.run('herdr', args);
      return { delivery: 'observed', evidence: 'turn-start', attempts };
    } catch (e) {
      if (e && (e.code === 'ENOENT' || e.code === 'EACCES')) {
        return { delivery: 'undeliverable', reason: 'herdr_unavailable', attempts };
      }
      const env = parseEnvelope(e);
      const code = env && env.error && env.error.code;
      if (code === 'agent_not_found') {
        return { delivery: 'undeliverable', reason: 'agent_not_found', attempts };
      }
      if (RETRY_SAFE.has(code)) {
        if (attempts < 2) { sleep(400); continue; }
        return { delivery: 'undeliverable', reason: code, attempts };
      }
      // Notably `timeout` and `agent_prompt_stalled`: herdr had already typed
      // and submitted before its own observation failed. Unknown, not failed.
      return { delivery: 'accepted', reason: code || 'unobserved', attempts };
    }
  }
}

// Corroboration only. A hit upgrades `accepted` to `observed`; a miss changes
// nothing and never triggers a resend. Matched against `recent-unwrapped`
// because soft wraps in the rendered pane can split a token across lines.
function echoSeen(handle, id, deps) {
  if (!id) return false;
  const sleep = sleeper(deps);
  for (let i = 0; i < ECHO_TRIES; i++) {
    let text = '';
    try {
      text = String(deps.run('herdr',
        ['agent', 'read', handle, '--source', 'recent-unwrapped', '--lines', ECHO_LINES]));
    } catch { /* a read failure is not evidence either way */ }
    if (text.includes(id)) return true;
    if (i < ECHO_TRIES - 1) sleep(ECHO_INTERVAL_MS);
  }
  return false;
}

function parseSend(args) {
  const fromI = args.indexOf('--from');
  if (fromI >= 0 && (args[fromI + 1] === undefined || args[fromI + 1].startsWith('--'))) {
    throw new Error('--from needs a value');
  }
  return {
    handle: args[0],
    message: args[1],
    reply: args.includes('--reply'),
    fyi: args.includes('--fyi'),
    force: args.includes('--force'),
    from: fromI >= 0 ? args[fromI + 1] : undefined,
  };
}

function sendCmd(args, deps) {
  const cfg = parseSend(args);
  const data = fetchAgents(deps);
  const target = findAgent(data, cfg.handle);
  if (!target) throw new Error(`no agent: ${cfg.handle}`);

  let body = cfg.message;
  let id;
  if (cfg.reply || cfg.fyi) {
    const self = resolveSelf(data, cfg.from, deps.env);
    if (!self) throw new Error('cannot resolve sender handle (pass --from <self>)');
    id = newId(deps);
    body = stampPrefix(cfg.message, self, cfg.reply ? 'reply' : 'fyi', id);
  }
  id = idIn(body) || id; // a caller-prefixed body may already carry one

  const before = target.agent_status;
  const seq = target.state_change_seq; // audit context: which turn we sent into
  const base = { result: { type: 'ok' }, pane: target.pane_id, sent: body, id, before, seq };

  // `blocked` is the one state that genuinely gates. A modal — a permission
  // prompt — holds keyboard focus, so the keystrokes land in the dialog and
  // never reach the composer. Everything else (idle, working, done, unknown)
  // accepts a prompt; a working recipient queues it behind its current turn.
  //
  // `--force` overrides this and is deliberately unsafe: it types at a modal.
  // It exists for diagnosing a wedged recipient, not for routine delivery.
  if (before === 'blocked' && !cfg.force) {
    return { ...base, delivery: 'undeliverable', reason: 'recipient_blocked', attempts: 0 };
  }

  const lock = acquireLock(cfg.handle, deps);
  if (!lock) {
    return { ...base, delivery: 'undeliverable', reason: 'lock_busy', attempts: 0 };
  }
  let out;
  try {
    // Re-read inside the lock. The status above was sampled before we queued
    // for it, and a recipient can raise a permission dialog while we wait.
    const fresh = status(fetchAgents(deps), cfg.handle);
    if (fresh === 'blocked' && !cfg.force) {
      return { ...base, delivery: 'undeliverable', reason: 'recipient_blocked', attempts: 0 };
    }
    out = submitPrompt(cfg.handle, body, deps);
    if (out.delivery === 'accepted' && echoSeen(cfg.handle, id, deps)) {
      out = { ...out, delivery: 'observed', evidence: 'echo', reason: undefined };
    }
  } finally {
    releaseLock(lock, deps);
  }

  return {
    ...base,
    delivery: out.delivery,
    evidence: out.evidence,
    reason: out.reason,
    attempts: out.attempts,
  };
}

// ---------------------------------------------------------------------------
// herd lifecycle: seed, broadcast, roster sync, withdraw
// ---------------------------------------------------------------------------

function optOf(args) {
  return (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
}

function csv(value) {
  return String(value || '').split(',').map((s) => s.trim()).filter(Boolean);
}

// The seed line must name the helper path the RECIPIENT can run, and hosts
// install to different places: a claude peer runs the stable
// ~/.claude/comitatus copy this file is invoked from, while a codex peer runs
// its own versioned plugin cache. Guessing wrong seeds an agent that cannot
// message anyone, so an unresolvable path is an error, not a default.
function codexHelper(home = os.homedir()) {
  const root = path.join(home, '.codex', 'plugins', 'cache');
  const found = [];
  let marketplaces = [];
  try {
    marketplaces = fs.readdirSync(root);
  } catch {
    return undefined;
  }
  for (const market of marketplaces) {
    const versions = path.join(root, market, 'comitatus');
    let entries = [];
    try {
      entries = fs.readdirSync(versions);
    } catch {
      continue;
    }
    for (const version of entries) {
      const candidate = path.join(versions, version, 'skills', 'herdr', 'scripts', 'herd.js');
      if (fs.existsSync(candidate)) found.push({ version, candidate });
    }
  }
  if (!found.length) return undefined;
  found.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));
  return found[found.length - 1].candidate;
}

function helperFor(kind, override, self = __filename, home = os.homedir()) {
  if (override) return override;
  if (kind === 'codex') {
    const found = codexHelper(home);
    if (!found) {
      throw new Error('cannot resolve the codex helper path; pass --helper <abs path>');
    }
    return found;
  }
  return self;
}

// seedLine crosses from argv-safe Node code into prose that an agent will run
// through its shell. A Windows helper path commonly contains spaces; cmd.exe
// and PowerShell both keep a double-quoted path as one native-command argument.
// POSIX keeps its existing readable form for ordinary paths and single-quotes
// only paths that need protection.
function shellPath(value, platform = process.platform) {
  const text = String(value);
  if (/[\r\n]/.test(text)) throw new Error('helper path must be one line');
  if (platform === 'win32') {
    if (text.includes('"')) throw new Error('Windows helper path cannot contain a double quote');
    return `"${text}"`;
  }
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(text)) return text;
  return `'${text.replace(/'/g, `'"'"'`)}'`;
}

// A cold agent knows neither the protocol nor its own handle. This composes
// the whole orientation as ONE line (a newline submits the turn early), so
// seeding is a repeatable command rather than prose retyped per herd.
function seedLine(cfg) {
  const peers = cfg.roster.filter((h) => h !== cfg.handle);
  return [
    `you are ${cfg.handle}, a member of a herd working on ${cfg.cwd}`,
    `roster: ${cfg.roster.join(', ')} (your teammates: ${peers.join(', ') || 'none yet'})`,
    `working lead: ${cfg.lead}${cfg.lead === cfg.handle ? ' (that is you - you drive the work)' : ''}`,
    cfg.launcher ? `${cfg.launcher} launched this herd and is outside it: not a member and not its coordinator - the working lead coordinates, so do not wait on ${cfg.launcher} unless your task names it as an approver` : undefined,
    `PROTOCOL: message a teammate with exactly ONE line by RUNNING this as a real shell command, never printing it: node ${shellPath(cfg.helper, cfg.platform)} send <handle> "<body>" --reply (use --fyi instead when no reply is wanted)`,
    'an incoming "[from X reply]" needs a one-line answer back to X; "[from X fyi]" needs no answer and no ack; "[herd +H]" and "[herd -H]" are roster updates you apply idempotently without replying or rebroadcasting',
    'a "#id" in the header is a delivery id - ignore it, except that the same id arriving twice is a duplicate to ignore',
    'keep every message to one line because a newline submits the turn',
    cfg.brief ? `YOUR TASK: ${cfg.brief}` : undefined,
    'reply with one line confirming your handle, your roster, and that you can run the helper',
  ].filter(Boolean).join('; ');
}

function seedCmd(args, deps) {
  const opt = optOf(args);
  const handle = args[0];
  if (!handle || handle.startsWith('--')) throw new Error('seed needs a <handle>');
  const roster = csv(opt('--roster'));
  if (!roster.length) throw new Error('--roster is required (comma-separated handles)');
  const data = fetchAgents(deps);
  const target = findAgent(data, handle);
  if (!target) throw new Error(`no agent: ${handle}`);
  // The launcher stays OUT of the herd it seeds unless it opts in by listing
  // itself in --roster. The lead, defaulted or explicit, must be a roster
  // member: a lead outside the roster - the sender included - would coordinate
  // a herd that cannot see it, and every member would wait on an agent the
  // roster says is not there.
  const self = resolveSelf(data, opt('--from'), deps.env);
  const herd = roster.includes(handle) ? roster : [handle, ...roster];
  const lead = opt('--lead') || herd[0];
  if (!herd.includes(lead)) {
    throw new Error(`--lead ${lead} is not in the roster (${herd.join(', ')}); a lead must be a member - add it to --roster to join`);
  }
  const line = seedLine({
    handle,
    roster: herd,
    lead,
    launcher: self && !herd.includes(self) ? self : undefined,
    cwd: opt('--cwd', target.cwd || '(this worktree)'),
    helper: helperFor(target.agent, opt('--helper')),
    brief: opt('--brief'),
  });
  // `--reply` on purpose: the newcomer's answer is the only proof it is seeded.
  const flags = ['--reply'];
  const from = opt('--from');
  if (from) flags.push('--from', from);
  const sent = sendCmd([handle, line, ...flags], deps);
  if (!args.includes('--wait') || sent.delivery === 'undeliverable') return sent;

  // `--wait` confirms only that the newcomer took the seed and finished a
  // turn. It is NOT the confirmation the seed asks for: that reply lands in
  // the sender's own pane, which this process cannot poll. Announce
  // `[herd +<handle>]` to the rest of the herd after the reply arrives, not
  // after this returns.
  // Native wait, both states named: without --until it also matches `blocked`.
  const timeout = String(Number(opt('--timeout', '120000')));
  try {
    deps.run('herdr', ['agent', 'wait', handle, '--until', 'idle', '--until', 'done', '--timeout', timeout]);
  } catch {
    return { ...sent, turn: 'timeout' };
  }
  return {
    ...sent,
    turn: 'finished',
    tail: deps.run('herdr', ['agent', 'read', handle, '--source', 'recent', '--lines', '20']),
  };
}

// One recipient at a time. Concurrent sends to DIFFERENT recipients are safe
// (the lock is per-recipient), but a broadcast from one sender is sequential
// anyway, and sequencing keeps the failure report readable.
function broadcastCmd(args, deps) {
  const opt = optOf(args);
  const message = args[0];
  if (!message || message.startsWith('--')) throw new Error('broadcast needs a <message>');
  const data = fetchAgents(deps);
  const self = resolveSelf(data, opt('--from'), deps.env);
  const exclude = csv(opt('--exclude'));
  const targets = members(data, opt('--workspace'))
    .filter((h) => h !== self && !exclude.includes(h));

  const flags = [];
  if (args.includes('--reply')) flags.push('--reply');
  else if (args.includes('--fyi')) flags.push('--fyi');
  if (flags.length && self) flags.push('--from', self);

  return targets.map((h) => {
    try {
      const r = sendCmd([h, message, ...flags], deps);
      return { handle: h, delivery: r.delivery, evidence: r.evidence, reason: r.reason, id: r.id };
    } catch (e) {
      return { handle: h, delivery: 'undeliverable', reason: e.message };
    }
  });
}

// Peer detection: one workspace is one herd, so the live handles in it are the
// truth and the roster you were told is the belief. Keying on handles (not
// panes) means a relaunch is not a false leave-then-join.
function syncCmd(args, deps) {
  const opt = optOf(args);
  // An EMPTY roster is a legitimate belief, not a missing argument: a solo agent
  // and a freshly seeded one both start with no teammates, and they are the
  // callers most likely to self-pollute a roster by hand-diffing instead. So
  // require the flag to be PRESENT and let its value be empty.
  if (!args.includes('--roster')) {
    throw new Error('--roster is required (your current roster; pass --roster "" if you have none)');
  }
  const known = csv(opt('--roster'));
  const dryRun = args.includes('--dry-run');
  const data = fetchAgents(deps);
  const self = resolveSelf(data, opt('--from'), deps.env);
  const live = members(data, opt('--workspace'));
  const added = live.filter((h) => h !== self && !known.includes(h));
  const removed = known.filter((h) => h !== self && !live.includes(h));

  const notified = [];
  if (!dryRun) {
    for (const h of added) notified.push(...announce(`[herd +${h}]`, h, live, self, deps));
    for (const h of removed) notified.push(...announce(`[herd -${h}]`, h, live, self, deps));
  }
  return { self, live, added, removed, notified };
}

// A directive carries no [from ...] header on purpose: it is never relayed and
// never replied to. The subject is skipped — nobody needs "+yourself".
function announce(directive, subject, live, self, deps) {
  const out = [];
  for (const peer of live) {
    if (peer === self || peer === subject) continue;
    try {
      const r = sendCmd([peer, directive], deps);
      out.push({ handle: peer, directive, delivery: r.delivery });
    } catch (e) {
      out.push({ handle: peer, directive, delivery: 'undeliverable', reason: e.message });
    }
  }
  return out;
}

// A lead seeds a herd and gets out of the way. Withdrawal is ordered: the
// handoff naming the working lead goes out FIRST, so no member is ever holding
// a roster that has lost its lead with nobody named in its place; the
// `[herd -self]` directives follow.
//
// Withdrawal buys no durability. Once the lead's agent is gone, a message to
// it fails `no agent` — there is no queue behind the handle.
function withdrawCmd(args, deps) {
  const opt = optOf(args);
  const lead = opt('--lead');
  if (!lead) throw new Error('--lead is required (who owns the work after you leave)');
  const data = fetchAgents(deps);
  const self = resolveSelf(data, opt('--from'), deps.env);
  if (!self) throw new Error('cannot resolve your own handle (pass --from <self>)');
  const targets = members(data, opt('--workspace')).filter((h) => h !== self);

  const note = opt('--note');
  const handoff = [
    `${self} has withdrawn from this herd`,
    `${lead} is the working lead and owns this work end to end`,
    `do not wait on ${self} for scope, approval, or review`,
    note,
  ].filter(Boolean).join('; ');

  const handed = [];
  for (const h of targets) {
    try {
      const r = sendCmd([h, handoff, '--fyi', '--from', self], deps);
      handed.push({ handle: h, delivery: r.delivery, id: r.id });
    } catch (e) {
      handed.push({ handle: h, delivery: 'undeliverable', reason: e.message });
    }
  }
  const announced = announce(`[herd -${self}]`, self, targets, self, deps);
  return { self, lead, handoff: handed, announced };
}

function agentCmd(args, deps) {
  const { makeAgent, launchAgent } = require('./up.js'); // lazy: keep plain verbs independent of the launcher
  const [kind, spec] = args;
  const opt = optOf(args);
  const ws = opt('--workspace');
  const cwd = opt('--cwd');
  if (!ws || !cwd) throw new Error('--workspace and --cwd are required');
  const a = makeAgent(kind, spec); // validates the kind and the handle[:model,effort] selector

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
    '  send <handle> <msg> [--reply|--fyi] [--from <self>] [--force]',
    '      one sender at a time per recipient (per-recipient lock); reports',
    '      delivery: observed (turn start or id echoed) | accepted (submitted,',
    '      unconfirmed - resending may duplicate) | undeliverable (never typed).',
    '      --force is an UNSAFE override of the blocked gate: it types into a',
    '      recipient whose modal has keyboard focus, so the text can land in a',
    '      permission dialog instead of the composer. Diagnostics only.',
    '  seed <handle> --roster a,b,c [--lead h] [--brief s] [--helper p] [--wait]',
    '      one-line cold-agent orientation: handle, roster, lead, protocol.',
    '      the lead defaults to the first roster member and must be in the',
    '      roster; a sender left off --roster is named as an outside launcher.',
    '      --wait blocks until it finishes a turn; its REPLY is the real proof',
    '  broadcast <msg> [--workspace ws] [--exclude a,b] [--reply|--fyi]',
    '  sync --roster a,b,c [--workspace ws] [--dry-run]',
    '      diff the live herd against your roster, announce [herd +/-H];',
    '      excludes self on both sides - use it instead of hand-diffing members.',
    '      --roster "" is a valid empty roster (solo or freshly seeded)',
    '  withdraw --lead <handle> [--workspace ws] [--note s]',
    '      hand off to the working lead, then announce your own departure',
    '  agent <kind> <handle>[:<selector>] --workspace <ws> --cwd <dir> [--timeout ms] [--label s]',
    '      kind is claude|codex|opencode. a bare handle gets the default model',
    '      (claude-opus-5-5 for claude, gpt-6.1-sol for codex) and INHERITS effort',
    '      from that CLI\'s ambient config; codex always runs --no-daemon. the',
    '      selector overrides per agent:',
    '        nell:model=opus,effort=high    claude --model/--effort',
    '        jay:effort=high                codex -c model_reasoning_effort=high',
    '        bob:ollama/qwen2.5:7b          opencode -m (model REQUIRED here)',
    '      a bare suffix is a model, so handle:opus == handle:model=opus. keys',
    '      are named, not positional, because opencode models contain colons.',
    '      opencode has no effort selector and refuses effort= rather than',
    '      dropping it. the result reports effort as null when inherited.',
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
    case 'send':
      return sendCmd(rest, deps);
    case 'seed':
      return seedCmd(rest, deps);
    case 'broadcast':
      return broadcastCmd(rest, deps);
    case 'sync':
      return syncCmd(rest, deps);
    case 'withdraw':
      return withdrawCmd(rest, deps);
    case 'agent':
      return agentCmd(rest, deps);
    default:
      throw new Error(`unknown command: ${cmd}`);
  }
}

function format(value) {
  if (value === undefined || value === null) return '';
  // `members` returns plain handles, one per line; every other array carries
  // per-recipient result objects, which are only readable as JSON.
  if (Array.isArray(value)) {
    return value.every((v) => typeof v === 'string') ? value.join('\n') : JSON.stringify(value);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function defaultDeps() {
  const { defaultRun } = require('./up.js'); // lazy: plain verbs stay independent of the launcher
  return {
    run: defaultRun,
    sleep: defaultSleep,
    now: () => Date.now(),
    env: process.env,
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

module.exports = {
  pane,
  status,
  members,
  fetchAgents,
  resolveSelf,
  stampPrefix,
  idIn,
  newId,
  lockRoot,
  lockPath,
  acquireLock,
  releaseLock,
  holderAlive,
  parseEnvelope,
  submitPrompt,
  echoSeen,
  parseSend,
  sendCmd,
  seedLine,
  seedCmd,
  codexHelper,
  helperFor,
  shellPath,
  broadcastCmd,
  syncCmd,
  announce,
  withdrawCmd,
  agentCmd,
  defaultDeps,
  dispatch,
  format,
  usage,
};

if (require.main === module) main();
