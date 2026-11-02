'use strict';
// One contender in the lock stress test: repeatedly take the lock, prove
// exclusivity by creating an occupancy file exclusively, and sometimes die
// while holding it so that others must break a stale lock.
const fs = require('fs');
const path = require('path');
const lock = require('../../lib/comm/lock.js');

const [dir, rounds, crashEvery] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4])];
const file = path.join(dir, 'P.lock');
const occupied = path.join(dir, 'occupied');
for (let i = 0; i < rounds; i++) {
  const release = lock.acquire(file, { wait: 20000 });
  if (!release) continue;
  try {
    fs.writeFileSync(occupied, String(process.pid), { flag: 'wx' });
  } catch {
    fs.appendFileSync(path.join(dir, 'violations'), `${process.pid}\n`);
    process.exit(2);
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.floor(Math.random() * 3));
  fs.rmSync(occupied);
  if (crashEvery && i % crashEvery === crashEvery - 1) process.exit(0); // dies holding the lock
  release();
}
