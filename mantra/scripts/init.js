#!/usr/bin/env node
/**
 * mantra init script
 *
 * Sets up native Claude rules by copying mantra's rules/*.md files
 * to the project's .claude/rules/ directory.
 *
 * These are frontmatter-only markdown files that leverage Claude Code's
 * native .claude/rules/ auto-loading mechanism.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Find plugin root (where this script lives is scripts/, go up one)
const PLUGIN_ROOT = path.join(__dirname, '..');
const RULES_DIR = path.join(PLUGIN_ROOT, 'rules');
const CONTEXT_DIR = path.join(PLUGIN_ROOT, 'context');
const STATUSLINE_SRC = path.join(__dirname, 'statusline.js');

/**
 * Compute MD5 hash of file content
 * @param {string} filePath - Path to file
 * @returns {string} MD5 hash hex string
 */
function computeFileHash(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('md5').update(content).digest('hex');
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
 * Initialize .claude/rules in target directory
 * @param {string} targetDir - Directory to initialize (defaults to cwd)
 * @param {Object} options - Configuration options
 * @param {boolean} options.force - Overwrite existing rules files
 */
function init(targetDir = process.cwd(), options = {}) {
  const { force = false } = options;
  const projectRulesDir = path.join(targetDir, '.claude', 'rules');

  console.log('mantra init');
  console.log('==================');
  console.log(`Target: ${targetDir}`);
  console.log(`Plugin: ${PLUGIN_ROOT}`);
  console.log();

  // Check for old setup and provide migration guidance
  const oldContextDir = path.join(targetDir, '.claude', 'context');
  if (fs.existsSync(oldContextDir)) {
    console.log('NOTE: Detected .claude/context/ (legacy mantra setup)');
    console.log('      The new version uses .claude/rules/ for native loading.');
    console.log('      Your custom context files in .claude/context/ will still work');
    console.log('      but consider migrating them to .claude/rules/ format.');
    console.log();
  }

  // Check for old hooks in settings.json
  const settingsPath = path.join(targetDir, '.claude', 'settings.json');
  if (fs.existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (settings.hooks && settings.hooks.length > 0) {
        const hasMantraHook = settings.hooks.some(h =>
          h.command && h.command.includes('context-refresh')
        );
        if (hasMantraHook) {
          console.log('WARNING: Found old mantra hook in .claude/settings.json');
          console.log('         Remove the context-refresh hook - it\'s no longer needed.');
          console.log();
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Create .claude/rules/ directory
  if (!fs.existsSync(projectRulesDir)) {
    fs.mkdirSync(projectRulesDir, { recursive: true });
    console.log('Created: .claude/rules/');
  } else {
    console.log('Exists:  .claude/rules/');
  }

  // Check if rules source directory exists
  if (!fs.existsSync(RULES_DIR)) {
    console.log('ERROR: Rules directory not found at:', RULES_DIR);
    console.log('       Plugin may be corrupted. Try reinstalling.');
    return { success: false, error: 'Rules directory not found' };
  }

  // Get list of rule files to copy
  const ruleFiles = fs.readdirSync(RULES_DIR)
    .filter(f => f.endsWith('.md'));

  if (ruleFiles.length === 0) {
    console.log('WARNING: No rule files found in plugin');
    return { success: true, copied: 0 };
  }

  console.log();
  console.log(`Copying ${ruleFiles.length} rule files...`);

  let copied = 0;
  let skipped = 0;
  let updated = 0;

  for (const file of ruleFiles) {
    const srcPath = path.join(RULES_DIR, file);
    const dstPath = path.join(projectRulesDir, file);

    if (fs.existsSync(dstPath) && !force) {
      // Check if content is different
      const srcContent = fs.readFileSync(srcPath, 'utf8');
      const dstContent = fs.readFileSync(dstPath, 'utf8');

      if (srcContent === dstContent) {
        console.log(`  Skip:   ${file} (unchanged)`);
        skipped++;
      } else {
        console.log(`  Exists: ${file} (use --force to update)`);
        skipped++;
      }
    } else {
      fs.copyFileSync(srcPath, dstPath);
      if (force && fs.existsSync(dstPath)) {
        console.log(`  Update: ${file}`);
        updated++;
      } else {
        console.log(`  Create: ${file}`);
        copied++;
      }
    }
  }

  console.log();
  console.log('Summary:');
  console.log(`  Created: ${copied}`);
  if (updated > 0) console.log(`  Updated: ${updated}`);
  if (skipped > 0) console.log(`  Skipped: ${skipped}`);

  // Copy companion/verbose files to .claude/context/
  const projectContextDir = path.join(targetDir, '.claude', 'context');

  if (fs.existsSync(CONTEXT_DIR)) {
    const contextFiles = fs.readdirSync(CONTEXT_DIR)
      .filter(f => f.endsWith('.md'));

    if (contextFiles.length > 0) {
      // Create .claude/context/ directory
      if (!fs.existsSync(projectContextDir)) {
        fs.mkdirSync(projectContextDir, { recursive: true });
        console.log();
        console.log('Created: .claude/context/');
      } else {
        console.log();
        console.log('Exists:  .claude/context/');
      }

      console.log();
      console.log(`Copying ${contextFiles.length} companion files...`);

      let contextCopied = 0;
      let contextSkipped = 0;
      let contextUpdated = 0;

      for (const file of contextFiles) {
        const srcPath = path.join(CONTEXT_DIR, file);
        const dstPath = path.join(projectContextDir, file);

        if (fs.existsSync(dstPath) && !force) {
          const srcContent = fs.readFileSync(srcPath, 'utf8');
          const dstContent = fs.readFileSync(dstPath, 'utf8');

          if (srcContent === dstContent) {
            console.log(`  Skip:   ${file} (unchanged)`);
            contextSkipped++;
          } else {
            console.log(`  Exists: ${file} (use --force to update)`);
            contextSkipped++;
          }
        } else {
          fs.copyFileSync(srcPath, dstPath);
          if (force && fs.existsSync(dstPath)) {
            console.log(`  Update: ${file}`);
            contextUpdated++;
          } else {
            console.log(`  Create: ${file}`);
            contextCopied++;
          }
        }
      }

      console.log();
      console.log('Companion files:');
      console.log(`  Created: ${contextCopied}`);
      if (contextUpdated > 0) console.log(`  Updated: ${contextUpdated}`);
      if (contextSkipped > 0) console.log(`  Skipped: ${contextSkipped}`);
    }
  }

  // Copy statusline script and configure settings.json
  const statuslineDst = path.join(targetDir, '.claude', 'statusline.js');
  let statuslineUpdated = false;

  if (fs.existsSync(STATUSLINE_SRC)) {
    const srcContent = fs.readFileSync(STATUSLINE_SRC, 'utf8');
    const dstExists = fs.existsSync(statuslineDst);
    const dstContent = dstExists ? fs.readFileSync(statuslineDst, 'utf8') : '';

    if (!dstExists) {
      fs.writeFileSync(statuslineDst, srcContent);
      console.log();
      console.log('Created: .claude/statusline.js');
      statuslineUpdated = true;
    } else if (srcContent !== dstContent && force) {
      fs.writeFileSync(statuslineDst, srcContent);
      console.log();
      console.log('Updated: .claude/statusline.js');
      statuslineUpdated = true;
    } else if (srcContent !== dstContent) {
      console.log();
      console.log('Exists:  .claude/statusline.js (use --force to update)');
    } else {
      console.log();
      console.log('Exists:  .claude/statusline.js (unchanged)');
    }

    // Configure settings.json
    const settingsPath = path.join(targetDir, '.claude', 'settings.json');
    let settings = {};

    if (fs.existsSync(settingsPath)) {
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      } catch (e) {
        console.log('WARNING: Could not parse .claude/settings.json');
      }
    }

    // Add statusLine config if not present or if we're forcing
    if (!settings.statusLine || force) {
      settings.statusLine = {
        type: 'command',
        command: '.claude/statusline.js'
      };
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
      console.log('Configured: .claude/settings.json statusLine');
    } else {
      console.log('Exists:  .claude/settings.json statusLine');
    }
  }

  // Write version file with hashes for update detection
  const contextFiles = fs.existsSync(CONTEXT_DIR)
    ? fs.readdirSync(CONTEXT_DIR).filter(f => f.endsWith('.md'))
    : [];

  const versionFile = path.join(projectRulesDir, '.mantra-version.json');
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
      : null,
    statuslineHash: fs.existsSync(STATUSLINE_SRC) ? computeFileHash(STATUSLINE_SRC) : null
  };
  fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2) + '\n');
  console.log();
  console.log('Written: .claude/rules/.mantra-version.json');

  console.log();
  console.log('Init complete!');
  console.log();
  console.log('How it works:');
  console.log('- .claude/rules/*.md files are auto-loaded by Claude Code');
  console.log('- Each rule file has compact YAML in frontmatter');
  console.log('- Companion files in .claude/context/ provide detailed examples');
  console.log('- Status line shows rules count and context usage');
  console.log();
  console.log('To update rules after plugin update:');
  console.log('  Run /mantra:init --force');

  return { success: true, copied, updated, skipped, statuslineUpdated };
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const force = args.includes('--force') || args.includes('-f');
  const targetDir = args.find(a => !a.startsWith('-')) || process.cwd();

  init(path.resolve(targetDir), { force });
}

module.exports = { init };
