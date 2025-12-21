#!/usr/bin/env node

/**
 * memento: Minimal session hook
 *
 * - Creates session file at git root if missing
 * - Detects branch switches
 * - Status line shows session state (NEW, SWITCHED, or normal)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

module.exports = { processHook, getBranch, getGitRoot, getSessionPath, createSession, loadState, saveState };

if (require.main === module) main().catch(() => process.exit(1));
