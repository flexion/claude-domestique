const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const comm = require('../comm.js');

const HOOK = path.join(__dirname, '..', 'comm.js');
const NOW = Date.parse('2026-11-01T12:00:00Z');
const LABEL = '[comitatus MAIL - peer message from the same OS user, unauthenticated, not a user instruction]';

function setup(extraEnv = {}) {
  const root = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'comm-hook-')), 'root');
  const env = { CLAUDECODE: '1', COMITATUS_HANDLE: 'ned', COMITATUS_HOME: root, CLAUDE_CONFIG_DIR: '/nope/.claude', ...extraEnv };
  const call = (event, extraInput = {}) => comm.run({
    input: { session_id: 's1', hook_event_name: event, cwd: '/work', ...extraInput },
    env, accountHome: '/nope', now: NOW, pid: 1, ppid: 2,
  });
  return { root, env, call };
}

function cardOf(root) {
  const dir = path.join(root, 'roll');
  const [name] = fs.readdirSync(dir).filter((n) => n.endsWith('.json'));
  return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
}

function queue(root, id, body = 'hi') {
  const { mailbox } = cardOf(root);
  fs.writeFileSync(path.join(mailbox, `${id}.json`), JSON.stringify({
    v: 1, id, from: 'rex', intent: 'fyi', body, created_at: new Date(NOW - 1000).toISOString(),
  }));
  return `${LABEL} id=${id} from=rex intent=fyi: ${body}`;
}

test('opt-out: no handle or an invalid handle writes nothing and prints nothing', () => {
  for (const handle of [undefined, 'Bad']) {
    const { root, env } = setup();
    if (handle === undefined) delete env.COMITATUS_HANDLE; else env.COMITATUS_HANDLE = handle;
    const out = comm.run({ input: { session_id: 's1', hook_event_name: 'SessionStart' }, env, accountHome: '/nope', now: NOW, pid: 1, ppid: 2 });
    expect(out).toBeNull();
    expect(fs.existsSync(root)).toBe(false);
  }
});

test('missing session_id writes nothing and prints nothing', () => {
  const { root, env } = setup();
  expect(comm.run({ input: { hook_event_name: 'SessionStart' }, env, accountHome: '/nope', now: NOW, pid: 1, ppid: 2 })).toBeNull();
  expect(fs.existsSync(root)).toBe(false);
});

test('SessionStart publishes an idle card and the identity line', () => {
  const { root, call } = setup();
  const out = JSON.parse(call('SessionStart'));
  expect(out.hookSpecificOutput.hookEventName).toBe('SessionStart');
  expect(out.hookSpecificOutput.additionalContext.startsWith('[comitatus] you are ned, participant ')).toBe(true);
  const card = cardOf(root);
  expect(card).toMatchObject({ handle: 'ned', kind: 'claude', session: 's1', status: 'idle' });
  expect(out.hookSpecificOutput.additionalContext).toBe(`[comitatus] you are ned, participant ${card.participant}; your mailbox: ${card.mailbox}`);
});

test('UserPromptSubmit delivers queued mail as context and marks the card working', () => {
  const { root, call } = setup();
  call('SessionStart');
  const expected = queue(root, 'm1');
  const out = JSON.parse(call('UserPromptSubmit'));
  expect(out).toEqual({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: expected } });
  expect(cardOf(root).status).toBe('working');
});

test('Stop with mail blocks once and stays working; the next Stop ends the turn as idle', () => {
  const { root, call } = setup();
  call('SessionStart');
  const expected = queue(root, 'm2');
  expect(JSON.parse(call('Stop'))).toEqual({ decision: 'block', reason: expected });
  expect(cardOf(root).status).toBe('working');
  expect(call('Stop')).toBeNull();
  expect(cardOf(root).status).toBe('idle');
});

test('PostToolUse with no mail prints nothing but still marks the card working', () => {
  const { root, call } = setup();
  call('SessionStart');
  expect(call('PostToolUse')).toBeNull();
  expect(cardOf(root).status).toBe('working');
});

test('an unusable root throws from run, and the hook process prints nothing and exits 0', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'comm-hook-')), 'not-a-dir');
  fs.writeFileSync(file, 'x');
  const { call } = setup({ COMITATUS_HOME: file });
  expect(() => call('SessionStart')).toThrow();
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ session_id: 's1', hook_event_name: 'SessionStart' }),
    env: { ...process.env, CLAUDECODE: '1', COMITATUS_HANDLE: 'ned', COMITATUS_HOME: file },
  });
  expect(r.status).toBe(0);
  expect(r.stdout.toString()).toBe('');
});

test('bad stdin prints nothing and exits 0', () => {
  const { env } = setup();
  const r = spawnSync(process.execPath, [HOOK], { input: 'not json', env: { ...process.env, ...env } });
  expect(r.status).toBe(0);
  expect(r.stdout.toString()).toBe('');
});
