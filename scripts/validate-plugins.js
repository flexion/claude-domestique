#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { loadScenarios } = require('./parity/scenarios');

const ROOT = path.resolve(__dirname, '..');
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CATALOG_RELATIVE_PATH = 'metadata/skill-catalog.json';
const CLASSIFICATIONS = ['public', 'internal'];

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

// The catalog names skills as plugin:skill, so discovery has to walk the
// marketplace rather than the working directory. It runs independently of
// manifest validation so a broken manifest cannot silently empty the inventory
// and turn every catalog entry into a stale reference.
function discoverSkillNames(root, plugins) {
  const names = new Set();

  for (const entry of plugins) {
    if (!entry || typeof entry !== 'object' || typeof entry.name !== 'string') continue;
    if (typeof entry.source !== 'string' || entry.source !== `./${entry.name}`) continue;

    const skillsRoot = path.join(path.resolve(root, entry.source), 'skills');
    if (!fs.existsSync(skillsRoot)) continue;

    for (const skill of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
      if (!skill.isDirectory() || skill.name.startsWith('.')) continue;
      if (!fs.existsSync(path.join(skillsRoot, skill.name, 'SKILL.md'))) continue;
      names.add(`${entry.name}:${skill.name}`);
    }
  }

  return names;
}

function validateCatalogEntries(catalogSkills, discovered, errors) {
  const entries = new Map();

  for (const entry of catalogSkills) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) ||
      typeof entry.name !== 'string' || !entry.name.trim()) {
      errors.push('skill-catalog: every entry must have a name');
      continue;
    }
    if (entries.has(entry.name)) {
      errors.push(`skill-catalog: duplicate entry for ${entry.name}`);
      continue;
    }
    entries.set(entry.name, entry);

    if (!discovered.has(entry.name)) {
      errors.push(`skill-catalog: ${entry.name} does not exist`);
    }
    if (!CLASSIFICATIONS.includes(entry.classification)) {
      errors.push(`skill-catalog: ${entry.name} classification must be public or internal`);
    }
  }

  return entries;
}

function validateCatalogOrchestrators(entries, errors) {
  for (const [name, entry] of entries) {
    if (entry.classification === 'internal') {
      if (typeof entry.orchestrator !== 'string' || !entry.orchestrator.trim()) {
        errors.push(`skill-catalog: ${name} must declare an orchestrator`);
        continue;
      }
      const orchestrator = entries.get(entry.orchestrator);
      if (!orchestrator) {
        errors.push(`skill-catalog: ${name} orchestrator ${entry.orchestrator} does not exist`);
      } else if (orchestrator.classification !== 'public') {
        errors.push(
          `skill-catalog: ${name} orchestrator ${entry.orchestrator} must be classified public`
        );
      }
      continue;
    }

    if (entry.classification === 'public' && entry.orchestrator !== undefined) {
      errors.push(`skill-catalog: ${name} must not declare an orchestrator`);
    }
  }
}

function validateCatalogScenarios(root, entries, errors) {
  let scenarios;
  try {
    scenarios = loadScenarios(path.join(root, 'scenarios', 'parity'));
  } catch (error) {
    for (const problem of error.message.split('\n')) {
      errors.push(`skill-catalog: invalid scenario (${problem})`);
    }
    return;
  }

  const scenariosById = new Map(scenarios.map(scenario => [scenario.id, scenario]));

  for (const [name, entry] of entries) {
    if (entry.classification !== 'public') continue;
    if (!Array.isArray(entry.scenarios) || entry.scenarios.length === 0) {
      errors.push(`skill-catalog: ${name} must reference discovery scenarios`);
      continue;
    }

    const referenced = [];
    for (const scenarioId of entry.scenarios) {
      const scenario = scenariosById.get(scenarioId);
      if (!scenario) {
        errors.push(`skill-catalog: ${name} references missing scenario ${String(scenarioId)}`);
        continue;
      }
      if (scenario.class !== 'discovery') {
        errors.push(`skill-catalog: ${name} references non-discovery scenario ${scenarioId}`);
        continue;
      }
      if (scenario.target_skill !== name) {
        errors.push(
          `skill-catalog: ${name} references scenario ${scenarioId} targeting ${scenario.target_skill}`
        );
        continue;
      }
      referenced.push(scenario);
    }

    if (!referenced.some(scenario => scenario.expectation === 'positive')) {
      errors.push(`skill-catalog: ${name} must reference a positive discovery scenario`);
    }
    if (!referenced.some(scenario =>
      ['ordinary-negative', 'side-effect-negative'].includes(scenario.expectation))) {
      errors.push(`skill-catalog: ${name} must reference a negative discovery scenario`);
    }
    if (!referenced.some(scenario => scenario.expectation === 'ambiguous')) {
      errors.push(`skill-catalog: ${name} must reference a ambiguous/neighboring discovery scenario`);
    }
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validateDescriptionPolicy(root, entries, errors) {
  for (const [name, entry] of entries) {
    const separator = name.indexOf(':');
    if (separator === -1) continue;
    const plugin = name.slice(0, separator);
    const skill = name.slice(separator + 1);
    const relativeLabel = `skills/${skill}/SKILL.md`;
    const filePath = path.join(root, plugin, 'skills', skill, 'SKILL.md');
    if (!fs.existsSync(filePath)) continue;

    const frontmatter = readFrontmatter(filePath, errors, relativeLabel);
    if (!frontmatter || typeof frontmatter.description !== 'string') continue;
    const description = frontmatter.description.trim();

    if (entry.classification === 'public' && !description.startsWith('Use when')) {
      errors.push(`${relativeLabel}: public description must begin with "Use when"`);
    }
    if (entry.classification === 'internal' && typeof entry.orchestrator === 'string') {
      const expected = new RegExp(
        `^Internal .+ phase of ${escapeRegExp(entry.orchestrator)}\\. ` +
        'Not a standalone user workflow\\.$'
      );
      if (!expected.test(description)) {
        errors.push(`${relativeLabel}: internal description must use the non-triggering phase form`);
      }
    }

    if (/(?:\/|\$)[a-z0-9-]+:[a-z0-9-]+/i.test(description) || /\binvoke with\b/i.test(description)) {
      errors.push(`${relativeLabel}: description contains invocation syntax`);
    }
    if (/\b(?:workflow steps?|then runs?|returns?|reports?|produces?|works in \w+ phases?|give it)\b/i.test(description)) {
      errors.push(`${relativeLabel}: description contains workflow or output-summary language`);
    }
  }
}

function validateSkillCatalog(root, plugins, errors) {
  const catalogPath = path.join(root, ...CATALOG_RELATIVE_PATH.split('/'));
  if (!fs.existsSync(catalogPath)) {
    errors.push(`skill-catalog: missing ${CATALOG_RELATIVE_PATH}`);
    return;
  }

  const catalog = readJson(catalogPath, errors, 'skill-catalog');
  if (!catalog) return;
  if (!Array.isArray(catalog.skills)) {
    errors.push('skill-catalog: skills must be an array');
    return;
  }

  const discovered = discoverSkillNames(root, plugins);
  const entries = validateCatalogEntries(catalog.skills, discovered, errors);

  for (const name of [...discovered].sort()) {
    if (!entries.has(name)) {
      errors.push(`skill-catalog: missing entry for ${name}`);
    }
  }

  validateCatalogOrchestrators(entries, errors);
  validateCatalogScenarios(root, entries, errors);
  validateDescriptionPolicy(root, entries, errors);
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

  validateSkillCatalog(root, marketplace.plugins, errors);

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
