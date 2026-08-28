#!/usr/bin/env node
'use strict';

/**
 * Reference linter for the boundary bundle in docs/autonomous-jira-workflow.md.
 *
 * Two passes, because the artifacts are authored a stage apart:
 *
 *   lintBoundary(doc)              stages 2 and 3, before the freeze
 *   lintEvidence(boundary, ev)     stage 5, once tests exist
 *
 * Evidence edges are NOT fields of the frozen manifest. An earlier version put
 * them there, which meant three checks demanded data that could not exist when
 * the linter ran and the bundle froze before it was authored.
 *
 * Provenance is declared, never inferred. An earlier version decided whether a
 * trace pointed at a registry invariant by matching /^INV-\d+$/, which made the
 * claim unfalsifiable and let both trace rules be defeated by renaming an id.
 *
 * Rules that need meaning are not here: handoff feasibility, entailment, and
 * "names no implementation" belong to a model actor by the document's own
 * definition of "no model".
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const SUPPORTED_SCHEMA = [1];
const VERIFIER = ['mechanical', 'independent_review', 'observation'];
const STAGE = ['pre_merge', 'post_merge', 'production'];
const OBLIGATION = ['must', 'watch'];
const TEST_ROLE = ['change', 'preservation'];
const BASELINE = ['assertion_fail', 'expected_error', 'pass'];
const PROBE_KIND = ['negative_control', 'mutation'];
const HANDOFF_FIELDS = [
  'owner', 'trigger', 'verification_method', 'evidence_destination', 'failure_transition',
];
const BASELINE_ROLE = {
  assertion_fail: 'change', expected_error: 'change', pass: 'preservation',
};
const REQUIRED_TOP = [
  'schema_version', 'issue', 'registry_revision', 'mandates', 'non_goals',
  'claims', 'coupling', 'entails', 'entries', 'registry_selections',
];

function load(file) {
  // js-yaml 5.x already resolves under the 1.2 core schema, so passing the
  // schema explicitly changes nothing — see the YAML tests, which assert that
  // rather than pretending otherwise. It does NOT preserve comments, and it
  // does NOT keep `1.10` as a string: unquoted, that becomes the number 1.1.
  // The quantity rules below require quoting because the loader cannot help.
  return yaml.load(fs.readFileSync(file, 'utf8'), { filename: file });
}

const isGating = (e) => e.verifier === 'mechanical'
  && e.verification_stage === 'pre_merge'
  && e.obligation === 'must';

function lintBoundary(doc) {
  const f = [];
  const add = (code, at, message) => f.push({ code, at, message });

  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    add('E_NOT_A_MAPPING', '/', 'boundary did not parse to a mapping');
    return f;
  }

  REQUIRED_TOP.forEach((k) => {
    if (doc[k] === undefined || doc[k] === null) {
      add('E_MISSING_TOP_FIELD', `/${k}`, `required manifest field ${k} is absent`);
    }
  });
  if (doc.schema_version !== undefined && !SUPPORTED_SCHEMA.includes(doc.schema_version)) {
    add('E_UNSUPPORTED_SCHEMA', '/schema_version',
      `schema_version ${doc.schema_version} is not one this linter knows (${SUPPORTED_SCHEMA.join(', ')})`);
  }

  const arr = (v) => (Array.isArray(v) ? v : []);
  const entries = arr(doc.entries);
  const mandates = arr(doc.mandates);
  const coupling = arr(doc.coupling);
  const claims = arr(doc.claims);
  const selections = arr(doc.registry_selections);
  const entails = doc.entails && typeof doc.entails === 'object' && !Array.isArray(doc.entails)
    ? doc.entails : {};

  if (!Array.isArray(doc.non_goals) || doc.non_goals.length === 0) {
    add('E_NONGOALS_EMPTY', '/non_goals', 'non-goals must be present and non-empty');
  }
  if (entries.length === 0) add('E_NO_ENTRIES', '/entries', 'boundary has no entries');

  // ids live in one namespace because traces resolve across all three
  const seen = new Map();
  const claimIds = new Set();
  const couplingIds = new Set();
  const entryIds = new Set();
  const note = (id, kind, at) => {
    if (id === undefined || id === null || id === '') {
      add('E_NO_ID', at, `${kind} has no id`);
      return;
    }
    if (seen.has(id)) {
      add('E_DUPLICATE_ID', at,
        `id ${id} is already used by ${seen.get(id)}; every resolution check keys on ids`);
    } else {
      seen.set(id, `${kind} at ${at}`);
    }
  };
  claims.forEach((c, i) => { note(c && c.id, 'claim', `/claims/${i}`); if (c && c.id) claimIds.add(c.id); });
  coupling.forEach((c, i) => { note(c && c.id, 'coupling edge', `/coupling/${i}`); if (c && c.id) couplingIds.add(c.id); });
  entries.forEach((e, i) => { note(e && e.id, 'entry', `/entries/${i}`); if (e && e.id) entryIds.add(e.id); });

  // declared provenance: a selection must be an entry, since selecting a floor
  // invariant means it appears as an obligation
  const selected = new Set(selections);
  selections.forEach((id, i) => {
    if (!entryIds.has(id)) {
      add('E_SELECTION_NOT_AN_ENTRY', `/registry_selections/${i}`,
        `${id} is declared registry-selected but is not an entry id`);
    }
  });

  const mandatesUsed = new Set();

  entries.forEach((e, i) => {
    const at = `/entries/${i}${e && e.id ? ` (${e.id})` : ''}`;
    if (!e || typeof e !== 'object') {
      add('E_ENTRY_NOT_A_MAPPING', at, 'entry is not a mapping');
      return;
    }
    ['statement', 'observation', 'decision'].forEach((k) => {
      if (!e[k]) add('E_ENTRY_MISSING_FIELD', at, `entry has no ${k}`);
    });

    if (!VERIFIER.includes(e.verifier)) add('E_ENUM_VERIFIER', at, `verifier must be one of ${VERIFIER.join(' | ')}`);
    if (!STAGE.includes(e.verification_stage)) add('E_ENUM_STAGE', at, `verification_stage must be one of ${STAGE.join(' | ')}`);
    if (!OBLIGATION.includes(e.obligation)) add('E_ENUM_OBLIGATION', at, `obligation must be one of ${OBLIGATION.join(' | ')}`);

    if (e.verifier === 'observation' && e.obligation === 'must') {
      add('E_OBSERVATION_MUST', at,
        'observation + must cannot gate; author it as watch or supply a mechanical / independent_review proxy');
    }

    const later = e.verification_stage === 'post_merge' || e.verification_stage === 'production';
    if (later && e.obligation === 'must') {
      if (!e.handoff || typeof e.handoff !== 'object') {
        add('E_HANDOFF_MISSING', at, `${e.verification_stage} + must requires a handoff object`);
      } else {
        const missing = HANDOFF_FIELDS.filter((k) => !e.handoff[k]);
        if (missing.length) add('E_HANDOFF_INCOMPLETE', at, `handoff missing: ${missing.join(', ')}`);
      }
    }

    // quantities. `quantitative` is declared because no script can read a
    // statement and decide whether it asserts a number.
    if (e.quantitative === undefined) {
      add('E_QUANTITATIVE_UNDECLARED', at,
        'entry must declare quantitative: true | false');
    } else if (e.quantitative === true) {
      const q = e.quantity;
      if (!q || typeof q !== 'object') {
        add('E_QUANTITY_MISSING', at, 'quantitative entry requires a quantity object');
      } else {
        ['value', 'unit', 'conditions'].forEach((k) => {
          if (q[k] === undefined || q[k] === '') {
            add('E_QUANTITY_INCOMPLETE', at, `quantity missing ${k}`);
          }
        });
        // The loader turns an unquoted 1.10 into 1.1 and silently changes a
        // threshold. It cannot be configured out, so require the string form.
        if (q.value !== undefined && typeof q.value !== 'string') {
          add('E_UNQUOTED_QUANTITY', at,
            `quantity.value must be a quoted string; ${JSON.stringify(q.value)} was parsed as ${typeof q.value}, `
            + 'and an unquoted 1.10 becomes 1.1');
        }
      }
    } else if (e.quantitative !== false) {
      add('E_QUANTITATIVE_NOT_BOOLEAN', at, 'quantitative must be true or false');
    }

    if (isGating(e)) {
      if (!TEST_ROLE.includes(e.test_role)) {
        add('E_TESTROLE_REQUIRED', at, `mechanical + pre_merge + must requires test_role of ${TEST_ROLE.join(' | ')}`);
      }
      if (!BASELINE.includes(e.baseline)) {
        add('E_BASELINE_REQUIRED', at, `mechanical + pre_merge + must requires baseline of ${BASELINE.join(' | ')}`);
      }
      if (BASELINE.includes(e.baseline) && TEST_ROLE.includes(e.test_role)
          && BASELINE_ROLE[e.baseline] !== e.test_role) {
        add('E_BASELINE_ROLE_MISMATCH', at,
          `baseline ${e.baseline} is only legal with test_role ${BASELINE_ROLE[e.baseline]}`);
      }
      if (e.baseline === 'expected_error' && (!e.error_code || !e.error_pattern)) {
        add('E_EXPECTED_ERROR_UNTYPED', at, 'baseline expected_error requires error_code and error_pattern');
      }
    } else if (e.test_role !== undefined || e.baseline !== undefined) {
      add('E_TESTROLE_FORBIDDEN', at,
        'test_role and baseline are only meaningful on mechanical + pre_merge + must');
    }
    if (e.evidence !== undefined) {
      add('E_EVIDENCE_IN_MANIFEST', at,
        'evidence edges are a stage-4 artifact and cannot be fields of a manifest frozen at stage 3');
    }

    const m = Array.isArray(e.mandate) ? e.mandate : [];
    if (m.length === 0) add('E_ORPHAN_ENTRY', at, 'entry maps to no mandate');
    m.forEach((name) => {
      mandatesUsed.add(name);
      if (!mandates.includes(name)) add('E_UNKNOWN_MANDATE', at, `mandate ${name} is not declared in /mandates`);
    });

    // traces anchor an obligation to a requirement stated outside the boundary
    const tr = Array.isArray(e.traces) ? e.traces : [];
    if (tr.length === 0) add('E_NO_TRACE', at, 'entry has no traces');
    let upstream = 0;
    tr.forEach((t) => {
      const self = t === e.id;
      const isSelection = selected.has(t);
      if (!claimIds.has(t) && !couplingIds.has(t) && !entryIds.has(t)) {
        add('E_TRACE_UNRESOLVED', at, `trace ${t} resolves to no claim, coupling edge, or entry`);
        return;
      }
      if (self && !isSelection) {
        add('E_SELF_TRACE', at,
          `trace ${t} is the entry's own id and the entry is not declared registry-selected, so it anchors nothing`);
        return;
      }
      if (claimIds.has(t) || couplingIds.has(t) || (self && isSelection)) upstream += 1;
    });
    if (tr.length > 0 && upstream === 0) {
      add('E_NO_UPSTREAM_TRACE', at,
        'at least one trace must reach a claim, a coupling edge, or this entry as a declared registry '
        + 'selection; tracing only other obligations records a relationship and does not anchor');
    }
  });

  mandates.forEach((name) => {
    if (!mandatesUsed.has(name)) add('E_UNANCHORED_MANDATE', '/mandates', `mandate ${name} has no entry`);
  });

  // entails: every coupling edge covered, and no key outside the coupling space
  coupling.forEach((c, i) => {
    if (!c || !c.id) return;
    const at = `/coupling/${i} (${c.id})`;
    if (!(c.id in entails)) {
      add('E_ENTAILS_UNDECLARED', at, `coupling edge ${c.id} is neither mapped in /entails nor marked uncovered`);
      return;
    }
    const target = entails[c.id];
    if (target !== 'uncovered' && !entryIds.has(target)) {
      add('E_ENTAILS_UNRESOLVED', at, `/entails/${c.id} points at ${target}, which is not an entry id`);
    }
  });
  Object.keys(entails).forEach((k) => {
    if (!couplingIds.has(k)) {
      add('E_ENTAILS_ALIEN_KEY', `/entails/${k === '' ? '""' : k}`,
        `${k === '' ? 'empty key' : k} is not a coupling edge id; a typo here would otherwise read as coverage`);
    }
  });

  return f;
}

/** Stage 5. Runs once tests exist, against the frozen boundary. */
function lintEvidence(boundary, ev) {
  const f = [];
  const add = (code, at, message) => f.push({ code, at, message });
  if (!ev || typeof ev !== 'object') {
    add('E_NOT_A_MAPPING', '/', 'evidence did not parse to a mapping');
    return f;
  }
  const entries = Array.isArray(boundary.entries) ? boundary.entries : [];
  const byId = new Map(entries.filter((e) => e && e.id).map((e) => [e.id, e]));
  const gating = entries.filter((e) => e && isGating(e));
  const edges = Array.isArray(ev.edges) ? ev.edges : [];

  if (!ev.boundary_digest) {
    add('E_NO_BOUNDARY_DIGEST', '/boundary_digest',
      'evidence must name the frozen bundle digest it was written against');
  }

  const covered = new Set();
  const caseBaselines = new Map();
  edges.forEach((edge, i) => {
    const at = `/edges/${i}`;
    if (!edge || !edge.entry) { add('E_EDGE_NO_ENTRY', at, 'edge names no entry'); return; }
    if (!byId.has(edge.entry)) {
      add('E_EDGE_UNKNOWN_ENTRY', at, `edge names ${edge.entry}, which is not an entry in the boundary`);
      return;
    }
    const e = byId.get(edge.entry);
    if (!isGating(e)) {
      add('E_EDGE_ON_NONGATING', at,
        `${edge.entry} is not mechanical + pre_merge + must, so it takes no test evidence`);
      return;
    }
    if (!edge.case_id) {
      add('E_EDGE_NO_CASE_ID', at, 'edge must name a collected test case id, not a file');
      return;
    }
    covered.add(edge.entry);
    if (!caseBaselines.has(edge.case_id)) caseBaselines.set(edge.case_id, []);
    caseBaselines.get(edge.case_id).push({ at, baseline: e.baseline });

    if (e.test_role === 'preservation'
        && (!edge.probe || !PROBE_KIND.includes(edge.probe.kind) || !edge.probe.ref)) {
      add('E_NO_SENSITIVITY_PROBE', at,
        `${edge.entry} is preservation, so the edge requires probe.kind of ${PROBE_KIND.join(' | ')} with a ref, `
        + 'or the entry must be reclassified as independent_review');
    }
  });

  gating.forEach((e) => {
    if (!covered.has(e.id)) {
      add('E_NO_EVIDENCE_EDGE', `/edges (${e.id})`, `gating entry ${e.id} has no evidence edge`);
    }
  });

  for (const [caseId, list] of caseBaselines) {
    const distinct = [...new Set(list.map((x) => x.baseline))];
    if (distinct.length > 1) {
      add('E_EDGE_BASELINE_CONFLICT', list.map((x) => x.at).join(', '),
        `test case ${caseId} carries conflicting baselines: ${distinct.join(', ')}`);
    }
  }
  return f;
}

function main(argv) {
  const args = argv.slice(2);
  const evIdx = args.indexOf('--evidence');
  const evFile = evIdx >= 0 ? args[evIdx + 1] : null;
  const files = evIdx >= 0 ? args.slice(0, evIdx) : args;
  if (files.length === 0) {
    process.stderr.write('usage: lint-boundary.js <boundary.yaml> [...] [--evidence <evidence.yaml>]\n');
    return 2;
  }
  let bad = 0;
  for (const file of files) {
    let findings;
    let doc = null;
    try {
      doc = load(file);
      findings = lintBoundary(doc);
      if (evFile && files.length === 1) findings = findings.concat(lintEvidence(doc, load(evFile)));
    } catch (err) {
      findings = [{ code: 'E_PARSE', at: '/', message: err.message }];
    }
    const name = path.basename(file);
    if (findings.length === 0) process.stdout.write(`ok    ${name}\n`);
    else {
      bad += 1;
      process.stdout.write(`FAIL  ${name}  (${findings.length})\n`);
      for (const x of findings) process.stdout.write(`        ${x.code}  ${x.at}\n          ${x.message}\n`);
    }
  }
  return bad === 0 ? 0 : 1;
}

module.exports = { lintBoundary, lintEvidence, load, isGating };

if (require.main === module) process.exit(main(process.argv));
