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
const EXAMPLES_DIR = path.join(PACKAGE_ROOT, 'examples', 'context');
const HOOKS_DIR = path.join(PACKAGE_ROOT, 'hooks');
const SETTINGS_FILE = path.join(PACKAGE_ROOT, 'templates', 'settings.json');

/**
 * Initialize mantra in current directory
 */
function initCommand(args) {
  const force = args.includes('--force');
  const cwd = process.cwd();
  const targetDir = path.join(cwd, '.claude');
  const contextDir = path.join(targetDir, 'context');
  const hooksDir = path.join(targetDir, 'hooks');

  console.log('Initializing mantra...\n');

  // Check if .claude already exists
  if (fs.existsSync(targetDir) && !force) {
    console.log('⚠️  .claude/ directory already exists.');
    console.log('   Use --force to overwrite existing files.\n');
    console.log('   Existing files will NOT be overwritten without --force.');
    console.log('');
  }

  // Create directories
  mkdirSafe(contextDir);
  mkdirSafe(hooksDir);

  // Copy example context files
  console.log('📁 Creating context files...');
  const exampleFiles = fs.readdirSync(EXAMPLES_DIR);
  let copiedCount = 0;
  let skippedCount = 0;

  for (const file of exampleFiles) {
    if (file === 'README.md') continue; // Skip the examples README

    const src = path.join(EXAMPLES_DIR, file);
    const dest = path.join(contextDir, file);

    if (fs.existsSync(dest) && !force) {
      console.log(`   ⏭️  ${file} (exists, skipped)`);
      skippedCount++;
    } else {
      fs.copyFileSync(src, dest);
      console.log(`   ✅ ${file}`);
      copiedCount++;
    }
  }

  // Copy hook
  console.log('\n📁 Creating hook...');
  const hookSrc = path.join(HOOKS_DIR, 'context-refresh.js');
  const hookDest = path.join(hooksDir, 'context-refresh.js');

  if (fs.existsSync(hookDest) && !force) {
    console.log('   ⏭️  context-refresh.js (exists, skipped)');
    skippedCount++;
  } else {
    fs.copyFileSync(hookSrc, hookDest);
    fs.chmodSync(hookDest, 0o755);
    console.log('   ✅ context-refresh.js');
    copiedCount++;
  }

  // Copy settings
  console.log('\n📁 Creating settings...');
  const settingsDest = path.join(targetDir, 'settings.json');

  if (fs.existsSync(settingsDest) && !force) {
    console.log('   ⏭️  settings.json (exists, skipped)');
    skippedCount++;
  } else {
    fs.copyFileSync(SETTINGS_FILE, settingsDest);
    console.log('   ✅ settings.json');
    copiedCount++;
  }

  // Summary
  console.log('\n---');
  console.log(`✨ Done! ${copiedCount} files created, ${skippedCount} skipped.`);
  console.log('\nNext steps:');
  console.log('  1. Customize .claude/context/*.yml files for your project');
  console.log('  2. Update companion .md files with detailed examples');
  console.log('  3. Restart Claude Code to activate the hook');
  console.log('\nSee FORMAT.md for context file specification.');
}

/**
 * Show help
 */
function helpCommand() {
  console.log(`
mantra - Periodic context refresh for Claude Code

Usage:
  npx mantra <command> [options]

Commands:
  init [--force]    Initialize mantra in current directory
  help              Show this help message

Options:
  --force           Overwrite existing files

Examples:
  npx mantra init          # Initialize in current directory
  npx mantra init --force  # Overwrite existing files

Documentation:
  https://github.com/flexion/claude-domestique/tree/main/mantra
`);
}

/**
 * Create directory if it doesn't exist
 */
function mkdirSafe(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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
  EXAMPLES_DIR,
  HOOKS_DIR,
  SETTINGS_FILE
};

// Run if executed directly
if (require.main === module) {
  main();
}
