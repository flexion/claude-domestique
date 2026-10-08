const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { processInput, readSnapshot } = require('../resources');
const { DISPLAY_GUIDANCE } = require('../../lib/resource-display');

let root;
let env;
let input;

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
  env = { ...process.env, MANTRA_RESOURCE_HOST: 'claude', MANTRA_RESOURCE_DIR: path.join(root, 'reports') };
  input = { hook_event_name: 'UserPromptSubmit', session_id: 'run-a', transcript_path: transcript };
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

test.each(['disabled', undefined, 'unrecognized'])('disabled mode %s neither writes nor displays', mode => {
  env.MANTRA_RESOURCES = mode;
  expect(processInput(input, env)).toEqual({});
  expect(fs.existsSync(env.MANTRA_RESOURCE_DIR)).toBe(false);
});

test('collect records measurements without agent feedback', () => {
  env.MANTRA_RESOURCES = 'collect';
  expect(processInput(input, env)).toEqual({});
  expect(readSnapshot('claude', 'run-a', env).tokens.input_tokens.value).toBe(10);
});

test('display records the same categories and exposes the fresh report after tool use', () => {
  env.MANTRA_RESOURCES = 'display';
  const output = processInput({ ...input, hook_event_name: 'PostToolUse', tool_use_id: 'tool-a' }, env);
  expect(output.hookSpecificOutput.hookEventName).toBe('PostToolUse');
  expect(output.hookSpecificOutput.additionalContext).toContain('tokens input=10');
  expect(output.hookSpecificOutput.additionalContext).not.toContain(DISPLAY_GUIDANCE);
  const first = readSnapshot('claude', 'run-a', env);
  const row = JSON.parse(fs.readFileSync(input.transcript_path, 'utf8'));
  row.message.usage.input_tokens = 17;
  fs.appendFileSync(input.transcript_path, `${JSON.stringify(row)}\n`);
  const second = processInput({ ...input, hook_event_name: 'PostToolUseFailure', tool_use_id: 'tool-b' }, env);
  expect(second.hookSpecificOutput.additionalContext).toContain('tokens input=17');
  expect(readSnapshot('claude', 'run-a', env).tokens.output_tokens.value).toBe(first.tokens.output_tokens.value);
});

test('fixed guidance appears on startup but is not repeated on resume or prompts', () => {
  env.MANTRA_RESOURCES = 'display';
  const startup = processInput({ ...input, hook_event_name: 'SessionStart', source: 'startup' }, env);
  expect(startup.hookSpecificOutput.additionalContext).toBe(DISPLAY_GUIDANCE);
  expect(processInput({ ...input, hook_event_name: 'SessionStart', source: 'resume' }, env)).toEqual({});
  expect(processInput(input, env).hookSpecificOutput.additionalContext).not.toContain(DISPLAY_GUIDANCE);
  expect(processInput({ ...input, hook_event_name: 'Stop' }, env)).toEqual({});
});

test('unsupported display host produces no feedback or collection writes', () => {
  env.MANTRA_RESOURCES = 'display';
  env.MANTRA_RESOURCE_HOST = 'codex';
  expect(processInput(input, env)).toEqual({});
  expect(fs.existsSync(env.MANTRA_RESOURCE_DIR)).toBe(false);
});

test('CLI keeps malformed input silent and emits valid context for display', () => {
  env.MANTRA_RESOURCES = 'display';
  const script = path.join(__dirname, '..', 'resources.js');
  expect(JSON.parse(execFileSync(process.execPath, [script, '--host', 'claude'], {
    env, input: 'malformed', encoding: 'utf8',
  }))).toEqual({});
  const output = JSON.parse(execFileSync(process.execPath, [script, '--host', 'claude'], {
    env, input: JSON.stringify(input), encoding: 'utf8',
  }));
  expect(output.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
  expect(output.hookSpecificOutput.additionalContext).toContain('tokens input=10');
});
