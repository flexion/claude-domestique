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

function buildOrientation(herdJsPath) {
  return [
    '# herdr (comitatus)',
    '',
    'You are running inside herdr, a terminal-native agent multiplexer.',
    'Invoke the `comitatus:herdr` skill for worktree / herd / pane / agent workflows.',
    `Roster/state helper: \`node ${herdJsPath} <pane|members|status|field> ...\` (reads herdr --json on stdin).`,
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

function provisionCodex({ skillDir, codexHome }) {
  if (!fs.existsSync(codexHome)) {
    return { provisioned: false, reason: 'codex-absent' };
  }
  const skillsDir = path.join(codexHome, 'skills');
  const destSkills = path.join(skillsDir, 'herdr');
  const srcHash = hashDir(skillDir);

  const curHash = readHash(path.join(destSkills, HASH_FILE));
  if (curHash === srcHash) {
    return { provisioned: false, reason: 'current' };
  }

  // Stage the complete tree (skill files + hash marker) in a sibling temp dir on
  // the same filesystem, then swap it into place with a single rename. A codex
  // reader therefore never observes a half-copied skill dir: it sees either the
  // previous complete copy or the new one, never a partial one. Concurrent
  // provisioners stage to distinct temp dirs (keyed on pid) and converge, since
  // they copy byte-identical content.
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

function processSessionStart({ env, skillDir, herdJsPath, codexHome }) {
  if (env.HERDR_ENV !== '1') return null;

  let provision = { provisioned: false, reason: 'skipped' };
  try {
    provision = provisionCodex({ skillDir, codexHome });
  } catch (e) {
    provision = { provisioned: false, reason: 'error', error: String((e && e.message) || e) };
  }

  let additionalContext = buildOrientation(herdJsPath);
  if (provision.provisioned) {
    additionalContext += `\n\nProvisioned the herdr skill for codex at ${path.join(codexHome, 'skills', 'herdr')}.`;
  }

  return {
    systemMessage: `📍 comitatus: herdr${provision.provisioned ? ' (codex synced)' : ''}`,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext,
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

async function main() {
  await readStdin(); // drain stdin; input is unused
  const result = processSessionStart({
    env: process.env,
    skillDir: SKILL_DIR,
    herdJsPath: HERD_JS,
    codexHome: path.join(os.homedir(), '.codex'),
  });
  if (result) console.log(JSON.stringify(result));
}

if (require.main === module) main();

module.exports = {
  buildOrientation,
  hashDir,
  copyDir,
  provisionCodex,
  processSessionStart,
  EXCLUDE,
  PLUGIN_ROOT,
  SKILL_DIR,
  HERD_JS,
};
