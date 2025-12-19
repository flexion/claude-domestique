#!/usr/bin/env node
/**
 * onus CLI
 *
 * Usage:
 *   onus init [target-dir]    Initialize onus configuration
 *   onus fetch <issue>        Fetch issue details (placeholder)
 *   onus commit               Generate commit message (placeholder)
 *   onus pr                   Generate PR description (placeholder)
 */

const { init } = require('../scripts/init.js');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0];

function showHelp() {
  console.log(`
onus - Work item automation for Claude Code

Usage:
  onus init [target-dir]    Initialize onus configuration
  onus fetch <issue>        Fetch issue details
  onus commit               Generate commit message
  onus pr                   Generate PR description
  onus help                 Show this help

Examples:
  onus init                 Initialize in current directory
  onus init ~/my-project    Initialize in specific directory
  onus fetch 42             Fetch GitHub issue #42
  onus fetch PROJ-123       Fetch JIRA issue PROJ-123

Environment Variables:
  GITHUB_TOKEN         GitHub API token
  JIRA_TOKEN           JIRA API token (base64 encoded)
  AZURE_DEVOPS_TOKEN   Azure DevOps PAT (base64 encoded)
`);
}

switch (command) {
  case 'init':
    const targetDir = args[1] ? path.resolve(args[1]) : process.cwd();
    init(targetDir);
    break;

  case 'fetch':
    const issue = args[1];
    if (!issue) {
      console.error('Error: Issue number required');
      console.error('Usage: onus fetch <issue>');
      process.exit(1);
    }
    console.log(`Fetching issue: ${issue}`);
    console.log('Note: Full fetch implementation coming in future release.');
    console.log('For now, use the /fetch slash command within Claude Code.');
    break;

  case 'commit':
    console.log('Generating commit message...');
    console.log('Note: Full implementation coming in Phase 2.');
    console.log('For now, Claude Code will suggest commit messages based on staged changes.');
    break;

  case 'pr':
    console.log('Generating PR description...');
    console.log('Note: Full implementation coming in Phase 2.');
    console.log('For now, Claude Code will help generate PR descriptions on request.');
    break;

  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;

  default:
    if (command) {
      console.error(`Unknown command: ${command}`);
    }
    showHelp();
    process.exit(command ? 1 : 0);
}
