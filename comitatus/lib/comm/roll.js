'use strict';

const fs = require('fs');
const path = require('path');

const MAX_CARD_BYTES = 4096;

const STATUS_BY_EVENT = Object.freeze({
  SessionStart: 'idle', UserPromptSubmit: 'working', PostToolUse: 'working', Stop: 'idle',
});

function ensureDirs(root, pkey) {
  const drop = path.join(root, 'mail', pkey);
  const state = path.join(root, 'state', pkey);
  for (const d of [path.join(root, 'roll'), drop, state]) fs.mkdirSync(d, { recursive: true, mode: 0o700 });
  return { drop, state };
}

// Routes are temporary: every hook invocation rebuilds them from its own env.
function buildCard({ pkey, kind, home, session, handle, cwd, hostPid, status, env, drop, now }) {
  return {
    v: 1,
    participant: pkey,
    kind,
    home,
    session,
    handle,
    cwd,
    host_pid: hostPid,
    status,
    routes: {
      herdr_pane: env.HERDR_PANE_ID || null,
      claude_socket: env.CLAUDE_CODE_MESSAGING_SOCKET || null,
      codex_home: kind === 'codex' ? home : null,
    },
    mailbox: drop,
    updated_at: new Date(now).toISOString(),
  };
}

function publishCard(root, card) {
  const json = JSON.stringify(card, null, 2) + '\n';
  if (Buffer.byteLength(json) > MAX_CARD_BYTES) throw new Error(`card exceeds ${MAX_CARD_BYTES} bytes`);
  const dir = path.join(root, 'roll');
  const tmp = path.join(dir, `.${card.participant}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, json, { mode: 0o600 });
  fs.renameSync(tmp, path.join(dir, `${card.participant}.json`));
}

function readCards(root) {
  const dir = path.join(root, 'roll');
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const cards = [];
  for (const name of names) {
    if (!name.endsWith('.json') || name.startsWith('.')) continue;
    const file = path.join(dir, name);
    try {
      const st = fs.lstatSync(file);
      if (!st.isFile() || st.size > MAX_CARD_BYTES) continue;
      const c = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (c && c.v === 1) cards.push(c);
    } catch { /* unreadable card: skip */ }
  }
  return cards;
}

module.exports = { STATUS_BY_EVENT, MAX_CARD_BYTES, ensureDirs, buildCard, publishCard, readCards };
