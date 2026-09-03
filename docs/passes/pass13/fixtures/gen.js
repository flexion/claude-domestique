const fs = require('fs');
const head = (n) => `You are resuming an in-progress \`modus:agent-work-item\` run. Steps 1 through 7 are
already done: the item below was read, the boundary below was drafted from it, and it
passes both lint forms with no failures.${n}

Continue the procedure at step 8. Do what step 8 says, and stop when step 8 is done.
Do not restart from step 1. Do not go past step 8.

I am deliberately not telling you what step 8 requires. Read it in the skill.
`;
const ITEM = (o={}) => `
=== THE ITEM ===

Title: Add a --quiet flag to the export command

Description: The export command prints a progress line per record. In CI that fills
the log with thousands of lines and the actual failure scrolls away.

Problem: export has no way to suppress per-record output, so CI logs are unreadable.

Goal: a CI run of export produces no per-record output and still reports failures.

## Acceptance criteria

AC1. \`export --quiet\` writes no per-record line.
AC2. \`export --quiet\` still writes every error line.
${o.ac3 || 'AC3. `export` without the flag writes what it writes today.'}
${o.itemTail === undefined ? `
## What must keep working

- The exit status export returns for a failed record.

## Out of scope

- Changing what counts as an error. Separate item.` : o.itemTail}
`;
const B = (o={}) => `
=== THE BOUNDARY ===

schema_version: 1
tracker: github-issues
item: gh-901
registry_revision: "none"
registry_selections: []
mandates: [correctness]
non_goals:
${o.nonGoals || '  - "changing what counts as an error — separate item"'}
interpretation:
  goal:
    statement: "a CI run of export produces no per-record output and still reports failures"
    provenance: stated
    support:
      - kind: item_locator
        ref: "Goal"
  problem:
    statement: "export cannot suppress per-record output, so CI logs are unreadable"
    provenance: stated
    support:
      - kind: item_locator
        ref: "Problem"
  claim_provenance:
    C1:
      provenance: stated
      support:
        - kind: item_locator
          ref: "AC1"
    C2:
      provenance: stated
      support:
        - kind: item_locator
          ref: "AC2"
  corrections: []
  gaps: []
claims:
  - id: C1
    text: "export --quiet writes no per-record line"
  - id: C2
    text: "export --quiet still writes every error line"
coupling:
  - id: CPL-1
    kind: consumer
    target: "the CI job that reads export's output"
entails:
  CPL-1: OB-1
entries:
  - id: OB-1
    statement: "export --quiet writes no per-record line"
    verifier: mechanical
    verification_stage: pre_merge
    obligation: must
    mandate: [correctness]
    traces: [C1, CPL-1]
    observation: "run export --quiet over a three-record input and count the per-record lines"
    decision: "the count is zero"
    quantitative: false
    test_role: change
    baseline: assertion_fail
${o.extraEntries || `  - id: OB-2
    statement: "export --quiet writes an error line for every failed record"
    verifier: mechanical
    verification_stage: pre_merge
    obligation: must
    mandate: [correctness]
    traces: [C2]
    observation: "run export --quiet over an input whose second record fails, then count the error lines"
    decision: "the count is one"
    quantitative: false
    test_role: change
    baseline: assertion_fail`}
`;

const F = {
// F3 -> OB-4: boundary AND item together state none of the three conditions
f3: head('') + ITEM({ itemTail: '' }) + B({ nonGoals: '  - "nothing is excluded from this item"' }),

// F4 -> OB-11: non_goals present but addressing nothing the item raises
f4: head('') + ITEM() + B({ nonGoals: '  - "rewriting the installer in Rust"\n  - "the mobile client\'s offline cache"' }),

// F5 -> PRESB-2, PRESB-5: unevaluable decision in an entry the round did NOT change
f5: head(' This is a repair round: OB-1 was rewritten since the last review; PRES-1 was not touched.')
  + ITEM() + B({ extraEntries: `  - id: PRES-1
    statement: "the exit status for a failed record does not change"
    verifier: mechanical
    verification_stage: pre_merge
    obligation: must
    mandate: [correctness]
    traces: [C2]
    observation: "run export over an input whose second record fails, on base and on head"
    decision: "the behaviour is preserved"
    quantitative: false
    test_role: preservation
    baseline: pass` }),

// F6 -> PRESB-3, PRESB-4: defect whose repair needs a threshold neither artifact supplies.
// Editing is permitted; the run must be free to attempt the fix and fail.
f6: head(' You may edit the boundary if step 8 tells you to.')
  + ITEM() + B({ extraEntries: `  - id: OB-2
    statement: "export --quiet keeps the log small enough for CI"
    verifier: mechanical
    verification_stage: pre_merge
    obligation: must
    mandate: [correctness]
    traces: [C2]
    observation: "run export --quiet over the CI corpus and measure the log size"
    decision: "the log is under the CI limit"
    quantitative: false
    test_role: change
    baseline: assertion_fail` }),

// F7 -> PRESB-6: defective against each of the five questions at once
f7: head('') + ITEM({ itemTail: `
## What must keep working

- Whatever the CI job currently depends on.` })
  + B({ nonGoals: '  - "the structured log format the CI job will need afterwards; deferred"',
        extraEntries: `  - id: OB-2
    statement: "export --quiet behaves well under load"
    verifier: mechanical
    verification_stage: pre_merge
    obligation: must
    mandate: [correctness]
    traces: [C2]
    observation: "run export --quiet and observe"
    decision: "the behaviour is satisfactory"
    quantitative: false
    test_role: change
    baseline: assertion_fail` }),

// F8 -> PRESB-7: an unresolved what-is-wanted choice, two readings, neither chosen
f8: head('') + ITEM({ ac3: 'AC3. `export --quiet` suppresses per-record output for successful records.\nAC4. `export --quiet` suppresses per-record output for every record, including failures.' }) + B(),
};
for (const [k, v] of Object.entries(F)) fs.writeFileSync(`/tmp/fx/${k}.txt`, v);
console.log(Object.keys(F).map(k => `${k}: ${fs.statSync('/tmp/fx/'+k+'.txt').size} bytes`).join('\n'));
