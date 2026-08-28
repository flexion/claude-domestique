#!/usr/bin/env node
'use strict';

/**
 * Reference linter for the boundary bundle described in
 * docs/autonomous-jira-workflow.md.
 *
 * Every check here corresponds to a rule the document calls mechanical. If a
 * rule cannot be checked without reference to meaning, it is not in this file —
 * handoff feasibility, entailment, and "names no implementation" all belong to
 * a model actor by the document's own definition of "no model".
 *
 * Exit 0 when clean, 1 when any finding is reported.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const VERIFIER = ['mechanical', 'independent_review', 'observation'];
const STAGE = ['pre_merge', 'post_merge', 'production'];
const OBLIGATION = ['must', 'watch'];
const TEST_ROLE = ['change', 'preservation'];
const BASELINE = ['assertion_fail', 'expected_error', 'pass'];
const PROBE_KIND = ['negative_control', 'mutation'];
const HANDOFF_FIELDS = [
  'owner', 'trigger', 'verification_method', 'evidence_destination', 'failure_transition',
];

// baseline is legal only with these test_role values
const BASELINE_ROLE = {
  assertion_fail: 'change',
  expected_error: 'change',
  pass: 'preservation',
};

function load(file) {
  const raw = fs.readFileSync(file, 'utf8');
  // js-yaml v4+ defaults to the YAML 1.2 core schema, which is what the document
  // requires: NO stays a string, 1.10 stays a string unless quoted as a number.
  // It does NOT preserve comments. See the caveat in README-lint.md.
  return yaml.load(raw, { schema: yaml.CORE_SCHEMA, filename: file });
}

function lint(doc) {
  const f = [];
  const add = (code, at, message) => f.push({ code, at, message });

  if (!doc || typeof doc !== 'object') {
    add('E_NOT_A_MAPPING', '/', 'boundary file did not parse to a mapping');
    return f;
  }

  const entries = Array.isArray(doc.entries) ? doc.entries : [];
  const mandates = Array.isArray(doc.mandates) ? doc.mandates : [];
  const coupling = Array.isArray(doc.coupling) ? doc.coupling : [];
  const entails = doc.entails && typeof doc.entails === 'object' ? doc.entails : {};
  const claims = Array.isArray(doc.claims) ? doc.claims : [];

  if (!Array.isArray(doc.non_goals) || doc.non_goals.length === 0) {
    add('E_NONGOALS_EMPTY', '/non_goals', 'non-goals must be present and non-empty');
  }
  if (entries.length === 0) {
    add('E_NO_ENTRIES', '/entries', 'boundary has no entries');
  }

  // resolvable trace targets: claim ids, entry ids, registry INV-*, coupling edge ids
  const claimIds = new Set(claims.map((c) => c && c.id).filter(Boolean));
  const couplingIds = new Set(coupling.map((c) => c && c.id).filter(Boolean));
  const traceable = new Set([
    ...claimIds,
    ...entries.map((e) => e && e.id).filter(Boolean),
    ...couplingIds,
  ]);

  const mandatesUsed = new Set();
  // case_id -> [{entry, baseline}]  for the same-baseline constraint
  const caseEdges = new Map();

  entries.forEach((e, i) => {
    const at = `/entries/${i}${e && e.id ? ` (${e.id})` : ''}`;
    if (!e || typeof e !== 'object') {
      add('E_ENTRY_NOT_A_MAPPING', at, 'entry is not a mapping');
      return;
    }
    if (!e.id) add('E_ENTRY_NO_ID', at, 'entry has no id');
    if (!e.statement) add('E_ENTRY_NO_STATEMENT', at, 'entry has no statement');

    if (!VERIFIER.includes(e.verifier)) {
      add('E_ENUM_VERIFIER', at, `verifier must be one of ${VERIFIER.join(' | ')}`);
    }
    if (!STAGE.includes(e.verification_stage)) {
      add('E_ENUM_STAGE', at, `verification_stage must be one of ${STAGE.join(' | ')}`);
    }
    if (!OBLIGATION.includes(e.obligation)) {
      add('E_ENUM_OBLIGATION', at, `obligation must be one of ${OBLIGATION.join(' | ')}`);
    }

    // cross-product: observation cannot gate
    if (e.verifier === 'observation' && e.obligation === 'must') {
      add('E_OBSERVATION_MUST', at,
        'observation + must is not allowed; author it as watch or supply a mechanical / independent_review proxy');
    }

    // cross-product: later stages require a complete handoff
    const laterStage = e.verification_stage === 'post_merge' || e.verification_stage === 'production';
    if (laterStage && e.obligation === 'must') {
      if (!e.handoff || typeof e.handoff !== 'object') {
        add('E_HANDOFF_MISSING', at,
          `${e.verification_stage} + must requires a handoff object`);
      } else {
        const missing = HANDOFF_FIELDS.filter((k) => !e.handoff[k]);
        if (missing.length) {
          add('E_HANDOFF_INCOMPLETE', at, `handoff missing: ${missing.join(', ')}`);
        }
      }
    }

    // test_role / baseline scope: only mechanical + pre_merge + must
    const gating = e.verifier === 'mechanical'
      && e.verification_stage === 'pre_merge'
      && e.obligation === 'must';

    if (gating) {
      if (!TEST_ROLE.includes(e.test_role)) {
        add('E_TESTROLE_REQUIRED', at,
          `mechanical + pre_merge + must requires test_role of ${TEST_ROLE.join(' | ')}`);
      }
      if (!BASELINE.includes(e.baseline)) {
        add('E_BASELINE_REQUIRED', at,
          `mechanical + pre_merge + must requires baseline of ${BASELINE.join(' | ')}`);
      }
      if (BASELINE.includes(e.baseline) && TEST_ROLE.includes(e.test_role)
          && BASELINE_ROLE[e.baseline] !== e.test_role) {
        add('E_BASELINE_ROLE_MISMATCH', at,
          `baseline ${e.baseline} is only legal with test_role ${BASELINE_ROLE[e.baseline]}`);
      }
      if (e.baseline === 'expected_error') {
        if (!e.error_code || !e.error_pattern) {
          add('E_EXPECTED_ERROR_UNTYPED', at,
            'baseline expected_error requires error_code and error_pattern');
        }
      }
      const edges = Array.isArray(e.evidence) ? e.evidence : [];
      if (edges.length === 0) {
        add('E_NO_EVIDENCE_EDGE', at, 'gating entry has no evidence edge');
      }
      edges.forEach((edge, j) => {
        const eat = `${at}/evidence/${j}`;
        if (!edge || !edge.case_id) {
          add('E_EDGE_NO_CASE_ID', eat,
            'evidence edge must name a collected test case id, not a file');
          return;
        }
        if (!caseEdges.has(edge.case_id)) caseEdges.set(edge.case_id, []);
        caseEdges.get(edge.case_id).push({ at: eat, baseline: e.baseline });

        // preservation needs a sensitivity probe; pass/pass alone proves nothing
        if (e.test_role === 'preservation') {
          if (!edge.probe || !PROBE_KIND.includes(edge.probe.kind) || !edge.probe.ref) {
            add('E_NO_SENSITIVITY_PROBE', eat,
              'preservation edge requires probe.kind of negative_control | mutation with a ref, '
              + 'or the entry must be reclassified as independent_review');
          }
        }
      });
    } else if (e.test_role !== undefined || e.baseline !== undefined) {
      add('E_TESTROLE_FORBIDDEN', at,
        'test_role and baseline are only meaningful on mechanical + pre_merge + must');
    }

    // mandate anchoring
    const m = Array.isArray(e.mandate) ? e.mandate : [];
    if (m.length === 0) {
      add('E_ORPHAN_ENTRY', at, 'entry maps to no mandate');
    }
    m.forEach((name) => {
      mandatesUsed.add(name);
      if (!mandates.includes(name)) {
        add('E_UNKNOWN_MANDATE', at, `mandate ${name} is not declared in /mandates`);
      }
    });

    // traces must resolve, and must anchor upstream rather than to this entry
    const tr = Array.isArray(e.traces) ? e.traces : [];
    if (tr.length === 0) {
      add('E_NO_TRACE', at, 'entry has no traces');
    }
    let upstream = 0;
    tr.forEach((t) => {
      const key = String(t);
      const isRegistryInv = /^INV-\d+$/.test(key);
      if (!traceable.has(t) && !isRegistryInv) {
        add('E_TRACE_UNRESOLVED', at,
          `trace ${t} resolves to no claim, entry, coupling edge, or registry invariant`);
        return;
      }
      // A selected registry invariant legitimately anchors to its own registry id;
      // any other self-reference anchors nothing and trivially satisfies the rule.
      if (key === String(e.id) && !isRegistryInv) {
        add('E_SELF_TRACE', at,
          `trace ${t} is the entry's own id, which anchors nothing`);
        return;
      }
      if (claimIds.has(t) || couplingIds.has(t) || isRegistryInv) upstream += 1;
    });
    if (tr.length > 0 && upstream === 0) {
      add('E_NO_UPSTREAM_TRACE', at,
        'at least one trace must resolve to a claim, a coupling edge, or a registry invariant; '
        + 'tracing only other obligations anchors the entry to nothing outside the boundary');
    }
  });

  // one test case may carry several edges only if every baseline agrees
  for (const [caseId, list] of caseEdges) {
    const distinct = [...new Set(list.map((x) => x.baseline))];
    if (distinct.length > 1) {
      add('E_EDGE_BASELINE_CONFLICT', list.map((x) => x.at).join(', '),
        `test case ${caseId} carries conflicting baselines: ${distinct.join(', ')}`);
    }
  }

  // every mandate must be anchored by at least one entry
  mandates.forEach((name) => {
    if (!mandatesUsed.has(name)) {
      add('E_UNANCHORED_MANDATE', `/mandates`, `mandate ${name} has no entry`);
    }
  });

  // every coupling edge is mapped to an obligation or explicitly uncovered
  const entryIds = new Set(entries.map((e) => e && e.id).filter(Boolean));
  coupling.forEach((c, i) => {
    const at = `/coupling/${i}${c && c.id ? ` (${c.id})` : ''}`;
    if (!c || !c.id) {
      add('E_COUPLING_NO_ID', at, 'coupling edge has no id');
      return;
    }
    if (!(c.id in entails)) {
      add('E_ENTAILS_UNDECLARED', at,
        `coupling edge ${c.id} is neither mapped in /entails nor marked uncovered`);
      return;
    }
    const target = entails[c.id];
    if (target !== 'uncovered' && !entryIds.has(target)) {
      add('E_ENTAILS_UNRESOLVED', at,
        `/entails/${c.id} points at ${target}, which is not an entry id`);
    }
  });

  return f;
}

function main(argv) {
  const files = argv.slice(2);
  if (files.length === 0) {
    process.stderr.write('usage: lint-boundary.js <boundary.yaml> [...]\n');
    return 2;
  }
  let bad = 0;
  for (const file of files) {
    let findings;
    try {
      findings = lint(load(file));
    } catch (err) {
      findings = [{ code: 'E_PARSE', at: '/', message: err.message }];
    }
    const name = path.basename(file);
    if (findings.length === 0) {
      process.stdout.write(`ok    ${name}\n`);
    } else {
      bad += 1;
      process.stdout.write(`FAIL  ${name}  (${findings.length})\n`);
      for (const x of findings) {
        process.stdout.write(`        ${x.code}  ${x.at}\n          ${x.message}\n`);
      }
    }
  }
  return bad === 0 ? 0 : 1;
}

module.exports = { lint, load };

if (require.main === module) process.exit(main(process.argv));
