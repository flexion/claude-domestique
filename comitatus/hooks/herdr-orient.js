#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const SKILL_DIR = path.join(PLUGIN_ROOT, 'skills', 'herdr');
const HERD_JS = path.join(SKILL_DIR, 'scripts', 'herd.js');
const EXCLUDE = new Set(['__tests__', 'node_modules']);

function buildOrientation(herdJsPath, { codexPlugin } = {}) {
  return [
    '# herdr (comitatus)',
    '',
    'You are running inside herdr, a terminal-native agent multiplexer.',
    'Invoke the `comitatus:herdr` skill for worktree / herd / pane / agent workflows.',
    '',
    'Prefer native `herdr` verbs by handle: `herdr agent prompt|read|get|wait <handle>`.',
    'The herd.js helper adds the composite verbs (each is self-contained and',
    'runs herdr itself - no shell variables):',
    '  status|members|wait|send|send-wait-read|agent|up',
    '',
    `    node ${herdJsPath} send jay "..." --reply`,
    '',
    'This path is STABLE across comitatus updates; allowlist it once with',
    '`/herd-setup` and always call it by this absolute path so the permission',
    'matcher can match it.',
    '',
    codexPlugin === true
      ? 'comitatus is installed as a Codex plugin, so codex agents in this herd load the same `herdr` skill from their own plugin install.'
      : codexPlugin === false
        ? 'comitatus is NOT installed as a Codex plugin, so codex agents in this herd cannot see the `herdr` skill. Install it there with `codex plugin add comitatus@claude-domestique`.'
        : 'Codex plugin status for comitatus is unknown.',
  ].join('\n');
}

function hashDir(dir) {
  const h = crypto.createHash('sha256');
  (function walk(d, rel) {
    const entries = fs.readdirSync(d, { withFileTypes: true })
      .sort((a, b) => (a.name < b.name ? -1 : 1));
    for (const e of entries) {
      if (EXCLUDE.has(e.name)) continue;
      const abs = path.join(d, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(abs, r);
      else {
        h.update(r);
        h.update('\0');
        h.update(fs.readFileSync(abs));
        h.update('\0');
      }
    }
  })(dir, '');
  return h.digest('hex');
}

function copyDir(src, dest) {
  fs.cpSync(src, dest, {
    recursive: true,
    filter: (s) => !EXCLUDE.has(path.basename(s)),
  });
}

const HASH_FILE = '.comitatus-hash';
let tmpCounter = 0;

function readHash(hashFile) {
  try {
    return fs.readFileSync(hashFile, 'utf8').trim();
  } catch {
    return null;
  }
}

function provisionInto({ skillDir, home }) {
  const skillsDir = path.join(home, 'skills');
  const destSkills = path.join(skillsDir, 'herdr');
  const srcHash = hashDir(skillDir);

  const curHash = readHash(path.join(destSkills, HASH_FILE));
  if (curHash === srcHash) {
    return { provisioned: false, reason: 'current' };
  }

  // Stage the complete tree (skill files + hash marker) in a sibling temp dir on
  // the same filesystem, then swap it into place with a single rename. A reader
  // therefore never observes a half-copied skill dir: it sees either the previous
  // complete copy or the new one, never a partial one. Concurrent provisioners
  // stage to distinct temp dirs (keyed on pid) and converge, since they copy
  // byte-identical content.
  fs.mkdirSync(skillsDir, { recursive: true });
  tmpCounter += 1;
  const tmpDir = path.join(skillsDir, `.herdr.tmp.${process.pid}.${tmpCounter}`);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  try {
    copyDir(skillDir, tmpDir);
    fs.writeFileSync(path.join(tmpDir, HASH_FILE), srcHash + '\n');
    try {
      fs.rmSync(destSkills, { recursive: true, force: true });
      fs.renameSync(tmpDir, destSkills);
    } catch (e) {
      // A concurrent provisioner may have recreated destSkills between our rm
      // and rename. If the now-in-place copy already matches our content, the
      // other writer won with identical files - accept it. Otherwise re-throw.
      if (readHash(path.join(destSkills, HASH_FILE)) !== srcHash) throw e;
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  return { provisioned: true, reason: curHash ? 'stale' : 'missing' };
}

function realpath(p) {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

// True when this very copy of comitatus is the one Codex installed, i.e. we are
// running out of a Codex plugin cache. Derived from our own location rather than
// an environment variable: both hosts export CLAUDE_PLUGIN_ROOT (Codex does so
// deliberately, for compatibility), so no env var distinguishes them. Both sides
// are realpath'd because __dirname is already resolved while $CODEX_HOME may not
// be (on macOS /var is a symlink to /private/var).
function isCodexInstall({ pluginRoot, codexHome }) {
  if (!pluginRoot || !codexHome) return false;
  const cacheRoot = realpath(path.resolve(codexHome, 'plugins', 'cache'));
  const root = realpath(pluginRoot);
  return root === cacheRoot || root.startsWith(cacheRoot + path.sep);
}

// Whether comitatus is installed as a Codex plugin. Reported to the agent so it
// knows if codex peers in the herd can see the herdr skill. Nothing is copied
// into the Codex home: a Codex agent gets the skill by installing the plugin.
function codexPluginInstalled({ codexHome }) {
  const cacheRoot = path.join(codexHome, 'plugins', 'cache');
  let marketplaces;
  try {
    marketplaces = fs.readdirSync(cacheRoot, { withFileTypes: true });
  } catch {
    return false;
  }
  return marketplaces.some(entry =>
    entry.isDirectory() && fs.existsSync(path.join(cacheRoot, entry.name, 'comitatus'))
  );
}

function provisionStable({ skillDir, home }) {
  fs.mkdirSync(home, { recursive: true });
  return provisionInto({ skillDir, home });
}

function stableHome(homedir) { return path.join(homedir, '.claude', 'comitatus'); }
function stableHerdJs(home) { return path.join(home, 'skills', 'herdr', 'scripts', 'herd.js'); }

function processSessionStart({ env, skillDir, herdJsPath, codexHome, stableHome: stableHomeDir, directCodex = false }) {
  if (env.HERDR_ENV !== '1') return null;

  // Report-only: comitatus never writes into the Codex home. A codex agent gets
  // the herdr skill by installing the plugin, not by having it copied there.
  let codexPlugin;
  try {
    codexPlugin = codexPluginInstalled({ codexHome });
  } catch {
    codexPlugin = undefined;
  }

  // Provision a stable, version-independent copy and prefer its path; fall back
  // to the plugin's own copy (whose path moves on each comitatus update) if that
  // fails. Skipped when we are the Codex-installed copy: there is no Claude
  // permission matcher to keep stable in that case.
  let helperPath = herdJsPath;
  if (stableHomeDir && !directCodex) {
    try {
      provisionStable({ skillDir, home: stableHomeDir });
      helperPath = stableHerdJs(stableHomeDir);
    } catch { /* keep fallback */ }
  }

  return {
    systemMessage: `📍 Comitatus: herdr${codexPlugin === undefined ? '' : codexPlugin ? ' (codex: installed)' : ' (codex: not installed)'}`,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: buildOrientation(helperPath, { codexPlugin }),
    },
  };
}

async function readStdin() {
  let s = '';
  try {
    for await (const chunk of process.stdin) s += chunk;
  } catch {
    /* ignore */
  }
  return s;
}

function resolveCodexHome(env, homedir) {
  return env.CODEX_HOME ? path.resolve(env.CODEX_HOME) : path.join(homedir, '.codex');
}

async function main() {
  await readStdin(); // drain stdin; input is unused
  const codexHome = resolveCodexHome(process.env, os.homedir());
  const result = processSessionStart({
    env: process.env,
    skillDir: SKILL_DIR,
    herdJsPath: HERD_JS,
    codexHome,
    stableHome: stableHome(os.homedir()),
    directCodex: isCodexInstall({ pluginRoot: PLUGIN_ROOT, codexHome }),
  });
  if (result) console.log(JSON.stringify(result));
}

if (require.main === module) main();

module.exports = {
  buildOrientation,
  hashDir,
  copyDir,
  provisionInto,
  provisionStable,
  isCodexInstall,
  codexPluginInstalled,
  resolveCodexHome,
  stableHome,
  stableHerdJs,
  processSessionStart,
  EXCLUDE,
  PLUGIN_ROOT,
  SKILL_DIR,
  HERD_JS,
};
