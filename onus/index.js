/**
 * onus - Work item automation for Claude Code
 *
 * This module exports the main functionality for programmatic usage.
 * For CLI usage, see bin/cli.js.
 * For hook usage, see hooks/work-item.js.
 */

const workItem = require('./hooks/work-item.js');
const { init, detectGitRemote, buildDefaultConfig } = require('./scripts/init.js');

module.exports = {
  // Hook exports
  processHook: workItem.processHook,
  processSessionStart: workItem.processSessionStart,
  processUserPromptSubmit: workItem.processUserPromptSubmit,

  // Utility exports
  extractIssueFromBranch: workItem.extractIssueFromBranch,
  detectPlatform: workItem.detectPlatform,
  formatWorkItemContext: workItem.formatWorkItemContext,
  createPlaceholderWorkItem: workItem.createPlaceholderWorkItem,

  // Cache management
  loadWorkItemCache: workItem.loadWorkItemCache,
  saveWorkItemCache: workItem.saveWorkItemCache,
  getCachedWorkItem: workItem.getCachedWorkItem,

  // State management
  loadState: workItem.loadState,
  saveState: workItem.saveState,

  // Configuration
  loadProjectConfig: workItem.loadProjectConfig,
  DEFAULT_CONFIG: workItem.DEFAULT_CONFIG,
  PLATFORM_CONFIG: workItem.PLATFORM_CONFIG,

  // Init exports
  init,
  detectGitRemote,
  buildDefaultConfig
};
