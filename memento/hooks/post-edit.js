#!/usr/bin/env node

/**
 * memento: Post-edit session update hook
 *
 * Runs on PostToolUse for Edit/Write tools.
 * Automatically updates the session file's "Files Changed" section
 * with the file that was just edited/written.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const { parseBranchName } = require('../tools/session.js');

/**
 * Get the current git branch name
 * @param {string} cwd - Working directory
 * @returns {string|null} Branch name or null if not in a git repo
 */
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

/**
 * Read branch metadata to get session file name
 * @param {string} gitRoot - Git root directory
 * @param {string} branchMetaFile - Branch metadata filename
 * @returns {object|null} Parsed metadata or null
 */
function readBranchMeta(gitRoot, branchMetaFile) {
  const metaPath = path.join(gitRoot, '.claude', 'branches', branchMetaFile);
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

/**
 * Find the session file path for the current branch
 * @param {string} gitRoot - Git root directory
 * @param {string} branch - Current branch name
 * @returns {string|null} Path to session file or null if not found
 */
function findSessionFile(gitRoot, branch) {
  const branchInfo = parseBranchName(branch);
  const sessionsDir = path.join(gitRoot, '.claude', 'sessions');

  // Check branch metadata first (authoritative)
  const meta = readBranchMeta(gitRoot, branchInfo.branchMetaFile);
  if (meta?.session) {
    const sessionPath = path.join(sessionsDir, meta.session);
    if (fs.existsSync(sessionPath)) {
      return sessionPath;
    }
  }

  // Fallback to guessed session path
  const sessionPath = path.join(sessionsDir, branchInfo.sessionFile);
  if (fs.existsSync(sessionPath)) {
    return sessionPath;
  }

  return null;
}

/**
 * Check if a file path should be tracked in Files Changed
 * Skip session/branch metadata files and other internal files
 * @param {string} filePath - Absolute file path
 * @param {string} gitRoot - Git root directory
 * @returns {boolean} True if file should be tracked
 */
function shouldTrackFile(filePath, gitRoot) {
  try {
    // Normalize paths to handle symlinks (especially on macOS)
    const normalizedFilePath = fs.realpathSync(path.dirname(filePath)) + '/' + path.basename(filePath);
    const normalizedGitRoot = fs.realpathSync(gitRoot);
    const relativePath = path.relative(normalizedGitRoot, normalizedFilePath);

    // Skip .claude internal files
    if (relativePath.startsWith('.claude/') || relativePath.startsWith('.claude\\')) {
      return false;
    }

    // Skip paths that escape the git root (start with ..)
    if (relativePath.startsWith('..')) {
      return false;
    }

    return true;
  } catch {
    // If path resolution fails, default to not tracking
    return false;
  }
}

/**
 * Update the session file's "Files Changed" section
 * @param {string} sessionPath - Path to session file
 * @param {string} changedFile - Relative path to changed file
 * @returns {boolean} True if updated, false if already listed or error
 */
function updateFilesChanged(sessionPath, changedFile) {
  try {
    let content = fs.readFileSync(sessionPath, 'utf-8');

    // Find the "## Files Changed" section
    const filesChangedMatch = content.match(/## Files Changed\n([\s\S]*?)(?=\n## |\n*$)/);
    if (!filesChangedMatch) {
      // Section doesn't exist - add it before Next Steps or at end
      const nextStepsMatch = content.match(/\n## Next Steps/);
      if (nextStepsMatch) {
        content = content.replace(
          /\n## Next Steps/,
          `\n## Files Changed\n- ${changedFile}\n\n## Next Steps`
        );
      } else {
        content = content.trimEnd() + `\n\n## Files Changed\n- ${changedFile}\n`;
      }
      fs.writeFileSync(sessionPath, content, 'utf-8');
      return true;
    }

    const filesSection = filesChangedMatch[1];

    // Check if file is already listed (exact match or with description)
    const filePattern = new RegExp(`^- ${escapeRegex(changedFile)}(\\s|$)`, 'm');
    if (filePattern.test(filesSection)) {
      return false; // Already listed
    }

    // Check for placeholder text and replace it
    const placeholderPattern = /- \[List modified files\]\n?|- None yet\n?/;
    let newFilesSection;
    if (placeholderPattern.test(filesSection)) {
      newFilesSection = filesSection.replace(placeholderPattern, `- ${changedFile}\n`);
    } else {
      // Append to existing list
      newFilesSection = filesSection.trimEnd() + `\n- ${changedFile}\n`;
    }

    // Replace the section in the content
    content = content.replace(
      /## Files Changed\n[\s\S]*?(?=\n## |\n*$)/,
      `## Files Changed\n${newFilesSection}`
    );

    fs.writeFileSync(sessionPath, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Process PostToolUse hook for Edit/Write
 * @param {object} input - Hook input from stdin
 * @returns {object} Hook response
 */
function processPostToolUse(input) {
  const cwd = input.cwd || process.cwd();
  const toolName = input.tool_name;
  const toolInput = input.tool_input || {};

  // Only process Edit and Write tools
  if (toolName !== 'Edit' && toolName !== 'Write') {
    return {};
  }

  // Get the file path that was edited
  const filePath = toolInput.file_path;
  if (!filePath) {
    return {};
  }

  // Get git root
  const gitRoot = getGitRoot(cwd);
  if (!gitRoot) {
    return {};
  }

  // Check if we should track this file
  if (!shouldTrackFile(filePath, gitRoot)) {
    return {};
  }

  // Get current branch
  const branch = getCurrentBranch(cwd);
  if (!branch || branch === 'main' || branch === 'master') {
    return {};
  }

  // Find the session file
  const sessionPath = findSessionFile(gitRoot, branch);
  if (!sessionPath) {
    // No session - exit gracefully
    return {};
  }

  // Get relative path for display (normalize to handle symlinks)
  let relativePath;
  try {
    const normalizedFilePath = fs.realpathSync(path.dirname(filePath)) + '/' + path.basename(filePath);
    const normalizedGitRoot = fs.realpathSync(gitRoot);
    relativePath = path.relative(normalizedGitRoot, normalizedFilePath);
  } catch {
    relativePath = path.relative(gitRoot, filePath);
  }

  // Update the session file
  const updated = updateFilesChanged(sessionPath, relativePath);

  if (updated) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `📝 Session updated: added ${relativePath} to Files Changed`
      }
    };
  }

  return {};
}

/**
 * Route to appropriate handler based on event type
 */
function processHook(input) {
  const eventName = input.hook_event_name;

  if (eventName === 'PostToolUse') {
    return processPostToolUse(input);
  }

  // Unknown event - no action
  return {};
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
    input = { cwd: process.cwd(), hook_event_name: 'PostToolUse' };
  }

  const output = processHook(input);
  console.log(JSON.stringify(output));
  process.exit(0);
}

// Export for testing
module.exports = {
  getGitRoot,
  getCurrentBranch,
  findSessionFile,
  shouldTrackFile,
  updateFilesChanged,
  processPostToolUse,
  processHook,
};

// Run CLI if executed directly
if (require.main === module) {
  main().catch(e => {
    console.error(e.message);
    process.exit(1);
  });
}
