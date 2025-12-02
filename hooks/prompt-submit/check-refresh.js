#!/usr/bin/env node
/**
 * Prompt Submit Hook: Check Context Refresh
 *
 * Called on every user message submission.
 * Checks if periodic context refresh is needed and outputs a message if so.
 *
 * @see agents/context-refresh.md for behavioral specification
 */

const path = require('path');

// Import tracker from src directory
const trackerPath = path.join(__dirname, '..', '..', 'src', 'context-refresh-tracker.js');
const { checkRefresh } = require(trackerPath);

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
      // Silent - no output needed
      break;

    case 'DISABLED':
      // Silent - periodic refresh is disabled
      break;

    default:
      // Unknown action - log for debugging
      console.error(`Unknown action: ${result.action}`);
  }
}

main();
