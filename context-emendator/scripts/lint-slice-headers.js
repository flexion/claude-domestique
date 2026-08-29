#!/usr/bin/env node
'use strict';

/**
 * Linter for the slice headers in docs/*.md.
 *
 * The seven slice documents each declare a `source_lines` range against the pre-split
 * document. That declaration is a claim, and until this script existed nothing checked it:
 * two reviewers reconciled the split twice, both times asserting "no duplicates, all clean",
 * because the reconcile compared declared ranges to each other and never compared a range to
 * the document claiming it. Three material omissions and three mis-attributions survived that.
 *
 * So the load-bearing pass here is PROVENANCE: for every claimed source line, is that line's
 * content actually present in the document claiming it? Range arithmetic is the easy half and
 * was never the half that was wrong.
 *
 * Usage:
 *   node context-emendator/scripts/lint-slice-headers.js [--source <git-rev>] [--docs <dir>]
 *
 * Exit code is the number of E_ findings, so it can gate. W_ findings are recorded and
 * non-gating, matching the prefix contract the boundary linter uses.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REQUIRED_KEYS = [
  'slice', 'job', 'ships', 'gating_test', 'non_gating',
  'depends_on', 'terminal_failure_owned', 'source_lines',
];
const SHIP_KINDS = ['deterministic', 'prompt', 'skill', 'doc'];
const GATING_STATUS = ['planned', 'implemented'];

/** Minimum source-line length worth checking for presence. Shorter lines are
 *  table pipes, list bullets and fragments whose text recurs everywhere. */
const MIN_PROBE_LEN = 55;
const PROBE_WORDS = 7;

function loadYaml() {
  const candidates = [
    () => require('js-yaml'),
    () => require(path.join(process.env.HOME, '.npm/_npx/b8d86e6551a4f492/node_modules/js-yaml')),
  ];
  for (const c of candidates) {
    try { return c(); } catch (_) { /* try next */ }
  }
  throw new Error('js-yaml not resolvable; run from a tree where it is installed');
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

function parseRanges(spec, onError) {
  if (/^new$/i.test(String(spec).trim())) return null;
  const out = [];
  for (const part of String(spec).split(',')) {
    const m = part.trim().match(/^(\d+)-(\d+)$/);
    if (!m) { onError(`unparseable range ${JSON.stringify(part.trim())}; use N-N even for a single line`); continue; }
    const [a, b] = [+m[1], +m[2]];
    if (b < a) { onError(`inverted range ${part.trim()}`); continue; }
    out.push([a, b]);
  }
  return out;
}

function main(argv) {
  const yaml = loadYaml();
  const rev = argv.includes('--source') ? argv[argv.indexOf('--source') + 1] : 'HEAD';
  const docsDir = argv.includes('--docs')
    ? argv[argv.indexOf('--docs') + 1]
    : path.join(__dirname, '..', 'docs');

  // Same prefix contract as lint-boundary.js: E_ gates, W_ is recorded and non-gating.
  // A textual miss is review data — light rewording approved in an Extraction note is
  // legitimate provenance — so it reports without failing the run.
  const findings = [];
  const add = (slice, code, msg) => findings.push({ slice, code, msg });
  const errors = () => findings.filter((f) => f.code.startsWith('E_'));

  // The pre-split source is immutable history, never the working tree: the spine slice
  // reuses the original filename, so the working-tree copy is a different document.
  const sourcePath = 'context-emendator/docs/autonomous-workitem-workflow.md';
  const isSplitDoc = (text) => /^---\n[\s\S]*?\nslice:\s/.test(text) || /^---\nslice:\s/.test(text);
  // stderr is inherited by default, so a probe that misses leaks `fatal: path ... does not
  // exist` into the caller's output. Probing history is normal control flow here.
  const GIT = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] };
  const readAt = (r) => execFileSync('git', ['show', `${r}:${sourcePath}`], GIT);

  // Verify the oracle before trusting it. The spine slice reuses the pre-split filename, so
  // once the split is committed `HEAD:<path>` is the *new* spine — a 288-line document that
  // every range overshoots. Read as source it does not error, it silently reports every slice
  // as broken, which is a constant oracle wearing a finding's clothes. So: reject any candidate
  // that carries slice frontmatter, and walk back through this file's history to the last
  // revision that does not.
  let src = null;
  let resolvedRev = null;
  const explicitRev = argv.includes('--source');
  const candidates = explicitRev
    ? [rev]
    : execFileSync('git', ['log', '--format=%H', '--', sourcePath], GIT)
        .split('\n').filter(Boolean);

  for (const c of candidates) {
    let text;
    try { text = readAt(c); } catch (_) { continue; }
    if (isSplitDoc(text)) {
      if (explicitRev) {
        console.error(`${c}:${sourcePath} is a post-split slice document, not the pre-split source.`);
        console.error('Pass --source <rev> naming a revision before the split.');
        return 1;
      }
      continue;
    }
    src = text.split('\n');
    // A file ending in a newline yields a phantom trailing element; counting it reports
    // 1119 lines for an 1118-line document and puts every range check one off.
    if (src.length && src[src.length - 1] === '') src.pop();
    resolvedRev = c;
    break;
  }
  if (!src) {
    console.error(`cannot resolve a pre-split ${sourcePath} from history`);
    return 1;
  }
  console.log(`source: ${resolvedRev.slice(0, 8)}:${sourcePath} (${src.length} lines)\n`);

  const docs = {};
  for (const file of fs.readdirSync(docsDir).filter((f) => f.endsWith('.md'))) {
    const text = fs.readFileSync(path.join(docsDir, file), 'utf8');
    const m = text.match(/^---\n([\s\S]*?)\n---\n/);
    const slug = file.replace(/\.md$/, '');
    if (!m) { add(slug, 'E_NO_FRONTMATTER', 'no YAML frontmatter'); continue; }
    let meta;
    try { meta = yaml.load(m[1]); } catch (e) { add(slug, 'E_YAML', e.message); continue; }
    docs[slug] = { meta, body: norm(text), file };
  }

  for (const [slug, { meta }] of Object.entries(docs)) {
    const keys = Object.keys(meta);
    for (const k of REQUIRED_KEYS) if (!(k in meta)) add(slug, 'E_MISSING_KEY', k);
    if (JSON.stringify(keys) !== JSON.stringify(REQUIRED_KEYS)) {
      // The agreed order is part of the header contract, so a reordered block is an
      // error: a script reading these by position, or a reader diffing two of them,
      // cannot rely on a shape that is only conventionally stable.
      add(slug, 'E_KEY_ORDER', `expected ${REQUIRED_KEYS.join(',')}; got ${keys.join(',')}`);
    }
    if (meta.slice !== slug) add(slug, 'E_SLUG_MISMATCH', `slice: ${meta.slice}`);

    for (const s of meta.ships || []) {
      if (!SHIP_KINDS.includes(s && s.kind)) add(slug, 'E_SHIP_KIND', JSON.stringify(s));
    }
    const gt = meta.gating_test || {};
    if (!GATING_STATUS.includes(gt.status)) add(slug, 'E_GATING_STATUS', String(gt.status));
    // A planned slice still owes a concrete command and a concrete assertion. Vagueness here
    // is the defect the status field exists to make visible, not a licence for it.
    for (const k of ['command', 'evidence']) {
      if (!gt[k] || !String(gt[k]).trim()) add(slug, 'E_GATING_INCOMPLETE', `gating_test.${k}`);
    }
    for (const dep of meta.depends_on || []) {
      if (!docs[dep]) add(slug, 'E_DEP_UNRESOLVED', dep);
      if (dep === slug) add(slug, 'E_DEP_SELF', dep);
    }
  }

  // Every artifact has exactly one delivering slice.
  const shipOwners = {};
  for (const [slug, { meta }] of Object.entries(docs)) {
    for (const s of meta.ships || []) {
      if (!s || !s.path) continue;
      (shipOwners[s.path] = shipOwners[s.path] || []).push(slug);
    }
  }
  for (const [p, owners] of Object.entries(shipOwners)) {
    if (owners.length > 1) add(owners.join('+'), 'E_SHIP_AMBIGUOUS', `${p} claimed by ${owners.join(', ')}`);
  }

  for (const [slug, { body }] of Object.entries(docs)) {
    for (const l of new Set([...body.matchAll(/\]\(([a-z0-9-]+) md\)/g)].map((m) => m[1]))) {
      if (!docs[l]) add(slug, 'E_LINK_BROKEN', `${l}.md`);
    }
  }

  // Coverage and provenance.
  const cov = {};
  for (const [slug, { meta }] of Object.entries(docs)) {
    const ranges = parseRanges(meta.source_lines, (m) => add(slug, 'E_RANGE', m));
    if (ranges === null) continue; // declared `new`; nothing to trace
    for (const [a, b] of ranges) {
      if (b > src.length) add(slug, 'E_RANGE', `${a}-${b} exceeds source length ${src.length}`);
      for (let i = a; i <= b; i++) (cov[i] = cov[i] || []).push(slug);
    }
  }

  for (const [line, owners] of Object.entries(cov)) {
    if (owners.length > 1) add(owners.join('+'), 'E_LINE_DUPLICATED', `line ${line}`);
  }

  // The pass that matters: is the claimed line's text actually in the claiming document?
  // Sampled by three word-windows so reflowed prose and light rewording still resolve; a
  // miss means the content is absent or lives in a different slice.
  const orphanClaims = {};
  for (const [line, owners] of Object.entries(cov)) {
    const text = src[line - 1] || '';
    if (text.trim().length < MIN_PROBE_LEN) continue;
    const w = norm(text).split(' ');
    if (w.length < PROBE_WORDS) continue;
    const starts = [0, Math.max(0, Math.floor(w.length / 2) - 3), Math.max(0, w.length - PROBE_WORDS)];
    for (const slug of owners) {
      const found = starts.some((st) => docs[slug].body.includes(w.slice(st, st + PROBE_WORDS).join(' ')));
      if (!found) (orphanClaims[slug] = orphanClaims[slug] || []).push(+line);
    }
  }
  for (const [slug, lines] of Object.entries(orphanClaims)) {
    add(slug, 'W_CONTENT_NOT_FOUND',
      `${lines.length} claimed line(s) whose text is absent: ${lines.slice(0, 12).join(', ')}${lines.length > 12 ? ', …' : ''}`);
  }

  const uncovered = [];
  for (let i = 1; i <= src.length; i++) {
    const t = (src[i - 1] || '').trim();
    if (!t || t === '---') continue;
    if (!cov[i]) uncovered.push(i);
  }

  for (const f of findings) console.log(`${f.code.padEnd(22)} ${f.slice}: ${f.msg}`);
  console.log(`\n${Object.keys(docs).length} slice docs · ${Object.keys(cov).length}/${src.length} source lines claimed`);
  if (uncovered.length) {
    console.log(`unclaimed substantive lines (${uncovered.length}): ${uncovered.join(', ')}`);
    console.log('  — expected: superseded per-stage GOAL/HOW preambles. Anything else is a gap.');
  }
  const errs = errors().length;
  const warns = findings.length - errs;
  console.log(`\n${errs} error(s), ${warns} warning(s)`);
  return errs;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { main };
