'use strict';

const fs = require('fs');
const path = require('path');
const { validAlias } = require('./identity.js');
const crypto = require('crypto');
const lock = require('./lock.js');
const { TTL_MS } = require('./mail.js');

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
function buildCard({ pkey, kind, home, session, handle, alias = null, cwd, hostPid, status, env, drop, now }) {
  return {
    v: 1,
    participant: pkey,
    kind,
    home,
    session,
    handle,
    alias,
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

// Small one-line name files under a participant's state directory. Reads are
// bounded to 64 bytes: a valid name is 32 characters, so anything longer is
// invalid without reading the rest. Anything invalid reads as null.
function readName(state, file) {
  let fd;
  try {
    fd = fs.openSync(path.join(state, file), 'r');
    const buf = Buffer.alloc(64);
    const v = buf.toString('utf8', 0, fs.readSync(fd, buf, 0, 64, 0)).trim();
    return validAlias(v) ? v : null;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function writeName(state, file, value) {
  const tmp = path.join(state, `.${file}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, `${value}\n`, { mode: 0o600 });
  fs.renameSync(tmp, path.join(state, file));
}

// The agent renames itself by writing `alias`; the hook republishes it on the
// next event. `herdr-name` records the last herdr member name seen.
const readAlias = (state) => readName(state, 'alias');
const writeAlias = (state, alias) => writeName(state, 'alias', alias);
const readHerdrName = (state) => readName(state, 'herdr-name');
const writeHerdrName = (state, name) => writeName(state, 'herdr-name', name);

// EPERM means the pid exists but belongs to someone else: alive.
function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

const KEY = /^[0-9a-f]{16}$/;
const CARD_FILE = /^([0-9a-f]{16})\.json$/;
const STATE_ENTRY = /^([0-9a-f]{16})(?:\.lock)?$/;

// The participant mutex: its own hooks hold it for their whole run, and the
// sweeper must hold it to change anything of that participant's.
function lockPath(root, pkey) {
  return path.join(root, 'state', `${pkey}.lock`);
}

function tryLock(root, pkey) {
  return lock.acquire(lockPath(root, pkey), { wait: 0 });
}

function readCard(file) {
  try {
    const st = fs.lstatSync(file);
    if (!st.isFile() || st.size > MAX_CARD_BYTES) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function cardIsStale(c, now, alive) {
  const live = Number.isInteger(c.host_pid) && c.host_pid > 0 && alive(c.host_pid);
  return !live || !(now - Date.parse(c.updated_at) <= TTL_MS);
}

function newestMtime(dir) {
  let t = -Infinity;
  try {
    t = fs.lstatSync(dir).mtimeMs;
    for (const n of fs.readdirSync(dir)) {
      try {
        t = Math.max(t, fs.lstatSync(path.join(dir, n)).mtimeMs);
      } catch { /* vanished */ }
    }
  } catch { /* absent */ }
  return t;
}

// Put a claimed file back under its name, never over a newer file there; if
// one exists, keep the claimed file under a fresh name pickup still reads.
function putBack(claim, dir, name) {
  try {
    fs.linkSync(claim, path.join(dir, name));
  } catch {
    const alt = name.endsWith('.json') ? `r${crypto.randomBytes(4).toString('hex')}-${name}` : null;
    if (!alt) return; // an abandoned temp file that was replaced: drop the old one
    try {
      fs.linkSync(claim, path.join(dir, alt));
    } catch { return; }
  }
  fs.rmSync(claim, { force: true });
}

// Removes mail that pickup would drop unread: envelopes whose created_at is
// past the TTL or that are unreadable, and abandoned temp or claim files whose
// mtime is past it. A file is claimed by rename and the claimed file is then
// inspected, so a sender publishing a fresh file under the same name is never
// touched. Temp files are claimed only once already old, and re-checked after.
// Senders name each temp file uniquely (see the mail skill), so an old one is
// abandoned and no send can be writing to it. onClaim is a test seam.
function expireDrop(drop, now, onClaim = () => {}) {
  let names;
  try {
    names = fs.readdirSync(drop);
  } catch {
    return;
  }
  for (const name of names) {
    if (name.startsWith('.expire-')) continue;
    const envelope = name.endsWith('.json') && !name.startsWith('.');
    if (!envelope) {
      // A temp file may be a send in progress: never move one that is not
      // already past the TTL, or its sender's rename would fail.
      try {
        if (!(now - fs.lstatSync(path.join(drop, name)).mtimeMs > TTL_MS)) continue;
      } catch {
        continue;
      }
    }
    const claim = path.join(drop, `.expire-${crypto.randomBytes(4).toString('hex')}`);
    try {
      fs.renameSync(path.join(drop, name), claim);
    } catch {
      continue;
    }
    onClaim(name);
    let expired;
    try {
      const st = fs.lstatSync(claim);
      if (envelope) {
        const m = st.isFile() && st.size <= 8192 ? JSON.parse(fs.readFileSync(claim, 'utf8')) : null;
        expired = !(m && now - Date.parse(m.created_at) <= TTL_MS);
      } else {
        expired = now - st.mtimeMs > TTL_MS;
      }
    } catch {
      expired = true; // unreadable mail is discarded at pickup too
    }
    if (expired) fs.rmSync(claim, { recursive: true, force: true });
    else putBack(claim, drop, name);
  }
}

// Runs at SessionStart, never on its own key. Every change to another
// participant happens under that participant's lock, after re-checking: a
// busy lock means the participant is active, and it is skipped.
//
// Cards go when their host has exited or they are older than the mail TTL.
// Mailbox and state go when the participant has no card and has not been
// active for longer than the TTL: its drop is emptied of expired mail and
// removed only if then empty (non-recursive), and its state only after that.
// A session that resumes after its directories were reclaimed starts fresh.
function pruneRoll(root, { self, now, isAlive: alive = isAlive, lockFor = (k) => tryLock(root, k) }) {
  const rollDir = path.join(root, 'roll');
  const cardFile = (k) => path.join(rollDir, `${k}.json`);
  let names = [];
  try {
    names = fs.readdirSync(rollDir);
  } catch { /* no roll yet */ }
  for (const name of names) {
    const m = CARD_FILE.exec(name);
    if (!m || m[1] === self) continue;
    const c = readCard(cardFile(m[1]));
    if (!c || !cardIsStale(c, now, alive)) continue;
    const release = lockFor(m[1]);
    if (!release) continue;
    try {
      const again = readCard(cardFile(m[1]));
      if (again && cardIsStale(again, now, alive)) fs.rmSync(cardFile(m[1]), { force: true });
    } catch { /* racing: leave it */ } finally {
      release();
    }
  }

  const keys = new Set();
  for (const [sub, re] of [['state', STATE_ENTRY], ['mail', KEY]]) {
    try {
      for (const n of fs.readdirSync(path.join(root, sub))) {
        const m = re.exec(n);
        if (m) keys.add(m[1] || m[0]);
      }
    } catch { /* absent */ }
  }
  for (const k of keys) {
    if (k === self || fs.existsSync(cardFile(k))) continue;
    const release = lockFor(k);
    if (!release) continue;
    try {
      const drop = path.join(root, 'mail', k);
      const state = path.join(root, 'state', k);
      if (fs.existsSync(cardFile(k))) continue;
      if (!(now - Math.max(newestMtime(state), newestMtime(drop)) > TTL_MS)) continue;
      expireDrop(drop, now);
      try {
        fs.rmdirSync(drop);
      } catch (e) {
        if (e.code !== 'ENOENT') continue; // mail still waiting
      }
      fs.rmSync(state, { recursive: true, force: true });
    } catch { /* racing: leave it */ } finally {
      release();
    }
  }
}

module.exports = {
  STATUS_BY_EVENT, MAX_CARD_BYTES, ensureDirs, buildCard, publishCard, readCards,
  readAlias, writeAlias, readHerdrName, writeHerdrName, isAlive, pruneRoll, expireDrop, lockPath, tryLock,
};
