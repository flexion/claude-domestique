const fs = require('fs');
const os = require('os');
const path = require('path');
const lock = require('../lib/comm/lock.js');

const NOW = Date.parse('2026-11-01T12:00:00Z');
const STARTED = NOW - 5000;
const file = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'comm-lock-')), 'k.lock');
const held = (f, over = {}) => fs.writeFileSync(f, JSON.stringify({ pid: 4242, token: 'other', at: NOW, started: STARTED, ...over }));
const opts = (over = {}) => ({
  now: () => NOW, isAlive: () => true, startOf: () => STARTED, sleep: () => {}, ...over,
});
const tokenOf = (f) => JSON.parse(fs.readFileSync(f, 'utf8')).token;
const files = (f) => fs.readdirSync(path.dirname(f));

test('acquire is exclusive until released, at 0600, leaving no temp file', () => {
  const f = file();
  const release = lock.acquire(f, opts());
  expect(typeof release).toBe('function');
  expect(fs.statSync(f).mode & 0o777).toBe(0o600);
  expect(files(f)).toEqual(['k.lock']);
  expect(lock.acquire(f, opts())).toBeNull();
  release();
  expect(files(f)).toEqual([]);
});

test('release never removes a successor\'s lock', () => {
  const f = file();
  const release = lock.acquire(f, opts());
  fs.rmSync(f);
  held(f, { token: 'successor' });
  release();
  expect(tokenOf(f)).toBe('successor');
});

test('a lock whose owner has exited is broken', () => {
  const f = file();
  held(f);
  const release = lock.acquire(f, opts({ isAlive: (pid) => pid !== 4242 }));
  expect(typeof release).toBe('function');
  expect(tokenOf(f)).not.toBe('other');
  release();
  expect(files(f)).toEqual([]);
});

test('a live owner is never broken for age alone, e.g. a suspended process', () => {
  const f = file();
  held(f, { at: NOW - 10 * lock.STALE_MS });
  expect(lock.acquire(f, opts())).toBeNull();
  expect(lock.acquire(f, opts({ startOf: () => { throw new Error('no ps'); } }))).toBeNull();
  expect(tokenOf(f)).toBe('other');
});

test('an old lock whose pid now belongs to a different process is broken', () => {
  const f = file();
  held(f, { at: NOW - lock.STALE_MS - 1 });
  expect(typeof lock.acquire(f, opts({ startOf: () => STARTED + 60000 }))).toBe('function');
  const g = file();
  held(g, { at: NOW - 1000 }); // young: no start-time check, not broken
  expect(lock.acquire(g, opts({ startOf: () => STARTED + 60000 }))).toBeNull();
});

test('a breaker that judged a lock stale never moves the lock that replaced it (four contenders)', () => {
  const f = file();
  held(f, { token: 'aaaa' }); // owner 4242 crashed
  let other = null;
  const isAlive = (pid) => {
    if (pid === 4242 && !other) {
      // While B is judging, A breaks the stale lock and acquires it, and C and D try too.
      other = lock.acquire(f, opts({ isAlive: (p) => p !== 4242 }));
      expect(lock.acquire(f, opts({ isAlive: (p) => p !== 4242 }))).toBeNull();
      expect(lock.acquire(f, opts({ isAlive: (p) => p !== 4242 }))).toBeNull();
    }
    return pid !== 4242;
  };
  expect(lock.acquire(f, opts({ isAlive }))).toBeNull(); // B
  expect(typeof other).toBe('function');
  expect(tokenOf(f)).not.toBe('aaaa');
  expect(files(f)).toEqual(['k.lock']);
  other();
  expect(files(f)).toEqual([]);
});

test('while a live breaker holds the right to break a stale lock, others leave it alone', () => {
  const f = file();
  held(f, { token: 'aaaa' });
  fs.writeFileSync(`${f}.break.aaaa.1`, JSON.stringify({ pid: 5151, token: 'b', at: NOW, started: STARTED }));
  expect(lock.acquire(f, opts({ isAlive: (pid) => pid !== 4242 }))).toBeNull();
  expect(tokenOf(f)).toBe('aaaa');
});

test('a breaker that died holding the right is passed over, and the right files cleaned up', () => {
  const f = file();
  held(f, { token: 'aaaa' });
  fs.writeFileSync(`${f}.break.aaaa.1`, JSON.stringify({ pid: 5151, token: 'b', at: NOW, started: STARTED }));
  const release = lock.acquire(f, opts({ isAlive: (pid) => pid !== 4242 && pid !== 5151 }));
  expect(typeof release).toBe('function');
  release();
  expect(files(f)).toEqual([]);
});

test('a late breaker of an already-broken token leaves the current lock alone', () => {
  const f = file();
  held(f, { token: 'bbbb' });
  const judged = { owner: { token: 'aaaa' }, ino: 1 };
  const deps = { now: () => NOW, isAlive: () => true, startOf: () => STARTED };
  expect(lock._breakLock(f, judged, { pid: process.pid, token: 'c', at: NOW, started: STARTED }, deps)).toBe(true);
  expect(tokenOf(f)).toBe('bbbb');
  expect(files(f)).toEqual(['k.lock']);
});

test('an unreadable lock is broken only once its file is older than the stale limit', () => {
  const f = file();
  fs.writeFileSync(f, '{garbage');
  expect(lock.acquire(f, opts({ now: () => Date.now() }))).toBeNull();
  const old = new Date(Date.now() - lock.STALE_MS - 1000);
  fs.utimesSync(f, old, old);
  expect(typeof lock.acquire(f, opts({ now: () => Date.now() }))).toBe('function');
});

test('acquire waits up to its deadline for the owner to release', () => {
  const f = file();
  held(f);
  let t = NOW;
  let sleeps = 0;
  const tick = (ms) => { t += ms; if (++sleeps === 3) fs.rmSync(f); };
  expect(typeof lock.acquire(f, opts({ now: () => t, sleep: tick, wait: 1000 }))).toBe('function');
  fs.rmSync(f);
  held(f);
  t = NOW;
  expect(lock.acquire(f, opts({ now: () => t, sleep: (ms) => { t += ms; }, wait: 50 }))).toBeNull();
});

test('processStart reads a live process start time, matching this process to within the tolerance', () => {
  const own = Date.now() - process.uptime() * 1000;
  expect(Math.abs(lock.processStart(process.pid) - own)).toBeLessThan(lock.START_TOLERANCE_MS);
});

test('eight processes, some dying while they hold it, never hold the lock at the same time', async () => {
  const { spawn } = require('child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'comm-lock-stress-'));
  const fixture = path.join(__dirname, 'fixtures', 'lock-contender.js');
  const runs = Array.from({ length: 8 }, (_, i) => new Promise((resolve) => {
    const child = spawn(process.execPath, [fixture, dir, '40', i % 2 ? '0' : '13']);
    child.on('close', (code) => resolve(code));
  }));
  const codes = await Promise.all(runs);
  expect(fs.existsSync(path.join(dir, 'violations'))).toBe(false);
  expect(codes.every((c) => c === 0)).toBe(true);
  const leftovers = fs.readdirSync(dir).filter((n) => n.includes('.break.') || n.includes('.broken.') || n.endsWith('.tmp'));
  expect(leftovers).toEqual([]);
}, 60000);
