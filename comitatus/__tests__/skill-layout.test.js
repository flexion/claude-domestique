const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKILLS = path.join(ROOT, 'skills');

// 1.0.0 removed the fan-out skill: a second discoverable skill gave a seeded
// member a second, conflicting account of who leads. Only directories with a
// SKILL.md are discoverable by either host.
test('herdr and herd-setup are the only discoverable skills', () => {
  const discoverable = fs.readdirSync(SKILLS)
    .filter((name) => fs.existsSync(path.join(SKILLS, name, 'SKILL.md')))
    .sort();
  expect(discoverable).toEqual(['herd-setup', 'herdr']);
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
