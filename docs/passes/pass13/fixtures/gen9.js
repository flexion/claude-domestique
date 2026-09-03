const fs=require('fs');
const head = `You are resuming an in-progress \`modus:agent-work-item\` run. Steps 1 through 8 are
already done: the item below was read, the boundary below was drafted from it, it
passes both lint forms with no failures, and the review returned an empty list of
unevaluable decisions and no blocking question.

The boundary is marked NOT FROZEN.

Continue the procedure at step 9. Do what step 9 says, and stop when step 9 is done.
Do not restart from step 1. Do not redraft or edit the boundary. Do not go past step 9.

I am deliberately not telling you what step 9 requires, and not telling you what its
result should be. Read it in the skill and reach your own conclusion.
`;
const item = (o={}) => `
=== THE ITEM ===

Title: Add a --quiet flag to the export command

Description: The export command prints a progress line per record. In CI that fills
the log with thousands of lines and the actual failure scrolls away.

Problem: export has no way to suppress per-record output, so CI logs are unreadable.

Goal: a CI run of export produces no per-record output and still reports failures.

## Acceptance criteria

AC1. \`export --quiet\` writes no per-record line.
AC2. \`export --quiet\` still writes every error line.
${o.noAC3?'':'AC3. `export` without the flag writes what it writes today.'}
${o.extraAC||''}
${o.keep===false?'':`## What must keep working

- The exit status export returns for a failed record.`}
${o.scope===false?'':`
## Out of scope

- Changing what counts as an error. Separate item.`}
`;
const OB1 = (o={}) => `  - id: OB-1
    statement: "export --quiet writes no per-record line"
    verifier: mechanical
    verification_stage: pre_merge
    obligation: ${o.watch?'watch':'must'}
    mandate: [correctness]
    traces: [C1, CPL-1]
    observation: ${o.vagueObs?'"review the output"':'"run export --quiet over a three-record input and count the per-record lines"'}
    decision: "the count is zero"
    quantitative: false${o.watch?'':`
    test_role: change
    baseline: assertion_fail`}`;
const OB2 = `  - id: OB-2
    statement: "export --quiet writes an error line for every failed record"
    verifier: mechanical
    verification_stage: pre_merge
    obligation: must
    mandate: [correctness]
    traces: [C2]
    observation: "run export --quiet over an input whose second and third records fail, then count the error lines"
    decision: "the count is two"
    quantitative: false
    test_role: change
    baseline: assertion_fail`;
const PRES1 = `  - id: PRES-1
    statement: "the exit status for a failed record does not change"
    verifier: mechanical
    verification_stage: pre_merge
    obligation: must
    mandate: [correctness]
    traces: [C3]
    observation: "run export over an input whose second record fails, on base and on head, then read both exit statuses"
    decision: "the two statuses are equal"
    quantitative: false
    test_role: preservation
    baseline: pass`;
const PRES2 = `  - id: PRES-2
    statement: "unflagged export writes what it writes today"
    verifier: mechanical
    verification_stage: pre_merge
    obligation: must
    mandate: [correctness]
    traces: [C4]
    observation: "run export without the flag over a three-record input, on base and on head, then compare the two outputs"
    decision: "the two outputs are equal"
    quantitative: false
    test_role: preservation
    baseline: pass`;
const boundary = (o={}) => `
=== THE BOUNDARY ===

schema_version: 1
tracker: github-issues
item: gh-901
registry_revision: "none"
registry_selections: []
mandates: [correctness]
non_goals:
${o.nonGoals||'  - "changing what counts as an error — separate item"\n  - "the structured log format the CI job will need afterwards — deferred to gh-902"'}
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
          ref: "AC2"${o.noAC3?'':`
    C4:
      provenance: stated
      support:
        - kind: item_locator
          ref: "AC3"`}${o.noC3?'':`
    C3:
      provenance: stated
      support:
        - kind: item_locator
          ref: "What must keep working"`}
  corrections: []
  gaps: []
claims:
  - id: C1
    text: "export --quiet writes no per-record line"
  - id: C2
    text: "export --quiet still writes every error line"${o.noAC3?'':`
  - id: C4
    text: "unflagged export writes what it writes today"`}${o.noC3?'':`
  - id: C3
    text: "the exit status for a failed record does not change"`}
coupling:
  - id: CPL-1
    kind: consumer
    target: "the CI job that reads export's output"
entails:
  CPL-1: OB-1
entries:
${[OB1(o), OB2, o.noC3?null:PRES1, o.noAC3?null:PRES2].filter(Boolean).join('\n')}
`;
const F = {
  f15: head + item() + boundary(),                                   // control: all six hold
  f9 : head + item() + boundary({watch:true}),                        // 1 what must be true: nothing gates
  f10: head + item() + boundary({vagueObs:true}),                     // 2 how it would tell
  f11: head + item({keep:false,noAC3:true}) + boundary({noC3:true,noAC3:true}),             // 3 what must keep working
  f12: head + item({scope:false}) + boundary({nonGoals:'  - "rewriting the installer in Rust"'}), // 4 out of scope
  f13: head + item() + boundary({nonGoals:'  - "changing what counts as an error — separate item"\n  - "the structured log format the CI job will need afterwards"'}), // 5 handed off: deferred, no destination
  f14: head + item({extraAC:'AC4. `export --quiet` suppresses per-record output for every record, including failures.'}) + boundary(), // 6 blocking question
};
for(const [k,v] of Object.entries(F)) fs.writeFileSync(`/tmp/fx/${k}.txt`,v);
console.log(Object.keys(F).map(k=>`${k}: ${fs.statSync('/tmp/fx/'+k+'.txt').size}b`).join('  '));
