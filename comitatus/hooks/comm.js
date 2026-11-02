#!/usr/bin/env node
'use strict';

// comitatus mail hook: publishes this session's discovery card and hands it
// its waiting mail. Every session participates unless COMITATUS_ALIAS=off.
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const identity = require('../lib/comm/identity.js');
const lock = require('../lib/comm/lock.js');
const roll = require('../lib/comm/roll.js');
const mail = require('../lib/comm/mail.js');

const BUDGET = 6000;
// Sibling hooks of one participant and the sweeper each hold the lock briefly.
const LOCK_WAIT_MS = 3000;
const PICKUP_EVENTS = new Set(['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'Stop']);

// herdr names an agent but exports no alias, so ask it for this pane's member
// name. Any failure, or no name, means no answer.
function herdrName(env) {
  if (env.HERDR_ENV !== '1' || !env.HERDR_PANE_ID) return null;
  const out = execFileSync(env.HERDR_BIN_PATH || 'herdr', ['agent', 'get', env.HERDR_PANE_ID], {
    encoding: 'utf8', timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'],
  });
  const agent = ((JSON.parse(out) || {}).result || {}).agent;
  return agent && agent.pane_id === env.HERDR_PANE_ID && agent.name ? agent.name : null;
}

// Once per turn boundary, not per tool call: a lookup is a subprocess.
const LOOKUP_EVENTS = new Set(['SessionStart', 'UserPromptSubmit', 'Stop']);

// The alias file is the source of truth. The last explicit naming wins: an
// env seed fills an empty alias at SessionStart, the agent can write the file
// at any time, and a herdr rename overwrites it when it is first seen. The
// first herdr name seen only fills an empty alias.
function resolveAlias({ event, state, seed, env, lookup }) {
  let alias = roll.readAlias(state);
  if (!alias && seed && event === 'SessionStart') {
    roll.writeAlias(state, seed);
    alias = seed;
  }
  if (!LOOKUP_EVENTS.has(event)) return alias;
  let name = null;
  try {
    name = lookup(env);
  } catch { /* no herdr, or no answer */ }
  if (!identity.validAlias(name)) return alias;
  const seen = roll.readHerdrName(state);
  if (name === seen) return alias;
  if (seen !== null || !alias) {
    roll.writeAlias(state, name);
    alias = name;
  }
  roll.writeHerdrName(state, name);
  return alias;
}

// Lazily read the roll once, and only if some mail is actually rendered.
function rollResolver(root) {
  let byHandle;
  return (from) => {
    if (!byHandle) {
      byHandle = new Map();
      const newest = [...roll.readCards(root)].sort((a, b) => Date.parse(a.updated_at) - Date.parse(b.updated_at));
      for (const c of newest) if (typeof c.handle === 'string') byHandle.set(c.handle, c.alias);
    }
    const alias = byHandle.get(from);
    return identity.validAlias(alias) ? alias : null;
  };
}

function run({
  input, env, accountHome, now, ppid, herdrName: lookup = herdrName, isAlive = roll.isAlive, lockWait = LOCK_WAIT_MS,
}) {
  const { off, seed } = identity.aliasEnv(env);
  const session = input && input.session_id;
  if (off || typeof session !== 'string' || !session) return null;

  const kind = identity.detectKind(env);
  const home = identity.resolveHome(kind, env, accountHome);
  const root = identity.commRoot(env, accountHome);
  const pkey = identity.participantKey(kind, home, session);
  fs.mkdirSync(path.join(root, 'state'), { recursive: true, mode: 0o700 });
  // Everything this participant owns is changed only under its lock, which the
  // sweeper also takes. If it stays busy, do nothing: mail waits for next time.
  const release = lock.acquire(roll.lockPath(root, pkey), { wait: lockWait });
  if (!release) return null;
  try {
    return participate({ input, env, now, ppid, lookup, isAlive, seed, kind, home, root, pkey, session });
  } finally {
    release();
  }
}

function participate({ input, env, now, ppid, lookup, isAlive, seed, kind, home, root, pkey, session }) {
  const event = input.hook_event_name;
  const handle = identity.deriveHandle(pkey);
  const { drop, state } = roll.ensureDirs(root, pkey);
  const alias = resolveAlias({ event, state, seed, env, lookup });

  // Cards are only added at SessionStart, so sweeping there keeps the roll bounded.
  if (event === 'SessionStart') roll.pruneRoll(root, { self: pkey, now, isAlive });

  const ident = event === 'SessionStart'
    ? `[comitatus] you are ${handle}${alias ? ` (alias ${alias})` : ''}, participant ${pkey}; your mailbox: ${drop}; set your alias by writing ${path.join(state, 'alias')}`
    : null;
  const resolve = rollResolver(root);
  let delivered = [];
  let notes = [];
  if (PICKUP_EVENTS.has(event)) {
    const budget = BUDGET - (ident ? Buffer.byteLength(ident) + 1 : 0);
    ({ delivered, notes } = mail.pickup({ drop, state, now, budget, resolve }));
  }

  // A Stop that hands over mail continues the turn, so the agent is working.
  const status = event === 'Stop' && delivered.length ? 'working' : (roll.STATUS_BY_EVENT[event] || 'unknown');
  roll.publishCard(root, roll.buildCard({
    pkey, kind, home, session, handle, alias, cwd: input.cwd || process.cwd(), hostPid: ppid, status, env, drop, now,
  }));

  if (event === 'Stop') {
    // Only delivered mail is worth continuing the turn for.
    return delivered.length ? JSON.stringify({ decision: 'block', reason: mail.render(delivered, notes, resolve) }) : null;
  }
  const text = [ident, mail.render(delivered, notes, resolve)].filter(Boolean).join('\n');
  return text ? JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: text } }) : null;
}

// A hook always answers with a JSON object (AGENTS.md): `{}` means nothing to
// say, which also covers opt-out and failure, so the host is never disturbed.
function main() {
  let out = null;
  try {
    const input = JSON.parse(fs.readFileSync(0, 'utf8'));
    out = run({
      input, env: process.env, accountHome: os.userInfo().homedir, now: Date.now(), pid: process.pid, ppid: process.ppid,
    });
  } catch (e) {
    process.stderr.write(`comitatus mail: ${e.message}\n`);
  }
  process.stdout.write(out || '{}');
  process.exitCode = 0;
}

if (require.main === module) main();

module.exports = { run, herdrName, BUDGET, LOCK_WAIT_MS };
