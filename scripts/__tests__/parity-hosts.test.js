'use strict';

const { createClaudeAdapter } = require('../parity/hosts/claude');
const { createCodexAdapter } = require('../parity/hosts/codex');

function fakeExecutor(responses) {
  const calls = [];
  const execute = async (binary, args, options) => {
    calls.push({ binary, args, options });
    return responses.length > 0
      ? responses.shift()
      : { exitCode: 0, stdout: '', stderr: '', timedOut: false };
  };
  return { calls, execute };
}

const metadata = {
  scenarioId: 'direct-review', hostVersion: '1.2.3', arm: 'guided', trial: 1,
};

test('Claude installs the marketplace and plugins in isolated configuration', async () => {
  const fake = fakeExecutor([]);
  const adapter = createClaudeAdapter({ execute: fake.execute });
  await adapter.install({ marketplace: '/repo', plugins: ['stilus', 'memento'], home: '/tmp/claude' });
  expect(fake.calls.map(call => call.args)).toEqual([
    ['plugin', 'marketplace', 'add', '/repo'],
    ['plugin', 'install', 'stilus@claude-domestique'],
    ['plugin', 'install', 'memento@claude-domestique'],
  ]);
  expect(fake.calls.every(call => call.options.env.CLAUDE_CONFIG_DIR === '/tmp/claude')).toBe(true);
});

test('Claude direct invocation uses slash syntax and normalized JSON output', async () => {
  const fake = fakeExecutor([{ exitCode: 0, stdout: JSON.stringify({ result: 'reviewed' }), stderr: '', timedOut: false }]);
  const adapter = createClaudeAdapter({ execute: fake.execute });
  const result = await adapter.run({ ...metadata, cwd: '/fixture', home: '/tmp/claude', skill: 'stilus:review', input: 'draft.md' });
  expect(fake.calls[0].args).toEqual([
    '-p', '/stilus:review draft.md', '--output-format', 'json', '--no-session-persistence',
  ]);
  expect(fake.calls[0].options.cwd).toBe('/fixture');
  expect(result.outcome).toBe('PASS');
  expect(result.observations.output).toBe('reviewed');
});

test('Codex execution uses dollar syntax, JSONL, ephemeral mode, and an isolated home', async () => {
  const event = { type: 'item.completed', item: { type: 'agent_message', text: 'reviewed' } };
  const fake = fakeExecutor([{ exitCode: 0, stdout: `${JSON.stringify(event)}\n`, stderr: '', timedOut: false }]);
  const adapter = createCodexAdapter({ execute: fake.execute });
  const result = await adapter.run({ ...metadata, cwd: '/fixture', home: '/tmp/codex', skill: 'stilus:review', input: 'draft.md' });
  expect(fake.calls[0].args).toEqual([
    'exec', '--json', '--ephemeral', '--sandbox', 'workspace-write', '$stilus:review draft.md',
  ]);
  expect(fake.calls[0].options.cwd).toBe('/fixture');
  expect(fake.calls[0].options.env.CODEX_HOME).toBe('/tmp/codex');
  expect(result.observations.output).toBe('reviewed');
});

test('Codex installs the marketplace and plugins in an isolated home', async () => {
  const fake = fakeExecutor([]);
  const adapter = createCodexAdapter({ execute: fake.execute });
  await adapter.install({ marketplace: '/repo', plugins: ['stilus'], home: '/tmp/codex' });
  expect(fake.calls.map(call => call.args)).toEqual([
    ['plugin', 'marketplace', 'add', '/repo'],
    ['plugin', 'add', 'stilus@claude-domestique'],
  ]);
  expect(fake.calls.every(call => call.options.env.CODEX_HOME === '/tmp/codex')).toBe(true);
});

test.each([
  ['nonzero exit', { exitCode: 7, stdout: '', stderr: 'secret failure', timedOut: false }, 'nonzero_exit'],
  ['timeout', { exitCode: null, stdout: '', stderr: '', timedOut: true }, 'timeout'],
  ['invalid JSON', { exitCode: 0, stdout: '{bad', stderr: '', timedOut: false }, 'invalid_output'],
  ['missing final response', { exitCode: 0, stdout: JSON.stringify({ type: 'thread.started' }) + '\n', stderr: '', timedOut: false }, 'missing_final_response'],
])('normalizes Codex %s as infrastructure failure', async (_label, response, kind) => {
  const fake = fakeExecutor([response]);
  const adapter = createCodexAdapter({ execute: fake.execute });
  const result = await adapter.run({ ...metadata, cwd: '/fixture', home: '/tmp/codex', prompt: 'hello' });
  expect(result.outcome).toBe('INFRASTRUCTURE_FAILURE');
  expect(result.infrastructure_failure.kind).toBe(kind);
  expect(JSON.stringify(result)).not.toContain('/tmp/codex');
});

test('normalizes Claude missing final response as infrastructure failure', async () => {
  const fake = fakeExecutor([{ exitCode: 0, stdout: JSON.stringify({ session_id: 'x' }), stderr: '', timedOut: false }]);
  const adapter = createClaudeAdapter({ execute: fake.execute });
  const result = await adapter.run({ ...metadata, cwd: '/fixture', home: '/tmp/claude', prompt: 'hello' });
  expect(result.outcome).toBe('INFRASTRUCTURE_FAILURE');
  expect(result.infrastructure_failure.kind).toBe('missing_final_response');
});
