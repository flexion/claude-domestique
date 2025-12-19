#!/usr/bin/env node
/**
 * claude-onus init script
 *
 * Sets up work item integration configuration for a project.
 * - Creates .claude/ directory if missing
 * - Creates or updates .claude/config.json with onus settings
 * - Detects platform from git remote or existing config
 * - Never overwrites existing settings
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find plugin root
const PLUGIN_ROOT = path.join(__dirname, '..');
const TEMPLATES_DIR = path.join(PLUGIN_ROOT, 'templates', 'config');

/**
 * Detect git remote to infer platform and repo details
 */
function detectGitRemote(targetDir) {
  try {
    const remote = execSync('git remote get-url origin', {
      cwd: targetDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    // GitHub SSH: git@github.com:owner/repo.git
    const githubSsh = remote.match(/git@github\.com:([^/]+)\/(.+?)(\.git)?$/);
    if (githubSsh) {
      return {
        platform: 'github',
        owner: githubSsh[1],
        repo: githubSsh[2]
      };
    }

    // GitHub HTTPS: https://github.com/owner/repo.git
    const githubHttps = remote.match(/https:\/\/github\.com\/([^/]+)\/(.+?)(\.git)?$/);
    if (githubHttps) {
      return {
        platform: 'github',
        owner: githubHttps[1],
        repo: githubHttps[2]
      };
    }

    // Azure DevOps SSH: git@ssh.dev.azure.com:v3/org/project/repo
    const azureSsh = remote.match(/git@ssh\.dev\.azure\.com:v3\/([^/]+)\/([^/]+)\/(.+)$/);
    if (azureSsh) {
      return {
        platform: 'azure',
        org: azureSsh[1],
        project: azureSsh[2],
        repo: azureSsh[3]
      };
    }

    // Azure DevOps HTTPS: https://dev.azure.com/org/project/_git/repo
    const azureHttps = remote.match(/https:\/\/dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/(.+)$/);
    if (azureHttps) {
      return {
        platform: 'azure',
        org: azureHttps[1],
        project: azureHttps[2],
        repo: azureHttps[3]
      };
    }

    // Bitbucket (often used with JIRA)
    const bitbucket = remote.match(/bitbucket\.org[:/]([^/]+)\/(.+?)(\.git)?$/);
    if (bitbucket) {
      return {
        platform: 'jira', // Assume JIRA for Bitbucket
        owner: bitbucket[1],
        repo: bitbucket[2]
      };
    }

    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Load existing config file
 */
function loadExistingConfig(configPath) {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    console.log(`Warning: Could not parse existing config: ${e.message}`);
  }
  return {};
}

/**
 * Build default onus configuration
 */
function buildDefaultConfig(detected) {
  const config = {
    platform: detected?.platform || 'github',
    commitFormat: '#{number} - {verb} {description}',
    branchFormat: 'issue/{type}-{number}/{slug}'
  };

  if (detected?.platform === 'github') {
    config.github = {
      owner: detected.owner || 'OWNER',
      repo: detected.repo || 'REPO'
    };
  } else if (detected?.platform === 'azure') {
    config.azure = {
      org: detected.org || 'ORG',
      project: detected.project || 'PROJECT'
    };
  } else if (detected?.platform === 'jira') {
    config.jira = {
      host: 'your-company.atlassian.net',
      project: 'PROJ'
    };
  }

  return config;
}

/**
 * Initialize onus configuration in target directory
 */
function init(targetDir = process.cwd()) {
  const claudeDir = path.join(targetDir, '.claude');
  const configPath = path.join(claudeDir, 'config.json');

  console.log('claude-onus init');
  console.log('================');
  console.log(`Target: ${targetDir}`);
  console.log();

  // Create .claude/ directory
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
    console.log('Created: .claude/');
  } else {
    console.log('Exists:  .claude/');
  }

  // Detect git remote
  const detected = detectGitRemote(targetDir);
  if (detected) {
    console.log(`Detected: ${detected.platform} repository`);
    if (detected.owner && detected.repo) {
      console.log(`          ${detected.owner}/${detected.repo}`);
    } else if (detected.org && detected.project) {
      console.log(`          ${detected.org}/${detected.project}`);
    }
  } else {
    console.log('Could not detect git remote, using defaults');
  }
  console.log();

  // Load or create config
  const existingConfig = loadExistingConfig(configPath);
  const hasOnus = existingConfig.onus !== undefined;

  if (hasOnus) {
    console.log('Exists:  .claude/config.json (onus config present)');
    console.log('         Not overwriting existing configuration');
    console.log();
    console.log('Current onus config:');
    console.log(JSON.stringify(existingConfig.onus, null, 2));
  } else {
    // Build and merge onus config
    const onusConfig = buildDefaultConfig(detected);

    const newConfig = {
      ...existingConfig,
      onus: onusConfig
    };

    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    console.log('Created: .claude/config.json with onus configuration');
    console.log();
    console.log('New onus config:');
    console.log(JSON.stringify(onusConfig, null, 2));
  }

  console.log();
  console.log('Init complete!');
  console.log();
  console.log('Next steps:');
  console.log('1. Edit .claude/config.json with your platform details');
  console.log('2. For GitHub: Set GITHUB_TOKEN environment variable');
  console.log('3. For JIRA: Set JIRA_TOKEN environment variable');
  console.log('4. For Azure: Set AZURE_DEVOPS_TOKEN environment variable');
  console.log();
  console.log('Usage:');
  console.log('- Branch naming: issue/feature-42/description');
  console.log('- Issue detected automatically from branch name');
  console.log('- Use /fetch 42 to load issue details');
}

// CLI entry point
if (require.main === module) {
  const targetDir = process.argv[2] || process.cwd();
  init(path.resolve(targetDir));
}

module.exports = { init, detectGitRemote, buildDefaultConfig, loadExistingConfig };
