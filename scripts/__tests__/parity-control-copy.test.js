'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');
const { NEUTRAL_DESCRIPTION, createControlCopy } = require('../parity/control-copy');

// Mirrors the SEMVER expression enforced by scripts/validate-plugins.js.
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const VERSION_SURFACES = [
  'package.json',
  '.claude-plugin/plugin.json',
  '.codex-plugin/plugin.json',
];

const roots = [];

function write(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return filePath;
}

function writeJson(root, relativePath, content) {
  write(root, relativePath, JSON.stringify(content, null, 2) + '\n');
}

const DEFAULT_TARGET_SKILL = `---
name: target
description: Use when the caller needs the target behavior.
allowed-tools: Read, Grep
---

# Target

Body paragraph that must survive the ablation.

- first item
- second item
`;

function fixture(options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-control-copy-'));
  roots.push(root);
  const pluginRoot = path.join(root, 'plugin');

  writeJson(pluginRoot, 'package.json', {
    name: '@claude-domestique/example-plugin',
    version: '1.4.2',
  });
  writeJson(pluginRoot, '.claude-plugin/plugin.json', {
    name: 'example-plugin',
    version: '1.4.2',
  });
  writeJson(pluginRoot, '.codex-plugin/plugin.json', {
    name: 'example-plugin',
    version: '1.4.2',
  });
  write(pluginRoot, 'skills/target/SKILL.md', options.targetSkill || DEFAULT_TARGET_SKILL);
  write(pluginRoot, 'skills/target/references/matrix.md', `# Matrix

Nested reference content.
`);
  write(pluginRoot, 'skills/neighbour/SKILL.md', `---
name: neighbour
description: Use when the caller needs the neighbouring behavior.
---

# Neighbour

Neighbour body.
`);
  write(pluginRoot, 'rules/style.md', `# Style

Compact injected rule.
`);

  return {
    destination: path.join(root, 'control'),
    pluginRoot,
    root,
  };
}

function walk(root) {
  const entries = new Map();

  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort(byName)) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      if (entry.isSymbolicLink()) {
        entries.set(relative, { kind: 'symlink', target: fs.readlinkSync(absolute) });
      } else if (entry.isDirectory()) {
        entries.set(relative, { kind: 'directory' });
        visit(absolute);
      } else {
        entries.set(relative, { kind: 'file', content: fs.readFileSync(absolute) });
      }
    }
  };

  visit(root);
  return entries;
}

function byName(left, right) {
  return left.name < right.name ? -1 : left.name > right.name ? 1 : 0;
}

function splitSkill(content) {
  const remainder = content.slice(4);
  const closing = /\n---[ \t]*(?:\n|$)/.exec(remainder);
  return {
    body: content.slice(4 + closing.index + closing[0].length),
    frontmatter: content.slice(4, 4 + closing.index),
  };
}

function readSkill(root, skillName) {
  return fs.readFileSync(path.join(root, 'skills', skillName, 'SKILL.md'), 'utf8');
}

afterEach(() => {
  while (roots.length > 0) {
    fs.rmSync(roots.pop(), { recursive: true, force: true });
  }
});

test('returns the destination and reproduces every filename and directory', () => {
  const { destination, pluginRoot } = fixture();

  const result = createControlCopy({
    destination,
    pluginRoot,
    runId: 'trial-1',
    skillName: 'target',
  });

  expect(result).toBe(destination);
  expect([...walk(destination).keys()]).toEqual([...walk(pluginRoot).keys()]);
});

test('keeps every file outside the target skill and version surfaces byte-identical', () => {
  const { destination, pluginRoot } = fixture();

  createControlCopy({ destination, pluginRoot, runId: 'trial-1', skillName: 'target' });

  const source = walk(pluginRoot);
  const copy = walk(destination);
  const ablated = new Set(['skills/target/SKILL.md', ...VERSION_SURFACES]);

  for (const [relative, entry] of source) {
    if (ablated.has(relative) || entry.kind !== 'file') continue;
    expect(copy.get(relative).content.equals(entry.content)).toBe(true);
  }

  expect(copy.get('skills/neighbour/SKILL.md').content.equals(source.get('skills/neighbour/SKILL.md').content)).toBe(true);
  expect(copy.get('skills/target/references/matrix.md').content.equals(source.get('skills/target/references/matrix.md').content)).toBe(true);
  expect(copy.get('rules/style.md').content.equals(source.get('rules/style.md').content)).toBe(true);
});

test('replaces only the description scalar of the target skill', () => {
  const { destination, pluginRoot } = fixture();

  createControlCopy({ destination, pluginRoot, runId: 'trial-1', skillName: 'target' });

  const source = splitSkill(readSkill(pluginRoot, 'target'));
  const copy = splitSkill(readSkill(destination, 'target'));

  expect(copy.body).toBe(source.body);

  const sourceFrontmatter = yaml.load(source.frontmatter);
  const copyFrontmatter = yaml.load(copy.frontmatter);
  expect(copyFrontmatter.name).toBe('target');
  expect(copyFrontmatter.description).toBe(NEUTRAL_DESCRIPTION);
  expect(sourceFrontmatter.description).not.toBe(NEUTRAL_DESCRIPTION);

  delete sourceFrontmatter.description;
  delete copyFrontmatter.description;
  expect(copyFrontmatter).toEqual(sourceFrontmatter);

  expect(copy.frontmatter.split('\n')).toEqual([
    'name: target',
    'description: Skill.',
    'allowed-tools: Read, Grep',
  ]);
});

test('collapses a block-scalar description and preserves the following keys and body', () => {
  const { destination, pluginRoot } = fixture({
    targetSkill: `---
name: target
description: >-
  Use when the caller needs the target behavior and wants
  a long folded explanation of the triggering conditions.
allowed-tools: Read, Grep
model: inherit
---

# Target

Folded-scalar body that must survive the ablation.
`,
  });

  createControlCopy({ destination, pluginRoot, runId: 'trial-1', skillName: 'target' });

  const source = splitSkill(readSkill(pluginRoot, 'target'));
  const copy = splitSkill(readSkill(destination, 'target'));

  expect(copy.body).toBe(source.body);
  expect(copy.frontmatter.split('\n')).toEqual([
    'name: target',
    'description: Skill.',
    'allowed-tools: Read, Grep',
    'model: inherit',
  ]);

  const copyFrontmatter = yaml.load(copy.frontmatter);
  expect(copyFrontmatter.description).toBe(NEUTRAL_DESCRIPTION);
  expect(copyFrontmatter['allowed-tools']).toBe('Read, Grep');
  expect(copyFrontmatter.model).toBe('inherit');
});

test('stamps a unique control version on every copied version surface', () => {
  const { destination, pluginRoot } = fixture();

  createControlCopy({ destination, pluginRoot, runId: 'trial-1', skillName: 'target' });

  for (const surface of VERSION_SURFACES) {
    const copied = JSON.parse(fs.readFileSync(path.join(destination, surface), 'utf8'));
    expect(copied.version).toBe('0.0.0-control.trial-1');
    expect(SEMVER.test(copied.version)).toBe(true);
  }

  expect(JSON.parse(fs.readFileSync(path.join(destination, 'package.json'), 'utf8')).name)
    .toBe('@claude-domestique/example-plugin');
  expect(JSON.parse(fs.readFileSync(path.join(pluginRoot, 'package.json'), 'utf8')).version)
    .toBe('1.4.2');
});

test('sanitizes run identifier characters that are illegal in semver', () => {
  const { destination, pluginRoot } = fixture();

  createControlCopy({
    destination,
    pluginRoot,
    runId: 'claude 2.1.226/discovery_run+7',
    skillName: 'target',
  });

  const version = JSON.parse(fs.readFileSync(path.join(destination, 'package.json'), 'utf8')).version;
  expect(version).toBe('0.0.0-control.claude-2-1-226-discovery-run-7');
  expect(SEMVER.test(version)).toBe(true);
});

test('omits a version surface the source plugin does not declare', () => {
  const { destination, pluginRoot } = fixture();
  fs.rmSync(path.join(pluginRoot, '.codex-plugin'), { recursive: true, force: true });

  createControlCopy({ destination, pluginRoot, runId: 'trial-1', skillName: 'target' });

  expect(fs.existsSync(path.join(destination, '.codex-plugin'))).toBe(false);
  expect(JSON.parse(fs.readFileSync(path.join(destination, '.claude-plugin/plugin.json'), 'utf8')).version)
    .toBe('0.0.0-control.trial-1');
});

test('rejects an existing destination', () => {
  const { destination, pluginRoot } = fixture();
  fs.mkdirSync(destination, { recursive: true });

  expect(() => createControlCopy({
    destination,
    pluginRoot,
    runId: 'trial-1',
    skillName: 'target',
  })).toThrow(/destination already exists/);
});

test('rejects a missing plugin root', () => {
  const { destination, root } = fixture();

  expect(() => createControlCopy({
    destination,
    pluginRoot: path.join(root, 'absent-plugin'),
    runId: 'trial-1',
    skillName: 'target',
  })).toThrow(/plugin root/);
});

test('rejects a skill name without a SKILL.md', () => {
  const { destination, pluginRoot } = fixture();

  expect(() => createControlCopy({
    destination,
    pluginRoot,
    runId: 'trial-1',
    skillName: 'unknown',
  })).toThrow(/skills\/unknown\/SKILL\.md/);
});

test('rejects a symlink whose target escapes the plugin root', () => {
  const { destination, pluginRoot, root } = fixture();
  const outside = path.join(root, 'outside');
  fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(path.join(outside, 'secret.md'), '# Secret\n');
  fs.symlinkSync(path.join(outside, 'secret.md'), path.join(pluginRoot, 'skills/target/escape.md'));

  expect(() => createControlCopy({
    destination,
    pluginRoot,
    runId: 'trial-1',
    skillName: 'target',
  })).toThrow(/escapes the plugin root/);
});
