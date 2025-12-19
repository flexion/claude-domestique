#!/usr/bin/env node

/**
 * memento: Pre-edit session verification hook
 *
 * Runs on PreToolUse for Edit/Write tools.
 * Blocks source file edits when no session exists for the current branch.
 * This enforces the "1 session = 1 issue = 1 branch" workflow.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const { parseBranchName } = require('../tools/session.js');

// Files/directories that are allowed without a session
const ALLOWED_PATHS = [
  '.claude/sessions/',
  '.claude/branches/',
  '.claude/config',
  '.claude/context/',
  'CLAUDE.md',
  '.gitignore',
  'package.json',
  'package-lock.json',
  'README.md',
];

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

/**
 * Get the git repository root directory
 * Sessions are stored at the repo root, not in subdirectories
 * @param {string} cwd - Current working directory
 * @returns {string|null} Git root path or null if not in a git repo
 */
function getGitRoot(cwd) {
  try {
    return execSync('git rev-parse --show-toplevel', {
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

function sessionExists(cwd, branchInfo) {
  const sessionsDir = path.join(cwd, '.claude', 'sessions');

  // Check branch metadata first (authoritative)
  const meta = readBranchMeta(cwd, branchInfo.branchMetaFile);
  if (meta?.session) {
    const sessionPath = path.join(sessionsDir, meta.session);
    if (fs.existsSync(sessionPath)) {
      return true;
    }
  }

  // Fallback to guessed session path
  const sessionPath = path.join(sessionsDir, branchInfo.sessionFile);
  return fs.existsSync(sessionPath);
}

function isAllowedPath(filePath, cwd) {
  // Normalize the path relative to cwd
  const relativePath = path.relative(cwd, filePath);

  // Check if the file matches any allowed pattern
  return ALLOWED_PATHS.some(allowed => {
    if (allowed.endsWith('/')) {
      // Directory pattern - check if file is within this directory
      return relativePath.startsWith(allowed) || relativePath.startsWith(allowed.slice(0, -1));
    }
    // Exact file match or ends with the pattern
    return relativePath === allowed || relativePath.endsWith('/' + allowed);
  });
}

function isFeatureBranch(branch) {
  if (!branch) return false;
  // Not a feature branch if it's main, master, or detached HEAD
  return branch !== 'main' && branch !== 'master' && branch !== 'HEAD';
}

/**
 * Process PreToolUse hook for Edit/Write verification
 */
function processPreToolUse(input) {
  // Get git root - sessions are stored at repo root, not subdirectories
  const gitRoot = getGitRoot(input.cwd || process.cwd());

  const cwd = input.cwd || process.cwd();
  const toolName = input.tool_name;
  const toolInput = input.tool_input || {};

  // Only check Edit and Write tools
  if (toolName !== 'Edit' && toolName !== 'Write') {
    return { decision: 'approve' };
  }

  // Get the file path being edited
  const filePath = toolInput.file_path;
  if (!filePath) {
    return { decision: 'approve' };
  }

  // Allow editing certain files without a session
  if (isAllowedPath(filePath, gitRoot || cwd)) {
    return { decision: 'approve' };
  }

  // Check if we're on a feature branch
  const branch = getCurrentBranch(cwd);
  if (!isFeatureBranch(branch)) {
    // On main/master - no session required
    return { decision: 'approve' };
  }

  // Check if .claude directory exists (memento is set up)
  const claudeDir = path.join(gitRoot || cwd, '.claude');
  if (!fs.existsSync(claudeDir)) {
    // Memento not initialized - allow edits
    return { decision: 'approve' };
  }

  // Parse branch and check for session
  const branchInfo = parseBranchName(branch);
  if (sessionExists(gitRoot || cwd, branchInfo)) {
    return { decision: 'approve' };
  }

  // No session exists - block the edit
  const createCmd = '${CLAUDE_PLUGIN_ROOT}/tools/create-session.js';

  return {
    decision: 'block',
    reason: `**Session Required**

No session file exists for branch \`${branch}\`.

Before editing source files, create a session to track your work:

\`\`\`bash
${createCmd}
\`\`\`

Or use the \`/session\` command.

This ensures work context is preserved across conversation resets.`
  };
}

/**
 * Route to appropriate handler based on event type
 */
function processHook(input) {
  const eventName = input.hook_event_name;

  if (eventName === 'PreToolUse') {
    return processPreToolUse(input);
  }

  // Unknown event - approve by default
  return { decision: 'approve' };
}

// Main CLI wrapper
async function main() {
  let inputData = '';
  for await (const chunk of process.stdin) {
    inputData += chunk;
  }

  let input;
  try {
    input = JSON.parse(inputData);
  } catch (e) {
    // Fallback for direct CLI execution (testing)
    input = { cwd: process.cwd(), hook_event_name: 'PreToolUse' };
  }

  const output = processHook(input);
  console.log(JSON.stringify(output));
  process.exit(0);
}

// Export for testing
module.exports = {
  getGitRoot,
  processHook,
  processPreToolUse,
  sessionExists,
  isAllowedPath,
  isFeatureBranch,
  ALLOWED_PATHS
};

// Run CLI if executed directly
if (require.main === module) {
  main().catch(e => {
    console.error(e.message);
    process.exit(1);
  });
}
