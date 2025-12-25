#!/usr/bin/env node
/**
 * memento init script
 *
 * Sets up session management by copying memento's rules, context, and templates
 * to the project's .claude/ directory.
 *
 * - rules/*.md → .claude/rules/ (auto-loaded by Claude Code)
 * - context/*.md → .claude/context/ (companion docs)
 * - templates/*.md → .claude/templates/ (session templates)
 * - Creates .claude/sessions/ and .claude/branches/ directories
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Find plugin root (where this script lives is scripts/, go up one)
const PLUGIN_ROOT = path.join(__dirname, '..');
const RULES_DIR = path.join(PLUGIN_ROOT, 'rules');
const CONTEXT_DIR = path.join(PLUGIN_ROOT, 'context');
const TEMPLATES_DIR = path.join(PLUGIN_ROOT, 'templates');

/**
 * Compute MD5 hash of file content
 * @param {string} filePath - Path to file
 * @returns {string|null} MD5 hash hex string or null if file doesn't exist
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
 * MD5 of concatenated MD5s (sorted by filename)
 * @param {string} dir - Directory containing files
 * @param {string[]} files - List of filenames
 * @returns {string} Combined MD5 hash
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
 * @param {string} srcDir - Source directory
 * @param {string} dstDir - Destination directory
 * @param {string} filter - File extension filter (e.g., '.md')
 * @param {boolean} force - Overwrite existing files
 * @returns {Object} Copy statistics
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
 * Initialize memento in target directory
 * @param {string} targetDir - Directory to initialize (defaults to cwd)
 * @param {Object} options - Configuration options
 * @param {boolean} options.force - Overwrite existing files
 */
function init(targetDir = process.cwd(), options = {}) {
  const { force = false } = options;

  const projectRulesDir = path.join(targetDir, '.claude', 'rules');
  const projectContextDir = path.join(targetDir, '.claude', 'context');
  const projectTemplatesDir = path.join(targetDir, '.claude', 'templates');
  const projectSessionsDir = path.join(targetDir, '.claude', 'sessions');
  const projectBranchesDir = path.join(targetDir, '.claude', 'branches');

  console.log('memento init');
  console.log('==================');
  console.log(`Target: ${targetDir}`);
  console.log(`Plugin: ${PLUGIN_ROOT}`);
  console.log();

  // Create all directories
  const dirs = [
    { path: projectRulesDir, name: '.claude/rules/' },
    { path: projectContextDir, name: '.claude/context/' },
    { path: projectTemplatesDir, name: '.claude/templates/' },
    { path: projectSessionsDir, name: '.claude/sessions/' },
    { path: projectBranchesDir, name: '.claude/branches/' }
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir.path)) {
      fs.mkdirSync(dir.path, { recursive: true });
      console.log(`Created: ${dir.name}`);
    } else {
      console.log(`Exists:  ${dir.name}`);
    }
  }

  // Check if rules source directory exists
  if (!fs.existsSync(RULES_DIR)) {
    console.log('ERROR: Rules directory not found at:', RULES_DIR);
    console.log('       Plugin may be corrupted. Try reinstalling.');
    return { success: false, error: 'Rules directory not found' };
  }

  // Get list of rule files
  const ruleFiles = fs.readdirSync(RULES_DIR).filter(f => f.endsWith('.md'));

  if (ruleFiles.length === 0) {
    console.log('WARNING: No rule files found in plugin');
    return { success: true, copied: 0 };
  }

  // Copy rules
  console.log();
  console.log(`Copying ${ruleFiles.length} rule files...`);
  const rulesStats = copyFiles(RULES_DIR, projectRulesDir, '.md', force);

  console.log();
  console.log('Rules:');
  console.log(`  Created: ${rulesStats.copied}`);
  if (rulesStats.updated > 0) console.log(`  Updated: ${rulesStats.updated}`);
  if (rulesStats.skipped > 0) console.log(`  Skipped: ${rulesStats.skipped}`);

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

  // Copy templates
  if (fs.existsSync(TEMPLATES_DIR)) {
    const templateFiles = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.md'));

    if (templateFiles.length > 0) {
      console.log();
      console.log(`Copying ${templateFiles.length} session templates...`);
      const templateStats = copyFiles(TEMPLATES_DIR, projectTemplatesDir, '.md', force);

      console.log();
      console.log('Templates:');
      console.log(`  Created: ${templateStats.copied}`);
      if (templateStats.updated > 0) console.log(`  Updated: ${templateStats.updated}`);
      if (templateStats.skipped > 0) console.log(`  Skipped: ${templateStats.skipped}`);
    }
  }

  // Write version file with hashes for update detection
  const contextFiles = fs.existsSync(CONTEXT_DIR)
    ? fs.readdirSync(CONTEXT_DIR).filter(f => f.endsWith('.md'))
    : [];
  const templateFiles = fs.existsSync(TEMPLATES_DIR)
    ? fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.md'))
    : [];

  const versionFile = path.join(projectRulesDir, '.memento-version.json');
  const versionData = {
    version: require(path.join(PLUGIN_ROOT, 'package.json')).version,
    copiedAt: new Date().toISOString(),
    files: {
      rules: ruleFiles,
      context: contextFiles,
      templates: templateFiles
    },
    rulesHash: computeContentHash(RULES_DIR, ruleFiles),
    contextHash: contextFiles.length > 0
      ? computeContentHash(CONTEXT_DIR, contextFiles)
      : null,
    templatesHash: templateFiles.length > 0
      ? computeContentHash(TEMPLATES_DIR, templateFiles)
      : null
  };
  fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2) + '\n');
  console.log();
  console.log('Written: .claude/rules/.memento-version.json');

  console.log();
  console.log('Init complete!');
  console.log();
  console.log('How it works:');
  console.log('- .claude/rules/*.md files are auto-loaded by Claude Code');
  console.log('- .claude/context/*.md has detailed session workflow docs');
  console.log('- .claude/templates/*.md has session file templates');
  console.log('- .claude/sessions/ stores your session files');
  console.log('- .claude/branches/ maps branches to sessions');
  console.log();
  console.log('To update after plugin update:');
  console.log('  Run /memento:init --force');

  return {
    success: true,
    rules: rulesStats,
    context: fs.existsSync(CONTEXT_DIR) ? copyFiles(CONTEXT_DIR, projectContextDir, '.md', false) : null,
    templates: fs.existsSync(TEMPLATES_DIR) ? copyFiles(TEMPLATES_DIR, projectTemplatesDir, '.md', false) : null
  };
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const force = args.includes('--force') || args.includes('-f');
  const targetDir = args.find(a => !a.startsWith('-')) || process.cwd();

  init(path.resolve(targetDir), { force });
}

module.exports = { init, computeContentHash, computeFileHash };
