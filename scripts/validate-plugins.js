#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readJson(filePath, errors, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`${label}: invalid JSON (${error.message})`);
    return null;
  }
}

function readFrontmatter(filePath, errors, label) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    errors.push(`${label}: unable to read (${error.message})`);
    return null;
  }

  const normalized = content.replace(/\r\n/g, '\n');

  if (!normalized.startsWith('---\n')) {
    errors.push(`${label}: missing YAML frontmatter`);
    return null;
  }

  const closingMatch = /\n---(?:\n|$)/.exec(normalized.slice(4));
  if (!closingMatch) {
    errors.push(`${label}: unclosed YAML frontmatter`);
    return null;
  }
  const closing = closingMatch.index + 4;

  try {
    const frontmatter = yaml.load(normalized.slice(4, closing));
    if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
      errors.push(`${label}: frontmatter must be a YAML mapping`);
      return null;
    }
    return frontmatter;
  } catch (error) {
    errors.push(`${label}: invalid YAML frontmatter (${error.message})`);
    return null;
  }
}

function markdownFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => path.join(dirPath, entry.name))
    .sort();
}

function validatePromptFile(filePath, pluginRoot, errors) {
  const label = path.relative(pluginRoot, filePath);
  const frontmatter = readFrontmatter(filePath, errors, label);
  if (!frontmatter) return;
  if (typeof frontmatter.description !== 'string' || !frontmatter.description.trim()) {
    errors.push(`${label}: frontmatter description must be a non-empty string`);
  }
}

function validateSkills(pluginRoot, errors) {
  const skillsRoot = path.join(pluginRoot, 'skills');
  if (!fs.existsSync(skillsRoot)) return;

  const entries = fs.readdirSync(skillsRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    if (entry.isFile() && entry.name.endsWith('.md')) {
      const label = path.relative(pluginRoot, path.join(skillsRoot, entry.name));
      errors.push(`${label}: flat skill files are unsupported; use skills/<name>/SKILL.md`);
      continue;
    }
    if (!entry.isDirectory()) continue;

    const skillPath = path.join(skillsRoot, entry.name, 'SKILL.md');
    const label = path.relative(pluginRoot, skillPath);

    if (!KEBAB_CASE.test(entry.name)) {
      errors.push(`${label}: skill directory must be kebab-case`);
    }
    if (!fs.existsSync(skillPath)) {
      errors.push(`${label}: missing SKILL.md`);
      continue;
    }

    const frontmatter = readFrontmatter(skillPath, errors, label);
    if (!frontmatter) continue;

    const expectedName = entry.name;
    if (frontmatter.name !== expectedName) {
      errors.push(`${label}: skill name ${String(frontmatter.name)} must match directory ${expectedName}`);
    }
    if (typeof frontmatter.description !== 'string' || !frontmatter.description.trim()) {
      errors.push(`${label}: frontmatter description must be a non-empty string`);
    }
  }
}

function validatePromptFrontmatter(pluginRoot, errors) {
  for (const directory of ['agents', 'commands']) {
    for (const filePath of markdownFiles(path.join(pluginRoot, directory))) {
      validatePromptFile(filePath, pluginRoot, errors);
    }
  }
}

function validate(root = ROOT) {
  const errors = [];
  const marketplacePath = path.join(root, '.claude-plugin', 'marketplace.json');
  if (!fs.existsSync(marketplacePath)) {
    return ['marketplace: missing .claude-plugin/marketplace.json'];
  }

  const marketplace = readJson(marketplacePath, errors, 'marketplace');
  if (!marketplace) return errors;
  if (!Array.isArray(marketplace.plugins)) {
    return [...errors, 'marketplace: plugins must be an array'];
  }

  for (const entry of marketplace.plugins) {
    if (!entry || typeof entry !== 'object' || typeof entry.name !== 'string') {
      errors.push('marketplace: every plugin entry must have a name');
      continue;
    }
    const expectedSource = `./${entry.name}`;
    if (typeof entry.source !== 'string' || entry.source !== expectedSource) {
      errors.push(`${entry.name}: marketplace source must be ${expectedSource}`);
      continue;
    }

    const pluginRoot = path.resolve(root, entry.source);
    const packagePath = path.join(pluginRoot, 'package.json');
    const claudeManifestPath = path.join(pluginRoot, '.claude-plugin', 'plugin.json');
    const codexManifestPath = path.join(pluginRoot, '.codex-plugin', 'plugin.json');

    if (!fs.existsSync(packagePath)) {
      errors.push(`${entry.name}: missing package.json`);
      continue;
    }
    if (!fs.existsSync(claudeManifestPath)) {
      errors.push(`${entry.name}: missing .claude-plugin/plugin.json`);
      continue;
    }

    const packageJson = readJson(packagePath, errors, `${entry.name} package.json`);
    const claudeManifest = readJson(claudeManifestPath, errors, `${entry.name} Claude manifest`);
    if (!packageJson || !claudeManifest) continue;

    const expectedPackageName = `@claude-domestique/${entry.name}`;
    if (packageJson.name !== expectedPackageName) {
      errors.push(`${entry.name}: package name ${String(packageJson.name)} must be ${expectedPackageName}`);
    }

    const versions = [
      ['marketplace', entry.version],
      ['package', packageJson.version],
      ['Claude manifest', claudeManifest.version],
    ];

    if (!fs.existsSync(codexManifestPath)) {
      errors.push(`${entry.name}: missing .codex-plugin/plugin.json`);
    } else {
      const codexManifest = readJson(codexManifestPath, errors, `${entry.name} Codex manifest`);
      if (codexManifest) {
        versions.push(['Codex manifest', codexManifest.version]);
        if (codexManifest.name !== entry.name) {
          errors.push(`${entry.name}: Codex manifest name is ${String(codexManifest.name)}`);
        }
      }
    }

    if (claudeManifest.name !== entry.name) {
      errors.push(`${entry.name}: Claude manifest name is ${String(claudeManifest.name)}`);
    }

    const expectedVersion = entry.version;
    for (const [source, version] of versions) {
      if (typeof version !== 'string' || !SEMVER.test(version)) {
        errors.push(`${entry.name}: ${source} has invalid semver ${String(version)}`);
      } else if (version !== expectedVersion) {
        errors.push(`${entry.name}: ${source} version ${version} does not match ${expectedVersion}`);
      }
    }

    validateSkills(pluginRoot, errors);
    validatePromptFrontmatter(pluginRoot, errors);
  }

  return errors;
}

function main() {
  const errors = validate();
  if (errors.length > 0) {
    console.error('Plugin validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log('Plugin metadata and frontmatter validation passed.');
}

if (require.main === module) main();

module.exports = {
  readFrontmatter,
  readJson,
  validate,
};
