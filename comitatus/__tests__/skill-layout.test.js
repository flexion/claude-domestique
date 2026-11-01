const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKILLS = path.join(ROOT, 'skills');

// 1.0.0 removed the fan-out skill: a second discoverable skill gave a seeded
// member a second, conflicting account of who leads. Only directories with a
// SKILL.md are discoverable by either host.
test('herd-setup, herdr and mail are the only discoverable skills', () => {
  const discoverable = fs.readdirSync(SKILLS)
    .filter((name) => fs.existsSync(path.join(SKILLS, name, 'SKILL.md')))
    .sort();
  expect(discoverable).toEqual(['herd-setup', 'herdr', 'mail']);
});

// The doorbell commands are what agents copy; they must match the spec exactly.
test('the mail skill carries the exact doorbell command for each route and the wait rule', () => {
  const skill = fs.readFileSync(path.join(SKILLS, 'mail', 'SKILL.md'), 'utf8');
  for (const exact of [
    'herdr agent prompt <routes.herdr_pane> "[from <me> mail #<id>]"',
    '{"msgV":1,"msg_id":"<uuid>","type":"user","message":{"role":"user","content":"[from <me> mail #<id>]"},"priority":"next"}',
    'CODEX_HOME=<codex_home> codex queue --thread <session> --message "[from <me> mail #<id>]"',
    'To wait for a reply, end your turn',
  ]) {
    expect(skill).toContain(exact);
  }
});

function markdownFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : markdownFiles(p);
    return e.name.endsWith('.md') ? [p] : [];
  });
}

// Moving the runbook and its roles changed every relative link around them.
test('every relative Markdown link in the plugin resolves', () => {
  const broken = [];
  for (const file of [...markdownFiles(SKILLS), path.join(ROOT, 'README.md')]) {
    const text = fs.readFileSync(file, 'utf8');
    for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^[a-z]+:|^#/.test(target)) continue;
      const rel = target.split('#')[0];
      if (!fs.existsSync(path.resolve(path.dirname(file), rel))) {
        broken.push(`${path.relative(ROOT, file)} -> ${target}`);
      }
    }
  }
  expect(broken).toEqual([]);
});

// 2.0.0 replaced herd.js and up.js with native herdr commands. No operational
// path may still require them: neither file ships, and no skill, reference,
// hook, script or agent manifest invokes one. Prose that records the removal
// may name them; an invocation (`node <path>herd.js`) or the old `HERD`
// placeholder may not.
test('no runtime helper ships and nothing shipped invokes one', () => {
  expect(fs.existsSync(path.join(SKILLS, 'herdr', 'scripts'))).toBe(false);
  const shipped = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '__tests__'].includes(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(md|js|json|ya?ml)$/.test(e.name)) shipped.push(p);
    }
  })(ROOT);
  const offenders = shipped
    .filter((f) => !['README.md', 'package.json', 'jest.config.js'].includes(path.relative(ROOT, f)))
    .filter((f) => /node\s+\S*[\\/](herd|up)\.js\b|\bHERD\b|require\([^)]*[\\/](herd|up)\.js/.test(fs.readFileSync(f, 'utf8')))
    .map((f) => path.relative(ROOT, f));
  expect(offenders).toEqual([]);
});

// The skill states the herdr version whose native behavior it relies on.
test('the herdr skill states its supported herdr version', () => {
  const skill = fs.readFileSync(path.join(SKILLS, 'herdr', 'SKILL.md'), 'utf8');
  expect(skill).toMatch(/Supported herdr: 0\.9\.5 or later/);
});
