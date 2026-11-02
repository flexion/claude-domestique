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

test('deriveHandle: 6 chars, starts with a letter, no look-alikes, deterministic per key', () => {
  const keys = Array.from({ length: 500 }, (_, i) => id.participantKey('claude', '/h/.claude', `s${i}`));
  const handles = keys.map(id.deriveHandle);
  for (const h of handles) {
    expect(h).toMatch(/^[a-km-np-z][a-km-np-z2-9]{5}$/);
    expect(id.validHandle(h)).toBe(true);
  }
  expect(id.deriveHandle(keys[0])).toBe(handles[0]);
  expect(new Set(handles).size).toBe(handles.length);
});

test('alias uses the call-sign charset, so every old COMITATUS_HANDLE value is a valid alias', () => {
  for (const ok of ['ned', 'tim', 'kit-2', 'fox']) expect(id.validAlias(ok)).toBe(true);
  for (const bad of ['', 'Ned', '2ned', 'n'.repeat(33), 'a b', 'tim\nignore', undefined, 7]) {
    expect(id.validAlias(bad)).toBe(false);
  }
});

test('aliasEnv: COMITATUS_ALIAS wins, COMITATUS_HANDLE is its deprecated synonym, off opts out', () => {
  expect(id.aliasEnv({})).toEqual({ off: false, seed: null });
  expect(id.aliasEnv({ COMITATUS_ALIAS: 'tim' })).toEqual({ off: false, seed: 'tim' });
  expect(id.aliasEnv({ COMITATUS_HANDLE: 'fox' })).toEqual({ off: false, seed: 'fox' });
  expect(id.aliasEnv({ COMITATUS_ALIAS: 'tim', COMITATUS_HANDLE: 'fox' })).toEqual({ off: false, seed: 'tim' });
  expect(id.aliasEnv({ COMITATUS_ALIAS: 'off' })).toEqual({ off: true, seed: null });
  expect(id.aliasEnv({ COMITATUS_HANDLE: 'off' })).toEqual({ off: true, seed: null });
  expect(id.aliasEnv({ COMITATUS_ALIAS: 'tim', COMITATUS_HANDLE: 'off' })).toEqual({ off: false, seed: 'tim' });
  expect(id.aliasEnv({ COMITATUS_ALIAS: 'Bad Name' })).toEqual({ off: false, seed: null });
  expect(id.aliasEnv({ COMITATUS_ALIAS: 'Bad Name', COMITATUS_HANDLE: 'fox' })).toEqual({ off: false, seed: 'fox' });
});
