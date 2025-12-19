#!/usr/bin/env node
/**
 * bump-version.js - Bump plugin version across all config files
 *
 * Usage: node scripts/bump-version.js <plugin> <patch|minor|major>
 *
 * Updates version in:
 * - <plugin>/package.json
 * - <plugin>/.claude-plugin/plugin.json
 * - .claude-plugin/marketplace.json
 */

const fs = require('fs');
const path = require('path');

const PLUGINS = ['mantra', 'memento', 'onus'];
const VERSION_TYPES = ['patch', 'minor', 'major'];

function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node scripts/bump-version.js <plugin> <patch|minor|major>');
    console.error('');
    console.error('Plugins:', PLUGINS.join(', '));
    console.error('');
    console.error('Examples:');
    console.error('  node scripts/bump-version.js memento patch');
    console.error('  node scripts/bump-version.js mantra minor');
    process.exit(1);
  }

  const [plugin, versionType] = args;

  if (!PLUGINS.includes(plugin)) {
    console.error(`Unknown plugin: ${plugin}`);
    console.error('Available plugins:', PLUGINS.join(', '));
    process.exit(1);
  }

  if (!VERSION_TYPES.includes(versionType)) {
    console.error(`Unknown version type: ${versionType}`);
    console.error('Available types:', VERSION_TYPES.join(', '));
    process.exit(1);
  }

  return { plugin, versionType };
}

function bumpVersion(currentVersion, type) {
  const parts = currentVersion.split('.').map(Number);

  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid version format: ${currentVersion}`);
  }

  let [major, minor, patch] = parts;

  switch (type) {
    case 'major':
      major++;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor++;
      patch = 0;
      break;
    case 'patch':
      patch++;
      break;
  }

  return `${major}.${minor}.${patch}`;
}

function updateJsonFile(filePath, updateFn) {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const updated = updateFn(content);
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n');
  return updated;
}

function main() {
  const { plugin, versionType } = parseArgs();
  const rootDir = path.resolve(__dirname, '..');

  // Paths
  const packageJsonPath = path.join(rootDir, plugin, 'package.json');
  const pluginJsonPath = path.join(rootDir, plugin, '.claude-plugin', 'plugin.json');
  const marketplaceJsonPath = path.join(rootDir, '.claude-plugin', 'marketplace.json');

  // Read current version from package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const currentVersion = packageJson.version;
  const newVersion = bumpVersion(currentVersion, versionType);

  console.log(`Bumping ${plugin}: ${currentVersion} → ${newVersion}`);
  console.log('');

  // Update package.json
  updateJsonFile(packageJsonPath, (content) => {
    content.version = newVersion;
    return content;
  });
  console.log(`  ✓ ${plugin}/package.json`);

  // Update plugin.json
  updateJsonFile(pluginJsonPath, (content) => {
    content.version = newVersion;
    return content;
  });
  console.log(`  ✓ ${plugin}/.claude-plugin/plugin.json`);

  // Update marketplace.json
  updateJsonFile(marketplaceJsonPath, (content) => {
    const pluginEntry = content.plugins.find(p => p.name === plugin);
    if (pluginEntry) {
      pluginEntry.version = newVersion;
    } else {
      console.error(`  ⚠ Plugin ${plugin} not found in marketplace.json`);
    }
    return content;
  });
  console.log(`  ✓ .claude-plugin/marketplace.json`);

  console.log('');
  console.log(`Done! ${plugin} is now at version ${newVersion}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Review changes: git diff');
  console.log('  2. Commit: git add -A && git commit -m "chore - bump ' + plugin + ' to ' + newVersion + '"');
}

main();
