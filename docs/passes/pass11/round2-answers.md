# Pass 11, round two — answers as returned

Receipt as reported: `docs/passes/pass11/round-prompt.txt` sha256
`dbc5557245509aec9642710083808faca44ba86794e31e9b913239863ae23fe5`, 3324 bytes.
Matches the frozen digest. Round valid, pending zed's independent post-round
re-digest.

Reviewer: a fresh agent, dispatched by reference, no history with the artifact. The
wrapper differed from round one's only in the word "two".

## Q1 — decisions not evaluable against their own observation

None. All twenty-one decisions are decidable from what their own observation produces.
W-1 is decidable but vacuously so on an empty set — see Q6.

## Q2 — blocking question about what is wanted

No. The only candidate is the scope call `comment#3` leaves open, and the boundary
chooses: `non_goals` excludes the falsifiability check and routes it to
`domestique-37o`. The item's undefined "handed off" is likewise chosen, in C5.

## Q3 — can you state what must keep working

Yes. The item's three bullets, decomposed into PRES-1, PRES-10, PRES-2, PRES-3,
PRES-4, PRES-5, PRES-6, PRES-7.

## Q4 — can you state what is out of scope

Yes. Changing what the stopping rule requires, plus the schema and linter verdicts,
rebuild/reversion/reinstall in this session, and `human-work-item`.

## Q5 — can you state what is handed off, and to whom

Yes. Four `non_goals` residuals with destinations — `domestique-37o`,
`domestique-crl`, gh-172, `domestique-13n`; CPL-7 routed to gh-172 and CPL-6 declared
as deferring nothing; W-1's handoff object; step 10's approval left to a person. **No
live residual lacks a destination.**

## Q6 — an input where the decision returns true while the failure occurs

**OB-1, OB-2, OB-3.** Head states the three new questions *conditionally*: "for a
boundary marked NOT FROZEN, also ask whether a fresh reader can state what must keep
working, what is out of scope, and what is handed off." The observation runs a review
of *a* boundary; run on a NOT FROZEN one, the return answers all three yes-or-no and
all three decisions return true, while for every other boundary nothing asks — the C2
failure exactly. **PRES-10 forbids this qualifier but is scoped to "the two original
questions."**

**OB-3, second input.** Head leaves "handed off" undefined, which PRES-2 permits
because base defines nothing either, and the reviewed boundary has no `post_merge` or
`production` must entry. The review answers "yes — handed off is the per-entry handoff
object, and none is required." The return answers the condition yes, so the decision
is true, and the vacuous reading C5 was written to refuse is what the review just did.
OB-3 traces C5 and its decision cannot see it.

**OB-4.** Head produces a finding when a condition is literally absent and answers YES
when the condition is present in form and empty in substance — an out-of-scope list
excluding nothing live, or a handed-off answer satisfied by "no handoff object
required." The observation pins the input to a pair stating none of the three, where
all three are literally absent, so the findings name all three and the decision
returns true — while the vacuity case C5's own note calls the defect this item exists
to fix produces no finding.

**OB-7.** The decision is containment only. The recorded prompt carries head's full
question set *and* text assembled from the installed 0.3.0 skill, including "step 8
asks two questions." Every extracted question is carried, so the decision is true,
while the reviewer is reading pre-change step 8 — the C7/CPL-5 hazard the entry exists
for.

**PRES-1.** Head leaves both question wordings byte-identical and unconditional and
changes the field-meaning gloss the first question depends on: redefining
`observation`, or dropping "holding only what that entry's observation produces". The
two wordings are unchanged, so the decision is true, and the question establishes
less. **PRES-2's own reasoning — a condition is its meaning, not its label — is not
applied to step 8's two questions.**

**PRES-10.** Head states no condition on *when* the two questions are asked and adds
one on *what they are asked about*: "ask them of the entries this round changed." No
condition on when is present, so the decision is true, and the two questions stop
covering every entry.

**PRES-2.** Head keeps step 9's six conditions and any definitions byte-identical and
qualifies step 9 from outside: "step 9 is advisory for a boundary marked NOT FROZEN",
or removes step 9 from the sequence step 8 feeds. The observation reads only step 9's
conditions and definitions, so the decision is true, while the stopping rule no longer
requires them. **The same external-qualifier shape PRES-10 was added for on step 8.**

**PRES-4.** Head keeps the two-round limit and adds "after the drafter fixes a first
round's findings, a new review may be opened." No third round of the *same* review is
permitted, so the decision is true, and the limit binds nothing. PRES-4's note scopes
the witness to one review and calls a fresh budget "not this witness"; **that scoping
is the input.** This pass is the instance — two cap-stopped rounds in pass 10, then
pass 11 authorized.

**PRES-6.** Head's step 8 says a second round naming a finding hands the boundary to a
person, *or* the drafter may open a further review. The text does hand it to a person,
so the decision is true, while the escalation is optional and escapable.

**PRES-7.** The decision asks only whether the rule applies, never what it requires.
Head broadens the rule to every question and softens it: "the reviewer names its
concern" in place of "names a specific requirement it could not decide." It applies to
every question, so the decision is true, and the unactionable findings bullet three
protects against arrive on exactly the answers this item adds. **The mirror of the
PRES-1 repair — PRES-1 reads wording and not scope, PRES-7 reads scope and not
wording.**

**PRES-11.** Head adds a manifest field to the authoring schema — in the boundary
template or `modus/prompts/boundary-prose.md` — and leaves `lint-boundary.js`
byte-identical. The digests are equal, so the decision is true, and C10's schema half
is falsified. **The entry's stated justification, that an unchanged file cannot grow a
schema, holds only if the whole schema is inside that one file, which neither artifact
establishes.**

**W-1.** No condition is ever named as a finding under the changed step 8 because
reviewers answer yes to all three. The observation ranges over "the three conditions
named as a finding", so the decision is true over an empty set while the late arrival
C11 names keeps happening. The entry declares never-named excluded deliberately; **the
consequence is that the watch reports pass in the case it exists to detect.**

**None:** OB-5, OB-6, OB-8, OB-9, PRES-3, PRES-5, PRES-8, PRES-9.
