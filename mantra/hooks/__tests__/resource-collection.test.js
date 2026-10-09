const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, spawn } = require('child_process');
const { collect, readSnapshot, MAX_BYTES } = require('../resources');

let directory;
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mantra-resources-')); });
afterEach(() => { fs.rmSync(directory, { recursive: true, force: true }); });
const input = { session_id: 's', hook_event_name: 'SessionStart' };
const env = () => ({ host: 'claude', directory });

test('snapshots match host and session; identifiers cannot traverse directories', () => {
  const report = collect(input, env());
  expect(report.run_id).toBe('s');
  expect(readSnapshot('claude', 's', env()).host).toBe('claude');
  expect(readSnapshot('codex', 's', env())).toBeNull();
  expect(readSnapshot('claude', 'other', env())).toBeNull();
  expect(collect({ ...input, session_id: '../../bad' }, env())).not.toBeNull();
  expect(fs.readdirSync(directory).some(name => name.includes('bad'))).toBe(false);
});

test('bounded journals stop appending and mark report truncated', () => {
  collect(input, env());
  const journal = fs.readdirSync(directory).find(name => name.endsWith('.jsonl'));
  fs.writeFileSync(path.join(directory, journal), ' '.repeat(MAX_BYTES));
  expect(collect({ ...input, hook_event_name: 'Stop' }, env()).truncated).toBe(true);
  expect(fs.statSync(path.join(directory, journal)).size).toBe(MAX_BYTES);
});

test('CLI hook always returns valid empty JSON for invalid input, missing identity and missing host', () => {
  for (const data of ['invalid', '{}', JSON.stringify(input)]) {
    const result = spawnSync(process.execPath, [path.join(__dirname, '../resources.js')], { input: data, encoding: 'utf8', env: { ...process.env, HOME: directory } });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({});
  }
});

test('collection failure is diagnostic only and does not alter hook decisions', () => {
  const result = spawnSync(process.execPath, [path.join(__dirname, '../resources.js'), '--host', 'claude'], { input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, HOME: '/dev/null/no-directory' } });
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual({});
  expect(result.stderr).toContain('resource collection unavailable');
});

test('missing transcript marks partial acquisition without inventing usage', () => {
  const report = collect({ ...input, transcript_path: path.join(directory, 'absent') }, env());
  expect(report.truncated).toBe(true);
  expect(report.tokens.input_tokens.value).toBeNull();
  expect(collect({ ...input, hook_event_name: 'Stop' }, env()).metrics.collector_work_ms.value).toBeGreaterThanOrEqual(0);
});

test('plugin installation registers resource hooks on both hosts', () => {
  const config = require('../hooks.json');
  expect(JSON.stringify(config)).toContain('resources.js');
  expect(require('../../.codex-plugin/plugin.json').hooks).toBe('./hooks/codex.json');
});

test('live transcript usage reaches the current PostToolUse snapshot without content retention', () => {
  const transcript = path.join(directory, 'transcript');
  fs.writeFileSync(transcript, JSON.stringify({ session_id: 's', type: 'assistant', message: { id: 'msg', usage: { input_tokens: 25, output_tokens: 3 }, content: [{ type: 'thinking', thinking: 'private-value' }] } }) + '\n');
  collect(input, env());
  const report = collect({ ...input, hook_event_name: 'PostToolUse', tool_use_id: 'a', duration_ms: 5, transcript_path: transcript }, env());
  expect(report.tokens.input_tokens.value).toBe(25);
  expect(report.metrics.tool_execution_ms.value).toBe(5);
  expect(report.metrics.collector_work_ms.value).toBeGreaterThanOrEqual(0);
  const journal = fs.readdirSync(directory).find(name => name.endsWith('.jsonl'));
  expect(fs.readFileSync(path.join(directory, journal), 'utf8')).not.toContain('private-value');
});

test('an abandoned old lock cannot disable collection', () => {
  collect(input, env());
  const key = fs.readdirSync(directory).find(name => name.endsWith('.json')).replace('.json', '');
  fs.mkdirSync(path.join(directory, `${key}.lock`));
  expect(collect({ ...input, hook_event_name: 'PostToolUse', tool_use_id: 'a', duration_ms: 2 }, env()).metrics.tool_execution_ms.value).toBe(2);
});

test('concurrent hooks preserve every identified tool duration in the journal', async () => {
  const childOptions = { host: 'claude', directory: path.join(directory, '.cache/claude-domestique/mantra/resources') };
  collect(input, childOptions);
  await Promise.all(Array.from({ length: 12 }, (_, index) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, '../resources.js'), '--host', 'claude'], { env: { ...process.env, HOME: directory }, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    let diagnostic = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { diagnostic += data; });
    child.on('error', reject);
    child.on('close', status => {
      try {
        expect(status).toBe(0);
        expect(diagnostic).toBe('');
        expect(JSON.parse(output).hookSpecificOutput.additionalContext).toContain('Resources');
        resolve();
      } catch (error) { reject(error); }
    });
    child.stdin.end(JSON.stringify({ ...input, hook_event_name: 'PostToolUse', tool_use_id: `tool-${index}`, duration_ms: 1 }));
  })));
  expect(collect({ ...input, hook_event_name: 'Stop' }, childOptions).metrics.tool_execution_ms.value).toBe(12);
});
