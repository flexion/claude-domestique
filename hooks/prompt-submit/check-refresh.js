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
const { checkRefresh } = require(trackerPath);

function main() {
  const result = checkRefresh();

  // Build the hook output
  const output = {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit'
    }
  };

  switch (result.action) {
    case 'REFRESH_NEEDED':
      // Inject mandatory context refresh instruction
      // Use only project-relative paths that work in any installed project
      output.hookSpecificOutput.additionalContext = `[CONTEXT REFRESH REQUIRED - Interaction ${result.interaction}]

BEFORE responding, use the Read tool to reload these project context files:
1. .claude/context/behavior.yml
2. .claude/context/sessions.yml
3. .claude/context/git.yml

Then say "Context refreshed." and proceed with the user's request.

Next refresh at interaction ${result.nextRefresh}.`;
      break;

    case 'NO_REFRESH':
      // Silent between refreshes - no countdown clutter
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
