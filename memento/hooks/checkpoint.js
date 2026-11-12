#!/usr/bin/env node
/**
 * memento: Checkpoint hook
 *
 * Triggers session update reminders on key events:
 * - PostToolUse: ExitPlanMode, EnterPlanMode, Task, TodoWrite
 * - PreToolUse: git commit
 */

const fs = require('fs');
const { execSync } = require('child_process');

const paths = require('../lib/paths');

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
  return paths.resolveSession(gitRoot, branch).sessionPath;
}

function sessionExists(sessionPath) {
  return sessionPath && fs.existsSync(sessionPath);
}

function validateSessionFile(sessionPath) {
  if (!sessionPath || !fs.existsSync(sessionPath)) {
    return { valid: false, issue: 'missing' };
  }

  const content = fs.readFileSync(sessionPath, 'utf8');

  // Common placeholder patterns from session templates
  const placeholders = [
    '[Describe the objective',
    '[First task',
    '[Record key architectural',
    '[What did you learn',
    'Goal\n\n[',
    'Next Steps\n\n1. ['
  ];

  for (const pattern of placeholders) {
    if (content.includes(pattern)) {
      return { valid: false, issue: 'placeholders', pattern };
    }
  }

  return { valid: true };
}

// ============================================================================
// Command Inspection
// ============================================================================

// A command position: the start of the text, or just after a separator that
// ends the previous command. Optional leading environment assignments, an
// optional path, `git`, its global options, then the `commit` subcommand.
// Backslashes are allowed among the spaces so a line continuation still reads
// as one command.
const GIT_COMMIT = /(?:^|[;&|(\n])[\s\\]*(?:\w+=\S*[\s\\]+)*(?:[\w./-]*\/)?git[\s\\]+(?:-[cC][\s\\]+\S+[\s\\]+|-\S+[\s\\]+)*commit(?![\w-])/;

// Quoted text is an argument, so a separator inside it starts no command. This
// matters for the very case the change was about: a grep alternation,
// `grep -n "a\|git commit\|b" file`, puts a `|` in front of the words, and
// without this the pattern reads it as a command position and fires.
const QUOTED = /"(?:\\.|[^"\\])*"|'[^']*'/g;

/**
 * True when the command runs `git commit`.
 *
 * It used to be `command.includes('git commit')`, which fired on a grep whose
 * search pattern was those two words. Requiring a command position outside
 * quotes fixes that and is as far as this goes: the reminder is advisory, so a
 * miss costs one unwritten note and a false positive one ignored line, and
 * neither is worth parsing shell grammar.
 *
 * It therefore does not see a commit that something else launches - `sudo git
 * commit`, `env VAR=x git commit`, `then git commit` inside an `if` - nor one
 * written inside quotes, including `echo "$(git commit -m x)"`. In the other
 * direction it fires on the words at the start of a line in a heredoc body, or
 * after a `#` comment, which read as command positions without tracking shell
 * context.
 */
function invokesGitCommit(command) {
  return typeof command === 'string' && GIT_COMMIT.test(command.replace(QUOTED, 'Q'));
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
    case 'Agent':
    case 'spawn_agent':
      // Check if significant subagent
      const subagentType = input.tool_input?.subagent_type
        || input.tool_input?.task_name
        || input.tool_input?.name
        || '';
      const significantAgents = ['Plan', 'Explore'];
      const isSignificant = significantAgents.some(a =>
        subagentType.toLowerCase().includes(a.toLowerCase())
      );

      if (isSignificant && hasSession) {
        reminder = `📝 ${subagentType} agent completed. Consider updating session with findings.`;
      }
      break;

    case 'TodoWrite':
    case 'update_plan':
      // Sync reminder
      if (hasSession) {
        reminder = '📝 Todos updated. Keep session Next Steps in sync.';
      }
      break;

    case 'apply_patch':
      if (hasSession) {
        reminder = '📝 Files changed. Record milestones, decisions, or blockers in the session when material.';
      }
      break;

    case 'Bash':
    case 'exec_command':
      // Pre-commit checkpoint (PreToolUse)
      if (hookEvent === 'PreToolUse') {
        const command = input.tool_input?.command || input.tool_input?.cmd || '';
        if (invokesGitCommit(command)) {
          if (!hasSession) {
            reminder = '📝 This commit has no session file. Create one with `memento:session create`, or commit without it if the work does not warrant a session.';
          } else {
            const validation = validateSessionFile(sessionPath);
            if (!validation.valid && validation.issue === 'placeholders') {
              reminder = `📝 The session file still has template placeholder text ("${validation.pattern}..."). Fill it in before this commit, then commit session and code together. Details: memento:session.`;
            }
          }
        }
      }
      break;
  }

  return reminder;
}

function buildHookResponse(input) {
  const reminder = buildCheckpointReminder(input);
  if (!reminder) return {};
  return {
    hookSpecificOutput: {
      hookEventName: input.hook_event_name,
      additionalContext: `\n${reminder}`
    }
  };
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
      console.log(JSON.stringify(buildHookResponse(input)));
    } catch (err) {
      // Silent failure - don't break the hook chain
      console.log(JSON.stringify({}));
    }
  });
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  invokesGitCommit,
  validateSessionFile,
  buildCheckpointReminder,
  buildHookResponse,
  getGitRoot,
  getCurrentBranch,
  getSessionPath,
  sessionExists
};
