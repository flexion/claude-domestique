#!/usr/bin/env node
/**
 * Prompt Submit Hook: Check Context Refresh
 *
 * Called on every user message submission.
 * - Increments interaction count
 * - On first interaction: injects plugin core context directory path
 * - On refresh intervals: injects refresh instruction
 * - Uses Claude Code's hookSpecificOutput.additionalContext for enforcement
 *
 * @see agents/context-refresh.md for behavioral specification
 * @see https://docs.anthropic.com/en/docs/claude-code/hooks for hook output format
 */

const path = require('path');

// Import tracker from src directory
const trackerPath = path.join(__dirname, '..', '..', 'src', 'context-refresh-tracker.js');
const { checkRefresh } = require(trackerPath);

// Plugin root from environment (set by Claude Code when running hook)
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.join(__dirname, '..', '..');

function main() {
  const result = checkRefresh();

  // Build the hook output
  const output = {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit'
    }
  };

  const pluginContextDir = path.join(PLUGIN_ROOT, 'context');

  switch (result.action) {
    case 'FIRST_INTERACTION':
      // First interaction - load plugin core context
      output.hookSpecificOutput.additionalContext = `[CONTEXT LOAD - Session Start]

BEFORE responding, use the Read tool to load ALL files in these directories:

1. Plugin core context: ${pluginContextDir}/
   Read all .yml and .md files in this directory.

2. Project context (optional): .claude/context/
   If this directory exists, read all .yml files in it.

Say "Context loaded." and proceed with the user's request.

Next refresh at interaction ${result.nextRefresh}.`;
      break;

    case 'REFRESH_NEEDED':
      // Periodic refresh - reload both plugin and project context
      output.hookSpecificOutput.additionalContext = `[CONTEXT REFRESH REQUIRED - Interaction ${result.interaction}]

BEFORE responding, use the Read tool to reload ALL files in these directories:

1. Plugin core context: ${pluginContextDir}/
   Read all .yml and .md files in this directory.

2. Project context (optional): .claude/context/
   If this directory exists, read all .yml files in it.

Say "Context refreshed." and proceed with the user's request.

Next refresh at interaction ${result.nextRefresh}.`;
      break;

    case 'NO_REFRESH':
      // Show countdown to next refresh
      const untilRefresh = result.nextRefresh - result.interaction;
      output.hookSpecificOutput.additionalContext = `[Context Refresh: ${untilRefresh} interactions remaining]

At the END of your response, include this line:
"🔄 Context refresh in ${untilRefresh}"`;
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
