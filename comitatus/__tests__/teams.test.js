const fs = require('fs');
const os = require('os');
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

function frontmatterDescription() {
  return skill.match(/^---\n[\s\S]*?^description: (.+)$/m)[1];
}

function section(heading) {
  const text = skill.split(`## ${heading}\n`)[1]?.split('\n## ')[0];
  if (!text) throw new Error(`Missing Teams section: ${heading}`);
  return text;
}

function run(input) {
  const examples = Object.fromEntries(['Prerequisites', 'Connect', 'Receive', 'Send', 'Read message', 'Next page', 'Disconnect', 'Hold a conversation']
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

// #209: an agent saw an ~80-scope context dump and the context printed by
// Disconnect-MgGraph. Connect states only whether the two chat scopes are present.
testPowerShell('connect prints one line saying whether the chat scopes are granted', () => {
  const many = Array.from({ length: 80 }, (_, i) => `Scope${i}.Read`);
  const granted = run({ actions: [], grantedScopes: [...many, 'Chat.Read', 'ChatMessage.Send'] });
  expect(granted.connectOutput).toEqual(['ChatMessage.Send: True; Chat.Read: True']);
  const missing = run({ actions: [], grantedScopes: many });
  expect(missing.connectOutput).toEqual(['ChatMessage.Send: False; Chat.Read: False']);
});

testPowerShell('disconnect discards the context Disconnect-MgGraph emits', () => {
  const result = run({ actions: [] });
  expect(result.disconnected).toBe(1);
  expect(result.disconnectOutput).toEqual([]);
});

testPowerShell('prerequisites stop before sign-in when the module is missing and never install it', () => {
  const result = run({ actions: ['Send'], text: 'hello', moduleMissing: true });
  expect(result.error).toMatch(/Microsoft\.Graph\.Authentication is not installed/);
  expect(result.error).toMatch(/ask the user/i);
  expect(result.installAttempted).toBe(false);
  expect(result.connection).toBeNull();
  expect(result.calls).toEqual([]);
});

testPowerShell('prerequisites pass silently when the module is available', () => {
  const result = run({ actions: [] });
  expect(result.error).toBeNull();
  expect(result.installAttempted).toBe(false);
  expect(result.connection).not.toBeNull();
});

// #209: one-shot shells cannot keep a process open, and shell rules can forbid
// `$` and quotes in arguments. The script header carries IDs as literals and
// reads message text from a file, so `$`, quotes and Unicode survive.
testPowerShell('the one-script header sets the IDs and reads message text from a file intact', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'comitatus-teams-'));
  const file = path.join(dir, 'message.txt');
  // Trailing spaces, tabs and newlines are the user's text, not file noise.
  const text = 'Price is $5 for "it\'s" {x}\nCafé 😀 \t\n\n';
  fs.writeFileSync(file, text, 'utf8');
  const header = example('Run as one script')
    .replace("'<tenant ID>'", "'header-tenant'")
    .replace("'<decoded chat ID>'", "'19:header@thread.v2'")
    .replace("'<message file>'", `'${file.replace(/'/g, "''")}'`);
  const result = run({ actions: ['Send'], header });
  expect(result.error).toBeNull();
  expect(result.env).toEqual({ tenantId: 'header-tenant', chatId: '19:header@thread.v2' });
  expect(result.connection.tenantId).toBe('header-tenant');
  expect(result.calls[0].uri).toBe('https://graph.microsoft.com/v1.0/chats/19%3Aheader%40thread.v2/messages');
  expect(JSON.parse(result.calls[0].body).body.content).toBe(text);
});

// #209 live test: a preflight with a clear cause beats the SDK's access-denied
// error. Run against a real home directory: writable passes the ~/.mg check, and
// a read-only one stops before any network call or sign-in.
function codexPreflight(home) {
  return spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', example('Codex sandbox').split('\ntry { $null = [System.Net.Dns]')[0]], {
    encoding: 'utf8', env: { ...process.env, HOME: home }, timeout: 15000,
  });
}

testPowerShell('the Codex preflight stops with a clear cause when ~/.mg is not writable', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'comitatus-home-'));
  fs.mkdirSync(path.join(home, '.mg'));
  fs.chmodSync(path.join(home, '.mg'), 0o555);
  try {
    const denied = codexPreflight(home);
    expect(denied.status).not.toBe(0);
    expect(denied.stderr + denied.stdout).toMatch(/~\/\.mg is not writable/);
  } finally {
    fs.chmodSync(path.join(home, '.mg'), 0o755);
  }
  const ok = codexPreflight(home);
  expect(ok.status).toBe(0);
  expect(fs.readdirSync(path.join(home, '.mg'))).toEqual([]);
});

describe('discovery and routing guidance', () => {
  test('the description names the request and states that sends go through PowerShell', () => {
    const d = frontmatterDescription();
    expect(d).toMatch(/^Use when asked to send, post, read or reply in a Microsoft Teams chat or meeting chat/);
    expect(d).toContain('teams_send_chat_message');
    expect(d).toContain('ChatMessage.Send');
    expect(d).toMatch(/Sends go through `pwsh`/);
    expect(d).not.toMatch(/headless CLI/);
    expect(d).not.toMatch(/connector when it holds/);
  });

  // The user's direction (2026-11-02): the command line is how messages are sent.
  // The connector has not been granted ChatMessage.Send; it is for reads only
  // until the user says otherwise.
  test('sending is plainly the PowerShell route; the connector only reads', () => {
    expect(skill.split('\n## ')[1]).toMatch(/^Choose a route\n/);
    const route = section('Choose a route');
    expect(route).toMatch(/\*\*Send with PowerShell\.\*\*/);
    expect(route).toMatch(/Do not send through the connector's `teams_send_chat_message`/);
    for (const term of ['get_granted_scopes', 'teams_list_chats', 'read_resource', 'Chat.ReadBasic', 'Chat.ReadWrite', 'Chat.Read']) {
      expect(route).toContain(term);
    }
    // Verified live 2026-11-02: a page read works without a message ID.
    expect(route).toContain('teams:///chats/<chat ID>/messages');
    expect(route).toMatch(/skip items whose `messageType` is not\s+`message`/);
    expect(skill).not.toMatch(/only after the user confirms/);
    expect(skill).not.toMatch(/Send with `teams_send_chat_message`/);
  });

  test('inputs say where the tenant ID comes from and which links carry a chat ID', () => {
    const inputs = section('Inputs');
    expect(inputs).toMatch(/Entra/);
    expect(inputs).toContain('/l/chat/');
    expect(inputs).toContain('/meet/');
    expect(inputs).toContain('/l/chat/0/0');
    expect(inputs).toContain('/l/message/');
    expect(inputs).toContain('@thread.tacv2');
    expect(inputs).toMatch(/message link[^.]*tenantId=/);
    expect(inputs).toMatch(/%3A/);
    expect(inputs).toMatch(/%40/);
    expect(inputs).toContain('teams.microsoft.com');
    expect(inputs).toContain('teams.cloud.microsoft');
  });

  test('the one-script pattern runs non-interactively in the background and relays the device code', () => {
    const one = section('Run as one script');
    expect(one).toContain('pwsh -NoLogo -NoProfile -NonInteractive -File');
    expect(one).toMatch(/background/);
    expect(one).toMatch(/device/i);
    expect(one).toMatch(/finally/);
  });

  // #209 live test (ned): Teams wakes no idle agent; peers need a doorbell, and
  // the herdr and mail skills already define one.
  test('message handling says Teams wakes nobody and points to an existing doorbell', () => {
    const handling = section('Message handling');
    expect(handling).toMatch(/does not wake an idle agent/);
    expect(handling).toContain('comitatus:herdr');
    expect(handling).toContain('comitatus:mail');
    // 2.3.0 (#208): mail is on in every session and is the preferred doorbell.
    expect(handling.indexOf('comitatus:mail')).toBeLessThan(handling.indexOf('comitatus:herdr'));
  });

  // 2.3.0 (#208): agents are named by comitatus handle and alias, as
  // `[from <me> (<alias>) ...]`, from the `[comitatus] you are` session line.
  test('message handling names senders the way comitatus 2.3.0 does', () => {
    const handling = section('Message handling');
    expect(handling).toContain('[from <me> (<alias>) reply #<id>]');
    expect(handling).toContain('[comitatus] you are');
    expect(handling).toContain('[from <me> (<alias>) on behalf of <person> fyi #<id>]');
    expect(handling).not.toMatch(/\[from fox/);
  });

  test('message handling requires user-supplied text and labels third-party sends', () => {
    const handling = section('Message handling');
    expect(handling).toMatch(/text the user supplied/);
    expect(handling).toMatch(/message ID/);
    expect(handling).toMatch(/on behalf of/);
  });

  // #209 live test: Codex's workspace-write sandbox denied the SDK's
  // ~/.mg/mg.authrecord.json and blocks network by default (verified with
  // `codex sandbox`: write denied without the root, Graph unreachable without
  // network_access).
  test('the Codex sandbox section states the ~/.mg and network requirements', () => {
    const codex = section('Codex sandbox');
    expect(codex).toContain('~/.mg');
    expect(codex).toContain('writable_roots');
    expect(codex).toContain('network_access = true');
    expect(codex).toContain('--add-dir');
    expect(codex).toMatch(/mg\.authrecord\.json/);
    expect(codex).toMatch(/-NonInteractive/);
    // #209 live test: a `codex resume` relaunch without the flags kept the old sandbox.
    expect(codex).toMatch(/codex resume <session> --add-dir ~\/\.mg/);
    expect(codex).toMatch(/not writable/);
    expect(codex).toMatch(/no network/);
  });

  test('sign-in states the 120-second device-code window and what to do on timeout', () => {
    expect(section('Connect')).toMatch(/120 seconds/);
    expect(section('Connect')).toMatch(/timed out/);
  });

  test('inputs ask for a message link first, since it carries both IDs', () => {
    expect(section('Inputs')).toMatch(/Ask the user for a message link/);
  });

  test('prerequisites ask before installing the module', () => {
    const pre = section('Prerequisites');
    expect(pre).toContain('Get-Module -ListAvailable');
    expect(pre).toMatch(/Ask the user before/i);
    expect(pre).toContain('Install-Module Microsoft.Graph.Authentication');
  });
});

testPowerShell('receives a page from the runtime chat with its continuation link intact', () => {
  const result = run({ actions: ['Receive'], chatId: '19:test/chat?x=1@thread.v2' });
  expect(result.error).toBeNull();
  expect(result.calls).toEqual([{
    method: 'GET', uri: 'https://graph.microsoft.com/v1.0/chats/19%3Atest%2Fchat%3Fx%3D1%40thread.v2/messages?$top=10',
    body: null, contentType: null,
  }]);
  expect(result.page.value.map((m) => m.id)).toEqual(['received-id', 'event-id']);
  expect(result.page['@odata.nextLink']).toBe('https://graph.microsoft.com/v1.0/next-page');
});

// #209 live test: a depth-20 JSON dump of a page was unreadable in a
// conversation, and pages mix system events with messages. A multi-line body
// spread over several output lines and hid the newest message from `tail`.
testPowerShell('receive prints one line per message and skips system events', () => {
  const result = run({ actions: ['Receive'] });
  expect(result.error).toBeNull();
  expect(result.actionOutput).toEqual(['received-id | 2026-01-01T00:00:00Z | Peer | hello\\nsecond line']);
});

// #209 live test: one sign-in per script run costs the user a device code per
// turn. The conversation loop signs in once and serves request files.
testPowerShell('the conversation loop sends queued files, reads on request and stops', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'comitatus-teams-conv-'));
  const text = '[from a reply #c1] $x "q" \n';
  fs.writeFileSync(path.join(dir, '001.send.txt'), text, 'utf8');
  fs.writeFileSync(path.join(dir, 'read'), '');
  fs.writeFileSync(path.join(dir, 'stop'), '');
  const loop = example('Hold a conversation').replace("'<request folder>'", `'${dir.replace(/'/g, "''")}'`);
  const result = run({ actions: [], conversation: loop });
  expect(result.error).toBeNull();
  expect(result.calls.map((c) => c.method)).toEqual(['POST', 'GET']);
  expect(JSON.parse(result.calls[0].body).body.content).toBe(text);
  expect(result.conversationOutput).toEqual([
    'sent 001.send.txt sent-id',
    'received-id | 2026-01-01T00:00:00Z | Peer | hello\\nsecond line',
  ]);
  expect(fs.readdirSync(dir).sort()).toEqual(['stop']);
  expect(result.disconnected).toBe(1);
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
