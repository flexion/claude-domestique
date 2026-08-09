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
  const marketplaceVersion = options.marketplaceVersion || version;

  writeJson(root, '.claude-plugin/marketplace.json', {
    name: 'test-marketplace',
    plugins: [{ name: plugin, source: `./${plugin}`, version: marketplaceVersion }],
  });
  writeJson(root, `${plugin}/package.json`, {
    name: options.packageName || `@claude-domestique/${plugin}`,
    version: options.packageVersion || version,
  });
  writeJson(root, `${plugin}/.claude-plugin/plugin.json`, {
    name: options.claudeName || plugin,
    version: options.claudeVersion || version,
  });
  writeJson(root, `${plugin}/.codex-plugin/plugin.json`, {
    name: options.codexName || plugin,
    version: options.codexVersion || version,
  });
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

test('reports version drift across package and host manifests', () => {
  const { root } = fixture({ marketplaceVersion: '1.2.4' });
  const errors = validate(root);
  expect(errors).toContain('example-plugin: package version 1.2.3 does not match 1.2.4');
  expect(errors).toContain('example-plugin: Claude manifest version 1.2.3 does not match 1.2.4');
  expect(errors).toContain('example-plugin: Codex manifest version 1.2.3 does not match 1.2.4');
});

test('reports invalid semver', () => {
  const { root } = fixture({ packageVersion: 'latest' });
  expect(validate(root)).toContain('example-plugin: package has invalid semver latest');
});

test('reports missing required package and host manifest files', () => {
  const packageFixture = fixture();
  fs.rmSync(path.join(packageFixture.root, packageFixture.plugin, 'package.json'));
  expect(validate(packageFixture.root)).toContain('example-plugin: missing package.json');

  const manifestFixture = fixture();
  fs.rmSync(path.join(
    manifestFixture.root,
    manifestFixture.plugin,
    '.claude-plugin',
    'plugin.json'
  ));
  expect(validate(manifestFixture.root)).toContain(
    'example-plugin: missing .claude-plugin/plugin.json'
  );

  const codexFixture = fixture();
  fs.rmSync(path.join(
    codexFixture.root,
    codexFixture.plugin,
    '.codex-plugin',
    'plugin.json'
  ));
  expect(validate(codexFixture.root)).toContain(
    'example-plugin: missing .codex-plugin/plugin.json'
  );
});

test('reports host manifest name mismatches', () => {
  const { root } = fixture({
    claudeName: 'wrong-claude-name',
    codexName: 'wrong-codex-name',
  });
  const errors = validate(root);
  expect(errors).toContain('example-plugin: Claude manifest name is wrong-claude-name');
  expect(errors).toContain('example-plugin: Codex manifest name is wrong-codex-name');
});

test('collects malformed JSON as a validation error instead of throwing', () => {
  const { plugin, root } = fixture();
  write(root, `${plugin}/.claude-plugin/plugin.json`, '{not json}\n');
  expect(() => validate(root)).not.toThrow();
  expect(validate(root).some(error => error.includes('Claude manifest: invalid JSON'))).toBe(true);
});

// The frontmatter-shape rules are the class of defect that shipped once already:
// two Stilus descriptions containing an unquoted "word: word" parsed as invalid
// YAML and reached main before anything checked them.
test('rejects a skill whose frontmatter is missing, unclosed, or not a mapping', () => {
  const missing = fixture();
  write(missing.root, `${missing.plugin}/skills/review/SKILL.md`, '# Review\n');
  expect(validate(missing.root)).toContain('skills/review/SKILL.md: missing YAML frontmatter');

  const unclosed = fixture();
  write(unclosed.root, `${unclosed.plugin}/skills/review/SKILL.md`, '---\nname: review\n');
  expect(validate(unclosed.root)).toContain('skills/review/SKILL.md: unclosed YAML frontmatter');

  const notMapping = fixture();
  write(notMapping.root, `${notMapping.plugin}/skills/review/SKILL.md`, '---\n- review\n---\n');
  expect(validate(notMapping.root)).toContain('skills/review/SKILL.md: frontmatter must be a YAML mapping');
});

test('rejects a skill directory that is not kebab-case', () => {
  const { plugin, root } = fixture();
  write(root, `${plugin}/skills/Review_Prose/SKILL.md`, '---\nname: Review_Prose\ndescription: x\n---\n');
  expect(validate(root)).toContain('skills/Review_Prose/SKILL.md: skill directory must be kebab-case');
});

test('rejects a skill directory with no SKILL.md', () => {
  const { plugin, root } = fixture();
  fs.mkdirSync(path.join(root, plugin, 'skills', 'orphan'), { recursive: true });
  expect(validate(root)).toContain('skills/orphan/SKILL.md: missing SKILL.md');
});

test('rejects an empty or missing description on skills and prompt files', () => {
  const { plugin, root } = fixture();
  write(root, `${plugin}/skills/review/SKILL.md`, '---\nname: review\ndescription: "   "\n---\n');
  write(root, `${plugin}/commands/bare.md`, '---\nname: bare\n---\n');

  const errors = validate(root);
  expect(errors).toContain('skills/review/SKILL.md: frontmatter description must be a non-empty string');
  expect(errors).toContain('commands/bare.md: frontmatter description must be a non-empty string');
});

test('reports a malformed marketplace instead of throwing', () => {
  const { root } = fixture();
  write(root, '.claude-plugin/marketplace.json', '{nope}\n');
  expect(() => validate(root)).not.toThrow();
  expect(validate(root).some(e => e.startsWith('marketplace: invalid JSON'))).toBe(true);
});

test('reports a marketplace whose plugins field is not an array', () => {
  const { root } = fixture();
  writeJson(root, '.claude-plugin/marketplace.json', { name: 'test-marketplace', plugins: {} });
  expect(validate(root)).toContain('marketplace: plugins must be an array');
});

test('reports a plugin entry with no name', () => {
  const { root } = fixture();
  writeJson(root, '.claude-plugin/marketplace.json', {
    name: 'test-marketplace',
    plugins: [{ source: './nameless', version: '1.2.3' }],
  });
  expect(validate(root)).toContain('marketplace: every plugin entry must have a name');
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

test('rejects flat Markdown files under skills', () => {
  const { plugin, root } = fixture();
  write(root, `${plugin}/skills/legacy.md`, '# Legacy skill\n');
  expect(validate(root)).toContain(
    'skills/legacy.md: flat skill files are unsupported; use skills/<name>/SKILL.md'
  );
});

test('rejects malformed skill directory shapes', () => {
  const { plugin, root } = fixture();
  fs.renameSync(
    path.join(root, plugin, 'skills', 'review'),
    path.join(root, plugin, 'skills', 'Not_Kebab')
  );
  fs.rmSync(path.join(root, plugin, 'skills', 'Not_Kebab', 'SKILL.md'));
  const errors = validate(root);
  expect(errors).toContain('skills/Not_Kebab/SKILL.md: skill directory must be kebab-case');
  expect(errors).toContain('skills/Not_Kebab/SKILL.md: missing SKILL.md');
});

test.each([
  ['missing', '# No frontmatter\n', 'missing YAML frontmatter'],
  ['unclosed', '---\nname: review\n', 'unclosed YAML frontmatter'],
  ['non-mapping', '---\n- review\n---\n', 'frontmatter must be a YAML mapping'],
])('rejects %s skill frontmatter', (_case, content, expected) => {
  const { plugin, root } = fixture();
  write(root, `${plugin}/skills/review/SKILL.md`, content);
  expect(validate(root)).toContain(`skills/review/SKILL.md: ${expected}`);
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
