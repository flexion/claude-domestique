#!/usr/bin/env node
/**
 * mantra hook - delegates to shared handler with custom status line augmentation
 */

const fs = require('fs');
const path = require('path');

let shared;
try {
  shared = require('../lib/shared');
} catch {
  shared = require('../../shared');
}

const PLUGIN_ROOT = path.join(__dirname, '..');

// ============================================================================
// Context Window Analysis
// ============================================================================

function getContextPercentage(input) {
  const ctxWindow = input.context_window;
  if (!ctxWindow?.context_window_size || !ctxWindow?.current_usage) return null;

  const used = ctxWindow.current_usage.input_tokens +
    (ctxWindow.current_usage.cache_creation_input_tokens || 0) +
    (ctxWindow.current_usage.cache_read_input_tokens || 0);
  const total = ctxWindow.context_window_size;
  return Math.round((used / total) * 100);
}

// ============================================================================
// Project Rules Detection
// ============================================================================

function hasProjectRules(cwd) {
  const projectRulesDir = path.join(cwd, '.claude', 'rules');
  if (!fs.existsSync(projectRulesDir)) return false;
  try {
    const files = fs.readdirSync(projectRulesDir);
    return files.some(f => f.endsWith('.md'));
  } catch { return false; }
}

// ============================================================================
// Hook Callbacks
// ============================================================================

function onSessionStart(input, base) {
  const cwd = input.cwd || process.cwd();
  const source = input.source || 'startup';
  const hasProjectRulesResult = hasProjectRules(cwd);

  // Build status line with context info
  let statusLine = base.statusLine;

  // Add source indicator
  if (source === 'compact') {
    statusLine = statusLine.replace(/ \(reloaded\)$/, '') + ' (reloaded after compaction)';
  }

  // Context percentage analysis
  const contextPercentage = getContextPercentage(input);
  let startupBloat = false;

  if (contextPercentage !== null) {
    // Add context percentage to status line
    if (!statusLine.includes('@')) {
      statusLine += ` @ ${contextPercentage}%`;
    }

    // Warn about high initial context on startup only
    if (source === 'startup' && contextPercentage > 35) {
      startupBloat = true;
      statusLine += ` | High initial context (${contextPercentage}%)`;
    }
  }

  return {
    statusLine,
    additionalContext: base.additionalContext,
    extra: {
      source,
      rulesLoaded: base.files.length > 0,
      injectedFromPlugin: !hasProjectRulesResult,
      ruleCount: base.files.length,
      contextPercentage,
      startupBloat
    }
  };
}

function onUserPromptSubmit(input, base) {
  const cwd = input.cwd || process.cwd();
  const hasProjectRulesResult = hasProjectRules(cwd);

  return {
    additionalContext: base.additionalContext,
    extra: {
      rulesLoaded: true
    }
  };
}

// ============================================================================
// Main Entry Point
// ============================================================================

if (require.main === module) {
  shared.runHook({
    pluginName: 'Mantra',
    pluginRoot: PLUGIN_ROOT,
    onSessionStart,
    onUserPromptSubmit
  });
}

// ============================================================================
// Exports (for testing)
// ============================================================================

function processHook(input) {
  const config = {
    pluginName: 'Mantra',
    pluginRoot: PLUGIN_ROOT,
    onSessionStart,
    onUserPromptSubmit
  };
  return shared.processHook(config, input);
}

module.exports = {
  processHook,
  hasProjectRules,
  getContextPercentage
};
