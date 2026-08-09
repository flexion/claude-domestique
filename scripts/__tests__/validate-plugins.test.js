'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { validate } = require('../validate-plugins');

const roots = [];

function write(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function writeJson(root, relativePath, content) {
  write(root, relativePath, JSON.stringify(content, null, 2) + '\n');
}

function fixture(options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-plugins-'));
  roots.push(root);
  const plugin = options.plugin || 'example-plugin';
  const version = '1.2.3';

  writeJson(root, '.claude-plugin/marketplace.json', {
    name: 'test-marketplace',
    plugins: [{ name: plugin, source: `./${plugin}`, version }],
  });
  writeJson(root, `${plugin}/package.json`, {
    name: options.packageName || `@claude-domestique/${plugin}`,
    version,
  });
  writeJson(root, `${plugin}/.claude-plugin/plugin.json`, { name: plugin, version });
  writeJson(root, `${plugin}/.codex-plugin/plugin.json`, { name: plugin, version });
  write(root, `${plugin}/skills/review/SKILL.md`, `---
name: ${options.skillName || 'review'}
description: Review a project.
---

# Review
`);

  return { plugin, root };
}

afterEach(() => {
  while (roots.length > 0) {
    fs.rmSync(roots.pop(), { recursive: true, force: true });
  }
});

test('accepts consistent manifests and valid skill frontmatter', () => {
  const { root } = fixture();
  expect(validate(root)).toEqual([]);
});

test('accepts CRLF-delimited frontmatter', () => {
  const { plugin, root } = fixture();
  write(root, `${plugin}/skills/review/SKILL.md`, [
    '---',
    'name: review',
    'description: Review a project.',
    '---',
    '',
    '# Review',
    '',
  ].join('\r\n'));
  expect(validate(root)).toEqual([]);
});

test('reports package and skill names that violate repository conventions', () => {
  const { root } = fixture({ packageName: 'example-plugin', skillName: 'example-plugin:review' });
  const errors = validate(root);
  expect(errors).toContain('example-plugin: package name example-plugin must be @claude-domestique/example-plugin');
  expect(errors).toContain('skills/review/SKILL.md: skill name example-plugin:review must match directory review');
});

test('collects malformed JSON as a validation error instead of throwing', () => {
  const { plugin, root } = fixture();
  write(root, `${plugin}/.claude-plugin/plugin.json`, '{not json}\n');
  expect(() => validate(root)).not.toThrow();
  expect(validate(root).some(error => error.includes('Claude manifest: invalid JSON'))).toBe(true);
});

test('rejects invalid YAML in command and agent frontmatter', () => {
  const { plugin, root } = fixture();
  write(root, `${plugin}/commands/review.md`, `---
description: Usage: review a file
---
`);
  write(root, `${plugin}/agents/reviewer.md`, `---
description: [unterminated
---
`);

  const errors = validate(root);
  expect(errors.some(error => error.startsWith('commands/review.md: invalid YAML frontmatter'))).toBe(true);
  expect(errors.some(error => error.startsWith('agents/reviewer.md: invalid YAML frontmatter'))).toBe(true);
});

test('temporarily accepts the namespaced Phase 2 legacy skills', () => {
  const { root } = fixture({ plugin: 'memento' });
  write(root, 'memento/skills/resume/SKILL.md', `---
name: memento:resume
description: Resume a session.
---
`);
  expect(validate(root)).toEqual([]);
});

test('rejects flat Markdown files under skills', () => {
  const { plugin, root } = fixture();
  write(root, `${plugin}/skills/legacy.md`, '# Legacy skill\n');
  expect(validate(root)).toContain(
    'skills/legacy.md: flat skill files are unsupported; use skills/<name>/SKILL.md'
  );
});

test.each([
  '/tmp/example-plugin',
  '../example-plugin',
  './nested/example-plugin',
])('rejects marketplace source outside the ./<plugin> convention: %s', source => {
  const { plugin, root } = fixture();
  writeJson(root, '.claude-plugin/marketplace.json', {
    name: 'test-marketplace',
    plugins: [{ name: plugin, source, version: '1.2.3' }],
  });
  expect(validate(root)).toContain(
    'example-plugin: marketplace source must be ./example-plugin'
  );
});
