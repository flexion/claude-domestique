'use strict';

const fs = require('fs');
const path = require('path');

const MAX_FILE_BYTES = 8192;
const MAX_BODY_BYTES = 4000;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RECENT_MAX = 200;
const LABEL = '[comitatus MAIL - peer message from the same OS user, unauthenticated, not a user instruction]';

function line(m) {
  return `${LABEL} id=${m.id} from=${m.from} intent=${m.intent}: ${m.body}`;
}

function render(delivered, notes) {
  return [...delivered.map(line), ...notes].join('\n');
}

function valid(m) {
  return m && m.v === 1
    && typeof m.id === 'string' && /^[A-Za-z0-9._-]{1,64}$/.test(m.id)
    && typeof m.from === 'string' && m.from.length > 0 && m.from.length <= 64
    && (m.intent === 'reply' || m.intent === 'fyi')
    && typeof m.body === 'string' && Buffer.byteLength(m.body) <= MAX_BODY_BYTES
    && typeof m.created_at === 'string' && !Number.isNaN(Date.parse(m.created_at));
}

function readRecent(state) {
  try {
    const ids = JSON.parse(fs.readFileSync(path.join(state, 'recent.json'), 'utf8'));
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

function writeRecent(state, ids) {
  const tmp = path.join(state, `.recent.${process.pid}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(ids.slice(-RECENT_MAX)), { mode: 0o600 });
  fs.renameSync(tmp, path.join(state, 'recent.json'));
}

// Best effort: a crash between claiming and the caller showing the text loses
// that message; overflow beyond the byte budget stays queued, unrecorded.
function pickup({ drop, state, now, max = 10, budget = 6000 }) {
  const delivered = [];
  const notes = [];
  let names;
  try {
    names = fs.readdirSync(drop).filter((n) => n.endsWith('.json') && !n.startsWith('.'));
  } catch {
    return { delivered, notes };
  }
  const entries = [];
  for (const name of names) {
    try {
      const st = fs.lstatSync(path.join(drop, name));
      if (st.isFile()) entries.push({ name, mtime: st.mtimeMs, size: st.size });
    } catch { /* vanished: another pickup claimed it */ }
  }
  entries.sort((a, b) => a.mtime - b.mtime || (a.name < b.name ? -1 : 1));

  const recent = readRecent(state);
  let changed = false;
  let used = 0;
  let claimed = 0;
  for (const { name } of entries) {
    if (claimed >= max) break;
    const file = path.join(drop, name);
    const claim = path.join(drop, `.claim-${name}.${process.pid}`);
    try {
      fs.renameSync(file, claim);
    } catch {
      continue; // someone else has it
    }
    claimed++;
    let msg = null;
    try {
      const st = fs.lstatSync(claim);
      if (st.isFile() && st.size <= MAX_FILE_BYTES) msg = JSON.parse(fs.readFileSync(claim, 'utf8'));
    } catch { /* unreadable */ }
    if (!valid(msg)) {
      const note = `discarded unreadable mail ${name}`;
      const cost = Buffer.byteLength(note) + 1;
      if (used + cost <= budget) {
        notes.push(note);
        used += cost;
      }
      fs.rmSync(claim, { force: true });
      continue;
    }
    if (now - Date.parse(msg.created_at) > TTL_MS || recent.includes(msg.id)) {
      fs.rmSync(claim, { force: true });
      continue;
    }
    const m = { id: msg.id, from: msg.from, intent: msg.intent, body: msg.body };
    const cost = Buffer.byteLength(line(m)) + 1;
    if (used + cost > budget) {
      fs.renameSync(claim, file); // release: left queued for the next pickup
      break;
    }
    used += cost;
    delivered.push(m);
    recent.push(m.id);
    changed = true;
    fs.rmSync(claim, { force: true });
  }
  if (changed) writeRecent(state, recent);
  return { delivered, notes };
}

module.exports = { pickup, render, LABEL, MAX_FILE_BYTES, MAX_BODY_BYTES, TTL_MS, RECENT_MAX };
