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
