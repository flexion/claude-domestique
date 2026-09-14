'use strict';

/**
 * Every hook registration is executed the way a host executes it, and asked for
 * the JSON response the host parses.
 *
 * The unit suites next to each hook call `processInput` in-process, which proves
 * the hook's logic and nothing about whether the operating system can start it.
 * The failure this guards against lives entirely in that gap: on Windows a bare
 * `.js` command is dispatched through the file association, which on a stock
 * Windows 11 is Windows Script Host. WSH chokes on the Node shebang at line 1
 * character 1, reports it in a dialog rather than on stderr, and the host waits
 * out its timeout having received nothing. Every unit test still passes.
 *
 * So this runs the manifest's own command string — the field the host reads —
 * through a shell, with `${CLAUDE_PLUGIN_ROOT}` substituted as the host
 * substitutes it. On Windows that shell is cmd.exe, which makes this the
 * regression test for the association bug rather than a description of it.
 *
 * Hooks are run against a scratch HOME and a scratch, non-git working directory,
 * because a hook that writes session state should write it there and not into
 * whoever is running the suite.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const PAYLOADS = {
  SessionStart: { source: 'startup' },
  UserPromptSubmit: { prompt: 'what should I do first?' },
  PreToolUse: { tool_name: 'Bash', tool_input: { command: 'git status' } },
  PostToolUse: { tool_name: 'TodoWrite', tool_input: {}, tool_response: {} },
};

function marketplacePlugins() {
  const marketplacePath = path.join(ROOT, '.claude-plugin', 'marketplace.json');
  return JSON.parse(fs.readFileSync(marketplacePath, 'utf8')).plugins;
}

// One case per (plugin, event, command) registration, named so a failure says
// which of the nine registrations broke without reading the manifest.
function registrations() {
  const cases = [];

  for (const entry of marketplacePlugins()) {
    const pluginRoot = path.join(ROOT, entry.name);
    const manifestPath = path.join(pluginRoot, 'hooks', 'hooks.json');
    if (!fs.existsSync(manifestPath)) continue;

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    for (const [event, matchers] of Object.entries(manifest.hooks || {})) {
      for (const matcher of matchers) {
        for (const hook of matcher.hooks || []) {
          if (hook.type !== 'command') continue;
          cases.push({
            name: `${entry.name} ${event} ${path.basename(hook.command.replace(/"\s*$/, ''))}`,
            pluginRoot,
            event,
            command: hook.command,
          });
        }
      }
    }
  }

  return cases;
}

const cases = registrations();
let scratch;

beforeAll(() => {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-invocation-'));
});

afterAll(() => {
  fs.rmSync(scratch, { recursive: true, force: true });
});

test('the marketplace registers hooks for this suite to run', () => {
  // A suite that silently enumerates nothing reports the same green as one that
  // checked every registration, which is the failure mode it exists to catch.
  expect(cases.length).toBeGreaterThan(0);
  expect(Object.keys(PAYLOADS)).toEqual(
    expect.arrayContaining([...new Set(cases.map(c => c.event))])
  );
});

describe.each(cases)('$name', ({ pluginRoot, event, command }) => {
  test('starts under node and answers with JSON', () => {
    // The host substitutes ${CLAUDE_PLUGIN_ROOT} itself and hands the result to a
    // shell. cmd.exe expands neither `${...}` nor `$...`, so the substitution has
    // to happen here for the spawned command to be what Windows would receive.
    const resolved = command.split('${CLAUDE_PLUGIN_ROOT}').join(pluginRoot);
    const payload = JSON.stringify({ hook_event_name: event, ...PAYLOADS[event] });

    const result = spawnSync(resolved, {
      cwd: scratch,
      encoding: 'utf8',
      env: {
        ...process.env,
        CLAUDE_PLUGIN_ROOT: pluginRoot,
        // os.homedir() reads HOME on POSIX and USERPROFILE on Windows, and the
        // hooks that provision or cache do so under one of them.
        HOME: scratch,
        USERPROFILE: scratch,
        CODEX_HOME: path.join(scratch, 'codex'),
        // comitatus orients only inside a herd; without this its hook exits 0
        // with no output, and an empty stdout is indistinguishable from the
        // silent failure this suite exists to detect.
        HERDR_ENV: '1',
      },
      input: payload,
      shell: true,
      timeout: 15000,
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
    expect(typeof JSON.parse(result.stdout)).toBe('object');
  });
});
