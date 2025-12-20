#!/usr/bin/env node

/**
 * memento: Minimal session hook
 * 
 * - Creates session file at git root if missing
 * - Tracks interactions, reminds to update periodically
 * - Hands off to skill for session management
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(process.env.HOME || '/tmp', '.claude', 'memento-state.json');
const UPDATE_INTERVAL = 10;

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

function loadCount() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')).count || 0; }
  catch { return 0; }
}

function saveCount(count) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify({ count }));
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
  const isStart = event === 'SessionStart';
  
  if (!gitRoot || !branch || branch === 'main' || branch === 'master') {
    return { systemMessage: '', hookSpecificOutput: { hookEventName: event, additionalContext: '' } };
  }
  
  const sessionPath = getSessionPath(gitRoot, branch);
  const isNew = !fs.existsSync(sessionPath);
  
  if (isNew) createSession(sessionPath, branch);
  
  // Track interactions
  let count = isStart ? 0 : (loadCount() + 1) % UPDATE_INTERVAL;
  saveCount(count);
  
  const sessionName = path.basename(sessionPath, '.md');
  const msg = isNew 
    ? `📍 Memento: Created session for \`${branch}\``
    : `📍 Memento: ${sessionName}` + (isStart ? '' : ` (${count}/${UPDATE_INTERVAL})`);
  
  let context = `📂 Session: ${sessionPath}`;
  if (isNew) {
    context += '\nNew session created. Update Goal and Next Steps.';
  } else if (!isStart) {
    context += '\nFor resumption: Read session file FIRST.';
    if (count === 0) {
      context += '\n\n**Update Reminder**: Run `/memento:session update` to log progress.';
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

module.exports = { processHook, getBranch, getGitRoot, getSessionPath, createSession, loadCount, saveCount };

if (require.main === module) main().catch(() => process.exit(1));
