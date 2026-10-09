const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, fork } = require('child_process');
const { processInput } = require('../resources');

let directory;
let clock;
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mantra-cadence-'));
  clock = jest.spyOn(Date, 'now').mockReturnValue(1000000);
});
afterEach(() => {
  clock.mockRestore();
  fs.rmSync(directory.endsWith('/resources') ? path.dirname(directory) : directory, { recursive: true, force: true });
});
const event = (name, extra = {}) => ({ session_id: 'a', hook_event_name: name, ...extra });
const context = output => output.hookSpecificOutput?.additionalContext || '';

test.each(['claude', 'codex'])('five-minute reflection accompanies fresh resources on %s, without catch-up bursts', host => {
  const options = { host, directory };
  processInput(event('SessionStart', { source: 'startup' }), options);
  clock.mockReturnValue(1299999);
  expect(context(processInput(event('PostToolUse'), options))).not.toContain('Briefly recheck');
  clock.mockReturnValue(1300000);
  const due = processInput(event('PostToolUse'), options);
  expect(context(due)).toContain('Resources');
  expect(context(due)).toContain('Briefly recheck');
  expect(due).not.toHaveProperty('decision');
  expect(context(processInput(event('PostToolUse'), options))).not.toContain('Briefly recheck');
  clock.mockReturnValue(9900000);
  expect(context(processInput(event('PostToolUse'), options))).toContain('Briefly recheck');
  expect(context(processInput(event('PostToolUse'), options))).not.toContain('Briefly recheck');
});

test.each(['UserPromptSubmit', 'SessionStart'])('%s resets the checkpoint without creating Stop continuations', name => {
  const options = { host: 'claude', directory };
  processInput(event('SessionStart'), options);
  clock.mockReturnValue(1290000);
  processInput(event(name, { source: 'compact' }), options);
  clock.mockReturnValue(1300000);
  expect(context(processInput(event('PostToolUse'), options))).not.toContain('Briefly recheck');
  clock.mockReturnValue(1590000);
  expect(processInput(event('Stop'), options)).toEqual({});
  expect(context(processInput(event('PostToolUse'), options))).toContain('Briefly recheck');
});

test('host/session identities isolate cadence and a first tool receipt establishes the clock', () => {
  const options = { host: 'claude', directory };
  processInput(event('SessionStart'), options);
  clock.mockReturnValue(1300000);
  expect(context(processInput(event('PostToolUse', { session_id: 'b' }), options))).not.toContain('Briefly recheck');
  expect(context(processInput(event('PostToolUse'), { ...options, host: 'codex' }))).not.toContain('Briefly recheck');
  expect(context(processInput(event('PostToolUse'), options))).toContain('Briefly recheck');
});

test('subagent receipts neither collect nor consume the main conversation checkpoint', () => {
  const options = { host: 'claude', directory };
  processInput(event('SessionStart'), options);
  clock.mockReturnValue(1300000);
  expect(processInput(event('PostToolUse', { agent_id: 'child' }), options)).toEqual({});
  expect(context(processInput(event('PostToolUse'), options))).toContain('Briefly recheck');
});

test('an atomically published claim survives a missing pointer update without duplicate reflection', () => {
  const options = { host: 'claude', directory };
  processInput(event('SessionStart'), options);
  const file = path.join(directory, fs.readdirSync(directory).find(name => name.endsWith('.checkpoint')));
  // Simulate a hook killed after publishing its due claim and before updating the pointer.
  fs.writeFileSync(`${file}.1000000.claim`, '1300000');
  clock.mockReturnValue(1300000);
  expect(context(processInput(event('PostToolUse'), options))).not.toContain('Briefly recheck');
  clock.mockReturnValue(1600000);
  expect(context(processInput(event('PostToolUse'), options))).toContain('Briefly recheck');
  expect(context(processInput(event('PostToolUse'), options))).not.toContain('Briefly recheck');
});

test('a failed cadence claim preserves the current resource observation', () => {
  const options = { host: 'claude', directory };
  processInput(event('SessionStart'), options);
  clock.mockReturnValue(1300000);
  const link = jest.spyOn(fs, 'linkSync').mockImplementation(() => { throw new Error('unavailable'); });
  try {
    expect(context(processInput(event('PostToolUse'), options))).toContain('Resources');
    expect(context(processInput(event('PostToolUse'), options))).not.toContain('Briefly recheck');
  } finally { link.mockRestore(); }
});

test('startup removes only old collector files and preserves recent and unrelated data', () => {
  clock.mockRestore();
  const old = path.join(directory, `${'a'.repeat(64)}.jsonl`);
  const recent = path.join(directory, `${'b'.repeat(64)}.json`);
  const unrelated = path.join(directory, 'notes.txt');
  for (const file of [old, recent, unrelated]) fs.writeFileSync(file, 'data');
  const past = new Date(Date.now() - 31 * 86400000);
  fs.utimesSync(old, past, past);
  fs.utimesSync(unrelated, past, past);
  processInput(event('SessionStart'), { host: 'claude', directory });
  expect(fs.existsSync(old)).toBe(false);
  expect(fs.existsSync(recent)).toBe(true);
  expect(fs.existsSync(unrelated)).toBe(true);
});

test('parallel tool processes emit exactly one due reflection despite a legacy abandoned lock', async () => {
  clock.mockRestore();
  directory = path.join(directory, 'resources');
  const options = { host: 'claude', directory };
  processInput(event('SessionStart'), options);
  const file = path.join(directory, fs.readdirSync(directory).find(name => name.endsWith('.checkpoint')));
  fs.writeFileSync(file, String(Date.now() - 300000));
  fs.writeFileSync(`${file}.lock`, '');
  const past = new Date(Date.now() - 60000);
  fs.utimesSync(`${file}.lock`, past, past);
  // Legacy lock files are ignored; new claims need no release or recovery.
  expect(context(processInput(event('PostToolUse'), options))).toContain('Briefly recheck');
  fs.writeFileSync(file, String(Date.now() - 300000));
  const outputs = await Promise.all(Array.from({ length: 12 }, () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, '../resources.js'), '--host', 'claude'], {
      env: { ...process.env, CLAUDE_PLUGIN_DATA: path.dirname(directory) },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    // Use the documented host data directory, without a resource configuration variable.
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.on('error', reject);
    child.on('close', status => status === 0 ? resolve(JSON.parse(output)) : reject(new Error(`exit ${status}`)));
    child.stdin.end(JSON.stringify(event('PostToolUse')));
  })));
  expect(outputs.filter(output => context(output).includes('Briefly recheck'))).toHaveLength(1);
});

test('simultaneous abandoned-lock recoverers preserve observations and emit one reflection', async () => {
  clock.mockRestore();
  const data = path.join(directory, 'data');
  processInput({ session_id: 'race', hook_event_name: 'SessionStart' }, { host: 'claude', directory: data });
  const checkpoint = path.join(data, fs.readdirSync(data).find(name => name.endsWith('.checkpoint')));
  fs.writeFileSync(checkpoint, String(Date.now() - 600000));
  fs.writeFileSync(`${checkpoint}.lock`, '');
  const past = new Date(Date.now() - 60000);
  fs.utimesSync(`${checkpoint}.lock`, past, past);
  const children = [];
  const start = role => {
    const child = fork(path.join(__dirname, '../../test-fixtures/cadence-race-child.cjs'), [role, directory, path.join(__dirname, '../resources.js')], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
    children.push(child);
    const events = [];
    child.on('message', message => events.push(message));
    const until = async predicate => {
      const deadline = Date.now() + 3000;
      while (!events.some(predicate)) {
        if (Date.now() > deadline) throw new Error(`barrier timeout: ${role}`);
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      return events.find(predicate);
    };
    return { until, release: tag => fs.writeFileSync(path.join(directory, `${role}-${tag}`), '') };
  };
  try {
    const a = start('A');
    const b = start('B');
    const gates = await Promise.all([a.until(message => message.tag), b.until(message => message.tag)]);
    if (gates[0].tag === 'stat') {
      // Both have observed the abandoned inode; B resumes after A owns its replacement.
      a.release('stat'); await a.until(message => message.tag === 'read');
      b.release('stat'); await b.until(message => message.tag === 'read');
    }
    a.release('read');
    const first = await a.until(message => message.done);
    const c = start('C');
    await c.until(message => message.tag === 'read');
    b.release('read');
    const second = await b.until(message => message.done);
    c.release('read');
    const third = await c.until(message => message.done);
    const results = [first, second, third];
    expect(results.every(result => result.observation && !result.error)).toBe(true);
    expect(results.filter(result => result.reflection)).toHaveLength(1);
  } finally {
    for (const child of children) child.kill();
  }
});
