#!/usr/bin/env node
/**
 * Prompt Submit Hook: Check Context Refresh
 *
 * Called on every user message submission.
 * - Increments interaction count
 * - Outputs structured JSON for context injection when refresh needed
 * - Uses Claude Code's hookSpecificOutput.additionalContext for enforcement
 *
 * @see agents/context-refresh.md for behavioral specification
 * @see https://docs.anthropic.com/en/docs/claude-code/hooks for hook output format
 */

const path = require('path');

// Import tracker from src directory
const trackerPath = path.join(__dirname, '..', '..', 'src', 'context-refresh-tracker.js');
const { checkRefresh, getStatus } = require(trackerPath);

function main() {
  const result = checkRefresh();
  const status = getStatus();

  // Build the hook output
  const output = {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit'
    }
  };

  switch (result.action) {
    case 'REFRESH_NEEDED':
      // Inject mandatory context refresh instruction
      output.hookSpecificOutput.additionalContext = `[MANDATORY CONTEXT REFRESH - Interaction ${result.interaction}]

You MUST read the following context files BEFORE responding to the user's message:

Plugin core context (read these files):
- context/README.yml
- context/behavior.yml
- context/git.yml
- context/sessions.yml

Project context (read these files):
- .claude/context/*.yml (all YAML files in this directory)

After reading, briefly acknowledge the refresh: "Context refreshed at interaction ${result.interaction}."

Next refresh at interaction ${result.nextRefresh}.

Now proceed with the user's request.`;
      break;

    case 'NO_REFRESH':
      // Include interaction countdown as subtle context
      if (status.enabled && status.untilRefresh !== null) {
        output.hookSpecificOutput.additionalContext =
          `[Context refresh in ${status.untilRefresh} interactions]`;
      }
      break;

    case 'DISABLED':
      // No output when disabled
      return;

    default:
      // Unknown action - log error to stderr (visible but non-blocking)
      console.error(`Unknown action: ${result.action}`);
      return;
  }

  // Output structured JSON for Claude Code to parse
  console.log(JSON.stringify(output));
}

main();
