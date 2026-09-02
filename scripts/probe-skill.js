#!/usr/bin/env node
'use strict';

/**
 * Fire a one-shot agent run against a plugin loaded from source, and report which
 * skills it invoked and what it answered.
 *
 * A skill's description is its trigger, and whether it fires is not decidable by
 * reading it. Every other check in this repository is static; this one is the only
 * way to find out that a skill loses to a sibling on a realistic prompt.
 *
 * `claude plugin eval` is the first-party evaluator and does more than this —
 * a baseline arm, repeated runs, scoring, a CI threshold. It is gated behind
 * early access and refuses to run here, so this covers the near term and the
 * Codex half, which that tool does not reach at all. See
 * docs/plugin-evaluation.md before extending this: the useful additions are a
 * baseline arm and repeated runs, in that order.
 *
 * Fresh load per run, and no install step to forget:
 *
 *   claude  --plugin-dir <dir> reads the source directory directly.
 *   codex   has no equivalent flag, so this installs into a throwaway CODEX_HOME
 *           from the repository's own marketplace. Same effect, one more step.
 *
 * The run happens in a temporary working directory. Running it inside this
 * repository would put CLAUDE.md, AGENTS.md and the session's own files in front
 * of the model, and the question is whether the SKILL fires — not whether the
 * repository's instructions can make it fire.
 *
 *   node scripts/probe-skill.js --plugin modus --prompt "..." --expect modus:agent-work-item
 *   node scripts/probe-skill.js --host codex --plugin modus --prompt "..."
 *
 * Is it stuck? On the claude host the raw event stream goes to a file, announced
 * on stderr at startup, so `tail -f` on it shows tool calls as they happen. No new
 * line for a minute or two is the signal. Elapsed-versus-CPU is not: an agent run
 * spends almost all of its wall clock waiting on the model, so a working run and a
 * hung one both sit near zero percent.
 *
 * Exit 0 the expectation held, 1 it did not, 2 the run could not be made.
 */

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CODEX = '@openai/codex@0.147.0';
const REPO = path.resolve(__dirname, '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function die(message) {
  process.stderr.write(`probe-skill: ${message}\n`);
  process.exit(2);
}

/** Claude emits one JSON object per line; tool calls are content blocks. */
function claudeToolCalls(stdout) {
  const calls = [];
  let text = '';
  for (const line of stdout.split('\n')) {
    if (!line.trim()) continue;
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    if (event.type === 'result' && typeof event.result === 'string') text = event.result;
    const content = event.message && event.message.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block.type === 'text' && block.text) text = block.text;
      if (block.type !== 'tool_use') continue;
      const skill = block.input && block.input.skill;
      calls.push(skill ? `Skill:${skill}` : block.name);
    }
  }
  return { calls, text };
}

/**
 * Codex has no Skill tool. It invokes a skill by reading the SKILL.md itself, so
 * the signal is a command that opens `.../skills/<name>/SKILL.md`, not a named
 * tool call. Looking for a tool named after the skill finds nothing and reports a
 * skill that fired as a skill that did not — which is what this parser did first.
 */
function codexToolCalls(stdout) {
  const calls = [];
  const seen = new Set();
  let text = '';
  for (const line of stdout.split('\n')) {
    if (!line.trim()) continue;
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    const item = event.item;
    if (!item) continue;
    if (event.type === 'item.completed' && item.type === 'agent_message' && item.text) {
      text = item.text;
    }
    if (event.type !== 'item.started') continue;
    if (item.type !== 'command_execution' || typeof item.command !== 'string') {
      calls.push(item.type);
      continue;
    }
    const skill = item.command.match(/skills\/([a-z0-9-]+)\/SKILL\.md/i);
    const label = skill ? `Skill:${skill[1]}` : 'command_execution';
    if (skill && seen.has(label)) continue;
    seen.add(label);
    calls.push(label);
  }
  return { calls, text };
}

const PASS_OUTPUT = 'docs/passes/';

/**
 * A --cwd run writes into a real repository with permissions wide open, so git is
 * the only thing standing between a probe and the working tree. Commit first.
 *
 * Refuse rather than warn. A warning printed ahead of a four-minute run is read
 * after the damage, and exit 2 is the code for could-not-run per constraint 2 in
 * the modus README.
 */
function requireCleanTree(cwd) {
  const r = spawnSync('git', ['-C', cwd, 'status', '--porcelain'], { encoding: 'utf8' });
  if (r.status !== 0) return; // not a git repository, so nothing to protect
  // The pass directory is where a run is supposed to write, and fetching the item
  // into it is step 1 of the procedure. Checking it made the documented loop
  // impossible: the first real use of this guard refused the run that created
  // docs/passes/pass8/item.json a second earlier.
  const dirty = (r.stdout || '')
    .split('\n')
    .filter((l) => l.trim() && !l.slice(3).startsWith(PASS_OUTPUT));
  if (!dirty.length) return;
  const shown = dirty.slice(0, 10).map((l) => `  ${l}`).join('\n');
  const more = dirty.length > 10 ? `\n  ... and ${dirty.length - 10} more` : '';
  die(`--cwd ${cwd} has uncommitted changes outside ${PASS_OUTPUT} and this run `
    + `writes into it with permissions open.\nCommit or stash first — git is what `
    + `protects the tree.\n${shown}${more}`);
}

/** pluginDir null runs the baseline arm: same prompt, same cwd, no plugin. */
function runClaude(pluginDir, prompt, cwd) {
  const args = pluginDir ? ['--plugin-dir', pluginDir] : [];
  // --strict-mcp-config with no --mcp-config means no MCP servers at all. Without
  // it the run inherits ~/.claude, and a probe here booted n8n-mcp, @azure/mcp and
  // chrome-devtools-mcp; two of them resolve @latest from the npm registry on every
  // run. That run sat sleeping on a socket past twenty minutes with 25 seconds of
  // CPU and produced nothing.
  //
  // Speed is the smaller half. The plugin under test is supposed to be the only
  // thing added, and inherited MCP servers hand the agent dozens of unrelated
  // tools, so the probe measures the developer's machine as much as the skill. The
  // codex arm below already guards against exactly this by carrying auth.json and
  // deliberately not config.toml; this is the missing half of that pairing.
  //
  // Permissions are open because the skills under test cannot finish otherwise.
  // agent-work-item step 7 lints a boundary file, and you cannot lint a file you
  // were not allowed to write; step 9b writes the run out. Under inherited
  // permissions a real run got twelve Bash calls through and had Write denied,
  // which is the developer's allowlist showing through rather than a property of
  // the harness. That run could never have reached step 7.
  //
  // What protects the working tree is git, not the permission system. See
  // requireCleanTree: a --cwd run refuses to start against uncommitted work.
  //
  // The child's stdout goes straight to a file descriptor, so the OS writes each
  // event as it arrives. Buffering it in this process instead — which is what
  // spawnSync does by default — means nothing is observable until the run exits,
  // and a run in progress is indistinguishable from a hung one.
  //
  // That is not hypothetical. A probe sat for nineteen minutes and the only reason
  // it was diagnosable was its child processes; once those were gone the same
  // symptom had no signal at all. Elapsed-versus-CPU does not separate the two,
  // because an agent run is almost entirely wall-clock spent waiting on the model.
  const streamPath = arg('stream')
    || path.join(os.tmpdir(), `probe-stream-${process.pid}.jsonl`);
  process.stderr.write(`probe-skill: events streaming to ${streamPath}\n`);
  process.stderr.write(`probe-skill: watch with  tail -f ${streamPath}\n`);
  // Printed here rather than left in a document, because the moment you need it
  // you are looking at a stalled terminal and not at docs/. The child writes its
  // own session transcript under this directory as it goes; the newest file that
  // is not the caller's own session is the run's, and its tool calls say which
  // step it is on. docs/plugin-evaluation.md has the parse.
  process.stderr.write('probe-skill: session transcripts in '
    + `${path.join(os.homedir(), '.claude', 'projects', cwd.replace(/[/.]/g, '-'))}\n`);
  const fd = fs.openSync(streamPath, 'w');
  const r = spawnSync('claude', [
    ...args,
    '--strict-mcp-config',
    '--permission-mode', 'bypassPermissions',
    '--output-format', 'stream-json',
    '--verbose',
    '-p', prompt,
  ], { cwd, stdio: ['ignore', fd, 'inherit'] });
  fs.closeSync(fd);
  if (r.error) die(`could not run claude: ${r.error.message}`);
  return claudeToolCalls(fs.readFileSync(streamPath, 'utf8'));
}

function runCodex(pluginName, prompt, cwd) {
  // A throwaway home is what makes the install cheap to repeat and impossible to
  // stale: nothing survives between runs.
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'probe-codex-'));
  const env = { ...process.env, CODEX_HOME: home };
  // Credentials live in CODEX_HOME, so a fresh one is unauthenticated and the run
  // dies on a 401 before reaching the model. Carry the auth file across and
  // nothing else: config.toml stays behind so the probe is not shaped by whatever
  // the developer has configured locally.
  const auth = path.join(os.homedir(), '.codex', 'auth.json');
  if (!fs.existsSync(auth)) die(`no ${auth}; run codex once to authenticate first`);
  fs.copyFileSync(auth, path.join(home, 'auth.json'));
  const marketplace = require(path.join(REPO, '.claude-plugin', 'marketplace.json')).name;
  try {
    execFileSync('npx', ['--yes', CODEX, 'plugin', 'marketplace', 'add', REPO], { env, stdio: 'ignore' });
    execFileSync('npx', ['--yes', CODEX, 'plugin', 'add', `${pluginName}@${marketplace}`], { env, stdio: 'ignore' });
  } catch (err) {
    die(`could not install ${pluginName} into a throwaway CODEX_HOME: ${err.message}`);
  }
  // --skip-git-repo-check: the probe deliberately runs in a bare temp directory,
  // and codex refuses an untrusted non-repo without it.
  // input '': codex exec reads the positional prompt AND waits on stdin, so an
  // open stdin hangs the run until it is killed.
  const r = spawnSync('npx', [
    '--yes', CODEX, 'exec', '--json', '--sandbox', 'read-only', '--skip-git-repo-check', prompt,
  ], {
    cwd, env, encoding: 'utf8', input: '', maxBuffer: 64 * 1024 * 1024,
  });
  if (r.error) die(`could not run codex: ${r.error.message}`);
  return codexToolCalls(r.stdout || '');
}

function main() {
  const host = arg('host', 'claude');
  const plugin = arg('plugin');
  const prompt = arg('prompt');
  const expect = arg('expect');
  if (!plugin || !prompt) die('usage: --plugin <name-or-dir> --prompt <text> [--host claude|codex] [--expect <skill>] [--stream <path>]');

  const pluginDir = path.resolve(REPO, plugin);
  if (!fs.existsSync(path.join(pluginDir, '.claude-plugin', 'plugin.json'))) {
    die(`${pluginDir} has no .claude-plugin/plugin.json`);
  }
  const pluginName = path.basename(pluginDir);

  // Default is a bare temp directory: inside a real repository the agent reads
  // CLAUDE.md and everything else, and a skill that fires there has not been shown
  // to fire on its own. But the neutral directory also has nothing to read, so the
  // step that matters — find what the item does not say — cannot run. Use --cwd to
  // point at a real repository when testing the procedure rather than the trigger.
  const cwd = arg('cwd') ? path.resolve(arg('cwd')) : fs.mkdtempSync(path.join(os.tmpdir(), 'probe-cwd-'));
  if (!fs.existsSync(cwd)) die(`--cwd ${cwd} does not exist`);
  if (arg('cwd')) requireCleanTree(cwd);
  const { calls, text } = host === 'codex'
    ? runCodex(pluginName, prompt, cwd)
    : runClaude(pluginDir, prompt, cwd);

  process.stdout.write(`host:   ${host}\nplugin: ${pluginDir}\nprompt: ${prompt}\n\n`);
  process.stdout.write(calls.length ? `invoked:\n${calls.map((c) => `  ${c}`).join('\n')}\n` : 'invoked: nothing\n');

  // Whether it fired is one bit. Whether the answer is any good is the reason for
  // running it at all, so the response is printed rather than summarised.
  const full = process.argv.includes('--full');
  const show = (t) => (full || !t ? t : t.slice(0, 2000)) || '(none captured)';
  process.stdout.write(`\n--- with plugin ---\n${show(text)}\n`);
  if (!full && text.length > 2000) process.stdout.write(`\n[truncated, ${text.length} chars; --full for all]\n`);

  // Firing is an indicator, not a result. A run that invokes the skill and then
  // says what the model would have said anyway has demonstrated nothing, and that
  // is invisible from the with-arm alone. Claude only: codex has no way to load a
  // plugin per-invocation, so its baseline would differ in more than the plugin.
  if (process.argv.includes('--baseline')) {
    if (host === 'codex') die('--baseline is claude-only; codex installs per-home, so the arms would not be comparable');
    const base = runClaude(null, prompt, cwd);
    process.stdout.write(`\n--- without plugin (baseline) ---\n${show(base.text)}\n`);
    if (!full && base.text.length > 2000) process.stdout.write(`\n[truncated, ${base.text.length} chars; --full for all]\n`);
    process.stdout.write('\nRead both. The delta is the result; the invocation above is only the indicator.\n');
  }

  if (!expect) return 0;
  const fired = calls.some((c) => c.includes(expect));
  process.stdout.write(`\nexpected ${expect}: ${fired ? 'FIRED' : 'DID NOT FIRE'}\n`);
  return fired ? 0 : 1;
}

process.exit(main());
