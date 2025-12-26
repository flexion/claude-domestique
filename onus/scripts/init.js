/**
 * onus init - Project configuration initialization
 *
 * Provides utilities for detecting GitHub repo info from git remote and
 * generating default configuration. VCS is assumed to be GitHub (including
 * enterprise). Work item platform (GitHub Issues, JIRA, Azure DevOps) must
 * be explicitly configured.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG_FILE = '.claude/config.json';

// Default configuration values
const DEFAULT_CONFIG = {
  commitFormat: {
    issue: '{number} - {verb} {description}',
    chore: 'chore - {description}'
  },
  branchFormat: {
    issue: 'issue/{type}-{number}/{slug}',
    chore: 'chore/{slug}'
  }
};

// Supported work item platforms
const PLATFORMS = ['github', 'jira', 'azure'];

/**
 * Detect GitHub owner/repo from git remote URL
 * Assumes VCS is GitHub (including enterprise). Does NOT detect work item platform.
 * @param {string} cwd - Working directory
 * @param {object} deps - Dependencies for testing
 * @returns {object|null} { owner, repo } or null if not detectable
 */
function detectGitRemote(cwd, deps = {}) {
  const exec = deps.execSync || execSync;

  let remoteUrl;
  try {
    remoteUrl = exec('git remote get-url origin', {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch {
    return null;
  }

  if (!remoteUrl) return null;

  // GitHub SSH: git@github.com:owner/repo.git or git@github.enterprise.com:owner/repo.git
  const sshMatch = remoteUrl.match(/git@[^:]+:([^/]+)\/([^/.]+)(\.git)?$/);
  if (sshMatch) {
    return {
      owner: sshMatch[1],
      repo: sshMatch[2]
    };
  }

  // GitHub HTTPS: https://github.com/owner/repo.git or https://github.enterprise.com/owner/repo
  const httpsMatch = remoteUrl.match(/https?:\/\/[^/]+\/([^/]+)\/([^/.]+)(\.git)?$/);
  if (httpsMatch) {
    return {
      owner: httpsMatch[1],
      repo: httpsMatch[2]
    };
  }

  return null;
}

/**
 * Build configuration object from platform, detected repo info, and overrides
 * @param {string} platform - Work item platform: 'github', 'jira', or 'azure'
 * @param {object} detected - Result from detectGitRemote { owner, repo }
 * @param {object} overrides - User-provided overrides
 * @returns {object} Complete config object
 */
function buildDefaultConfig(platform, detected, overrides = {}) {
  const config = {
    onus: {
      ...DEFAULT_CONFIG,
      platform: platform || 'github',
      ...overrides
    }
  };

  // Add platform-specific config
  if (platform === 'github' && detected) {
    config.onus.github = {
      owner: detected.owner,
      repo: detected.repo
    };
  } else if (platform === 'jira') {
    config.onus.jira = {
      host: overrides.jiraHost || null,
      project: overrides.jiraProject || null
    };
  } else if (platform === 'azure') {
    config.onus.azure = {
      org: overrides.azureOrg || null,
      project: overrides.azureProject || null
    };
  }

  return config;
}

/**
 * Check if configuration already exists
 * @param {string} projectPath - Project root directory
 * @param {object} deps - Dependencies for testing
 * @returns {boolean} True if config exists
 */
function hasExistingConfig(projectPath, deps = {}) {
  const fileSystem = deps.fs || fs;
  const configPath = path.join(projectPath, CONFIG_FILE);

  try {
    if (fileSystem.existsSync(configPath)) {
      const content = fileSystem.readFileSync(configPath, 'utf8');
      const config = JSON.parse(content);
      return !!(config.onus || config.workItem);
    }
  } catch {
    // File doesn't exist or isn't valid JSON
  }

  return false;
}

/**
 * Initialize project configuration
 * @param {string} projectPath - Project root directory
 * @param {object} options - Init options
 * @param {boolean} options.force - Overwrite existing config
 * @param {string} options.platform - Work item platform: 'github' (default), 'jira', or 'azure'
 * @param {object} options.overrides - Config overrides (jiraHost, jiraProject, azureOrg, azureProject)
 * @param {object} deps - Dependencies for testing
 * @returns {object} Result { created, skipped, config, error }
 */
function init(projectPath, options = {}, deps = {}) {
  const fileSystem = deps.fs || fs;
  const exec = deps.execSync || execSync;

  const configPath = path.join(projectPath, CONFIG_FILE);
  const configDir = path.dirname(configPath);

  // Check for existing config
  if (!options.force && hasExistingConfig(projectPath, deps)) {
    return {
      created: false,
      skipped: true,
      message: 'Configuration already exists. Use --force to overwrite.'
    };
  }

  // Detect owner/repo from git remote (for GitHub Issues)
  const detected = detectGitRemote(projectPath, { execSync: exec });

  // Default to github platform
  const platform = options.platform || 'github';

  // Validate platform
  if (!PLATFORMS.includes(platform)) {
    return {
      created: false,
      error: `Invalid platform: ${platform}. Must be one of: ${PLATFORMS.join(', ')}`
    };
  }

  // Build config
  const config = buildDefaultConfig(platform, detected, options.overrides);

  // Ensure .claude directory exists
  try {
    if (!fileSystem.existsSync(configDir)) {
      fileSystem.mkdirSync(configDir, { recursive: true });
    }
  } catch (err) {
    return {
      created: false,
      error: `Failed to create config directory: ${err.message}`
    };
  }

  // Write config file
  try {
    // If file exists, merge with existing content
    let existingConfig = {};
    if (fileSystem.existsSync(configPath)) {
      try {
        existingConfig = JSON.parse(fileSystem.readFileSync(configPath, 'utf8'));
      } catch {
        // Ignore parse errors, will overwrite
      }
    }

    const mergedConfig = {
      ...existingConfig,
      onus: {
        ...(existingConfig.onus || {}),
        ...config.onus
      }
    };

    fileSystem.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2) + '\n');

    return {
      created: true,
      config: mergedConfig,
      platform,
      detected,
      path: configPath
    };
  } catch (err) {
    return {
      created: false,
      error: `Failed to write config: ${err.message}`
    };
  }
}

module.exports = {
  init,
  detectGitRemote,
  buildDefaultConfig,
  hasExistingConfig,
  DEFAULT_CONFIG,
  CONFIG_FILE,
  PLATFORMS
};

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--force') {
      options.force = true;
    } else if (args[i] === '--platform' && args[i + 1]) {
      options.platform = args[++i];
    }
  }

  const result = init(process.cwd(), options);

  if (result.error) {
    console.error('Error:', result.error);
    process.exit(1);
  } else if (result.skipped) {
    console.log(result.message);
  } else if (result.created) {
    console.log(`Created ${result.path}`);
    if (result.detected) {
      console.log(`  Platform: ${result.platform}`);
      console.log(`  Owner: ${result.detected.owner}`);
      console.log(`  Repo: ${result.detected.repo}`);
    }
  }
}
