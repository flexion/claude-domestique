const fs = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

const skill = fs.readFileSync(path.resolve(__dirname, '../skills/teams/SKILL.md'), 'utf8');
const fixture = path.join(__dirname, 'fixtures/teams.ps1');
const hasPowerShell = spawnSync('pwsh', ['--version'], { encoding: 'utf8' }).status === 0;
const testPowerShell = hasPowerShell ? test : test.skip;

function example(heading) {
  const section = skill.split(`## ${heading}\n`)[1]?.split('\n## ')[0];
  const code = section?.match(/```powershell\n([\s\S]*?)```/)?.[1];
  if (!code) throw new Error(`Missing runnable Teams example: ${heading}`);
  return code;
}

function run(input) {
  const examples = Object.fromEntries(['Connect', 'Receive', 'Send', 'Read message', 'Next page', 'Disconnect']
    .map((heading) => [heading, example(heading)]));
  const result = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', fixture], {
    encoding: 'utf8',
    env: {
      ...process.env,
      COMITATUS_TEAMS_TEST_INPUT: JSON.stringify({ tenantId: 'example-tenant', chatId: '19:example@thread.v2', ...input, examples }),
    },
    timeout: 15000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  return JSON.parse(result.stdout);
}

testPowerShell('uses the installed module and process-scoped device sign-in, then disconnects', () => {
  const result = run({ actions: [] });
  expect(result.error).toBeNull();
  expect(result.imported).toBe('Microsoft.Graph.Authentication');
  expect(result.connection).toEqual({ tenantId: 'example-tenant', scopes: ['Chat.Read', 'ChatMessage.Send'], device: true, contextScope: 'Process' });
  expect(result.context).toBeNull();
  expect(result.disconnected).toBe(1);
});

testPowerShell('receives a page from the runtime chat with its continuation link intact', () => {
  const result = run({ actions: ['Receive'], chatId: '19:test/chat?x=1@thread.v2' });
  expect(result.error).toBeNull();
  expect(result.calls).toEqual([{
    method: 'GET', uri: 'https://graph.microsoft.com/v1.0/chats/19%3Atest%2Fchat%3Fx%3D1%40thread.v2/messages?$top=10',
    body: null, contentType: null,
  }]);
  expect(result.page.value).toEqual([{ id: 'received-id', body: { content: 'hello' } }]);
  expect(result.page['@odata.nextLink']).toBe('https://graph.microsoft.com/v1.0/next-page');
});

testPowerShell('sends plain text with quotes, newlines and Unicode intact and retains the server ID', () => {
  const text = '[from sender reply #example] "quoted"\nCafé <tag> & 😀';
  const result = run({ actions: ['Send'], text });
  expect(result.error).toBeNull();
  expect(result.calls).toHaveLength(1);
  expect(result.calls[0]).toMatchObject({ method: 'POST', uri: 'https://graph.microsoft.com/v1.0/chats/19%3Aexample%40thread.v2/messages', contentType: 'application/json' });
  expect(JSON.parse(result.calls[0].body)).toEqual({ body: { contentType: 'text', content: text } });
  expect(result.sent.id).toBe('sent-id');
});

testPowerShell('reads a known message ID as a path segment without a page query', () => {
  const result = run({ actions: ['Read message'], messageId: 'message/one' });
  expect(result.error).toBeNull();
  expect(result.calls[0].uri).toBe('https://graph.microsoft.com/v1.0/chats/19%3Aexample%40thread.v2/messages/message%2Fone');
});

testPowerShell('follows the continuation link returned by a page', () => {
  const result = run({ actions: ['Receive', 'Next page'] });
  expect(result.error).toBeNull();
  expect(result.calls.map((call) => call.uri)).toEqual([
    'https://graph.microsoft.com/v1.0/chats/19%3Aexample%40thread.v2/messages?$top=10',
    'https://graph.microsoft.com/v1.0/next-page',
  ]);
});

testPowerShell.each([['Receive', 'GET'], ['Send', 'POST']])('%s exposes Graph errors without a second request', (action, method) => {
  const result = run({ actions: [action], text: 'hello', failMethod: method });
  expect(result.calls).toHaveLength(1);
  expect(result.error).toContain('Graph test failure: 403');
});
