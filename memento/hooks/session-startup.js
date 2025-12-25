#!/usr/bin/env node
/**
 * memento: Session persistence hook
 *
 * Delegates to shared hook handler with custom session file management.
 * Context injection via hooks - zero configuration required.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Use bundled shared module (for installed plugins) or workspace module (for development)
let shared;
try {
  shared = require('../lib/shared');
} catch {
  shared = require('../../shared');
}

const PLUGIN_ROOT = path.join(__dirname, '..');

// ============================================================================
// Git Helpers
// ============================================================================

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

// ============================================================================
// Session Management
// ============================================================================

function getSessionPath(gitRoot, branch) {
  return path.join(gitRoot, '.claude', 'sessions', `${branch.replace(/\//g, '-')}.md`);
}

function loadState() {
  return shared.loadState(shared.getStateFile('Memento'), {});
}

function saveState(state) {
  shared.saveState(shared.getStateFile('Memento'), state);
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

// ============================================================================
// Hook Callbacks
// ============================================================================

function onSessionStart(input, base) {
  const cwd = input.cwd || process.cwd();
  const gitRoot = getGitRoot(cwd);
  const branch = getBranch(cwd);

  if (!gitRoot || !branch) {
    return {
      statusLine: '📍 Memento: No session (not a git repo)',
      additionalContext: base.additionalContext
    };
  }

  if (branch === 'main' || branch === 'master') {
    return {
      statusLine: `📍 Memento: No session (${branch})`,
      additionalContext: base.additionalContext
    };
  }

  const sessionPath = getSessionPath(gitRoot, branch);
  const sessionName = path.basename(sessionPath);
  const isNew = !fs.existsSync(sessionPath);

  // Create session if missing
  if (isNew) createSession(sessionPath, branch);

  // Save current branch
  saveState({ branch });

  // Build status line
  let statusLine;
  if (isNew) {
    statusLine = `📍 Memento: NEW → ${sessionName}`;
  } else {
    statusLine = `📍 Memento: ${sessionName}`;
  }

  // Build context
  let context = base.additionalContext || '';
  context += `\n📂 Session: ${sessionPath}`;
  if (isNew) {
    context += '\nNew session created. Update Goal and Next Steps.';
  } else {
    context += '\nFor resumption: Read session file FIRST.';
  }
  context += '\nAfter responding: assess if work warrants session update (milestones, decisions, blockers).';

  return {
    statusLine,
    additionalContext: context,
    extra: { sessionPath, isNew }
  };
}

function onUserPromptSubmit(input, base) {
  const cwd = input.cwd || process.cwd();
  const gitRoot = getGitRoot(cwd);
  const branch = getBranch(cwd);

  if (!gitRoot || !branch || branch === 'main' || branch === 'master') {
    return null; // Use base behavior
  }

  const sessionPath = getSessionPath(gitRoot, branch);

  // Build context with session reminder
  let context = base.additionalContext || '';
  context += `\n📂 Session: ${sessionPath}`;
  context += '\nFor resumption: Read session file FIRST.';
  context += '\nAfter responding: assess if work warrants session update (milestones, decisions, blockers).';

  return {
    additionalContext: context,
    extra: { sessionPath }
  };
}

// ============================================================================
// Direct Processing (for testing)
// ============================================================================

function processHook(input) {
  const config = {
    pluginName: 'Memento',
    pluginRoot: PLUGIN_ROOT,
    onSessionStart,
    onUserPromptSubmit
  };
  return shared.processHook(config, input);
}

// ============================================================================
// Main Entry Point
// ============================================================================

if (require.main === module) {
  shared.runHook({
    pluginName: 'Memento',
    pluginRoot: PLUGIN_ROOT,
    onSessionStart,
    onUserPromptSubmit
  });
}

// ============================================================================
// Exports (for testing)
// ============================================================================

module.exports = {
  processHook,
  getBranch,
  getGitRoot,
  getSessionPath,
  createSession,
  loadState,
  saveState
};
