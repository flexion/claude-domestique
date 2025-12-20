#!/usr/bin/env node

/**
 * memento: Session management hook
 *
 * Runs on:
 * - SessionStart: Display current session info
 * - UserPromptSubmit: Track interactions, prompt for session updates periodically
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Import shared utilities from session.js
const { parseBranchName } = require('../scripts/session.js');

// Default configuration
const DEFAULT_CONFIG = {
  updateInterval: 10, // Prompt for session update every N interactions
  stateFile: path.join(process.env.HOME || '/tmp', '.claude', 'memento-state.json'),
  configFile: '.claude/config.json'
};

// Load project config
function loadProjectConfig(cwd, configFile) {
  const configPath = path.join(cwd, configFile);
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const session = config.session || {};
      const result = {};
      // Only include defined values to avoid overwriting defaults
      if (session.updateInterval !== undefined) {
        result.updateInterval = session.updateInterval;
      }
      return result;
    }
  } catch (e) {
    // Ignore errors, use defaults
  }
  return {};
}

// Load state from file
function loadState(stateFile) {
  try {
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
  } catch (e) {
    // Ignore errors
  }
  return { count: 0 };
}

// Save state to file
function saveState(stateFile, state) {
  try {
    const dir = path.dirname(stateFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(stateFile, JSON.stringify(state));
  } catch (e) {
    // Ignore save errors
  }
}

function getCurrentBranch(cwd) {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: cwd,
    }).trim();
  } catch {
    return null;
  }
}

function readBranchMeta(cwd, branchMetaFile) {
  const metaPath = path.join(cwd, '.claude', 'branches', branchMetaFile);
  try {
    const content = fs.readFileSync(metaPath, 'utf-8');
    const meta = {};
    content.split('\n').forEach(line => {
      const match = line.match(/^(\w[\w-]*): (.+)$/);
      if (match) {
        meta[match[1]] = match[2];
      }
    });
    return meta;
  } catch {
    return null;
  }
}

function findSessionFile(cwd, branchInfo) {
  const sessionsDir = path.join(cwd, '.claude', 'sessions');

  // Check branch metadata first (authoritative)
  const meta = readBranchMeta(cwd, branchInfo.branchMetaFile);
  if (meta?.session) {
    const sessionPath = path.join(sessionsDir, meta.session);
    if (fs.existsSync(sessionPath)) {
      return { path: sessionPath, meta };
    }
  }

  // Fallback to guessed session path
  const sessionPath = path.join(sessionsDir, branchInfo.sessionFile);
  if (fs.existsSync(sessionPath)) {
    return { path: sessionPath, meta };
  }

  return null;
}

function extractNextSteps(content) {
  const match = content.match(/## Next Steps\n([\s\S]*?)(?=\n## |\n---|\Z|$)/);
  if (match) {
    return match[1].trim().split('\n').slice(0, 5).join('\n');
  }
  return null;
}

function extractLastLogEntry(content) {
  const match = content.match(/## Session Log\n([\s\S]*?)(?=\n## |\n---|\Z|$)/);
  if (match) {
    const logContent = match[1].trim();
    // Find the last non-empty line that looks like a log entry
    const lines = logContent.split('\n').filter(l => l.trim());
    if (lines.length > 0) {
      // Return the last meaningful entry (skip empty bullets)
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line && line !== '-' && line !== '*') {
          // Strip leading bullet/dash and trim
          return line.replace(/^[-*]\s*/, '').trim();
        }
      }
    }
  }
  return null;
}

function getSessionInfo(cwd) {
  const claudeDir = path.join(cwd, '.claude');
  if (!fs.existsSync(claudeDir)) {
    return null;
  }

  const branch = getCurrentBranch(cwd);
  if (!branch || branch === 'main' || branch === 'master') {
    return null;
  }

  const branchInfo = parseBranchName(branch);
  const session = findSessionFile(cwd, branchInfo);

  if (!session) {
    return null;
  }

  const content = fs.readFileSync(session.path, 'utf-8');
  const nextSteps = extractNextSteps(content);
  const lastLogEntry = extractLastLogEntry(content);
  const status = session.meta?.status || 'in-progress';

  return {
    branch,
    branchInfo,
    session,
    content,
    nextSteps,
    lastLogEntry,
    status
  };
}

function buildSessionSummary(info) {
  // Short display message for terminal
  const sessionName = path.basename(info.session.path, '.md');
  const displayMsg = `📍 Memento: ${sessionName}`;

  // Detailed context for Claude
  const contextLines = [];
  contextLines.push(`Branch: ${info.branch} | Status: ${info.status}${info.branchInfo.issueId ? ` | Issue: ${info.branchInfo.issueId}` : ''}`);

  // Left off context - prefer last log entry, fall back to next steps
  if (info.lastLogEntry) {
    contextLines.push(`Left off: ${info.lastLogEntry}`);
  } else if (info.nextSteps) {
    const firstStep = info.nextSteps.split('\n')[0].replace(/^[-*]\s*/, '').trim();
    if (firstStep) {
      contextLines.push(`Next: ${firstStep}`);
    }
  }

  return {
    displayMsg,
    context: contextLines.join('\n')
  };
}

function buildUpdatePrompt(info) {
  return `
---
**Session Update Reminder**

Consider updating the session file with recent progress:
- Session: ${info.session.path}
- Update the **Session Log** with what was accomplished
- Update **Files Changed** if new files were modified
- Revise **Next Steps** based on current state

Use the Edit tool to update the session file directly.
`;
}

/**
 * Process SessionStart hook
 */
function processSessionStart(input, config = {}) {
  const cwd = input.cwd || process.cwd();
  const projectConfig = loadProjectConfig(cwd, DEFAULT_CONFIG.configFile);
  const cfg = { ...DEFAULT_CONFIG, ...projectConfig, ...config };

  // Reset counter on session start
  const state = { count: 0 };
  saveState(cfg.stateFile, state);

  const info = getSessionInfo(cwd);
  const branch = getCurrentBranch(cwd);

  if (!info) {
    // No session - provide helpful context about what Memento does
    let displayMsg = '📍 Memento: No active session';
    if (branch && branch !== 'main' && branch !== 'master') {
      displayMsg = `📍 Memento: No session for branch \`${branch}\``;
    }

    return {
      systemMessage: displayMsg,
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: 'Sessions track work context so Claude can resume where you left off. Use `/session` to create one.'
      }
    };
  }

  const summary = buildSessionSummary(info);

  // Build additional context
  let additionalContext = summary.context;

  // Warn if session is complete - new work needs new branch/session
  if (info.status === 'complete') {
    additionalContext += `

⚠️ **Session Complete** - This session is marked complete.
New work requires:
1. Create a new branch from main: \`git checkout main && git pull && git checkout -b <branch>\`
2. Create a new session: \`/session create\`

Ask the user: "Is this a new task or continuing the completed work?"`;
  }

  return {
    systemMessage: summary.displayMsg,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext
    }
  };
}

/**
 * Process UserPromptSubmit hook
 */
function processUserPromptSubmit(input, config = {}) {
  const cwd = input.cwd || process.cwd();
  const projectConfig = loadProjectConfig(cwd, DEFAULT_CONFIG.configFile);
  const cfg = { ...DEFAULT_CONFIG, ...projectConfig, ...config };

  // Load and increment state
  const state = loadState(cfg.stateFile);
  state.count = (state.count + 1) % cfg.updateInterval;
  const shouldPromptUpdate = state.count === 0;
  saveState(cfg.stateFile, state);

  const info = getSessionInfo(cwd);
  const branch = getCurrentBranch(cwd);

  if (!info) {
    // No session - show status like other plugins
    let displayMsg = '📍 Memento: No session';
    if (branch && branch !== 'main' && branch !== 'master') {
      displayMsg = `📍 Memento: No session for \`${branch}\``;
    }
    return {
      systemMessage: displayMsg,
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: ''
      }
    };
  }

  // Show session name and update progress
  const sessionName = path.basename(info.session.path, '.md');
  const displayMsg = `📍 Memento: ${sessionName} (${state.count}/${cfg.updateInterval})`;

  // Always include session path and resumption guidance
  let additionalContext = `📂 Session: ${info.session.path}
For "what's next" or resumption queries: Read session file FIRST (not issue).`;

  if (shouldPromptUpdate) {
    additionalContext += '\n' + buildUpdatePrompt(info);
  }

  return {
    systemMessage: displayMsg,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext
    }
  };
}

/**
 * Route to appropriate handler based on event type
 */
function processHook(input, config = {}) {
  const eventName = input.hook_event_name || 'UserPromptSubmit';

  if (eventName === 'SessionStart') {
    return processSessionStart(input, config);
  }

  return processUserPromptSubmit(input, config);
}

/**
 * Parse CLI input with fallback for invalid JSON
 * @param {string} inputData - Raw input string
 * @param {string} defaultEvent - Default hook event name
 * @returns {object} Parsed input object
 */
function parseCliInput(inputData, defaultEvent = 'SessionStart') {
  try {
    return JSON.parse(inputData);
  } catch {
    return { cwd: process.cwd(), hook_event_name: defaultEvent };
  }
}

/**
 * Read all data from stdin
 * @returns {Promise<string>} All stdin data
 */
async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) {
    data += chunk;
  }
  return data;
}

// Main CLI wrapper
async function main() {
  const inputData = await readStdin();
  const input = parseCliInput(inputData, 'SessionStart');
  const output = processHook(input);
  console.log(JSON.stringify(output));
  process.exit(0);
}

// Export for testing
module.exports = {
  processHook,
  processSessionStart,
  processUserPromptSubmit,
  getSessionInfo,
  buildSessionSummary,
  buildUpdatePrompt,
  extractLastLogEntry,
  extractNextSteps,
  loadState,
  saveState,
  loadProjectConfig,
  parseCliInput,
  DEFAULT_CONFIG
};

// Run CLI if executed directly
if (require.main === module) {
  main().catch(e => {
    console.error(e.message);
    process.exit(1);
  });
}
