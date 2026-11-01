#!/usr/bin/env node
'use strict';

// comitatus mail hook: publishes this session's discovery card and hands it
// its waiting mail. Silent unless COMITATUS_HANDLE opts the session in.
const fs = require('fs');
const os = require('os');
const identity = require('../lib/comm/identity.js');
const roll = require('../lib/comm/roll.js');
const mail = require('../lib/comm/mail.js');

const BUDGET = 6000;
const PICKUP_EVENTS = new Set(['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'Stop']);

function run({ input, env, accountHome, now, ppid }) {
  const handle = env.COMITATUS_HANDLE;
  const session = input && input.session_id;
  if (!identity.validHandle(handle) || typeof session !== 'string' || !session) return null;
  const event = input.hook_event_name;

  const kind = identity.detectKind(env);
  const home = identity.resolveHome(kind, env, accountHome);
  const root = identity.commRoot(env, accountHome);
  const pkey = identity.participantKey(kind, home, session);
  const { drop, state } = roll.ensureDirs(root, pkey);

  const ident = event === 'SessionStart'
    ? `[comitatus] you are ${handle}, participant ${pkey}; your mailbox: ${drop}`
    : null;
  let delivered = [];
  let notes = [];
  if (PICKUP_EVENTS.has(event)) {
    const budget = BUDGET - (ident ? Buffer.byteLength(ident) + 1 : 0);
    ({ delivered, notes } = mail.pickup({ drop, state, now, budget }));
  }

  // A Stop that hands over mail continues the turn, so the agent is working.
  const status = event === 'Stop' && delivered.length ? 'working' : (roll.STATUS_BY_EVENT[event] || 'unknown');
  roll.publishCard(root, roll.buildCard({
    pkey, kind, home, session, handle, cwd: input.cwd || process.cwd(), hostPid: ppid, status, env, drop, now,
  }));

  if (event === 'Stop') {
    // Only delivered mail is worth continuing the turn for.
    return delivered.length ? JSON.stringify({ decision: 'block', reason: mail.render(delivered, notes) }) : null;
  }
  const text = [ident, mail.render(delivered, notes)].filter(Boolean).join('\n');
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

module.exports = { run, BUDGET };
