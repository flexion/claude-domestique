#!/usr/bin/env node
/**
 * mantra CLI
 *
 * Usage:
 *   npx mantra init [--force]
 */

const fs = require('fs');
const path = require('path');

const COMMANDS = {
  init: initCommand,
  help: helpCommand
};

// Paths
const PACKAGE_ROOT = path.join(__dirname, '..');
const RULES_DIR = path.join(PACKAGE_ROOT, 'rules');

/**
 * Initialize mantra in current directory
 * @param {string[]} args - Command line arguments
 * @param {Object} options - Options for testing
 * @param {string} options.rulesSourceDir - Override source directory (testing only)
 */
function initCommand(args, options = {}) {
  const force = args.includes('--force');
  const cwd = process.cwd();
  const targetDir = path.join(cwd, '.claude');
  const rulesDir = path.join(targetDir, 'rules');
  const rulesSourceDir = options.rulesSourceDir || RULES_DIR;

  console.log('Initializing mantra...\n');

  // Check for old setup and provide migration guidance
  const oldContextDir = path.join(targetDir, 'context');
  if (fs.existsSync(oldContextDir)) {
    console.log('NOTE: Detected .claude/context/ (legacy mantra setup)');
    console.log('      The new version uses .claude/rules/ for native loading.');
    console.log('      Your custom context files will still work.');
    console.log('');
  }

  // Check for old hooks in settings.json
  const settingsPath = path.join(targetDir, 'settings.json');
  if (fs.existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (settings.hooks) {
        const hasMantraHook = JSON.stringify(settings.hooks).includes('context-refresh');
        if (hasMantraHook) {
          console.log('WARNING: Found old mantra hook in .claude/settings.json');
          console.log('         Remove the context-refresh hook - it\'s no longer needed.');
          console.log('');
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Create rules directory
  if (!fs.existsSync(rulesDir)) {
    fs.mkdirSync(rulesDir, { recursive: true });
    console.log('Created: .claude/rules/');
  } else {
    console.log('Exists:  .claude/rules/');
  }

  // Check if rules source directory exists
  if (!fs.existsSync(rulesSourceDir)) {
    console.error('ERROR: Rules directory not found at:', rulesSourceDir);
    console.error('       Plugin may be corrupted. Try reinstalling.');
    process.exit(1);
  }

  // Get list of rule files to copy
  const ruleFiles = fs.readdirSync(rulesSourceDir).filter(f => f.endsWith('.md'));

  if (ruleFiles.length === 0) {
    console.log('WARNING: No rule files found in plugin');
    return;
  }

  console.log(`\nCopying ${ruleFiles.length} rule files...`);

  let copied = 0;
  let skipped = 0;
  let updated = 0;

  for (const file of ruleFiles) {
    const srcPath = path.join(rulesSourceDir, file);
    const dstPath = path.join(rulesDir, file);

    if (fs.existsSync(dstPath) && !force) {
      const srcContent = fs.readFileSync(srcPath, 'utf8');
      const dstContent = fs.readFileSync(dstPath, 'utf8');

      if (srcContent === dstContent) {
        console.log(`  Skip:   ${file} (unchanged)`);
      } else {
        console.log(`  Exists: ${file} (use --force to update)`);
      }
      skipped++;
    } else {
      const existed = fs.existsSync(dstPath);
      fs.copyFileSync(srcPath, dstPath);
      if (existed) {
        console.log(`  Update: ${file}`);
        updated++;
      } else {
        console.log(`  Create: ${file}`);
        copied++;
      }
    }
  }

  console.log('\n---');
  console.log(`Done! ${copied} created, ${updated} updated, ${skipped} skipped.`);
  console.log('\nHow it works:');
  console.log('  - .claude/rules/*.md files are auto-loaded by Claude Code');
  console.log('  - Each rule file has compact YAML in frontmatter');
  console.log('  - Detailed examples in companion files (loaded on-demand)');
  console.log('\nTo update rules after plugin update:');
  console.log('  npx mantra init --force');
}

/**
 * Show help
 */
function helpCommand() {
  console.log(`
mantra - Behavioral rules for Claude Code

Usage:
  npx mantra <command> [options]

Commands:
  init [--force]    Initialize mantra rules in current directory
  help              Show this help message

Options:
  --force           Overwrite existing rule files

Examples:
  npx mantra init          # Initialize in current directory
  npx mantra init --force  # Overwrite existing files

How it works:
  - Copies rule files to .claude/rules/
  - Claude Code auto-loads these rules at session start
  - Each rule file has compact YAML in frontmatter

Documentation:
  https://github.com/flexion/claude-domestique/tree/main/mantra
`);
}

// Main
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const commandArgs = args.slice(1);

  if (COMMANDS[command]) {
    COMMANDS[command](commandArgs);
  } else {
    console.error(`Unknown command: ${command}`);
    console.error('Run "npx mantra help" for usage.');
    process.exit(1);
  }
}

// Export for testing
module.exports = {
  initCommand,
  helpCommand,
  RULES_DIR
};

// Run if executed directly
if (require.main === module) {
  main();
}
