const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { processInput, readSnapshot } = require('../resources');
const { INJECT_GUIDANCE } = require('../../lib/resource-inject');

let root;
let env;
let input;
let clock;

// The observation is injected only with the five-minute reflection, so these
// tests move the clock past the interval to see one. Collection itself still
// happens on every receipt, which the snapshot assertions check.
const REFLECTION_DUE_MS = 5 * 60 * 1000 + 1;
const atCadence = (event, extra = {}) => {
  clock.mockReturnValue(Date.now() + REFLECTION_DUE_MS);
  return processInput({ ...input, hook_event_name: event, ...extra }, env);
};

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'visibility-hook-test-'));
  const transcript = path.join(root, 'transcript.jsonl');
  fs.writeFileSync(transcript, `${JSON.stringify({
    type: 'assistant', session_id: 'run-a',
    message: { id: 'message-a', usage: {
      input_tokens: 10, output_tokens: 5,
      cache_read_input_tokens: 4, cache_creation_input_tokens: 8,
    } },
  })}\n`);
  env = { ...process.env, host: 'claude', directory: path.join(root, 'reports') };
  input = { hook_event_name: 'UserPromptSubmit', session_id: 'run-a', transcript_path: transcript };
  clock = jest.spyOn(Date, 'now').mockReturnValue(1000000);
});

afterEach(() => {
  clock.mockRestore();
  fs.rmSync(root, { recursive: true, force: true });
});

// A prompt used to carry a resource line, and so did every tool result. Both
// collect; neither injects. #213.
test('prompts and tool results collect without injecting an observation', () => {
  expect(processInput(input, env)).toEqual({});
  expect(processInput({ ...input, hook_event_name: 'PostToolUse', tool_use_id: 'tool-a' }, env)).toEqual({});
  expect(readSnapshot('claude', 'run-a', env).tokens.input_tokens.value).toBe(10);
});

test('the due reflection carries the fresh report after tool use', () => {
  processInput(input, env);
  const output = atCadence('PostToolUse', { tool_use_id: 'tool-a' });
  expect(output.hookSpecificOutput.hookEventName).toBe('PostToolUse');
  expect(output.hookSpecificOutput.additionalContext).toContain('tokens input=10');
  expect(output.hookSpecificOutput.additionalContext).toContain('Briefly recheck');
  expect(output.hookSpecificOutput.additionalContext).not.toContain(INJECT_GUIDANCE);
  const first = readSnapshot('claude', 'run-a', env);
  const row = JSON.parse(fs.readFileSync(input.transcript_path, 'utf8'));
  row.message.usage.input_tokens = 17;
  fs.appendFileSync(input.transcript_path, `${JSON.stringify(row)}\n`);
  const second = atCadence('PostToolUseFailure', { tool_use_id: 'tool-b' });
  expect(second.hookSpecificOutput.additionalContext).toContain('tokens input=17');
  expect(readSnapshot('claude', 'run-a', env).tokens.output_tokens.value).toBe(first.tokens.output_tokens.value);
});

// Every token field read "unknown" for a whole observed session, leaving a line
// whose only number was wall time including waits.
test('a report with no known token value yields the reflection alone', () => {
  fs.writeFileSync(input.transcript_path, '');
  processInput(input, env);
  const output = atCadence('PostToolUse', { tool_use_id: 'tool-a' });
  expect(output.hookSpecificOutput.additionalContext).toContain('Briefly recheck');
  expect(output.hookSpecificOutput.additionalContext).not.toContain('Resources');
  expect(output.hookSpecificOutput.additionalContext).not.toContain('tokens input=');
  expect(output.hookSpecificOutput.additionalContext).not.toContain('wall=');
});

test('fixed guidance appears on startup but is not repeated on resume or prompts', () => {
  const startup = processInput({ ...input, hook_event_name: 'SessionStart', source: 'startup' }, env);
  expect(startup.hookSpecificOutput.additionalContext).toBe(INJECT_GUIDANCE);
  expect(processInput({ ...input, hook_event_name: 'SessionStart', source: 'resume' }, env)).toEqual({});
  expect(processInput(input, env)).toEqual({});
  expect(processInput({ ...input, hook_event_name: 'Stop' }, env)).toEqual({});
});

test('unsupported injection host produces no feedback or collection writes', () => {
  env.host = 'unsupported';
  expect(processInput(input, env)).toEqual({});
  expect(fs.existsSync(env.directory)).toBe(false);
});

test('CLI keeps malformed input silent and collects a prompt without injecting', () => {
  const script = path.join(__dirname, '..', 'resources.js');
  expect(JSON.parse(execFileSync(process.execPath, [script, '--host', 'claude'], {
    env: { ...process.env, HOME: root }, input: 'malformed', encoding: 'utf8',
  }))).toEqual({});
  const output = JSON.parse(execFileSync(process.execPath, [script, '--host', 'claude'], {
    env: { ...process.env, HOME: root }, input: JSON.stringify(input), encoding: 'utf8',
  }));
  expect(output).toEqual({});
  const directory = path.join(root, '.cache/claude-domestique/mantra/resources');
  expect(readSnapshot('claude', 'run-a', { directory }).tokens.input_tokens.value).toBe(10);
});

function codexTranscript(usage = {}) {
  env.host = 'codex';
  fs.writeFileSync(input.transcript_path, `${JSON.stringify({
    type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: {
      input_tokens: 20, output_tokens: 6, cached_input_tokens: 4,
      reasoning_output_tokens: 2, ...usage,
    } } },
  })}\n`);
}

test('Codex inject adds fresh native categories on the due reflection', () => {
  codexTranscript();
  processInput(input, env);
  const output = atCadence('PostToolUse');
  expect(output).toEqual({ hookSpecificOutput: {
    hookEventName: 'PostToolUse', additionalContext: expect.any(String),
  } });
  expect(output.hookSpecificOutput.additionalContext).toContain('input=20 output=6 cached=4 cache-write=unknown reasoning=2');
  expect(output.hookSpecificOutput.additionalContext).toContain('cache/reasoning are subsets');
  expect(output.hookSpecificOutput.additionalContext).not.toContain(INJECT_GUIDANCE);
  expect(readSnapshot('codex', 'run-a', env).tokens.input_tokens.value).toBe(20);
  codexTranscript({ input_tokens: 27 });
  expect(atCadence('PostToolUse').hookSpecificOutput.additionalContext).toContain('input=27');
});

test('Codex prompts collect without injecting', () => {
  codexTranscript();
  expect(processInput(input, env)).toEqual({});
  expect(readSnapshot('codex', 'run-a', env).tokens.input_tokens.value).toBe(20);
});

test('Codex inject startup guidance uses the contract shape and stays silent on resume', () => {
  codexTranscript();
  expect(processInput({ ...input, hook_event_name: 'SessionStart', source: 'startup' }, env)).toEqual({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: INJECT_GUIDANCE },
  });
  expect(processInput({ ...input, hook_event_name: 'SessionStart', source: 'resume' }, env)).toEqual({});
  expect(readSnapshot('codex', 'run-a', env).host).toBe('codex');
});

test.each(['PreToolUse', 'Stop', 'SessionEnd', 'PreCompact', 'PostCompact', 'PostToolUseFailure', 'Notification'])(
  'Codex inject falls back to passive collection on %s', event => {
    codexTranscript();
    expect(processInput({ ...input, hook_event_name: event }, env)).toEqual({});
    expect(readSnapshot('codex', 'run-a', env).tokens.input_tokens.value).toBe(20);
    const journal = fs.readdirSync(env.directory).find(name => name.endsWith('.jsonl'));
    expect(fs.readFileSync(path.join(env.directory, journal), 'utf8')).toContain(`"event":"${event}"`);
  },
);

test('Codex CLI host flag selects collection and valid empty output on a prompt', () => {
  codexTranscript();
  env.host = 'claude';
  const output = JSON.parse(execFileSync(process.execPath, [path.join(__dirname, '..', 'resources.js'), '--host', 'codex'], {
    env: { ...process.env, HOME: root }, input: JSON.stringify(input), encoding: 'utf8',
  }));
  expect(output).toEqual({});
  expect(readSnapshot('codex', 'run-a', { directory: path.join(root, '.cache/claude-domestique/mantra/resources') }).tokens.input_tokens.value).toBe(20);
});
