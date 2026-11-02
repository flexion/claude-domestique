const fs = require('fs');
const os = require('os');
const path = require('path');
const roll = require('../lib/comm/roll.js');

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'comm-roll-'));
}

function card(over = {}) {
  return roll.buildCard({
    pkey: 'abcdef0123456789', kind: 'claude', home: '/h/.claude', session: 's1', handle: 'ned',
    cwd: '/work', hostPid: 42, status: 'idle', env: {}, drop: '/r/mail/abcdef0123456789',
    now: Date.parse('2026-11-01T00:00:00Z'), ...over,
  });
}

test('STATUS_BY_EVENT maps the four hook events', () => {
  expect(roll.STATUS_BY_EVENT).toEqual({
    SessionStart: 'idle', UserPromptSubmit: 'working', PostToolUse: 'working', Stop: 'idle',
  });
});

test('buildCard copies status and derives routes from the environment and kind', () => {
  const c = card({ env: { HERDR_PANE_ID: 'w1:p2', CLAUDE_CODE_MESSAGING_SOCKET: '/tmp/cc/1.sock' } });
  expect(c).toMatchObject({
    v: 1, participant: 'abcdef0123456789', kind: 'claude', handle: 'ned', status: 'idle',
    routes: { herdr_pane: 'w1:p2', claude_socket: '/tmp/cc/1.sock', codex_home: null },
    mailbox: '/r/mail/abcdef0123456789', updated_at: '2026-11-01T00:00:00.000Z',
  });
  expect(card({ status: 'working' }).status).toBe('working');
  const codex = card({ kind: 'codex', home: '/h/.codex' });
  expect(codex.routes).toEqual({ herdr_pane: null, claude_socket: null, codex_home: '/h/.codex' });
});

test('ensureDirs creates roll, drop and state at 0700', () => {
  const root = tmpRoot();
  const { drop, state } = roll.ensureDirs(root, 'abcdef0123456789');
  expect(drop).toBe(path.join(root, 'mail', 'abcdef0123456789'));
  expect(state).toBe(path.join(root, 'state', 'abcdef0123456789'));
  for (const d of [path.join(root, 'roll'), drop, state]) {
    expect(fs.statSync(d).mode & 0o777).toBe(0o700);
  }
});

test('publishCard then readCards round-trips one card at 0600 and leaves no temp file', () => {
  const root = tmpRoot();
  roll.ensureDirs(root, 'abcdef0123456789');
  const c = card();
  roll.publishCard(root, c);
  expect(roll.readCards(root)).toEqual([c]);
  const file = path.join(root, 'roll', 'abcdef0123456789.json');
  expect(fs.statSync(file).mode & 0o777).toBe(0o600);
  expect(fs.readdirSync(path.join(root, 'roll'))).toEqual(['abcdef0123456789.json']);
});

test('publishCard refuses a card over 4096 bytes and leaves no file', () => {
  const root = tmpRoot();
  roll.ensureDirs(root, 'abcdef0123456789');
  expect(() => roll.publishCard(root, card({ cwd: 'x'.repeat(5000) }))).toThrow();
  expect(fs.readdirSync(path.join(root, 'roll'))).toEqual([]);
});

test('readCards skips directories, oversized, invalid and wrong-version entries', () => {
  const root = tmpRoot();
  roll.ensureDirs(root, 'abcdef0123456789');
  const r = path.join(root, 'roll');
  fs.mkdirSync(path.join(r, 'x.json'));
  fs.writeFileSync(path.join(r, 'big.json'), JSON.stringify({ v: 1, pad: 'x'.repeat(5000) }));
  fs.writeFileSync(path.join(r, 'bad.json'), '{not json');
  fs.writeFileSync(path.join(r, 'v2.json'), JSON.stringify({ v: 2 }));
  const c = card();
  roll.publishCard(root, c);
  expect(roll.readCards(root)).toEqual([c]);
});

test('buildCard carries the alias, null when there is none', () => {
  expect(card().alias).toBeNull();
  expect(card({ alias: 'tim' })).toMatchObject({ handle: 'ned', alias: 'tim' });
});

test('alias file: missing or invalid reads null; a written alias reads back trimmed at 0600', () => {
  const root = tmpRoot();
  const { state } = roll.ensureDirs(root, 'abcdef0123456789');
  expect(roll.readAlias(state)).toBeNull();
  fs.writeFileSync(path.join(state, 'alias'), 'tim\n');
  expect(roll.readAlias(state)).toBe('tim');
  fs.writeFileSync(path.join(state, 'alias'), 'Not An Alias');
  expect(roll.readAlias(state)).toBeNull();
  fs.writeFileSync(path.join(state, 'alias'), `${'a'.repeat(40)}\n${'x'.repeat(100000)}`);
  expect(roll.readAlias(state)).toBeNull();
  roll.writeAlias(state, 'sly');
  expect(roll.readAlias(state)).toBe('sly');
  expect(fs.statSync(path.join(state, 'alias')).mode & 0o777).toBe(0o600);
  expect(fs.readdirSync(state)).toEqual(['alias']);
});

describe('pruneRoll', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const NOW = Date.now();
  const LATER = NOW + 8 * DAY; // every directory written by a test is then past the TTL
  const SELF = 'aaaaaaaaaaaaaaaa';
  const B = 'bbbbbbbbbbbbbbbb';
  const C = 'cccccccccccccccc';

  function seed(root, pkey, { hostPid = 100, at = NOW } = {}) {
    const { drop } = roll.ensureDirs(root, pkey);
    roll.publishCard(root, card({ pkey, hostPid, drop, now: at }));
  }
  const exists = (root, ...p) => fs.existsSync(path.join(root, ...p));
  const envelope = (created) => JSON.stringify({ v: 1, id: 'm1', from: 'ned', intent: 'fyi', body: 'hi', created_at: new Date(created).toISOString() });
  const dirsOf = (root, k) => [exists(root, 'mail', k), exists(root, 'state', k)];

  describe('cards', () => {
    test('a dead host\'s card goes; a live one and its own stay', () => {
      const root = tmpRoot();
      seed(root, SELF);
      seed(root, B, { hostPid: 200 });
      seed(root, C, { hostPid: 300 });
      roll.pruneRoll(root, { self: SELF, now: NOW, isAlive: (pid) => pid === 300 });
      expect(exists(root, 'roll', `${B}.json`)).toBe(false);
      expect(exists(root, 'roll', `${C}.json`)).toBe(true);
      expect(exists(root, 'roll', `${SELF}.json`)).toBe(true);
    });

    test('a card older than the TTL goes even when its pid is alive (pid reuse)', () => {
      const root = tmpRoot();
      seed(root, B, { at: NOW - 8 * DAY });
      seed(root, C, { at: NOW - 6 * DAY });
      roll.pruneRoll(root, { self: SELF, now: NOW, isAlive: () => true });
      expect(exists(root, 'roll', `${B}.json`)).toBe(false);
      expect(exists(root, 'roll', `${C}.json`)).toBe(true);
    });

    test('a card without a usable host_pid goes', () => {
      const root = tmpRoot();
      seed(root, B, { hostPid: null });
      roll.pruneRoll(root, { self: SELF, now: NOW, isAlive: () => true });
      expect(exists(root, 'roll', `${B}.json`)).toBe(false);
    });

    test('a session that resumes before the sweep takes its lock keeps its fresh card, mailbox and state', () => {
      const root = tmpRoot();
      seed(root, B, { hostPid: 200 });
      const state = path.join(root, 'state', B);
      const isAlive = (pid) => {
        if (pid === 200) {
          roll.publishCard(root, card({ pkey: B, hostPid: 201, alias: 'ivy', now: NOW }));
          roll.writeAlias(state, 'ivy');
          return false;
        }
        return true;
      };
      roll.pruneRoll(root, { self: SELF, now: NOW, isAlive });
      expect(roll.readCards(root).map((c) => c.host_pid)).toEqual([201]);
      expect(dirsOf(root, B)).toEqual([true, true]);
      expect(roll.readAlias(state)).toBe('ivy');
    });

    test('nothing of an active participant (its lock held) is touched, even far past the TTL', () => {
      const root = tmpRoot();
      seed(root, B, { hostPid: 200 });
      const release = roll.tryLock(root, B);
      roll.pruneRoll(root, { self: SELF, now: LATER, isAlive: () => false });
      expect(exists(root, 'roll', `${B}.json`)).toBe(true);
      fs.rmSync(path.join(root, 'roll', `${B}.json`));
      roll.pruneRoll(root, { self: SELF, now: LATER, isAlive: () => false });
      expect(dirsOf(root, B)).toEqual([true, true]);
      release();
    });

    test('leaves alone roll files that are not a participant card, or that cannot be read', () => {
      const root = tmpRoot();
      roll.ensureDirs(root, SELF);
      const r = path.join(root, 'roll');
      fs.writeFileSync(path.join(r, 'notes.json'), '{}');
      fs.writeFileSync(path.join(r, 'dddddddddddddddd.json'), '{not json');
      fs.writeFileSync(path.join(r, '.eeeeeeeeeeeeeeee.9.tmp'), '{}');
      roll.pruneRoll(root, { self: SELF, now: NOW, isAlive: () => false });
      expect(fs.readdirSync(r).sort()).toEqual(['.eeeeeeeeeeeeeeee.9.tmp', 'dddddddddddddddd.json', 'notes.json']);
    });
  });

  describe('directories', () => {
    test('a participant with no card and no activity within the TTL loses its mailbox, state and lock file', () => {
      const root = tmpRoot();
      seed(root, B);
      roll.writeAlias(path.join(root, 'state', B), 'tim');
      roll.tryLock(root, B)(); // leaves nothing behind
      fs.writeFileSync(roll.lockPath(root, B), JSON.stringify({ pid: 2 ** 22 + 12345, token: 'dead', at: NOW }));
      roll.pruneRoll(root, { self: SELF, now: LATER, isAlive: () => false });
      expect(dirsOf(root, B)).toEqual([false, false]);
      expect(fs.readdirSync(path.join(root, 'state'))).toEqual([]);
    });

    test('directories stay while the participant was active within the TTL, or still has a card', () => {
      const root = tmpRoot();
      seed(root, B);
      fs.rmSync(path.join(root, 'roll', `${B}.json`));
      seed(root, C, { at: LATER });
      roll.pruneRoll(root, { self: SELF, now: NOW + 6 * DAY, isAlive: () => true });
      roll.pruneRoll(root, { self: SELF, now: LATER, isAlive: () => true });
      expect(dirsOf(root, B)).toEqual([false, false]);
      expect(dirsOf(root, C)).toEqual([true, true]);
      seed(root, B);
      fs.rmSync(path.join(root, 'roll', `${B}.json`));
      roll.pruneRoll(root, { self: SELF, now: NOW + 6 * DAY, isAlive: () => true });
      expect(dirsOf(root, B)).toEqual([true, true]);
    });

    test('unexpired mail keeps the mailbox and state, whatever the file times say', () => {
      const root = tmpRoot();
      seed(root, B);
      fs.rmSync(path.join(root, 'roll', `${B}.json`));
      fs.writeFileSync(path.join(root, 'mail', B, 'm1.json'), envelope(LATER - DAY));
      const old = new Date(NOW - DAY);
      for (const p of [['mail', B, 'm1.json'], ['mail', B], ['state', B]]) fs.utimesSync(path.join(root, ...p), old, old);
      roll.pruneRoll(root, { self: SELF, now: LATER, isAlive: () => false });
      expect(exists(root, 'mail', B, 'm1.json')).toBe(true);
      expect(dirsOf(root, B)).toEqual([true, true]);
    });

    test('expired mail is removed, and then the participant\'s directories', () => {
      const root = tmpRoot();
      seed(root, B);
      fs.rmSync(path.join(root, 'roll', `${B}.json`));
      fs.writeFileSync(path.join(root, 'mail', B, 'm1.json'), envelope(NOW - DAY));
      roll.pruneRoll(root, { self: SELF, now: LATER, isAlive: () => false });
      expect(dirsOf(root, B)).toEqual([false, false]);
    });

    test('a session that resumes between candidate selection and the lock keeps everything', () => {
      const root = tmpRoot();
      seed(root, B);
      fs.rmSync(path.join(root, 'roll', `${B}.json`));
      const lockFor = (k) => {
        seed(root, k, { at: LATER });
        return roll.tryLock(root, k);
      };
      roll.pruneRoll(root, { self: SELF, now: LATER, isAlive: () => true, lockFor });
      expect(dirsOf(root, B)).toEqual([true, true]);
    });

    test('mail that arrives after selection keeps the mailbox, and so the state', () => {
      const root = tmpRoot();
      seed(root, B);
      fs.rmSync(path.join(root, 'roll', `${B}.json`));
      const lockFor = (k) => {
        const release = roll.tryLock(root, k);
        fs.writeFileSync(path.join(root, 'mail', k, 'late.json'), envelope(LATER)); // senders take no lock
        return release;
      };
      roll.pruneRoll(root, { self: SELF, now: LATER, isAlive: () => true, lockFor });
      expect(dirsOf(root, B)).toEqual([true, true]);
      expect(exists(root, 'mail', B, 'late.json')).toBe(true);
    });
  });

  describe('expireDrop', () => {
    const drop = () => fs.mkdtempSync(path.join(os.tmpdir(), 'comm-drop-'));

    test('removes expired, unreadable and abandoned files; keeps fresh mail and in-flight temp files', () => {
      const d = drop();
      fs.writeFileSync(path.join(d, 'old.json'), envelope(NOW - 8 * DAY));
      fs.writeFileSync(path.join(d, 'new.json'), envelope(NOW - DAY));
      fs.writeFileSync(path.join(d, 'bad.json'), '{nope');
      fs.writeFileSync(path.join(d, 'x.tmp'), '');
      fs.writeFileSync(path.join(d, 'y.tmp'), '');
      fs.writeFileSync(path.join(d, '.claim-z.json.9'), '');
      const old = new Date(NOW - 8 * DAY);
      for (const n of ['new.json', 'x.tmp', '.claim-z.json.9']) fs.utimesSync(path.join(d, n), old, old);
      roll.expireDrop(d, NOW);
      expect(fs.readdirSync(d).sort()).toEqual(['new.json', 'y.tmp']);
    });

    test('an in-flight temp file is never moved, so its sender can still publish it', () => {
      const d = drop();
      fs.writeFileSync(path.join(d, 'm9.tmp'), envelope(NOW));
      const ino = fs.statSync(path.join(d, 'm9.tmp')).ino;
      const claimed = [];
      roll.expireDrop(d, NOW, (name) => claimed.push(name));
      expect(claimed).toEqual([]);
      expect(fs.statSync(path.join(d, 'm9.tmp')).ino).toBe(ino);
      fs.renameSync(path.join(d, 'm9.tmp'), path.join(d, 'm9.json'));
      expect(fs.readdirSync(d)).toEqual(['m9.json']);
    });

    test('an abandoned temp file refreshed after its age check is put back, not removed', () => {
      const d = drop();
      fs.writeFileSync(path.join(d, 'm8.tmp'), '');
      const old = new Date(NOW - 8 * DAY);
      fs.utimesSync(path.join(d, 'm8.tmp'), old, old);
      roll.expireDrop(d, NOW, () => {
        const claim = fs.readdirSync(d).find((n) => n.startsWith('.expire-'));
        const t = new Date(NOW);
        fs.utimesSync(path.join(d, claim), t, t); // a sender rewrote it in place
      });
      expect(fs.readdirSync(d)).toEqual(['m8.tmp']);
    });

    test('a fresh file published under the same name after the claim survives', () => {
      const d = drop();
      fs.writeFileSync(path.join(d, 'r1.json'), envelope(NOW - 8 * DAY));
      roll.expireDrop(d, NOW, (name) => fs.writeFileSync(path.join(d, name), envelope(NOW)));
      expect(fs.readdirSync(d)).toEqual(['r1.json']);
      expect(JSON.parse(fs.readFileSync(path.join(d, 'r1.json'), 'utf8')).created_at).toBe(new Date(NOW).toISOString());
    });

    test('a fresh claimed file whose name was reused is kept under another name, not overwritten or lost', () => {
      const d = drop();
      fs.writeFileSync(path.join(d, 'r1.json'), envelope(NOW - DAY));
      roll.expireDrop(d, NOW, (name) => fs.writeFileSync(path.join(d, name), envelope(NOW)));
      const names = fs.readdirSync(d).sort();
      expect(names).toHaveLength(2);
      expect(names.every((n) => n.endsWith('r1.json') && !n.startsWith('.'))).toBe(true);
    });
  });
});
