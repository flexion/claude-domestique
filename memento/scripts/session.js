#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Consumer project paths (where sessions/branches are stored)
const CLAUDE_DIR = path.join(process.cwd(), '.claude');
const SESSIONS_DIR = path.join(CLAUDE_DIR, 'sessions');
const BRANCHES_DIR = path.join(CLAUDE_DIR, 'branches');

// Plugin paths (where templates live - relative to this script)
const PLUGIN_ROOT = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(PLUGIN_ROOT, 'templates');

// Branch patterns for different platforms/types
const BRANCH_PATTERNS = {
  // GitHub: issue/feature-N/desc or issue/fix-N/desc
  githubIssue: /^issue\/(feature|fix|chore)-(\d+)\/(.+)$/,
  // Jira: feature/PROJ-123/desc or fix/PROJ-123/desc
  jira: /^(feature|fix|chore)\/([A-Z]+-\d+)\/(.+)$/,
  // Azure DevOps: feature/123/desc (numeric only)
  azureDevOps: /^(feature|fix|chore)\/(\d+)\/(.+)$/,
  // Simple: feature/desc, fix/desc, chore/desc (no issue number)
  simple: /^(feature|fix|chore)\/(.+)$/,
};

/**
 * Get the current git branch name
 * @returns {string|null} Branch name or null if not in a git repo
 */
function getCurrentBranch() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return branch;
  } catch (error) {
    return null;
  }
}

/**
 * Parse a branch name into its components
 * @param {string} branchName - The branch name to parse
 * @returns {object} Parsed branch info
 */
function parseBranchName(branchName) {
  // Try GitHub issue pattern first
  let match = branchName.match(BRANCH_PATTERNS.githubIssue);
  if (match) {
    return {
      platform: 'github',
      type: match[1],
      issueNumber: match[2],
      issueId: `#${match[2]}`,
      description: match[3],
      sessionFile: `${match[2]}-${match[3]}.md`,
      branchMetaFile: branchName.replace(/\//g, '-'),
    };
  }

  // Try Jira pattern
  match = branchName.match(BRANCH_PATTERNS.jira);
  if (match) {
    return {
      platform: 'jira',
      type: match[1],
      issueNumber: match[2],
      issueId: match[2],
      description: match[3],
      sessionFile: `${match[2]}-${match[3]}.md`,
      branchMetaFile: branchName.replace(/\//g, '-'),
    };
  }

  // Try Azure DevOps pattern
  match = branchName.match(BRANCH_PATTERNS.azureDevOps);
  if (match) {
    return {
      platform: 'azure-devops',
      type: match[1],
      issueNumber: match[2],
      issueId: `#${match[2]}`,
      description: match[3],
      sessionFile: `${match[2]}-${match[3]}.md`,
      branchMetaFile: branchName.replace(/\//g, '-'),
    };
  }

  // Try simple pattern (no issue number)
  match = branchName.match(BRANCH_PATTERNS.simple);
  if (match) {
    return {
      platform: 'none',
      type: match[1],
      issueNumber: null,
      issueId: null,
      description: match[2],
      sessionFile: `${match[1]}-${match[2]}.md`,
      branchMetaFile: branchName.replace(/\//g, '-'),
    };
  }

  // Fallback: use sanitized branch name
  const sanitized = branchName.replace(/\//g, '-');
  return {
    platform: 'unknown',
    type: 'unknown',
    issueNumber: null,
    issueId: null,
    description: branchName,
    sessionFile: `${sanitized}.md`,
    branchMetaFile: sanitized,
  };
}

/**
 * Get paths for session-related files
 * @returns {object} Path configuration
 */
function getPaths() {
  return {
    // Consumer project paths
    claudeDir: CLAUDE_DIR,
    sessionsDir: SESSIONS_DIR,
    branchesDir: BRANCHES_DIR,
    // Plugin paths
    pluginRoot: PLUGIN_ROOT,
    templatesDir: TEMPLATES_DIR,
  };
}

/**
 * Get the session file path for a branch
 * @param {string} branchName - Branch name
 * @returns {string} Full path to session file
 */
function getSessionPath(branchName) {
  const parsed = parseBranchName(branchName);
  return path.join(SESSIONS_DIR, parsed.sessionFile);
}

/**
 * Get the branch metadata file path for a branch
 * @param {string} branchName - Branch name
 * @returns {string} Full path to branch metadata file
 */
function getBranchMetaPath(branchName) {
  const parsed = parseBranchName(branchName);
  return path.join(BRANCHES_DIR, parsed.branchMetaFile);
}

/**
 * Load a session template
 * @param {string} type - Template type (feature, fix, chore)
 * @returns {string|null} Template content or null if not found
 */
function loadTemplate(type) {
  const templatePath = path.join(TEMPLATES_DIR, `${type}.md`);
  try {
    return fs.readFileSync(templatePath, 'utf-8');
  } catch (error) {
    return null;
  }
}

/**
 * Get default template content
 * @param {string} type - Session type
 * @param {object} branchInfo - Parsed branch info
 * @returns {string} Default template content
 */
function getDefaultTemplate(type, branchInfo) {
  const today = new Date().toISOString().split('T')[0];
  const issueLink = branchInfo.issueId
    ? `- **Issue**: ${branchInfo.issueId}`
    : '';

  return `# Session: ${branchInfo.description}

## Details
${issueLink}
- **Branch**: ${branchInfo.branchMetaFile.replace(/-/g, '/')}
- **Type**: ${type}
- **Created**: ${today}
- **Status**: in-progress

## Objective
[Describe the goal of this work]

## Implementation Plan
[Outline the approach]

## Session Log

### ${today} - Session Started
- Created session file

## Key Decisions
[Document important decisions with rationale]

## Learnings
[Capture insights and surprises]

## Files Changed
- [List modified files]

## Next Steps
1. [First task]
`;
}

/**
 * Ensure required directories exist in consumer project
 * Note: Templates are in the plugin, not copied to consumer
 */
function ensureDirectories() {
  [SESSIONS_DIR, BRANCHES_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Read branch metadata file
 * @param {string} branchName - Branch name
 * @returns {object|null} Parsed metadata or null
 */
function readBranchMeta(branchName) {
  const metaPath = getBranchMetaPath(branchName);
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
  } catch (error) {
    return null;
  }
}

/**
 * Check if a session exists for the current branch
 * @param {string} branchName - Branch name
 * @returns {boolean} True if session exists
 */
function sessionExists(branchName) {
  const sessionPath = getSessionPath(branchName);
  const metaPath = getBranchMetaPath(branchName);
  return fs.existsSync(sessionPath) || fs.existsSync(metaPath);
}

module.exports = {
  getCurrentBranch,
  parseBranchName,
  getPaths,
  getSessionPath,
  getBranchMetaPath,
  loadTemplate,
  getDefaultTemplate,
  ensureDirectories,
  readBranchMeta,
  sessionExists,
  BRANCH_PATTERNS,
};
