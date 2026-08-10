'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  authArtifactNames,
  authStatusArgs,
  homeVariable,
  parseAuthStatus,
  seedHostAuth,
} = require('../parity/auth');

const roots = [];

function tempHome(files = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-auth-'));
  roots.push(root);
  for (const [name, contents] of Object.entries(files)) {
    const target = path.join(root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  }
  return root;
}

afterEach(() => {
  while (roots.length > 0) fs.rmSync(roots.pop(), { recursive: true, force: true });
});

test('discovers the auth artifacts a host home actually holds', () => {
  const home = tempHome({
    'auth.json': '{"token":"x"}',
    '.credentials.json': '{"token":"y"}',
    'settings.json': '{"permissions":[]}',
    'history.jsonl': 'turn\n',
  });
  expect(authArtifactNames(home)).toEqual(['.credentials.json', 'auth.json']);
});

test('a missing source home yields no artifacts rather than throwing', () => {
  expect(authArtifactNames(path.join(os.tmpdir(), 'parity-auth-absent'))).toEqual([]);
});

test('an operator override replaces discovery for a host that stores login elsewhere', () => {
  const home = tempHome({ 'session.dat': 'x', 'auth.json': '{}' });
  expect(authArtifactNames(home, ['session.dat'])).toEqual(['session.dat']);
  expect(authArtifactNames(home, 'session.dat, auth.json')).toEqual(['session.dat', 'auth.json']);
});

// Settings, plugin state, and history all steer the behavior under test, so the
// seed must carry the login and nothing else.
test('seeds only the auth artifact into a fresh home', () => {
  const source = tempHome({
    'auth.json': '{"token":"x"}',
    'settings.json': '{"permissions":["Bash"]}',
    'history.jsonl': 'unrelated\n',
    'plugins/memento/state.json': '{}',
  });
  const target = path.join(tempHome(), 'fresh');
  expect(seedHostAuth({ sourceHome: source, targetHome: target })).toEqual(['auth.json']);
  expect(fs.readdirSync(target)).toEqual(['auth.json']);
  expect(fs.readFileSync(path.join(target, 'auth.json'), 'utf8')).toBe('{"token":"x"}');
});

test('seeded credentials are not world readable', () => {
  const source = tempHome({ 'auth.json': '{}' });
  const target = path.join(tempHome(), 'fresh');
  seedHostAuth({ sourceHome: source, targetHome: target });
  expect(fs.statSync(path.join(target, 'auth.json')).mode & 0o077).toBe(0);
});

test('an absent source home seeds nothing and does not throw', () => {
  const target = path.join(tempHome(), 'fresh');
  expect(seedHostAuth({ sourceHome: '', targetHome: target })).toEqual([]);
});

test('seedHostAuth requires a target home', () => {
  expect(() => seedHostAuth({ sourceHome: tempHome(), targetHome: '' }))
    .toThrow('seedHostAuth requires a target home');
});

// These are the shapes the installed CLIs actually emit.
test('reads real Claude authentication status', () => {
  expect(parseAuthStatus('claude', JSON.stringify({
    loggedIn: true, authMethod: 'claude.ai', subscriptionType: 'team',
  }))).toEqual({ authenticated: true, detail: 'claude.ai' });
  expect(parseAuthStatus('claude', '{"loggedIn": false, "authMethod": "none"}').authenticated).toBe(false);
});

test('reads real Codex authentication status', () => {
  expect(parseAuthStatus('codex', 'Logged in using ChatGPT\n'))
    .toEqual({ authenticated: true, detail: 'ChatGPT' });
  expect(parseAuthStatus('codex', 'Not logged in').authenticated).toBe(false);
});

// A preflight that guesses "probably fine" would hand back a matrix of
// authentication failures, so anything unrecognized is unauthenticated.
test('treats unrecognized or absent status output as unauthenticated', () => {
  for (const output of ['', undefined, null, 'garbage', '<html>error</html>']) {
    expect(parseAuthStatus('claude', output).authenticated).toBe(false);
    expect(parseAuthStatus('codex', output).authenticated).toBe(false);
  }
  expect(parseAuthStatus('gemini', 'Logged in').authenticated).toBe(false);
});

test('exposes the status command and home variable each host uses', () => {
  expect(authStatusArgs('claude')).toEqual(['auth', 'status']);
  expect(authStatusArgs('codex')).toEqual(['login', 'status']);
  expect(authStatusArgs('gemini')).toBe(null);
  expect(homeVariable('claude')).toBe('CLAUDE_CONFIG_DIR');
  expect(homeVariable('codex')).toBe('CODEX_HOME');
  expect(homeVariable('gemini')).toBe(null);
});

const { verifyHostAuthentication } = require('../run-parity');

// This is the load-bearing safety property: seeding is an allowlist and can be
// wrong, so a host that is not authenticated inside the isolated home must stop
// the run with actionable guidance rather than yield a matrix of auth failures.
test('preflight fails with actionable guidance when a seeded home is unauthenticated', async () => {
  const probeRoot = tempHome();
  await expect(verifyHostAuthentication({
    host: 'claude',
    version: '2.1.226',
    sourceHome: tempHome({ 'settings.json': '{}' }),
    probeRoot,
    packageName: '@anthropic-ai/claude-code',
    execute: async () => ({ stdout: '{"loggedIn": false, "authMethod": "none"}', stderr: '', code: 0 }),
  })).rejects.toThrow(/claude is not authenticated inside an isolated CLAUDE_CONFIG_DIR/);
});

test('preflight names what it seeded so a wrong allowlist is diagnosable', async () => {
  const probeRoot = tempHome();
  await expect(verifyHostAuthentication({
    host: 'claude', version: '2.1.226',
    sourceHome: tempHome({ 'settings.json': '{}' }), probeRoot,
    packageName: '@anthropic-ai/claude-code',
    execute: async () => ({ stdout: '{"loggedIn": false}', stderr: '', code: 0 }),
  })).rejects.toThrow(/Seeded nothing from/);
  await expect(verifyHostAuthentication({
    host: 'codex', version: '0.147.0',
    sourceHome: tempHome({ 'auth.json': '{}' }), probeRoot,
    packageName: '@openai/codex',
    execute: async () => ({ stdout: 'Not logged in', stderr: '', code: 0 }),
  })).rejects.toThrow(/Seeded auth\.json from/);
});

test('preflight reports the method when the seeded home authenticates', async () => {
  const probeRoot = tempHome();
  const outcome = await verifyHostAuthentication({
    host: 'codex', version: '0.147.0',
    sourceHome: tempHome({ 'auth.json': '{"t":1}' }), probeRoot,
    packageName: '@openai/codex',
    execute: async () => ({ stdout: 'Logged in using ChatGPT', stderr: '', code: 0 }),
  });
  expect(outcome).toMatchObject({ host: 'codex', seeded: ['auth.json'], method: 'ChatGPT' });
});
