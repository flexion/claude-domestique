const id = require('../lib/comm/identity.js');

test('kind is claude only when CLAUDECODE=1', () => {
  expect(id.detectKind({ CLAUDECODE: '1' })).toBe('claude');
  expect(id.detectKind({ CODEX_HOME: '/x' })).toBe('codex');
  expect(id.detectKind({})).toBe('codex');
});

test('handle must be a short lowercase call-sign', () => {
  for (const ok of ['ned', 'a', 'kit-2']) expect(id.validHandle(ok)).toBe(true);
  for (const bad of ['', 'Ned', '2ned', 'n'.repeat(33), 'a b', undefined]) {
    expect(id.validHandle(bad)).toBe(false);
  }
});

test('home comes from the host env var, else the host default under homedir', () => {
  expect(id.resolveHome('claude', { CLAUDE_CONFIG_DIR: '/nope/c' }, '/h')).toBe('/nope/c');
  expect(id.resolveHome('claude', {}, '/h')).toBe('/h/.claude');
  expect(id.resolveHome('codex', {}, '/h')).toBe('/h/.codex');
});

test('root is COMITATUS_HOME, else .comitatus under the account home', () => {
  expect(id.commRoot({ COMITATUS_HOME: '/r' }, '/h')).toBe('/r');
  expect(id.commRoot({}, '/h')).toBe('/h/.comitatus');
});

test('participant key is stable, 16 hex, and varies by every input', () => {
  const k = id.participantKey('claude', '/h/.claude', 's1');
  expect(k).toMatch(/^[0-9a-f]{16}$/);
  expect(id.participantKey('claude', '/h/.claude', 's1')).toBe(k);
  for (const other of [['codex', '/h/.claude', 's1'], ['claude', '/h/.c2', 's1'], ['claude', '/h/.claude', 's2']]) {
    expect(id.participantKey(...other)).not.toBe(k);
  }
});
