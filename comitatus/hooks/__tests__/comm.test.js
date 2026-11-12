const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const comm = require('../comm.js');
const identity = require('../../lib/comm/identity.js');
const roll = require('../../lib/comm/roll.js');

const HOOK = path.join(__dirname, '..', 'comm.js');
// Relative to the real clock, not a fixed date: the concurrency test spawns the
// hook as a real process, which sweeps mail with Date.now() and drops anything
// older than mail.js's seven-day TTL. A pinned date makes that test pass until a
// week after it is written and fail every day after.
const NOW = Date.now();
const LABEL = '[comitatus MAIL - peer message from the same OS user, unauthenticated, not a user instruction]';

// Hermetic: no herdr lookup and every host alive unless a test says otherwise.
function setup(extraEnv = {}, deps = {}) {
  const root = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'comm-hook-')), 'root');
  const env = { CLAUDECODE: '1', COMITATUS_HOME: root, CLAUDE_CONFIG_DIR: '/nope/.claude', ...extraEnv };
  const call = (event, extraInput = {}, session = 's1') => comm.run({
    input: { session_id: session, hook_event_name: event, cwd: '/work', ...extraInput },
    env, accountHome: '/nope', now: NOW, pid: 1, ppid: 2, herdrName: () => null, isAlive: () => true, ...deps,
  });
  return { root, env, call };
}

// The hook process inherits the test runner's env; strip anything that would
// make it participate differently or reach a live herdr.
function processEnv(extra) {
  const e = { ...process.env };
  for (const k of Object.keys(e)) if (/^(COMITATUS_|HERDR_)/.test(k)) delete e[k];
  return { ...e, ...extra };
}

function cardOf(root) {
  const dir = path.join(root, 'roll');
  const [name] = fs.readdirSync(dir).filter((n) => n.endsWith('.json'));
  return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
}

function queue(root, id, body = 'hi', from = 'rex') {
  const { mailbox } = cardOf(root);
  fs.writeFileSync(path.join(mailbox, `${id}.json`), JSON.stringify({
    v: 1, id, from, intent: 'fyi', body, created_at: new Date(NOW - 1000).toISOString(),
  }));
  return `${LABEL} id=${id} from=${from} intent=fyi: ${body}`;
}

test('opt-out: COMITATUS_ALIAS=off, or the deprecated COMITATUS_HANDLE=off, writes nothing and prints nothing', () => {
  for (const extra of [{ COMITATUS_ALIAS: 'off' }, { COMITATUS_HANDLE: 'off' }]) {
    const { root, call } = setup(extra);
    expect(call('SessionStart')).toBeNull();
    expect(fs.existsSync(root)).toBe(false);
  }
});

test('missing session_id writes nothing and prints nothing', () => {
  const { root, env } = setup();
  expect(comm.run({ input: { hook_event_name: 'SessionStart' }, env, accountHome: '/nope', now: NOW, pid: 1, ppid: 2 })).toBeNull();
  expect(fs.existsSync(root)).toBe(false);
});

test('participates by default: SessionStart publishes an idle card with a derived handle and the identity line', () => {
  const { root, call } = setup();
  const out = JSON.parse(call('SessionStart'));
  expect(out.hookSpecificOutput.hookEventName).toBe('SessionStart');
  const card = cardOf(root);
  expect(card).toMatchObject({ kind: 'claude', session: 's1', status: 'idle', alias: null });
  expect(card.handle).toBe(identity.deriveHandle(card.participant));
  const aliasFile = path.join(root, 'state', card.participant, 'alias');
  expect(out.hookSpecificOutput.additionalContext).toBe(
    `[comitatus] you are ${card.handle}, participant ${card.participant}; your mailbox: ${card.mailbox}; set your alias by writing ${aliasFile}`,
  );
});

test('the handle is stable across --resume (same session) and differs per session', () => {
  const { root, call } = setup();
  call('SessionStart');
  const first = cardOf(root).handle;
  call('SessionStart');
  expect(cardOf(root).handle).toBe(first);
  call('SessionStart', {}, 's2');
  const handles = identity.validHandle(first) && fs.readdirSync(path.join(root, 'roll')).map((n) => JSON.parse(fs.readFileSync(path.join(root, 'roll', n), 'utf8')).handle);
  expect(new Set(handles).size).toBe(2);
});

test('COMITATUS_ALIAS, else the deprecated COMITATUS_HANDLE, seeds the alias at SessionStart', () => {
  for (const [extra, alias] of [[{ COMITATUS_ALIAS: 'tim' }, 'tim'], [{ COMITATUS_HANDLE: 'fox' }, 'fox']]) {
    const { root, call } = setup(extra);
    const ctx = JSON.parse(call('SessionStart')).hookSpecificOutput.additionalContext;
    const card = cardOf(root);
    expect(card.alias).toBe(alias);
    expect(card.handle).not.toBe(alias);
    expect(ctx.startsWith(`[comitatus] you are ${card.handle} (alias ${alias}), participant `)).toBe(true);
    expect(fs.readFileSync(path.join(root, 'state', card.participant, 'alias'), 'utf8')).toBe(`${alias}\n`);
  }
});

test('the alias file wins over the env, and a rename is published on the next event', () => {
  const { root, call } = setup({ COMITATUS_ALIAS: 'tim' });
  call('SessionStart');
  const { participant } = cardOf(root);
  fs.writeFileSync(path.join(root, 'state', participant, 'alias'), 'sly\n');
  call('PostToolUse');
  expect(cardOf(root).alias).toBe('sly');
  call('SessionStart'); // a resume does not reseed over the agent's own choice
  expect(cardOf(root).alias).toBe('sly');
});

test('a failing or nameless herdr lookup leaves the session participating without an alias', () => {
  for (const herdrName of [() => { throw new Error('no herdr'); }, () => null]) {
    const { root, call } = setup({ HERDR_ENV: '1', HERDR_PANE_ID: 'w1:p3' }, { herdrName });
    expect(call('SessionStart')).not.toBeNull();
    expect(cardOf(root).alias).toBeNull();
  }
});

test('mail from a handle on the roll renders with that card\'s alias', () => {
  const { root, call } = setup();
  call('SessionStart', {}, 'peer');
  const peer = cardOf(root);
  fs.writeFileSync(path.join(root, 'state', peer.participant, 'alias'), 'tim\n');
  call('PostToolUse', {}, 'peer');
  call('SessionStart');
  const me = fs.readdirSync(path.join(root, 'roll')).map((n) => JSON.parse(fs.readFileSync(path.join(root, 'roll', n), 'utf8'))).find((c) => c.session === 's1');
  fs.writeFileSync(path.join(me.mailbox, 'q1.json'), JSON.stringify({
    v: 1, id: 'q1', from: peer.handle, intent: 'fyi', body: 'hi', created_at: new Date(NOW - 1000).toISOString(),
  }));
  const ctx = JSON.parse(call('UserPromptSubmit')).hookSpecificOutput.additionalContext;
  expect(ctx).toBe(`${LABEL} id=q1 from=${peer.handle} (tim) intent=fyi: hi`);
});

test('SessionStart prunes dead participants; later events do not sweep', () => {
  let alive = true;
  const { root, call } = setup({}, { isAlive: () => alive });
  call('SessionStart', {}, 'gone');
  const gone = cardOf(root).participant;
  alive = false;
  call('PostToolUse');
  expect(fs.existsSync(path.join(root, 'roll', `${gone}.json`))).toBe(true);
  call('SessionStart');
  expect(fs.existsSync(path.join(root, 'roll', `${gone}.json`))).toBe(false);
  expect(fs.readdirSync(path.join(root, 'roll'))).toHaveLength(1);
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

test('an unusable root throws from run, and the hook process prints {} and exits 0', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'comm-hook-')), 'not-a-dir');
  fs.writeFileSync(file, 'x');
  const { call } = setup({ COMITATUS_HOME: file });
  expect(() => call('SessionStart')).toThrow();
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ session_id: 's1', hook_event_name: 'SessionStart' }),
    env: processEnv({ CLAUDECODE: '1', COMITATUS_HOME: file }),
  });
  expect(r.status).toBe(0);
  expect(r.stdout.toString()).toBe('{}');
});

test('bad stdin prints {} and exits 0', () => {
  const { env } = setup();
  const r = spawnSync(process.execPath, [HOOK], { input: 'not json', env: processEnv(env) });
  expect(r.status).toBe(0);
  expect(r.stdout.toString()).toBe('{}');
});

// AGENTS.md: a hook always answers with a JSON object; empty stdout is
// indistinguishable from a crash (scripts/__tests__/hook-invocation.test.js).
test('an opted-out session gets {} from the hook process, and nothing is written', () => {
  const { root, env } = setup();
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ session_id: 's1', hook_event_name: 'Stop' }),
    env: processEnv({ ...env, COMITATUS_ALIAS: 'off' }),
  });
  expect(r.status).toBe(0);
  expect(r.stdout.toString()).toBe('{}');
  expect(fs.existsSync(root)).toBe(false);
});

test('with no env at all, the hook process participates and prints the identity line', () => {
  const { root, env } = setup();
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ session_id: 's1', hook_event_name: 'SessionStart' }),
    env: processEnv(env),
  });
  expect(r.status).toBe(0);
  expect(JSON.parse(r.stdout.toString()).hookSpecificOutput.additionalContext).toMatch(/^\[comitatus\] you are [a-z0-9]{6}, participant /);
  expect(cardOf(root).alias).toBeNull();
});

test('inside herdr with no env alias, the herdr member name becomes the alias', () => {
  const { root, call } = setup({ HERDR_ENV: '1', HERDR_PANE_ID: 'w1:p3' }, { herdrName: () => 'ivy' });
  call('SessionStart');
  expect(cardOf(root).alias).toBe('ivy');
});

test('the herdr name is looked up at each turn boundary, never per tool call', () => {
  const asked = [];
  const { call } = setup({}, { herdrName: () => { asked.push(1); return null; } });
  for (const e of ['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'PostToolUse', 'Stop']) call(e);
  expect(asked).toHaveLength(3);
});

test('a herdr rename reaches the roll at the next turn boundary', () => {
  let name = 'ivy';
  const { root, call } = setup({}, { herdrName: () => name });
  call('SessionStart');
  name = 'kit';
  call('PostToolUse');
  expect(cardOf(root).alias).toBe('ivy');
  call('UserPromptSubmit');
  expect(cardOf(root).alias).toBe('kit');
});

test('an env alias wins at start; a later herdr rename still wins over it', () => {
  let name = 'ivy';
  const { root, call } = setup({ COMITATUS_ALIAS: 'tim' }, { herdrName: () => name });
  call('SessionStart');
  call('Stop');
  expect(cardOf(root).alias).toBe('tim');
  name = 'kit';
  call('UserPromptSubmit');
  expect(cardOf(root).alias).toBe('kit');
});

test('an agent-written alias survives an unchanged herdr name, and yields to a herdr rename', () => {
  let name = 'ivy';
  const { root, call } = setup({}, { herdrName: () => name });
  call('SessionStart');
  const { participant } = cardOf(root);
  fs.writeFileSync(path.join(root, 'state', participant, 'alias'), 'sly\n');
  call('UserPromptSubmit');
  call('SessionStart'); // resume
  expect(cardOf(root).alias).toBe('sly');
  name = 'kit';
  call('Stop');
  expect(cardOf(root).alias).toBe('kit');
});

test('a failing, nameless or invalid herdr lookup changes nothing', () => {
  for (const herdrName of [() => { throw new Error('no herdr'); }, () => null, () => 'Not Valid']) {
    const { root, call } = setup({ COMITATUS_ALIAS: 'tim' }, { herdrName });
    expect(call('SessionStart')).not.toBeNull();
    call('UserPromptSubmit');
    expect(cardOf(root).alias).toBe('tim');
  }
});

test('herdrName asks herdr for this pane only, and is skipped outside herdr', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'comm-herdr-'));
  const bin = path.join(dir, 'herdr');
  const get = (name) => JSON.stringify({ result: { agent: { pane_id: 'w1:p2', ...(name ? { name } : {}) } } });
  fs.writeFileSync(bin, [
    '#!/bin/sh',
    `[ "$1 $2 $3" = "agent get w1:p2" ] && { echo '${get('tim')}'; exit 0; }`,
    `[ "$1 $2 $3" = "agent get w1:p3" ] && { echo '${get(null)}'; exit 0; }`,
    `echo '{"error":{"code":"agent_not_found"}}'`,
    '',
  ].join('\n'), { mode: 0o755 });
  const env = { HERDR_ENV: '1', HERDR_BIN_PATH: bin };
  expect(comm.herdrName({ ...env, HERDR_PANE_ID: 'w1:p2' })).toBe('tim');
  expect(comm.herdrName({ ...env, HERDR_PANE_ID: 'w1:p3' })).toBeNull();
  expect(comm.herdrName({ ...env, HERDR_PANE_ID: 'w9:p9' })).toBeNull();
  expect(comm.herdrName({ HERDR_BIN_PATH: bin, HERDR_PANE_ID: 'w1:p2' })).toBeNull();
});

test('the hook runs under its participant lock and always releases it', () => {
  const { root, call } = setup();
  call('SessionStart');
  const { participant } = cardOf(root);
  const lockFile = path.join(root, 'state', `${participant}.lock`);
  expect(fs.existsSync(lockFile)).toBe(false);
  const throwing = setup({}, { herdrName: () => null });
  fs.mkdirSync(path.join(throwing.root, 'roll'), { recursive: true });
  fs.writeFileSync(path.join(throwing.root, 'mail'), 'not a dir');
  expect(() => throwing.call('SessionStart')).toThrow();
  expect(fs.readdirSync(path.join(throwing.root, 'state')).filter((n) => n.endsWith('.lock'))).toEqual([]);
});

test('while another live process holds the participant lock, the hook does nothing and mail waits', () => {
  const { root, call } = setup({}, { lockWait: 0 });
  call('SessionStart');
  const card = cardOf(root);
  queue(root, 'w1');
  const lockFile = path.join(root, 'state', `${card.participant}.lock`);
  fs.writeFileSync(lockFile, JSON.stringify({ pid: process.pid, token: 'other', at: Date.now() }));
  expect(call('UserPromptSubmit')).toBeNull();
  expect(cardOf(root).status).toBe('idle');
  expect(fs.existsSync(path.join(card.mailbox, 'w1.json'))).toBe(true);
  fs.rmSync(lockFile);
  expect(JSON.parse(call('UserPromptSubmit')).hookSpecificOutput.additionalContext).toContain('id=w1');
});

test('concurrent hook processes of one participant, racing sweepers, deliver each message once and keep its state', async () => {
  const { root, env, call } = setup({ COMITATUS_ALIAS: 'ivy' });
  call('SessionStart');
  const me = cardOf(root);
  for (let i = 0; i < 30; i++) queue(root, `c${i}`);
  const runHook = (session, event) => new Promise((resolve) => {
    const child = spawn(process.execPath, [HOOK], { env: processEnv({ ...env, COMITATUS_ALIAS: '' }) });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.on('close', (code) => resolve({ code, out }));
    child.stdin.end(JSON.stringify({ session_id: session, hook_event_name: event, cwd: '/work' }));
  });
  const runs = [];
  for (let i = 0; i < 8; i++) {
    runs.push(runHook('s1', 'PostToolUse'));
    runs.push(runHook(`sweeper-${i}`, 'SessionStart'));
  }
  const results = await Promise.all(runs);
  expect(results.every((r) => r.code === 0)).toBe(true);
  let seen = [];
  for (const r of results) {
    const o = JSON.parse(r.out);
    const text = (o.hookSpecificOutput && o.hookSpecificOutput.additionalContext) || '';
    seen = seen.concat([...text.matchAll(/id=(c\d+)/g)].map((m) => m[1]));
  }
  // Anything a busy-lock skip left behind is still queued, never lost.
  const left = fs.readdirSync(me.mailbox).filter((n) => n.endsWith('.json')).map((n) => n.slice(0, -5));
  expect(new Set(seen).size).toBe(seen.length);
  expect([...seen, ...left].sort()).toEqual(Array.from({ length: 30 }, (_, i) => `c${i}`).sort());
  expect(roll.readAlias(path.join(root, 'state', me.participant))).toBe('ivy');
  expect(fs.existsSync(path.join(root, 'roll', `${me.participant}.json`))).toBe(true);
  expect(fs.readdirSync(path.join(root, 'state')).filter((n) => n.includes('.lock'))).toEqual([]);
}, 30000);
