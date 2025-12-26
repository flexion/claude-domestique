#!/usr/bin/env node
/**
 * memento: Checkpoint hook
 *
 * Triggers session update reminders on key events:
 * - PostToolUse: ExitPlanMode, EnterPlanMode, Task, TodoWrite
 * - PreToolUse: git commit
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================================
// Git Helpers
// ============================================================================

function getGitRoot(cwd) {
  try {
    return execSync('git rev-parse --show-toplevel', {
      cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch { return null; }
}

function getCurrentBranch(cwd) {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch { return null; }
}

// ============================================================================
// Session Helpers
// ============================================================================

function getSessionPath(gitRoot, branch) {
  if (!gitRoot || !branch) return null;
  const sanitized = branch.replace(/\//g, '-');
  return path.join(gitRoot, '.claude', 'sessions', `${sanitized}.md`);
}

function sessionExists(sessionPath) {
  return sessionPath && fs.existsSync(sessionPath);
}

// ============================================================================
// Checkpoint Logic
// ============================================================================

function buildCheckpointReminder(input) {
  const toolName = input.tool_name;
  const hookEvent = input.hook_event_name;
  const cwd = input.cwd || process.cwd();

  const gitRoot = getGitRoot(cwd);
  const branch = getCurrentBranch(cwd);
  const sessionPath = getSessionPath(gitRoot, branch);
  const hasSession = sessionExists(sessionPath);

  // Skip if on main/master (no session expected)
  if (branch === 'main' || branch === 'master') {
    return null;
  }

  let reminder = null;

  switch (toolName) {
    case 'ExitPlanMode':
      // Pre-implementation checkpoint
      reminder = hasSession
        ? '📝 **Pre-Implementation Checkpoint**: Update session Approach section with the approved plan before coding.'
        : '⚠️ **No session file found**. Create session before implementation.';
      break;

    case 'EnterPlanMode':
      // Track planning started
      reminder = '📝 Planning mode started. Session will capture the plan when approved.';
      break;

    case 'Task':
      // Check if significant subagent
      const subagentType = input.tool_input?.subagent_type || '';
      const significantAgents = ['Plan', 'Explore'];
      const isSignificant = significantAgents.some(a =>
        subagentType.toLowerCase().includes(a.toLowerCase())
      );

      if (isSignificant && hasSession) {
        reminder = `📝 ${subagentType} agent completed. Consider updating session with findings.`;
      }
      break;

    case 'TodoWrite':
      // Sync reminder
      if (hasSession) {
        reminder = '📝 Todos updated. Keep session Next Steps in sync.';
      }
      break;

    case 'Bash':
      // Pre-commit checkpoint (PreToolUse)
      if (hookEvent === 'PreToolUse') {
        const command = input.tool_input?.command || '';
        if (command.includes('git commit')) {
          reminder = hasSession
            ? '📝 **Pre-Commit Checkpoint**: Ensure session is updated before committing. Commit session + code together.'
            : '⚠️ **No session file found**. Consider creating one before commit.';
        }
      }
      break;
  }

  return reminder;
}

// ============================================================================
// Main
// ============================================================================

function main() {
  let inputData = '';

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { inputData += chunk; });
  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(inputData);
      const reminder = buildCheckpointReminder(input);

      const response = {};
      if (reminder) {
        response.additionalContext = `\n${reminder}`;
      }

      console.log(JSON.stringify(response));
    } catch (err) {
      // Silent failure - don't break the hook chain
      console.log(JSON.stringify({}));
    }
  });
}

main();
