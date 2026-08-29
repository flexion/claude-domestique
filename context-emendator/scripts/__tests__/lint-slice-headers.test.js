'use strict';

/**
 * The subject here is the linter's ORACLE, not its rules.
 *
 * The spine slice reuses the pre-split filename, so after the split is committed
 * `HEAD:<that path>` resolves to a 288-line slice document. Read as source it raises no
 * error — it reports every slice as broken, because every declared range overshoots. That
 * is a constant oracle: it has no discriminating power and its output looks exactly like a
 * finding. It happened once for real before these tests existed.
 *
 * So these assert the two properties that keep the oracle honest: it recovers the pre-split
 * source from history on its own, and it refuses an explicitly named revision that is a
 * split document rather than silently measuring against it.
 */

const { execFileSync } = require('child_process');
const { main } = require('../lint-slice-headers');

const SOURCE_PATH = 'context-emendator/docs/autonomous-workitem-workflow.md';

function run(argv = []) {
  const out = [];
  const log = console.log;
  const err = console.error;
  console.log = (...a) => out.push(a.join(' '));
  console.error = (...a) => out.push(a.join(' '));
  try {
    const code = main(argv);
    return { code, text: out.join('\n') };
  } finally {
    console.log = log;
    console.error = err;
  }
}

const headIsSplitDoc = () => {
  const text = execFileSync('git', ['show', `HEAD:${SOURCE_PATH}`], { encoding: 'utf8' });
  return /^---\n[\s\S]*?\nslice:\s/.test(text);
};

describe('pre-split source resolution', () => {
  test('recovers the pre-split source from history rather than trusting HEAD', () => {
    const { text } = run([]);
    expect(text).toMatch(/^source: [0-9a-f]{8}:/);
    // The pre-split document is 1118 lines. A trailing newline yields a phantom final
    // element; counting it reports 1119 and puts every range check one off.
    expect(text).toMatch(/\(1118 lines\)/);
  });

  test('does not resolve to a document carrying slice frontmatter', () => {
    const { text } = run([]);
    const rev = text.match(/^source: ([0-9a-f]{8}):/)[1];
    const resolved = execFileSync('git', ['show', `${rev}:${SOURCE_PATH}`], { encoding: 'utf8' });
    expect(resolved).not.toMatch(/^---\n[\s\S]*?\nslice:\s/);
    expect(resolved).toMatch(/^# Autonomous work item to Ready for Merge/m);
  });
});

describe('explicit --source is checked, not obeyed', () => {
  test('rejects --source HEAD once HEAD holds the split spine', () => {
    if (!headIsSplitDoc()) {
      // Before the split lands, HEAD is legitimately the pre-split source and there is
      // nothing to reject. Skip rather than assert a condition history does not yet meet.
      return;
    }
    const { code, text } = run(['--source', 'HEAD']);
    expect(code).toBe(1);
    expect(text).toMatch(/post-split slice document/);
    // It must refuse rather than measure: no findings, no coverage line.
    expect(text).not.toMatch(/source lines claimed/);
  });

  test('rejects a revision that predates the file entirely', () => {
    const root = execFileSync('git', ['rev-list', '--max-parents=0', 'HEAD'], { encoding: 'utf8' })
      .trim().split('\n')[0];
    const stderr = [];
    const realWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = (chunk, ...rest) => { stderr.push(String(chunk)); return true; };
    let code;
    try { ({ code } = run(['--source', root])); } finally { process.stderr.write = realWrite; }
    expect(code).toBe(1);
    // Probing a revision that lacks the file is expected control flow, so git's own
    // `fatal:` chatter must not reach the caller's stderr.
    expect(stderr.join('')).not.toMatch(/fatal:/);
  });
});

describe('finding classes', () => {
  test('exit code counts only E_ findings, so a W_ cannot gate', () => {
    const { code, text } = run([]);
    const errs = (text.match(/^E_/gm) || []).length;
    expect(code).toBe(errs);
    // W_CONTENT_NOT_FOUND is review data: declared rewording is legitimate provenance.
    expect(text).toMatch(/\d+ error\(s\), \d+ warning\(s\)/);
  });
});
