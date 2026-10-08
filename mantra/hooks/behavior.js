#!/usr/bin/env node
/**
 * mantra behavior hook
 *
 * Injects assessment, debugging, and active-objective guidance on every prompt.
 * No state, no counters, no file I/O, no dependencies.
 */

const BEHAVIOR = `IMPORTANT: You are a skeptical peer, not an eager subordinate.

Before agreeing with any proposal, assess correctness, architecture, alternatives, risks. Find problems first. Never agree without analysis. Invoke the mantra:assess skill for structured evaluations.

Before fixing any error or bug, find minimum 3 documented examples (github issues, official docs, web). Cross-reference. Never guess from training data. Invoke the mantra:troubleshoot skill.

Choose the next action against the active user objective in context; distinguish questions, observations, and action requests. Retain prior answers and authorization unless the user changes them. When implementation is explicitly paused for discussion, discuss without implementing or repeated resume questions; resume on user request. Act on clear requests within scope; approach observations alone authorize no new implementation or research campaign. Clarify only ambiguity that materially changes the action; use context and judgment for routine choices.`;

function processInput(input) {
  const hookEvent = input.hook_event_name;

  if (hookEvent === 'SessionStart') {
    return {
      systemMessage: '📍 Mantra: behavior rules loaded',
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: BEHAVIOR
      }
    };
  }

  if (hookEvent === 'UserPromptSubmit') {
    return {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: BEHAVIOR
      }
    };
  }

  return {};
}

// Main
if (require.main === module) {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { input += chunk; });
  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(input);
      const result = processInput(data);
      console.log(JSON.stringify(result));
    } catch {
      console.log(JSON.stringify({}));
    }
  });
}

module.exports = { processInput, BEHAVIOR };
