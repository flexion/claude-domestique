'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const FILES = [
  'README.md',
  'AGENTS.md',
  '.github/workflows/pr-check.yml',
  'docs/plans/2026-08-08-cross-model-plugin-architecture.md',
];

test.each(FILES)('%s declares the deliberately tested host floors', relativePath => {
  const content = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  expect(content).toContain('2.1.226');
  expect(content).toContain('0.147.0');
  expect(content).not.toContain('2.0.12');
  expect(content).not.toContain('0.141.0');
});

test('the migration matrix requires native fresh subagents and names degraded operation', () => {
  const content = fs.readFileSync(
    path.join(ROOT, 'docs/plans/2026-08-08-cross-model-plugin-architecture.md'),
    'utf8'
  );
  expect(content).toContain('Claude native agents');
  expect(content).toContain('Codex `spawn_agent` subagents');
  expect(content).toContain('UNAVAILABLE');
  expect(content).not.toContain('Generic subagents or sequential passes');
  expect(content).not.toContain('sequential fallback');
});
