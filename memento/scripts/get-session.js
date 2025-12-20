#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const session = require('./session.js');

function getSession(options = {}) {
  /* istanbul ignore next - cwd always provided in tests */
  const cwd = options.cwd || process.cwd();
  const branchName = session.getCurrentBranch(cwd);

  if (!branchName) {
    console.error('Error: Not in a git repository');
    if (!options.silent) process.exit(1);
    return { error: 'Not in a git repository' };
  }

  const branchInfo = session.parseBranchName(branchName);
  const paths = session.getPaths(cwd);

  const sessionPath = path.join(paths.sessionsDir, branchInfo.sessionFile);
  const metaPath = path.join(paths.branchesDir, branchInfo.branchMetaFile);

  // Check for branch metadata first (authoritative)
  let meta = null;
  let sessionFile = null;

  if (fs.existsSync(metaPath)) {
    meta = session.readBranchMeta(branchName, cwd);
    if (meta && meta.session) {
      sessionFile = path.join(paths.sessionsDir, meta.session);
    }
  }

  // Fallback to guessed session path
  if (!sessionFile && fs.existsSync(sessionPath)) {
    sessionFile = sessionPath;
  }

  // If no session found
  if (!sessionFile || !fs.existsSync(sessionFile)) {
    if (options.quiet) {
      if (!options.silent) process.exit(1);
      return { error: 'No session found (quiet mode)' };
    }
    console.error('No session found for current branch');
    console.error(`  Branch: ${branchName}`);
    console.error(`  Expected session: ${sessionPath}`);
    console.error('Create one with: .claude/tools/create-session.js');
    if (!options.silent) process.exit(1);
    return { error: 'No session found' };
  }

  const result = {
    branch: branchName,
    sessionFile: sessionFile,
    metaFile: fs.existsSync(metaPath) ? metaPath : null,
    status: meta?.status || 'unknown',
    type: branchInfo.type,
    issueId: branchInfo.issueId,
    platform: branchInfo.platform,
  };

  // Output based on format
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (options.path) {
    // Just output the session file path
    console.log(sessionFile);
  } else if (options.content) {
    // Output the session file content
    const content = fs.readFileSync(sessionFile, 'utf-8');
    console.log(content);
  } else if (!options.silent) {
    // Default: human-readable output (skip if silent)
    console.log(`Branch: ${result.branch}`);
    console.log(`Session: ${result.sessionFile}`);
    if (result.metaFile) {
      console.log(`Metadata: ${result.metaFile}`);
    }
    console.log(`Status: ${result.status}`);
    console.log(`Type: ${result.type}`);
    if (result.issueId) {
      console.log(`Issue: ${result.issueId}`);
    }
  }

  return result;
}

// CLI handling
/* istanbul ignore next */
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    json: args.includes('--json'),
    path: args.includes('--path'),
    content: args.includes('--content'),
    quiet: args.includes('--quiet') || args.includes('-q'),
  };
  getSession(options);
}

module.exports = { getSession };
