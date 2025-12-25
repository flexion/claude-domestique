#!/usr/bin/env node
/**
 * onus init script
 *
 * Sets up work item integration for a project.
 * - Copies rules to .claude/rules/ (auto-loaded by Claude Code)
 * - Copies context docs to .claude/context/
 * - Creates .claude/config.json with platform settings
 * - Detects platform from git remote
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Find plugin root
const PLUGIN_ROOT = path.join(__dirname, '..');
const RULES_DIR = path.join(PLUGIN_ROOT, 'rules');
const CONTEXT_DIR = path.join(PLUGIN_ROOT, 'context');
const TEMPLATES_DIR = path.join(PLUGIN_ROOT, 'templates', 'config');

/**
 * Compute MD5 hash of file content
 */
function computeFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('md5').update(content).digest('hex');
  } catch (e) {
    return null;
  }
}

/**
 * Compute combined hash for multiple files
 */
function computeContentHash(dir, files) {
  const hashes = [];
  for (const file of files.sort()) {
    try {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      const hash = crypto.createHash('md5').update(content).digest('hex');
      hashes.push(`${file}:${hash}`);
    } catch (e) {
      // Skip unreadable files
    }
  }
  return crypto.createHash('md5').update(hashes.join('\n')).digest('hex');
}

/**
 * Copy files from source to destination directory
 */
function copyFiles(srcDir, dstDir, filter, force) {
  const stats = { copied: 0, skipped: 0, updated: 0 };

  if (!fs.existsSync(srcDir)) {
    return stats;
  }

  const files = fs.readdirSync(srcDir).filter(f => f.endsWith(filter));

  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const dstPath = path.join(dstDir, file);

    if (fs.existsSync(dstPath) && !force) {
      const srcContent = fs.readFileSync(srcPath, 'utf8');
      const dstContent = fs.readFileSync(dstPath, 'utf8');

      if (srcContent === dstContent) {
        console.log(`  Skip:   ${file} (unchanged)`);
        stats.skipped++;
      } else {
        console.log(`  Exists: ${file} (use --force to update)`);
        stats.skipped++;
      }
    } else {
      const existed = fs.existsSync(dstPath);
      fs.copyFileSync(srcPath, dstPath);
      if (force && existed) {
        console.log(`  Update: ${file}`);
        stats.updated++;
      } else {
        console.log(`  Create: ${file}`);
        stats.copied++;
      }
    }
  }

  return stats;
}

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
 * Initialize onus in target directory
 */
function init(targetDir = process.cwd(), options = {}) {
  const { force = false } = options;
  const claudeDir = path.join(targetDir, '.claude');
  const projectRulesDir = path.join(claudeDir, 'rules');
  const projectContextDir = path.join(claudeDir, 'context');
  const configPath = path.join(claudeDir, 'config.json');

  console.log('onus init');
  console.log('================');
  console.log(`Target: ${targetDir}`);
  console.log(`Plugin: ${PLUGIN_ROOT}`);
  console.log();

  // Create directories
  const dirs = [
    { path: claudeDir, name: '.claude/' },
    { path: projectRulesDir, name: '.claude/rules/' },
    { path: projectContextDir, name: '.claude/context/' }
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir.path)) {
      fs.mkdirSync(dir.path, { recursive: true });
      console.log(`Created: ${dir.name}`);
    } else {
      console.log(`Exists:  ${dir.name}`);
    }
  }

  // Copy rules
  if (fs.existsSync(RULES_DIR)) {
    const ruleFiles = fs.readdirSync(RULES_DIR).filter(f => f.endsWith('.md'));
    if (ruleFiles.length > 0) {
      console.log();
      console.log(`Copying ${ruleFiles.length} rule files...`);
      const rulesStats = copyFiles(RULES_DIR, projectRulesDir, '.md', force);
      console.log();
      console.log('Rules:');
      console.log(`  Created: ${rulesStats.copied}`);
      if (rulesStats.updated > 0) console.log(`  Updated: ${rulesStats.updated}`);
      if (rulesStats.skipped > 0) console.log(`  Skipped: ${rulesStats.skipped}`);
    }
  }

  // Copy context files
  if (fs.existsSync(CONTEXT_DIR)) {
    const contextFiles = fs.readdirSync(CONTEXT_DIR).filter(f => f.endsWith('.md'));
    if (contextFiles.length > 0) {
      console.log();
      console.log(`Copying ${contextFiles.length} companion files...`);
      const contextStats = copyFiles(CONTEXT_DIR, projectContextDir, '.md', force);
      console.log();
      console.log('Companion files:');
      console.log(`  Created: ${contextStats.copied}`);
      if (contextStats.updated > 0) console.log(`  Updated: ${contextStats.updated}`);
      if (contextStats.skipped > 0) console.log(`  Skipped: ${contextStats.skipped}`);
    }
  }

  // Write version file
  const ruleFiles = fs.existsSync(RULES_DIR)
    ? fs.readdirSync(RULES_DIR).filter(f => f.endsWith('.md'))
    : [];
  const contextFiles = fs.existsSync(CONTEXT_DIR)
    ? fs.readdirSync(CONTEXT_DIR).filter(f => f.endsWith('.md'))
    : [];

  if (ruleFiles.length > 0) {
    const versionFile = path.join(projectRulesDir, '.onus-version.json');
    const versionData = {
      version: require(path.join(PLUGIN_ROOT, 'package.json')).version,
      copiedAt: new Date().toISOString(),
      files: {
        rules: ruleFiles,
        context: contextFiles
      },
      rulesHash: computeContentHash(RULES_DIR, ruleFiles),
      contextHash: contextFiles.length > 0
        ? computeContentHash(CONTEXT_DIR, contextFiles)
        : null
    };
    fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2) + '\n');
    console.log();
    console.log('Written: .claude/rules/.onus-version.json');
  }

  // Detect git remote
  console.log();
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

  if (hasOnus && !force) {
    console.log('Exists:  .claude/config.json (onus config present)');
    console.log('         Not overwriting existing configuration');
  } else {
    // Build and merge onus config
    const onusConfig = buildDefaultConfig(detected);

    const newConfig = {
      ...existingConfig,
      onus: onusConfig
    };

    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    if (hasOnus) {
      console.log('Updated: .claude/config.json');
    } else {
      console.log('Created: .claude/config.json');
    }
  }

  console.log();
  console.log('Init complete!');
  console.log();
  console.log('How it works:');
  console.log('- .claude/rules/*.md files are auto-loaded by Claude Code');
  console.log('- Git workflow and work item rules loaded automatically');
  console.log('- Issue detected from branch name (issue/feature-N/desc)');
  console.log();
  console.log('To update after plugin update:');
  console.log('  Run /onus:init --force');

  return { success: true };
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const force = args.includes('--force') || args.includes('-f');
  const targetDir = args.find(a => !a.startsWith('-')) || process.cwd();

  init(path.resolve(targetDir), { force });
}

module.exports = { init, detectGitRemote, buildDefaultConfig, loadExistingConfig, computeContentHash, computeFileHash };
