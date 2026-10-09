'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const SCRIPT = path.join(__dirname, '..', 'probe-skill.js');
let root;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'probe-skill-test-'));
  fs.mkdirSync(path.join(root, '.codex'));
  fs.writeFileSync(path.join(root, '.codex', 'auth.json'), '{}');
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

// Exercise CLI parsing and the complete install/run flow. Only the external
// commands and credential-home lookup are replaced; files and isolation are real.
function probe(options = [], cwd = root) {
  const commands = [];
  let output = '';
  let exitCode;
  const child = {
    execFileSync(command, args, settings) {
      commands.push({ command, args, settings });
      return '';
    },
    spawnSync(command, args, settings) {
      if (command === 'git') return { status: 1, stdout: '' };
      commands.push({ command, args, settings });
      return { status: 0, stdout: `${JSON.stringify({
        type: 'item.completed', item: { type: 'agent_message', text: 'probe response' },
      })}\n` };
    },
  };
  vm.runInNewContext(fs.readFileSync(SCRIPT, 'utf8'), {
    __dirname: path.dirname(SCRIPT),
    require(name) {
      if (name === 'child_process') return child;
      if (name === 'os') return { ...os, homedir: () => root, tmpdir: () => root };
      return require(name);
    },
    process: {
      argv: ['node', SCRIPT, '--host', 'codex', '--plugin', 'mantra', '--cwd', cwd, '--prompt', 'ping', ...options],
      env: process.env,
      stdout: { write: text => { output += text; } },
      stderr: { write() {} },
      exit: code => { exitCode = code; },
    },
  });
  return { commands, output, exitCode };
}

test.each([
  [[], '@openai/codex@0.147.0'],
  [['--codex-version', '0.161.0'], '@openai/codex@0.161.0'],
])('uses the selected Codex package for marketplace, plugin installation and execution: %s', (options, expectedPackage) => {
  const result = probe(options);
  expect(result.exitCode).toBe(0);
  expect(result.output).toContain('probe response');
  expect(result.commands.map(call => call.args.slice(0, 2))).toEqual([
    ['--yes', expectedPackage], ['--yes', expectedPackage], ['--yes', expectedPackage],
  ]);
  expect(result.commands.map(call => call.args.slice(2, 4))).toEqual([
    ['plugin', 'marketplace'], ['plugin', 'add'], ['exec', '--json'],
  ]);
  const execution = result.commands[2];
  expect(execution.args).toContain('read-only');
  expect(execution.args).not.toContain('--dangerously-bypass-hook-trust');
  expect(fs.existsSync(path.join(execution.settings.env.CODEX_HOME, 'config.toml'))).toBe(false);
});

test('explicit hook trust is scoped to the isolated home and workspace, retaining read-only model tools', () => {
  const workspace = path.join(root, 'workspace');
  const alias = path.join(root, 'workspace-link');
  fs.mkdirSync(workspace);
  fs.symlinkSync(workspace, alias, 'dir');
  const result = probe(['--codex-version', '0.161.0', '--codex-trust-hooks'], alias);
  const execution = result.commands[2];
  expect(result.exitCode).toBe(0);
  expect(execution.args).toContain('--dangerously-bypass-hook-trust');
  expect(execution.args).toContain('read-only');
  const config = fs.readFileSync(path.join(execution.settings.env.CODEX_HOME, 'config.toml'), 'utf8');
  expect(config).toContain('[features]\nhooks = true');
  expect(config).toContain(`[projects.${JSON.stringify(fs.realpathSync(workspace))}]\ntrust_level = "trusted"`);
  expect(fs.existsSync(path.join(root, '.codex', 'config.toml'))).toBe(false);
});
