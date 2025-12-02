#!/usr/bin/env node
/**
 * Prompt Submit Hook: Check Context Refresh
 *
 * Called on every user message submission.
 * - Increments interaction count
 * - Outputs refresh message when threshold reached
 * - Always outputs canary instruction for Claude to include in response
 *
 * @see agents/context-refresh.md for behavioral specification
 */

const path = require('path');

// Import tracker from src directory
const trackerPath = path.join(__dirname, '..', '..', 'src', 'context-refresh-tracker.js');
const { checkRefresh, getStatus } = require(trackerPath);

function main() {
  const result = checkRefresh();

  switch (result.action) {
    case 'REFRESH_NEEDED':
      // Output message that will be shown to user
      console.log(`[Periodic context refresh at interaction ${result.interaction}]`);
      console.log('');
      console.log('Refreshing context to maintain alignment with core values...');
      console.log('');
      console.log('Please reload context files:');
      console.log('- Plugin core: context/README.yml, behavior.yml, git.yml, sessions.yml');
      console.log('- Project: .claude/context/*.yml');
      console.log('');
      console.log(`Next refresh at interaction ${result.nextRefresh}.`);
      break;

    case 'NO_REFRESH':
      // Silent for refresh - canary handled below
      break;

    case 'DISABLED':
      // Silent - periodic refresh is disabled, no canary
      return;

    default:
      // Unknown action - log for debugging
      console.error(`Unknown action: ${result.action}`);
  }

  // Always output canary instruction (unless disabled)
  const status = getStatus();
  if (status.enabled) {
    console.log('');
    console.log(`[CANARY: Include "(${status.untilRefresh})" at the end of your response to show interactions until context refresh]`);
  }
}

main();
