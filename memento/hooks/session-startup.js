#!/usr/bin/env node

/**
 * memento: Minimal session hook
 *
 * - Creates session file at git root if missing
 * - Detects branch switches
 * - Status line shows session state (NEW, SWITCHED, or normal)
 * - Warns when rules are outdated
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PLUGIN_ROOT = path.join(__dirname, '..');
const PLUGIN_RULES_DIR = path.join(PLUGIN_ROOT, 'rules');
const PLUGIN_CONTEXT_DIR = path.join(PLUGIN_ROOT, 'context');
const PLUGIN_TEMPLATES_DIR = path.join(PLUGIN_ROOT, 'templates');

const STATE_FILE = path.join(process.env.HOME || '/tmp', '.claude', 'memento-state.json');

function getBranch(cwd) {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], cwd
    }).trim();
  } catch { return null; }
}

function getGitRoot(cwd) {
  try {
    return execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], cwd
    }).trim();
  } catch { return null; }
}

function getSessionPath(gitRoot, branch) {
  return path.join(gitRoot, '.claude', 'sessions', `${branch.replace(/\//g, '-')}.md`);
}

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return {}; }
}

function saveState(state) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch {}
}

/**
 * Compute MD5 hash of file content
 */
function computeFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('md5').update(content).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Compute combined hash for multiple files
 */
function computeContentHash(dir, files) {
  const hashes = [];
  for (const file of files.sort()) {
    try {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      const hash = crypto.createHash('md5').update(content).digest('hex');
      hashes.push(`${file}:${hash}`);
    } catch {
      // Skip unreadable files
    }
  }
  return crypto.createHash('md5').update(hashes.join('\n')).digest('hex');
}

/**
 * Check if project rules/context/templates are outdated compared to plugin
 */
function checkVersionStatus(gitRoot) {
  const versionFile = path.join(gitRoot, '.claude', 'rules', '.memento-version.json');

  // No version file = not initialized
  if (!fs.existsSync(versionFile)) {
    // Check if .claude/sessions exists (legacy setup without init)
    const sessionsDir = path.join(gitRoot, '.claude', 'sessions');
    if (fs.existsSync(sessionsDir)) {
      return { status: 'not-initialized', hasLegacy: true };
    }
    return { status: 'not-initialized', hasLegacy: false };
  }

  try {
    const versionData = JSON.parse(fs.readFileSync(versionFile, 'utf8'));

    // Check rules hash (supports both old contentHash and new rulesHash)
    const storedRulesHash = versionData.rulesHash || versionData.contentHash;
    if (storedRulesHash && fs.existsSync(PLUGIN_RULES_DIR)) {
      const pluginFiles = fs.readdirSync(PLUGIN_RULES_DIR).filter(f => f.endsWith('.md'));
      if (pluginFiles.length > 0) {
        const currentHash = computeContentHash(PLUGIN_RULES_DIR, pluginFiles);
        if (currentHash !== storedRulesHash) {
          return {
            status: 'outdated',
            projectVersion: versionData.version,
            pluginVersion: require(path.join(PLUGIN_ROOT, 'package.json')).version
          };
        }
      }
    }

    // Check context hash
    if (versionData.contextHash && fs.existsSync(PLUGIN_CONTEXT_DIR)) {
      const pluginFiles = fs.readdirSync(PLUGIN_CONTEXT_DIR).filter(f => f.endsWith('.md'));
      if (pluginFiles.length > 0) {
        const currentHash = computeContentHash(PLUGIN_CONTEXT_DIR, pluginFiles);
        if (currentHash !== versionData.contextHash) {
          return {
            status: 'outdated',
            projectVersion: versionData.version,
            pluginVersion: require(path.join(PLUGIN_ROOT, 'package.json')).version
          };
        }
      }
    }

    // Check templates hash
    if (versionData.templatesHash && fs.existsSync(PLUGIN_TEMPLATES_DIR)) {
      const pluginFiles = fs.readdirSync(PLUGIN_TEMPLATES_DIR).filter(f => f.endsWith('.md'));
      if (pluginFiles.length > 0) {
        const currentHash = computeContentHash(PLUGIN_TEMPLATES_DIR, pluginFiles);
        if (currentHash !== versionData.templatesHash) {
          return {
            status: 'outdated',
            projectVersion: versionData.version,
            pluginVersion: require(path.join(PLUGIN_ROOT, 'package.json')).version
          };
        }
      }
    }

    return { status: 'current' };
  } catch {
    return { status: 'error' };
  }
}

function createSession(sessionPath, branch) {
  const dir = path.dirname(sessionPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const type = branch.match(/^(?:issue\/)?(feature|fix|chore)/)?.[1] || 'unknown';
  const desc = branch.replace(/^(?:issue\/)?(feature|fix|chore)[-\/]/, '').replace(/^\d+[-\/]/, '');
  const today = new Date().toISOString().split('T')[0];

  fs.writeFileSync(sessionPath, `# Session: ${desc}

## Details
- **Branch**: ${branch}
- **Type**: ${type}
- **Created**: ${today}
- **Status**: in-progress

## Goal
[Describe the objective]

## Session Log
- ${today}: Session created

## Next Steps
1. [First task]
`);
}

function processHook(input) {
  const cwd = input.cwd || process.cwd();
  const gitRoot = getGitRoot(cwd);
  const branch = getBranch(cwd);
  const event = input.hook_event_name || 'SessionStart';

  if (!gitRoot || !branch) {
    return { systemMessage: '📍 Memento: No session (not a git repo)', hookSpecificOutput: { hookEventName: event, additionalContext: '' } };
  }

  if (branch === 'main' || branch === 'master') {
    return { systemMessage: `📍 Memento: No session (${branch})`, hookSpecificOutput: { hookEventName: event, additionalContext: '' } };
  }

  const sessionPath = getSessionPath(gitRoot, branch);
  const sessionName = path.basename(sessionPath);
  const isNew = !fs.existsSync(sessionPath);

  // Load state and detect branch switch
  const state = loadState();
  const previousBranch = state.branch;
  const switched = previousBranch && previousBranch !== branch;

  // Save current branch
  saveState({ branch });

  // Create session if missing
  if (isNew) createSession(sessionPath, branch);

  // Status line format
  let msg;
  if (isNew) {
    msg = `📍 Memento: NEW → ${sessionName}`;
  } else if (switched) {
    msg = `📍 Memento: SWITCHED → ${sessionName}`;
  } else {
    msg = `📍 Memento: ${sessionName}`;
  }

  // Additional context
  let context = `📂 Session: ${sessionPath}`;
  if (isNew) {
    context += '\nNew session created. Update Goal and Next Steps.';
  } else {
    context += '\nFor resumption: Read session file FIRST.';
  }
  context += '\nAfter responding: assess if work warrants session update (milestones, decisions, blockers).';

  // Check version status on SessionStart
  if (event === 'SessionStart') {
    const versionStatus = checkVersionStatus(gitRoot);
    if (versionStatus.status === 'not-initialized') {
      if (versionStatus.hasLegacy) {
        context += '\n⚠️ Memento rules not installed. Run /memento:init to set up native rules.';
      }
      // Don't warn if no legacy setup - user may not want memento
    } else if (versionStatus.status === 'outdated') {
      context += '\n⚠️ Memento rules outdated. Run /memento:init --force to update.';
    }
  }

  return {
    systemMessage: msg,
    hookSpecificOutput: { hookEventName: event, additionalContext: context }
  };
}

async function main() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  const input = data ? JSON.parse(data) : { cwd: process.cwd() };
  console.log(JSON.stringify(processHook(input)));
}

module.exports = {
  processHook,
  getBranch,
  getGitRoot,
  getSessionPath,
  createSession,
  loadState,
  saveState,
  checkVersionStatus,
  computeFileHash,
  computeContentHash
};

if (require.main === module) main().catch(() => process.exit(1));
