#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const session = require('./session.js');

function createSession(options = {}) {
  /* istanbul ignore next - cwd always provided in tests */
  const cwd = options.cwd || process.cwd();
  const branchName = session.getCurrentBranch(cwd);

  if (!branchName) {
    console.error('Error: Not in a git repository');
    if (!options.silent) process.exit(1);
    return { error: 'Not in a git repository' };
  }

  if (branchName === 'main' || branchName === 'master') {
    console.error('Error: Cannot create session on main/master branch');
    console.error('Create a feature branch first: git checkout -b feature/your-feature');
    if (!options.silent) process.exit(1);
    return { error: 'Cannot create session on main/master branch' };
  }

  const branchInfo = session.parseBranchName(branchName);
  const paths = session.getPaths(cwd);

  // Ensure directories exist
  session.ensureDirectories(cwd);

  const sessionPath = path.join(paths.sessionsDir, branchInfo.sessionFile);
  const metaPath = path.join(paths.branchesDir, branchInfo.branchMetaFile);

  // Check if session already exists
  if (fs.existsSync(sessionPath) || fs.existsSync(metaPath)) {
    if (!options.force) {
      console.error('Error: Session already exists for this branch');
      console.error(`  Session: ${sessionPath}`);
      console.error(`  Metadata: ${metaPath}`);
      console.error('Use --force to overwrite');
      if (!options.silent) process.exit(1);
      return { error: 'Session already exists' };
    }
  }

  const today = new Date().toISOString().split('T')[0];

  // Try to load template, fall back to default
  let sessionContent = session.loadTemplate(branchInfo.type);
  if (!sessionContent) {
    sessionContent = session.getDefaultTemplate(branchInfo.type, branchInfo);
  } else {
    // Replace template placeholders
    sessionContent = sessionContent
      .replace(/\{\{description\}\}/g, branchInfo.description)
      .replace(/\{\{branch\}\}/g, branchName)
      .replace(/\{\{type\}\}/g, branchInfo.type)
      .replace(/\{\{date\}\}/g, today)
      .replace(/\{\{issueId\}\}/g, branchInfo.issueId || 'N/A')
      .replace(/\{\{issueNumber\}\}/g, branchInfo.issueNumber || '');
  }

  // Create branch metadata content
  const metaContent = `# Branch Metadata
branch: ${branchName}
session: ${branchInfo.sessionFile}
type: ${branchInfo.type}
status: in-progress
created: ${today}
last-updated: ${today}
description: ${branchInfo.description}
parent: main
${branchInfo.issueNumber ? `issue: ${branchInfo.issueNumber}` : ''}

## Current Work
[Describe what you're working on]

## Next Steps
[What needs to be done next]
`;

  // Write files
  fs.writeFileSync(sessionPath, sessionContent);
  fs.writeFileSync(metaPath, metaContent);

  console.log('Session created successfully!');
  console.log(`  Branch: ${branchName}`);
  console.log(`  Session: ${sessionPath}`);
  console.log(`  Metadata: ${metaPath}`);

  if (branchInfo.issueId) {
    console.log(`  Issue: ${branchInfo.issueId}`);
  }

  return {
    branchName,
    branchInfo,
    sessionPath,
    metaPath,
  };
}

// CLI handling
/* istanbul ignore next */
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    force: args.includes('--force') || args.includes('-f'),
  };
  createSession(options);
}

module.exports = { createSession };
