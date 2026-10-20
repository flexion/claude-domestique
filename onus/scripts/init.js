/**
 * onus init - Project configuration initialization
 *
 * Provides utilities for detecting GitHub repo info from git remote and
 * generating default configuration. VCS is assumed to be GitHub (including
 * enterprise). Work item platform (GitHub Issues, JIRA, Azure DevOps) must
 * be explicitly configured.
 *
 * Writes `.onus/config.json`. `--migrate` copies the Onus section of a legacy
 * `.claude/config.json` into it and leaves the legacy file untouched.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const { findProjectRoot, legacySection, isPlainObject, CONFIG_FILE, LEGACY_CONFIG_FILE } = require('./config');

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
    ...DEFAULT_CONFIG,
    platform: platform || 'github',
    ...overrides
  };

  // Add platform-specific config
  if (platform === 'github' && detected) {
    config.github = {
      owner: detected.owner,
      repo: detected.repo
    };
  } else if (platform === 'jira') {
    config.jira = {
      host: overrides.jiraHost || null,
      project: overrides.jiraProject || null
    };
  } else if (platform === 'azure') {
    config.azure = {
      org: overrides.azureOrg || null,
      project: overrides.azureProject || null
    };
  }

  return config;
}

/**
 * Check if `.onus/config.json` exists (usable or not)
 * @param {string} projectPath - Project root directory
 * @param {object} deps - Dependencies for testing
 * @returns {boolean} True if the file exists
 */
function hasExistingConfig(projectPath, deps = {}) {
  const fileSystem = deps.fs || fs;
  return fileSystem.existsSync(path.join(projectPath, CONFIG_FILE));
}

/**
 * Read the Onus section of a legacy `.claude/config.json`
 * @param {string} projectPath - Project root directory
 * @param {object} deps - Dependencies for testing
 * @returns {object} { exists, key, section, error }
 */
function readLegacyConfig(projectPath, deps = {}) {
  const fileSystem = deps.fs || fs;
  const legacyPath = path.join(projectPath, LEGACY_CONFIG_FILE);

  if (!fileSystem.existsSync(legacyPath)) return { exists: false };

  try {
    const found = legacySection(JSON.parse(fileSystem.readFileSync(legacyPath, 'utf8')));
    return found ? { exists: true, ...found } : { exists: true };
  } catch (err) {
    return { exists: true, error: `${LEGACY_CONFIG_FILE} could not be parsed: ${err.message}` };
  }
}

/**
 * Write a config object to `.onus/config.json`, creating `.onus/` as needed
 * @returns {string|null} Error message, or null on success
 */
function writeConfig(configPath, config, fileSystem) {
  try {
    fileSystem.mkdirSync(path.dirname(configPath), { recursive: true });
  } catch (err) {
    return `Failed to create config directory: ${err.message}`;
  }
  try {
    fileSystem.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  } catch (err) {
    return `Failed to write config: ${err.message}`;
  }
  return null;
}

/**
 * Initialize project configuration
 * @param {string} projectPath - Project root directory
 * @param {object} options - Init options
 * @param {boolean} options.force - Overwrite existing config, or init despite a legacy section
 * @param {string} options.platform - Work item platform: 'github' (default), 'jira', or 'azure'
 * @param {object} options.overrides - Config overrides (jiraHost, jiraProject, azureOrg, azureProject)
 * @param {object} deps - Dependencies for testing
 * @returns {object} Result { created, skipped, config, error }
 */
function init(projectPath, options = {}, deps = {}) {
  const fileSystem = deps.fs || fs;
  const exec = deps.execSync || execSync;

  const configPath = path.join(projectPath, CONFIG_FILE);

  if (!options.force) {
    if (hasExistingConfig(projectPath, deps)) {
      return {
        created: false,
        skipped: true,
        message: `${CONFIG_FILE} already exists. Use --force to overwrite.`
      };
    }
    // A new file would shadow legacy settings with defaults; migrate instead.
    if (readLegacyConfig(projectPath, deps).section) {
      return {
        created: false,
        skipped: true,
        message: `Onus settings found in ${LEGACY_CONFIG_FILE}. Use --migrate to copy them to ${CONFIG_FILE}, or --force to write defaults.`
      };
    }
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

  // Merge over a usable existing file; an unusable one is replaced
  let existingConfig = {};
  if (fileSystem.existsSync(configPath)) {
    try {
      const parsed = JSON.parse(fileSystem.readFileSync(configPath, 'utf8'));
      if (isPlainObject(parsed)) existingConfig = parsed;
    } catch {
      // Ignore parse errors, will overwrite
    }
  }

  const mergedConfig = { ...existingConfig, ...config };
  const error = writeConfig(configPath, mergedConfig, fileSystem);
  if (error) return { created: false, error };

  return {
    created: true,
    config: mergedConfig,
    platform,
    detected,
    path: configPath
  };
}

/**
 * Copy the Onus section of `.claude/config.json` to `.onus/config.json`.
 * The legacy file is never modified.
 * @param {string} projectPath - Project root directory
 * @param {object} options - Migrate options
 * @param {boolean} options.force - Overwrite an existing `.onus/config.json`
 * @param {object} deps - Dependencies for testing
 * @returns {object} Result { created, skipped, config, error }
 */
function migrate(projectPath, options = {}, deps = {}) {
  const fileSystem = deps.fs || fs;
  const configPath = path.join(projectPath, CONFIG_FILE);

  const legacy = readLegacyConfig(projectPath, deps);
  if (!legacy.exists) {
    return { created: false, error: `Nothing to migrate: ${LEGACY_CONFIG_FILE} not found.` };
  }
  if (legacy.error) {
    return { created: false, error: legacy.error };
  }
  if (!legacy.section) {
    return { created: false, error: `Nothing to migrate: ${LEGACY_CONFIG_FILE} has no onus or workItem section.` };
  }

  if (!options.force && hasExistingConfig(projectPath, deps)) {
    return {
      created: false,
      skipped: true,
      message: `${CONFIG_FILE} already exists. Use --migrate --force to replace it with the legacy settings.`
    };
  }

  const error = writeConfig(configPath, legacy.section, fileSystem);
  if (error) return { created: false, error };

  return {
    created: true,
    migrated: true,
    config: legacy.section,
    from: legacy.key,
    path: configPath,
    message: `Copied the ${legacy.key} section of ${LEGACY_CONFIG_FILE} to ${CONFIG_FILE}. ${LEGACY_CONFIG_FILE} was not modified; its ${legacy.key} section is now ignored and can be removed by hand.`
  };
}

module.exports = {
  init,
  migrate,
  readLegacyConfig,
  detectGitRemote,
  buildDefaultConfig,
  hasExistingConfig,
  DEFAULT_CONFIG,
  CONFIG_FILE,
  LEGACY_CONFIG_FILE,
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
    } else if (args[i] === '--migrate') {
      options.migrate = true;
    } else if (args[i] === '--platform' && args[i + 1]) {
      options.platform = args[++i];
    }
  }

  // Same root the resolver reads from, so a run from a subdirectory writes
  // where hooks and skills will look.
  const projectPath = findProjectRoot(process.cwd());
  const result = options.migrate
    ? migrate(projectPath, options)
    : init(projectPath, options);

  if (result.error) {
    console.error('Error:', result.error);
    process.exit(1);
  } else if (result.skipped) {
    console.log(result.message);
  } else if (result.migrated) {
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
