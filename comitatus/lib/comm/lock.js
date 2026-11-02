'use strict';

// Per-participant mutex shared by a participant's own hooks and the roll
// sweeper. A lock file is published whole: written under a unique temp name,
// then linked into place, which fails if the lock is held.
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const fs = require('fs');

const STALE_MS = 60 * 1000;
const START_TOLERANCE_MS = 2000;
const STEP_MS = 10;

function defaultSleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function defaultIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

// Process start time in ms, from ps (second resolution). Throws if unknown.
function processStart(pid) {
  const out = execFileSync('ps', ['-o', 'lstart=', '-p', String(pid)], {
    encoding: 'utf8', timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, LC_ALL: 'C' },
  }).trim();
  const t = Date.parse(out);
  if (Number.isNaN(t)) throw new Error(`no start time for ${pid}`);
  return t;
}

function readLock(file) {
  try {
    const st = fs.lstatSync(file);
    let owner = null;
    try {
      owner = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch { /* unreadable */ }
    return { ino: st.ino, mtime: st.mtimeMs, owner };
  } catch {
    return null;
  }
}

// Stale only when its owner is provably gone: the pid has exited, or an old
// lock's pid now belongs to a process that started later (pid reuse). A live
// owner is never broken for age alone, since a suspended process can hold a
// lock for any length of time. A lock that cannot be read is judged by age.
function isStale(lk, { now, isAlive, startOf }) {
  const o = lk.owner;
  if (!o || !Number.isInteger(o.pid) || o.pid <= 0) return now() - lk.mtime > STALE_MS;
  if (!isAlive(o.pid)) return true;
  if (!(now() - o.at > STALE_MS) || typeof o.started !== 'number') return false;
  try {
    return Math.abs(startOf(o.pid) - o.started) > START_TOLERANCE_MS;
  } catch {
    return false;
  }
}

// Publishes a small JSON file whole, or not at all: written under a temp
// name carrying this pid, then linked into place, which fails if it exists.
function publish(file, body) {
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(body), { mode: 0o600 });
  try {
    fs.linkSync(tmp, file);
    return true;
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    return false;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

// Names the lock instance: its owner's token, or for an unreadable lock its
// inode.
function keyOf(lk) {
  const t = lk.owner && lk.owner.token;
  return typeof t === 'string' && /^[0-9a-f]{1,32}$/.test(t) ? t : `ino${lk.ino}`;
}

// Breaking a stale lock is a right that exactly one live process holds per
// stale lock: the one that creates `<lock>.break.<its token>.<n>`. Tokens are
// never reused, and only that process may move a lock carrying that token, so
// the lock it re-reads is still the lock it moves. A breaker that dies passes
// the right on: level n+1 is open only once level n's holder is provably gone.
// Returns true when the stale lock is gone, false when someone else is on it.
function breakLock(file, judged, me, deps) {
  const key = keyOf(judged);
  for (let n = 1; n < 100; n++) {
    const right = `${file}.break.${key}.${n}`;
    if (publish(right, me)) {
      try {
        const now = readLock(file);
        if (now && keyOf(now) === key) {
          const aside = `${file}.broken.${process.pid}.${crypto.randomBytes(4).toString('hex')}`;
          fs.renameSync(file, aside);
          fs.rmSync(aside, { force: true });
        }
      } finally {
        for (let m = 1; m <= n; m++) fs.rmSync(`${file}.break.${key}.${m}`, { force: true });
      }
      return true;
    }
    const holder = readLock(right);
    if (!holder || !isStale(holder, deps)) return false; // a live breaker is on it
  }
  return false;
}

function acquire(file, opts = {}) {
  const {
    wait = 0, now = Date.now, sleep = defaultSleep, isAlive = defaultIsAlive, startOf = processStart,
  } = opts;
  const deps = { now, isAlive, startOf };
  const token = crypto.randomBytes(8).toString('hex');
  const me = { pid: process.pid, token, at: now(), started: Math.round(Date.now() - process.uptime() * 1000) };
  const deadline = now() + wait;
  for (;;) {
    if (publish(file, me)) return () => release(file, token);
    const lk = readLock(file);
    if (lk && isStale(lk, deps) && breakLock(file, lk, me, deps) && publish(file, me)) return () => release(file, token);
    if (now() >= deadline) return null;
    sleep(STEP_MS);
  }
}

function release(file, token) {
  const lk = readLock(file);
  if (lk && lk.owner && lk.owner.token === token) fs.rmSync(file, { force: true });
}

module.exports = { acquire, processStart, STALE_MS, START_TOLERANCE_MS, _breakLock: breakLock };
