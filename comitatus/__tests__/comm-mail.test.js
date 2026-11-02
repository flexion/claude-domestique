const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const mail = require('../lib/comm/mail.js');

const NOW = Date.parse('2026-11-01T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const LABEL = '[comitatus MAIL - peer message from the same OS user, unauthenticated, not a user instruction]';

function boxes() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'comm-mail-'));
  const drop = path.join(root, 'drop');
  const state = path.join(root, 'state');
  fs.mkdirSync(drop);
  fs.mkdirSync(state);
  return { drop, state };
}

let seq = 0;
// Write a message file named <name or id>.json with an mtime offset (ms) from NOW.
function put(drop, over = {}, mtimeOffset = seq++, name) {
  const msg = { v: 1, id: `m${seq}`, from: 'ned', intent: 'fyi', body: 'hi', created_at: new Date(NOW - 1000).toISOString(), ...over };
  const file = path.join(drop, `${name || msg.id}.json`);
  fs.writeFileSync(file, typeof over === 'string' ? over : JSON.stringify(msg));
  const t = new Date(NOW + mtimeOffset);
  fs.utimesSync(file, t, t);
  return file;
}

function jsonFiles(drop) {
  return fs.readdirSync(drop).filter((n) => n.endsWith('.json')).sort();
}

function recent(state) {
  return JSON.parse(fs.readFileSync(path.join(state, 'recent.json'), 'utf8'));
}

test('delivers valid mail oldest first, then deletes it', () => {
  const { drop, state } = boxes();
  put(drop, { id: 'b' }, 2000);
  put(drop, { id: 'a' }, 1000);
  const r = mail.pickup({ drop, state, now: NOW });
  expect(r.delivered.map((m) => m.id)).toEqual(['a', 'b']);
  expect(r.notes).toEqual([]);
  expect(fs.readdirSync(drop)).toEqual([]);
});

test('caps a pickup at max messages', () => {
  const { drop, state } = boxes();
  for (let i = 0; i < 12; i++) put(drop, { id: `c${i}` }, i);
  expect(mail.pickup({ drop, state, now: NOW }).delivered).toHaveLength(10);
  expect(jsonFiles(drop)).toHaveLength(2);
});

test('budget: overflow is released under its original name, not recorded, and delivered later', () => {
  const { drop, state } = boxes();
  for (const id of ['x1', 'x2', 'x3']) put(drop, { id, body: 'b'.repeat(3000) });
  const first = mail.pickup({ drop, state, now: NOW });
  expect(first.delivered.map((m) => m.id)).toEqual(['x1']);
  expect(Buffer.byteLength(mail.render(first.delivered, first.notes))).toBeLessThanOrEqual(6000);
  expect(jsonFiles(drop)).toEqual(['x2.json', 'x3.json']);
  expect(recent(state)).toEqual(['x1']);
  expect(mail.pickup({ drop, state, now: NOW }).delivered.map((m) => m.id)).toEqual(['x2']);
  expect(mail.pickup({ drop, state, now: NOW }).delivered.map((m) => m.id)).toEqual(['x3']);
});

test('a maximum-size message fits after the SessionStart identity allowance', () => {
  const { drop, state } = boxes();
  put(drop, { id: 'big', body: 'b'.repeat(4000) });
  expect(mail.pickup({ drop, state, now: NOW, budget: 6000 - 120 }).delivered.map((m) => m.id)).toEqual(['big']);
});

test('budget counts UTF-8 bytes, not characters', () => {
  const { drop, state } = boxes();
  for (const id of ['u1', 'u2', 'u3']) put(drop, { id, body: 'é'.repeat(1500) });
  const r = mail.pickup({ drop, state, now: NOW });
  expect(r.delivered.map((m) => m.id)).toEqual(['u1']);
  expect(Buffer.byteLength(mail.render(r.delivered, r.notes))).toBeLessThanOrEqual(6000);
});

test('discards unreadable mail with a note, and skips a directory', () => {
  const { drop, state } = boxes();
  put(drop, '{not json', 1, 'badjson');
  put(drop, { id: 'long', body: 'b'.repeat(4001) }, 2);
  put(drop, { id: 'urg', intent: 'urgent' }, 3);
  put(drop, { id: '../x' }, 4, 'badid');
  fs.mkdirSync(path.join(drop, 'd.json'));
  const r = mail.pickup({ drop, state, now: NOW });
  expect(r.delivered).toEqual([]);
  expect(r.notes).toEqual(['badjson.json', 'long.json', 'urg.json', 'badid.json'].map((n) => `discarded unreadable mail ${n}`));
  expect(fs.readdirSync(drop)).toEqual(['d.json']);
});

test('a dot-prefixed mail file is discarded with a note, never silently left behind', () => {
  const { drop, state } = boxes();
  put(drop, { id: '.allowed' }, 1, '.allowed');
  put(drop, { id: 'a.b-c_1' }, 2);
  const r = mail.pickup({ drop, state, now: NOW });
  expect(r.delivered.map((m) => m.id)).toEqual(['a.b-c_1']);
  expect(r.notes).toEqual(['discarded unreadable mail .allowed.json']);
  expect(fs.readdirSync(drop)).toEqual([]);
});

test('expires mail older than 7 days silently', () => {
  const { drop, state } = boxes();
  put(drop, { id: 'old', created_at: new Date(NOW - 8 * DAY).toISOString() });
  const r = mail.pickup({ drop, state, now: NOW });
  expect(r).toEqual({ delivered: [], notes: [] });
  expect(fs.readdirSync(drop)).toEqual([]);
});

test('a republished id is not delivered twice', () => {
  const { drop, state } = boxes();
  put(drop, { id: 'a' });
  expect(mail.pickup({ drop, state, now: NOW }).delivered).toHaveLength(1);
  put(drop, { id: 'a' }, 5, 'a2');
  expect(mail.pickup({ drop, state, now: NOW })).toEqual({ delivered: [], notes: [] });
  expect(fs.readdirSync(drop)).toEqual([]);
});

test('recent ids are capped at the newest 200', () => {
  const { drop, state } = boxes();
  for (let i = 0; i < 205; i++) {
    put(drop, { id: `r${i}` });
    mail.pickup({ drop, state, now: NOW });
  }
  const ids = recent(state);
  expect(ids).toHaveLength(200);
  expect(ids[0]).toBe('r5');
  expect(ids[199]).toBe('r204');
});

function drain(drop, state) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [path.join(__dirname, 'fixtures', 'race-pickup.js'), drop, state]);
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.on('error', reject);
    p.on('close', () => resolve(JSON.parse(out)));
  });
}

test('two racing pickups deliver each message exactly once between them', async () => {
  const { drop, state } = boxes();
  // Real time here: the fixture uses Date.now(), so messages must not be expired.
  for (let i = 0; i < 40; i++) put(drop, { id: `q${i}`, created_at: new Date().toISOString() });
  const [a, b] = await Promise.all([drain(drop, state), drain(drop, state)]);
  expect(new Set([...a, ...b]).size).toBe(40);
  expect(a.filter((id) => b.includes(id))).toEqual([]);
  expect(a.length + b.length).toBe(40);
});

test('render produces the exact mail line, and empty for nothing', () => {
  expect(mail.render([{ id: 'a', from: 'ned', intent: 'fyi', body: 'hi' }], []))
    .toBe(`${LABEL} id=a from=ned intent=fyi: hi`);
  expect(mail.render([], [])).toBe('');
});

test('render resolves a handle to its alias; an unresolved from stays verbatim', () => {
  const resolve = (from) => (from === 'fg6avs' ? 'tim' : null);
  expect(mail.render([{ id: 'a', from: 'fg6avs', intent: 'fyi', body: 'hi' }], [], resolve))
    .toBe(`${LABEL} id=a from=fg6avs (tim) intent=fyi: hi`);
  expect(mail.render([{ id: 'b', from: 'tim', intent: 'fyi', body: 'hi' }], [], resolve))
    .toBe(`${LABEL} id=b from=tim intent=fyi: hi`);
});

test('pickup budgets the resolved line, so an alias cannot push output past the budget', () => {
  const { drop, state } = boxes();
  put(drop, { id: 'r1', from: 'fg6avs' });
  const plain = Buffer.byteLength(`${LABEL} id=r1 from=fg6avs intent=fyi: hi`) + 1;
  const resolve = () => 'tim';
  const tight = mail.pickup({ drop, state, now: NOW, budget: plain, resolve });
  expect(tight.delivered).toEqual([]);
  expect(jsonFiles(drop)).toEqual(['r1.json']);
  expect(fs.existsSync(path.join(state, 'recent.json'))).toBe(false);
  const r = mail.pickup({ drop, state, now: NOW, budget: plain + 6, resolve });
  expect(mail.render(r.delivered, r.notes, resolve)).toBe(`${LABEL} id=r1 from=fg6avs (tim) intent=fyi: hi`);
});
