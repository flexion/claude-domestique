const { spawnSync } = require('child_process');
const path = require('path');

const SCRIPT = path.resolve(__dirname, '../skills/teams/scripts/teams.ps1');
const FIXTURE = path.join(__dirname, 'fixtures/teams.ps1');
const hasPowerShell = spawnSync('pwsh', ['--version'], { encoding: 'utf8' }).status === 0;
const testPowerShell = hasPowerShell ? test : test.skip;

function run(input) {
  const result = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', FIXTURE], {
    encoding: 'utf8',
    env: {
      ...process.env,
      COMITATUS_TEAMS_TEST_SCRIPT: SCRIPT,
      COMITATUS_TEAMS_TEST_INPUT: JSON.stringify(input),
    },
    timeout: 15000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  return JSON.parse(result.stdout);
}

testPowerShell('receives one page from the supplied chat and preserves the continuation link', () => {
  const result = run({ action: 'get', chatId: '19:test/chat?x=1@thread.v2', top: 25 });
  expect(result.calls).toEqual([{
    method: 'GET',
    uri: 'https://graph.microsoft.com/v1.0/chats/19%3Atest%2Fchat%3Fx%3D1%40thread.v2/messages?$top=25',
    body: null, contentType: null,
  }]);
  expect(result.result.value).toEqual([{ id: 'received-id', body: { content: 'hello' } }]);
  expect(result.result['@odata.nextLink']).toBe('https://graph.microsoft.com/v1.0/next-page');
});

testPowerShell('reads a specific message without a page query', () => {
  const result = run({ action: 'get', chatId: '19:example@thread.v2', messageId: 'message/one' });
  expect(result.calls[0].uri).toBe('https://graph.microsoft.com/v1.0/chats/19%3Aexample%40thread.v2/messages/message%2Fone');
});

testPowerShell('sends plain text with quotes, newlines and Unicode intact and returns the server ID', () => {
  const text = '[from sender reply #example] "quoted"\nCafé <tag> & 😀';
  const result = run({ action: 'send', chatId: '19:example@thread.v2', text });
  expect(result.calls).toHaveLength(1);
  expect(result.calls[0]).toMatchObject({
    method: 'POST',
    uri: 'https://graph.microsoft.com/v1.0/chats/19%3Aexample%40thread.v2/messages',
    contentType: 'application/json',
  });
  expect(JSON.parse(result.calls[0].body)).toEqual({ body: { contentType: 'text', content: text } });
  expect(result.result.id).toBe('sent-id');
});

testPowerShell.each(['get', 'send'])('%s refuses missing or shared authentication before any HTTP call', (action) => {
  for (const context of ['none', 'CurrentUser']) {
    const result = run({ action, chatId: 'example', text: 'hello', context });
    expect(result.calls).toEqual([]);
    expect(result.error).toMatch(/process-scoped/i);
  }
});

testPowerShell.each([0, 51])('rejects a page size of %i before any HTTP call', (top) => {
  const result = run({ action: 'get', chatId: 'example', top });
  expect(result.calls).toEqual([]);
  expect(result.error).toBeTruthy();
});

testPowerShell.each(['get', 'send'])('%s reports Graph failures without retrying', (action) => {
  const result = run({ action, chatId: 'example', text: 'hello', fail: true });
  expect(result.calls).toHaveLength(1);
  expect(result.error).toContain('Graph test failure: 403');
});
