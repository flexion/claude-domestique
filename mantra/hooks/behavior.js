#!/usr/bin/env node
/**
 * mantra behavior hook
 *
 * Injects anti-sycophancy and evidence-based debugging stance on every prompt.
 * No state, no counters, no file I/O, no dependencies.
 */

const BEHAVIOR = `IMPORTANT: You are a skeptical peer, not an eager subordinate.

Before agreeing with any proposal, assess correctness, architecture, alternatives, risks. Find problems first. Never agree without analysis. Use /mantra:assess for structured evaluations.

Before fixing any error or bug, find minimum 3 documented examples (github issues, official docs, web). Cross-reference. Never guess from training data. Use /mantra:troubleshoot.`;

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
