'use strict';

// A stale relative link shipped in this plugin's own markdown and was caught by
// a human reader, not by a check — there was no check. This is the check.
//
// Scope is deliberately narrow: relative `.md` targets inside `vernaculus/`
// only. External URLs are someone else's uptime, anchors need a heading parser,
// and scanning the repository would make this plugin's suite fail for a
// neighbour's edit.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git']);

function markdownFiles(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      found.push(...markdownFiles(path.join(dir, entry.name)));
    } else if (entry.name.endsWith('.md')) {
      found.push(path.join(dir, entry.name));
    }
  }
  return found;
}

// Inline links only: [text](target). The target is trimmed of a bare-word title
// and of any #anchor, which this check does not resolve.
function relativeMarkdownLinks(source) {
  const links = [];
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || !target.endsWith('.md')) continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//')) continue; // external
    links.push(target);
  }
  return links;
}

const files = markdownFiles(ROOT);

describe('markdown links', () => {
  test('finds this plugin\'s markdown to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  test.each(files.map((file) => [path.relative(ROOT, file), file]))(
    '%s resolves every relative .md link it declares',
    (_name, file) => {
      const source = fs.readFileSync(file, 'utf8');
      const broken = relativeMarkdownLinks(source).filter((target) => {
        const resolved = target.startsWith('/')
          ? path.join(ROOT, target.slice(1))
          : path.resolve(path.dirname(file), target);
        return !fs.existsSync(resolved);
      });
      expect(broken).toEqual([]);
    },
  );
});
