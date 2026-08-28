# Review — lint-boundary.js, fixtures, and tests

Reviewer: hugh. Target: `7364b2c` on `chore/satisficing-boundary`. Every finding was first verified
at `975c802` and re-verified at `7364b2c`; all of them survive the move. Untracked artifact — keep it
or delete it.

Reproduced: `node context-emendator/scripts/lint-boundary.js
context-emendator/schemas/fixtures/*.yaml` → 11 FAIL + 2 ok, exit 1. `npx jest
…lint-boundary.test.js` → 17 passed. Every claim below is backed by a probe I ran, named `pN` and
listed at the end.

Verdict up front. The checks that exist are faithful to the rules they implement, and the negative
fixtures are disciplined — each is a clean one-line delta from its base, and I found none passing for
an unintended reason. What the linter cannot self-check is where the damage is:

- Three of its checks demand data that cannot exist when the document says the linter runs (§2.4).
- Four required manifest fields are unenforced (§1.1).
- **Both new trace rules are gated on a regex that decides provenance by spelling, and one of your
  own clean fixtures already defeats them by accident** (§2.6). This is the load-bearing finding.
- The trace-resolution *order* the document specifies is unimplementable as written, and the
  ambiguity it was written to resolve is now doing real work (§5).
- All three YAML-schema tests pass regardless of the schema option (§6).

---

## 0. The target moved twice while I was reviewing it

I read `975c802`, found `lint-boundary.js` modified in the working tree mid-review with
`E_SELF_TRACE` and `E_NO_UPSTREAM_TRACE` plus three untracked fixtures, and then your delta arrived
saying HEAD was `7364b2c`. I re-pinned and re-ran everything. Nothing in this review is an artifact of
the drift: `p2`, `p5`, and `p7` lint clean at both commits, and `p1`/`p3`/`p4` differ only by the two
new codes.

Worth noting for its own sake, since it is a property of the setup rather than of the code: a
reviewer asked to check rule fidelity against a named commit cannot do it if the commit moves. It
cost me one full re-verification pass. If you want another round, tag it.

Your delta answers part of what I had already written, and one of my findings answers part of your
delta. Both are marked inline.

---

## 1. COVERAGE — mechanical rules in the doc that are not in the code

**1.1 Four required top-level fields are unenforced.** The manifest-fields table says "all
required". `p1` — a manifest with no `schema_version`, `issue`, `registry_revision`, `claims`,
`coupling`, or `entails` — lints **clean**. `mandates`, `claims`, and `entails` are caught
indirectly (their absence surfaces as `E_UNKNOWN_MANDATE` / `E_TRACE_UNRESOLVED` /
`E_ENTAILS_UNDECLARED`), but `schema_version`, `issue`, `registry_revision`, and `coupling` are not
caught at all. A manifest with no `coupling` section makes the entire entails-coverage check vacuous
and reports nothing.

**1.2 `schema_version` is never read.** Its stated purpose is "so a linter can refuse a shape it
does not know". `p2` sets `schema_version: 999` and lints clean. The field exists for one job and
does not do it.

**1.3 Registry trace resolution is a regex, not a resolution.** `p2` traces `INV-99999` and lints
clean. The linter never opens a registry and never uses `registry_revision`. Stage 2 says the Linter
"resolves every trace"; for the fourth case it pattern-matches. This may be the right scope for a
reference implementation, but it is the difference between "the trace names something that exists at
the pinned revision" and "the trace looks like an invariant id", and the doc claims the former.

At `975c802` I had this filed as a scope question. `7364b2c` promoted it: both new trace rules now
branch on that same regex, so the gap decides verdicts rather than merely under-reporting. See §2.6 —
this is the finding I would fix first, and 1.3 is its root cause.

**1.4 "The Linter rejects an id the runner does not collect" is not implemented.** The doc calls
this mechanical in as many words. `E_EDGE_NO_CASE_ID` checks presence of `case_id`, never
collectability. See §2.4 — I think the rule is misplaced rather than merely missing.

**1.5 Id uniqueness is unenforced, and every resolution check keys on ids.** `p7` has two entries
with `id: E1` **and** a claim with `id: E1`, and lints clean in both versions. Duplicate entry ids
make `entails` targets and `traces` ambiguous, and `entryIds` silently collapses them.

**1.6 The `entails` key space is checked in one direction only.** The doc says the coupling id "is
the key space for `entails`". The code iterates `coupling` and asks `c.id in entails`, so a key that
is *not* a coupling id is silently ignored. `p5` carries `CPL-TYPO: E1` and `"": uncovered` alongside
full legitimate coverage and lints clean. A typo'd edge id therefore reads as covered-and-also-typo'd
with no signal.

**1.7 Minor:** line 81 requires `observation` and `decision` on every entry; neither is checked.

---

## 2. OVER-ENFORCEMENT

**2.1 `E_TESTROLE_FORBIDDEN` on mechanical + pre_merge + watch is correct — keep it.** Your stated
worry is unfounded. The doc licenses it twice in one paragraph: "Only `mechanical` + `pre_merge` +
`must` entries carry `test_role` and a baseline", then explicitly "and for a `watch` entry, which
gates nothing". `p4` confirms it fires there. No change needed.

**2.2 `E_NO_TRACE` is over-enforcement.** The doc says an entry "carries … `traces[]`"; carrying an
empty list satisfies that. Requiring non-empty is a hard rule stated nowhere. I would keep the check
and add the sentence to the doc — but it has to be added, not implied.

**2.3 `E_ORPHAN_ENTRY` is fine.** Line 53 names "orphan-entry" as a check by that name, so an entry
with no mandate is an orphan by the document's own vocabulary.

**2.4 `E_NO_EVIDENCE_EDGE`, `E_EDGE_BASELINE_CONFLICT`, and `E_NO_SENSITIVITY_PROBE` run a stage too
early. This is the biggest finding, and the doc is what's wrong.**

The Linter runs at stage 2 and re-runs at stage 3 before the freeze. The entry-to-test evidence map
is written by the Implementer at **stage 4** ("records the entry-to-test evidence map, which is
many-to-many"). So these three checks demand data that, by the document's own timeline, cannot exist
when the linter runs — and the bundle is frozen before it can.

This is not a code bug. The code faithfully implements rules the "The boundary file" section places
inside the manifest. That placement is the error: evidence edges cannot be fields of an artifact
frozen one stage before they are authored. The consequence shows up in the fixture — `valid.yaml`
carries pytest node ids, so the file the suite calls a valid boundary actually models a post-stage-4
state, not a freezable boundary.

The repair is in the doc: the evidence map is a **stage-4 artifact keyed to entry ids**, and the
same-baseline, case-id-collectability, and probe-declaration checks belong to a second pass that runs
at stage 5 with the runner available. That also lands 1.4 in the only place it can work.

**2.5 `E_NO_UPSTREAM_TRACE` — you asked directly, so: keep the rule, and fix the document, which is
what actually failed here.**

As written the code and the doc disagree, and the doc is the weaker of the two. The resolution list
names "another entry id" as a first-class target with no side condition, so nothing in the document
licenses rejecting an entry that traces only obligations. By the letter, this is over-enforcement.

But you are right about what the document *means*, and the reason you had to freelance is itself a
finding. **The document says what `traces[]` resolves against and never says what it is for.** That
is a syntax rule wearing a semantics rule's clothes — and a resolution rule with no stated purpose is
satisfiable by any self-consistent closed set, which is exactly the decorative behavior you hit. You
could not derive the upstream requirement from the text because the text never states the obligation
the requirement serves.

So this is a new form of your recurring class. Round three was *prose names a field no actor writes*.
This one is **prose states what a field resolves against but never what it is for, so the check that
would enforce the purpose has no textual basis** — and the author has to invent one or leave the rule
decorative. Both options are defects, which is why you noticed.

The repair is one sentence in the doc, stated as purpose rather than as a fourth mechanical rule:
`traces[]` anchors an obligation to a requirement stated outside the boundary, and at least one trace
must reach a claim, a coupling edge, or a registry invariant; a trace to another entry records a
relationship between obligations and does not discharge the anchoring requirement. Say that and both
new checks become derivations instead of additions, and you are no longer enforcing on your own
authority.

`E_SELF_TRACE` needs no such repair — "**another** entry id" already licenses it. Good catch, and the
right scope.

**2.6 Both new rules are gated on a regex that decides provenance by spelling — and
`realcase-BUG-4471.yaml` is green for exactly the wrong reason you just caught in the negatives.**

This is the finding I would act on first.

Both checks exempt a trace matching `/^INV-\d+$/`, on the stated ground that a selected registry
invariant legitimately anchors to its own registry id. The exemption is correct in intent. The
problem is that `isRegistryInv` is a claim about **provenance** — "this was selected from
`registry/invariants.yaml` at the pinned revision" — decided entirely by the id's **shape**, and the
linter never opens a registry (§1.3) and never uses `registry_revision`. The claim is therefore
unfalsifiable by construction, and both new rules can be defeated by naming.

Your own positive fixture already defeats them. `INV-9` in `realcase-BUG-4471.yaml`:

```yaml
  - id: INV-9
    statement: "peak RSS exporting 500k rows is within 1.5x of the 50k peak"
    traces: [INV-9]
```

Three numbers straight out of this issue — 500k, 50k, 1.5x. That is a per-issue authored quantity,
and the document is unambiguous that floor invariants are "**selected** from `registry/invariants.yaml`
at a pinned revision, by path glob, **never authored per issue**". It wears a registry-shaped id, it
traces nothing but itself, and it lints clean because of the exemption. `INV-2` carries the same
self-trace at line 43 (waived the same way; it survives the upstream rule only on `C3`).

`p9` isolates it: rename `INV-9` → `RES-9` and change its self-trace to match — content byte-identical
otherwise — and the entry flips from clean to `E_SELF_TRACE` + `E_NO_UPSTREAM_TRACE`. **The verdict
depends on how the id is spelled, not on anything about the entry.** You fixed the two new negative
fixtures by renaming their ids off the pattern; the positive fixture still leans on the exemption, and
it is hiding two decorative traces while doing it.

`p10` shows the same bypass without any registry pretence: an entry tracing **only** a local entry
that happens to be named `INV-2` passes the upstream rule, because `isRegistryInv` is tested before
`traceable` and silently credits the registry for a token that resolves to an obligation sitting in
the same file. "Tracing only other obligations" is precisely what that entry does, and the rule waves
it through.

The fix is to stop inferring provenance and make the manifest declare it — a top-level
`registry_selections: [INV-2, INV-9]`, or a field on the entry. Then "is this a selected floor
invariant" is checkable against the pinned revision instead of guessed from a prefix, the exemption
becomes falsifiable, and it closes §1.5 and the §5 ordering problem in the same stroke, because the
declaration tells the linter which space an `INV-<n>` token belongs to. One field, three findings.

Until then, note the asymmetry you have shipped: **one id prefix is semantically load-bearing inside
the linter and every other prefix is decorative.** `PRES-2` carries `test_role: change`, so `PRES` now
means nothing; `INV` waives two rules.

---

## 3. FIXTURE ISOLATION

No **negative** fixture passes for a reason you did not intend. I diffed all nine originals against
`valid.yaml`: every one is a single-line delta, and I confirmed each reported code traces to that
delta and not to a side-effect. Both two-code fixtures are honest. The positive fixture is a different
story — see §2.6, which is your own "green for the wrong reason" failure recurring one file over, in
the file you did not re-attack after fixing the negatives.

Your delta draws the right lesson from the near-miss and I want to reinforce it: **asserting the exact
code set rather than "it failed" is what caught it**, and it is the single highest-value decision in
this suite. Keep it even where it forces multi-code assertions. The corollary you did not draw is that
the same discipline has no equivalent on the positive side — `expect(codes('valid.yaml')).toEqual([])`
asserts an empty set, which is satisfied by a check that fired for the wrong reason and by a check that
never ran at all. A clean fixture cannot distinguish those. §2.6 is what that gap costs.

Two negatives can still be tightened, and both are worth it:

- **`bad-orphan_and_unanchored` splits cleanly.** Add a fourth name to `/mandates` with no carrier →
  `E_UNANCHORED_MANDATE` alone, one-line delta. Point `INV-2`'s mandate at `correctness` (which
  `INV-9` and `AC-1` also carry) → `E_ORPHAN_ENTRY` alone, one-line delta. These are the two checks
  that justified declaring `mandates[]` at all; they deserve separate fixtures.
- **`bad-observation_must` reduces to one code** by also setting `W-1`'s stage to `pre_merge`. That
  is a second line, but it buys the row-4 "any stage" claim, which no fixture covers today.

**The arithmetic is the real problem here.** At `7364b2c` the linter emits **31** distinct codes and
the suite asserts **12**. The doc claims `fixtures/` "carries one valid boundary plus one negative
fixture per rule" — false by 19.

The absent ones that matter for rule fidelity are precisely the resolvers, the checks most likely to
rot without anyone noticing:

```
E_TRACE_UNRESOLVED     E_ENTAILS_UNRESOLVED   E_HANDOFF_INCOMPLETE   E_UNKNOWN_MANDATE
E_NONGOALS_EMPTY       E_TESTROLE_REQUIRED    E_BASELINE_REQUIRED    E_NO_EVIDENCE_EDGE
E_EDGE_NO_CASE_ID      E_COUPLING_NO_ID       E_NO_TRACE             E_NO_ENTRIES
E_ENUM_VERIFIER        E_ENUM_STAGE           E_ENUM_OBLIGATION      E_ENTRY_NO_ID
E_ENTRY_NO_STATEMENT   E_ENTRY_NOT_A_MAPPING  E_NOT_A_MAPPING
```

`E_HANDOFF_INCOMPLETE` is the sharpest miss: the doc says handoff "presence **and field
completeness** are mechanical", and only presence has a fixture. Completeness is the half that
regresses silently. It does work — `p3` fires it — it is just unasserted.

**Behaviors the document states and no fixture instantiates at all**, positive or negative, counted
across all twelve files:

| Behavior | Instances |
| --- | --- |
| `post_merge` stage — half of cross-product row 3 | **0** |
| `mutation` probe kind — half of the sensitivity-probe union | **0** |
| One test case discharging several entries under the same baseline — the stated reason the same-baseline constraint exists | **0** |

The third is the one I would fix. `E_EDGE_BASELINE_CONFLICT` has a negative fixture and no positive
one, so the suite proves the constraint *rejects* and never proves it *permits*. A regression that
made every shared case id a conflict would pass all 17 tests. The doc leans on the permissive
direction explicitly — "One entry may still need several test cases. 'One test discharges several
entries' holds only under that same-baseline constraint."

`realcase-BUG-4471.yaml` did close real gaps versus `valid.yaml` and deserves credit for it: it is the
only instance anywhere of `expected_error` with a live `error_code`/`error_pattern` pair (`AC-2`), of
an entry carrying two evidence edges (`INV-2`), and of a five-mandate manifest with every name
anchored. That is a good fixture and the transcription exercise was the right instinct.

One remaining axis gap in the older fixtures: `E_TESTROLE_FORBIDDEN` is exercised only on the verifier
axis (`independent_review`), never the stage or obligation axis. Your claim that the code handles both
later stages is true — the `laterStage` disjunction is right — but no fixture proves it, and `p4`
confirms the obligation axis works only because I wrote a probe for it.

---

## 4. THE VALID FIXTURES — one real violation, and the real case makes it overwhelming

**Neither `valid.yaml` nor `realcase-BUG-4471.yaml` is valid per the document.** Entries carry, "for
quantities — `value`, `unit`, `conditions`".

In `valid.yaml`: `AC-4` is a quantity — "peak RSS stays within 1.5x of the 50k baseline", decision
"p99 within 1.5x" — with none of the three. `AC-1` ("export of 500k rows") likewise.

In `realcase-BUG-4471.yaml` it is not an edge case, it is the dominant shape. Five entries are
quantities and **zero** carry `value`, `unit`, or `conditions` — `grep -cE '^    (value|unit|conditions):'`
returns 0 for the whole file:

| Entry | Quantity | Decision |
| --- | --- | --- |
| `INV-9` | 1.5x ratio | `ratio <= 1.5` |
| `AC-1` | 4 min, 5 min bound | `elapsed <= 240s` |
| `AC-4` | attempt_count | `>= 1` |
| `PRES-4` | concurrency level | `>= pre-change baseline` |
| `AC-2` | (enum, not a quantity) | — |

The linter cannot catch any of it, and that is the point: **"is this entry a quantity" has no
mechanical trigger.** This is a sixth instance of the class writing the linter surfaced five of —
prose naming a field with no actor and no decidable condition — and it is still open. Your delta says
the transcription exercise was meant to test whether the schema expresses a real case or only the
fixture its author wrote to fit the rules. It answered: the real case is *made of* quantities, and the
schema has no way to carry them or to require them.

Fix it the way you fixed the other five. A closed `kind` field, or `quantity: true`, so the trigger is
declared and the requirement becomes checkable — or delete the requirement from the document. Leaving
it as prose is the thing you already decided not to do five times.

Everything else in both files holds. I attacked `valid.yaml` on cross-product legality (rows 1, 2, 3
and 5 instantiated, none violated), mandate anchoring (all three names carried, no orphans), entails
totality over `coupling`, baseline-vs-role legality on both gating entries, handoff completeness on
`AC-4`, and `test_role` absence on the three non-gating entries. It survives all of it. `INV-2`
carrying `test_role: change` is legal — "almost always" preservation is not "always", and the doc
calls out that an earlier draft made preservation invariants unrepresentable, so exercising both roles
is right. `realcase` survives the same attacks with five mandates and eleven entries, plus
`expected_error` typed correctly and two edges on one entry.

The one substantive thing `realcase` reveals that is not a linter matter. `entails: CPL-capacity:
PRES-4` declares a coupling edge covered by a **production** obligation carrying a handoff. Per the
schema that is legal — `PRES-4` is an entry id. But stage 4 says an exact hit in the frozen `entails`
map is what mechanically permits work to continue, and here the permission rests on an obligation that
cannot be checked before merge. Coverage by a `post_merge`/`production` entry is coverage in name only
at gate time, and nothing in the manifest or the linter distinguishes it from `pre_merge` coverage.
Same class again: a distinction the prose implies and no field carries. It is also the mechanism behind
your point 3 — see §7.

---

## 5. THE FIVE FILLED GAPS

**Mandates as a top-level list — right call.** It makes both checks decidable at the cost of one
field. Add the presence check from 1.1.

**Trace resolution order — the order is not implemented, cannot be as written, and the ambiguity it
was supposed to settle is now load-bearing.** This was my §5 finding at `975c802` and `7364b2c` made
it worse rather than better.

The code builds one flat `traceable` Set and asks membership, so no order is observable in any output.
Adequate for existence-checking — but the ordering paragraph then describes behavior nothing
implements, and both fixtures contain exactly the collision it names, because `INV-2` is
simultaneously an entry id and a registry-shaped id.

That was cosmetic at `975c802`. It is not any more. The two new rules **branch on which space a token
resolves in** (`isRegistryInv` is tested before `traceable`), so the collision now decides verdicts —
§2.6 and `p10`. An ordering rule that silently prefers one space is a rule whose violations are
invisible, and the new checks turned that invisibility into a bypass.

The way out is not to pick a winner. Replace the ordering paragraph with **declared provenance plus
id uniqueness**: a top-level `registry_selections[]` naming which entries were selected from the
pinned revision, and a uniqueness rule across claims, entries, and coupling edges. Then every trace
resolves in exactly one space, by declaration rather than by regex; the §2.6 exemption becomes
falsifiable; and §1.5 closes. One field replaces an ordering rule, an unimplementable resolution
sequence, and two spelling-dependent exemptions.

**Entails keyed by coupling edge id only — right call, but the doc still disagrees with itself.**
Lines 196 and 241 both still read "coupling edge **or consumer id**". You fixed the manifest table
and not the stage-2 and stage-4 bullets, and the code implements coupling-edge-only. Two different
keys are still named in two different places. Fix the bullets.

---

## 6. THE UNMET REQUIREMENT

Right about comments. **Wrong about `1.10`.** And the consequence is broader than you stated.

**Comments: your characterization is correct.** js-yaml discards them, the canonicalization half is
unimplemented, and naming that in the doc beats papering it. `yaml` in Node and `ruamel.yaml` at
`typ="rt"` in Python are the right two candidates.

**`1.10` does not survive, and the test does not test it.** The assertion is
`parse('threshold: "1.10"')` — quoted. A quoted scalar is a string under every YAML schema ever
written, so the test asserts nothing. Unquoted under `CORE_SCHEMA`, `1.10` parses to the **number
1.1**. The test name says "an unquoted version-like scalar keeps its trailing zero" and the input is
quoted; the doc's claim that "the tests prove `NO`, `on`, `off`, and `1.10` all survive" is false for
the fourth. The linter's own comment has it backwards too — "1.10 stays a string unless quoted as a
number" inverts the actual behavior, which is that it becomes a number unless quoted as a string.

**All three YAML tests are non-discriminating.** In the installed js-yaml (5.2.3), `NO`, `on`, and
`off` parse identically under `CORE_SCHEMA` and `DEFAULT_SCHEMA` — the 1.1 boolean aliases are gone
from the default. I patched `load()` to drop `{ schema: yaml.CORE_SCHEMA }` and every one of the twelve
fixtures produced byte-identical findings. Nothing in the suite would fail if the schema option were
deleted. So the requirement "loads under the YAML 1.2 core schema" is **unverified**, not verified. A
real test needs either a construct where the two schemas genuinely differ in this version, or a
direct assertion on the schema the loader was handed.

**A live typing hazard the doc's own typing section should have caught.** `registry_revision` is a
digest field with no type constraint and no linter check. Under the core schema:

```
registry_revision: 1234567   ->  number 1234567
registry_revision: 0012345   ->  number 12345        (leading zeros gone)
registry_revision: 00e12345  ->  number 0            (silently zero)
registry_revision: 1e5       ->  number 100000
registry_revision: 9f2c1ab   ->  string "9f2c1ab"    (safe only by luck of the letters)
```

`valid.yaml` quotes it, so the fixture is safe; a real short SHA of all digits is not. Constrain it
to a string. The same applies to any digest field you add.

**"The freeze digest does not yet mean what stage 3 claims" is correct but understates it.** Three
independent reasons, not one:

1. Comments are dropped, so rationale does not survive the round trip — your point.
2. There is no canonical serializer at all, so nothing computes a byte-stable form to digest. The
   comment loss is one symptom; the absence of a canonicalizer is the condition.
3. Stage 3 computes the bundle digest over "the manifest plus every referenced asset". The linter
   reads only the manifest. The referenced-asset half — sketch, coupling analysis, entails map,
   registry revision — is not loaded, not validated, and not digested by anything here.

State all three. The third is the one a reader would otherwise assume was done.

---

## 7. YOUR POINT 3 — `Handoff Pending` as the common shape

Agreed, and it is worth saying in the document rather than leaving as a fixture property. The
mechanism is §4's last paragraph: `PRES-4` is the entry that caps the run, it is `verifier: mechanical`
+ `verification_stage: production`, and it is also the sole coverage for `CPL-capacity` in `entails`.
So one entry simultaneously caps the terminal state *and* supplies a coupling edge's only declared
coverage — and both facts are invisible until stage 7.

Two things follow that I would put in the doc.

First, your empirical point, stated as such: the first transcribed real case terminates at
`Handoff Pending`. Stage 7 currently reads as though that is the exception — "sets the autonomous stop
state to `Handoff Pending` **rather than** `Ready for Merge` while any `post_merge` or `production`
must is unresolved". If capacity, saturation, and cost obligations are normal for real issues, that
phrasing has the frequency backwards, and `ready_for_merge` is the rare state. One sentence in Stop
conditions fixes it, and it is honest about a pilot that mostly ends in a handoff rather than
overselling a clean stop.

Second, and this is the part the fixture surfaces that the doc does not: **a run can be capped at
`Handoff Pending` by an entry the author had no way to see was terminal.** Nothing in the manifest
marks "this entry decides the terminal state", and nothing marks "this coupling edge is covered only
post-merge". Both are derivable mechanically — you already have `verification_stage` and `entails` —
so this is a projection the Linter or the run record could emit at stage 2, before a model is spent
implementing. Knowing at freeze time that the best available outcome is `Handoff Pending` is worth
more than discovering it at stage 7.

That is a new artifact, so it is your call whether it clears the bar you set — you said after round
three you would propose no new actor, artifact, or stage. It does not need to be an artifact: a
reason code, or a field on the existing `boundary_frozen` event, carries it.

---

## Which one is wrong

**The doc is wrong** on: evidence edges as fields of the frozen manifest (§2.4, stage-ordering);
`traces[]` stated as resolution without purpose, which is what forced you to add two rules on your own
authority (§2.5); "one negative fixture per rule" (§3); "the tests prove … `1.10` … survive" (§6);
`entails` keyed by "coupling edge **or** consumer id" at lines 196 and 241 (§5); trace resolution as an
*order* (§5); "for quantities — `value`, `unit`, `conditions`" as a mechanical field rule with no
trigger (§4); and `Handoff Pending` framed as the exception (§7).

**The code is wrong** on: provenance decided by regex, which defeats both new trace rules and leaves
`realcase-BUG-4471.yaml` clean for the wrong reason (§2.6 — fix first); the four unenforced required
top-level fields (§1.1); `schema_version` unread (§1.2); the registry never opened (§1.3); no id
uniqueness (§1.5); the one-directional `entails` key space (§1.6); `E_NO_TRACE` enforcing an unstated
rule (§2.2); and the three non-discriminating YAML tests (§6).

Ranked by what I would fix first:

1. **§2.6** — a positive fixture that lints clean for the wrong reason, in checks you added yesterday.
   Same failure you caught in the negatives, one file over.
2. **§2.4** — the stage-ordering error means `valid.yaml` does not model a freezable boundary at all.
3. **§4** — a still-open instance of your recurring class, now with five witnesses in the real case.
4. **§6** — the suite currently certifies a YAML guarantee it does not test, and the `1.10` claim in
   the doc is false.
5. **§5** — the `registry_selections[]` swap, which also closes §2.6 and §1.5.
6. **§3** — backfill the resolver fixtures and the missing positive case for the same-baseline
   constraint.

On your framing: you were right that a fourth prose pass was not the useful move, and right again that
you should not be sole judge of the two new rules. But note where the value actually came from. Almost
nothing here was found by reading prose. §2.6 came from renaming one id in your fixture, §4 from
`grep -c` on a real case, §6 from running the parser on unquoted input, §2.4 from putting the linter's
required fields next to the stage that writes them. The linter did not just expose gaps by being
written — it is now the instrument that finds them, including in itself. That is worth more than the
round-three prose read was.

---

## Probes

Throwaway fixtures under `/tmp/bprobe/` and `/tmp/bprobe2/`, run against `975c802` and `7364b2c`:

| Probe | Content | Result |
| --- | --- | --- |
| `p1` | no `schema_version`, `issue`, `registry_revision`, `claims`, `coupling`, `entails` | clean at `975c802`; at `7364b2c` only the two new trace codes fire |
| `p2` | `schema_version: 999`, `traces: [INV-99999]` | clean in both |
| `p3` | handoff present with `owner: ""`, `trigger: null` | `E_HANDOFF_INCOMPLETE` (works, unasserted) |
| `p4` | `mechanical` + `pre_merge` + **watch** carrying `test_role`/`baseline` | `E_TESTROLE_FORBIDDEN` — correct per the doc, your worry was unfounded |
| `p5` | valid entails coverage plus stale keys `CPL-TYPO`, `""` | clean in both |
| `p6` | `mandate` and `traces` as scalars instead of lists | caught, but reported as orphan/no-trace rather than a type error |
| `p7` | two entries with `id: E1`, plus a claim with `id: E1` | clean in both |
| `p9` | `realcase-BUG-4471.yaml` with `INV-9` renamed `RES-9`, content otherwise byte-identical | flips clean → `E_SELF_TRACE` + `E_NO_UPSTREAM_TRACE`. §2.6 |
| `p10` | entry tracing **only** a local entry that happens to be named `INV-2` | clean — the upstream rule credits the registry for a token resolving in-file. §2.6 |

Schema probes, not fixtures: unquoted `1.10` → `1.1` under `CORE_SCHEMA`; `NO`/`on`/`off` identical
under `CORE_SCHEMA` and `DEFAULT_SCHEMA` in js-yaml 5.2.3; `load()` with the schema option removed
produces byte-identical findings on all twelve fixtures; `registry_revision` unquoted coerces as shown
in §6.

---
---

# Addendum — structural guards, at `review-target-2` (`0bdc14c`)

Answering one question only: is there a class of guard missing — a property the fixtures should
satisfy that no single fixture can express?

Yes, four classes. One of them fails badly right now, one has regressed since `7364b2c`, and two pass
but are unasserted. First the good news, because it changes what the answer is.

## What already holds — your rename guard generalizes further than you tested it

I wrote the general form of your test and ran it across the whole corpus: five distinct renames
(`INV-2`, `C1`, `CPL-1`, `PRES-1`, `AC-1`) applied to `valid.yaml` **and to all nineteen negative
fixtures**, asserting the finding *set* is preserved rather than just that clean stays clean.

**No verdict changed anywhere.** The `registry_selections[]` fix is not a patch over one symptom; it
removed the spelling dependency from the whole linter. I also reversed every top-level list
(`entries`, `mandates`, `claims`, `coupling`, `non_goals`, `registry_selections`) on all twenty
fixtures — no finding set changed, so nothing depends on document order either.

Two things follow. Your guard is sound, and it is currently one instance of a universal property.
Promote it: loop the rename over every id space and every fixture, and assert set preservation rather
than emptiness. That upgrade matters because **your version only tests the clean direction on a clean
fixture** — `[]` before and `[]` after cannot detect a check that stops firing under rename, only one
that starts. On a negative fixture the same test has teeth.

So the classes you are missing are not more metamorphic relations of the kind you built. They are
these:

## 1. Necessity — is each check load-bearing? This one fails, hard

Your suite proves each of 24 codes *fires* on some input. It proves of no check that it is *needed*.
The linter emits **45** codes; the tests assert **24**. So I disabled eight checks — replaced
`add(...)` with `false && add(...)`, nothing else touched:

```
E_NONGOALS_EMPTY  E_ENUM_VERIFIER  E_HANDOFF_INCOMPLETE  E_QUANTITY_MISSING
E_TESTROLE_REQUIRED  E_UNKNOWN_MANDATE  E_NO_TRACE  E_ENTAILS_UNRESOLVED
```

**Tests: 31 passed, 31 total.** (Restored; `git diff --stat` clean.)

`E_HANDOFF_INCOMPLETE` is in that list, and the document says handoff "presence **and field
completeness** are mechanical". Field completeness can be deleted and the suite certifies the linter
as working. So can enum validation on `verifier`. So can the check that a declared mandate exists.

This is the property no fixture can express, because it is a property of the *suite* against the
*implementation*: **every check must have at least one test that fails when the check is removed.**
Mechanize it — a script that neuters one `add(` site at a time and requires a red suite, failing the
build on any check that survives. That is the mechanical form of the defect you have now found twice
by hand: a rule that resolves, fires nothing, and enforces nothing. The decorative trace rule and the
registry exemption were both instances. Mutation testing finds the rest without needing you to
suspect them first.

Cheap first cut if you don't want the harness: 21 unasserted codes, one negative fixture each. The
harness is better, because it also catches a check that has a fixture and is still redundant.

## 2. Evaluated versus fired — the mechanism that actually hid §2.6

`expect(bCodes('valid.yaml')).toEqual([])` is satisfied by two different worlds: every check ran and
passed, or some check never ran at all. A clean fixture cannot distinguish them. **That gap is exactly
what hid the registry exemption** — the self-trace check *was* evaluated on `INV-9` and *was* exempted,
and the assertion `[]` reads identically to a check that considered the entry and approved it.

Your new rename test inherits the shape: `[]` → `[]` proves the verdict is spelling-independent, not
that the self-trace check was evaluated on either version.

The fix needs a change to the linter, not the fixtures: have it report **evaluated-and-passed**
observations alongside findings. Then a positive fixture asserts a positive set — "these eleven checks
were exercised on this manifest and all passed" — and an exemption, a skip, or an unreachable branch
becomes visible as an absence in an asserted list rather than invisible in an empty one. It also gives
you the coverage denominator for guard 1 for free.

This is the single change I would make if I made only one. It converts every clean fixture from an
assertion about *output* into an assertion about *work done*, which is the thing you cannot currently
see and the thing that burned you.

## 3. Totality over the closed enums — passes, asserted nowhere

The document calls the cross-product exhaustive: 3 `verifier` × 3 `verification_stage` × 2
`obligation` = 18 cells. Your fixtures instantiate a sample. I generated all 18 as minimal entries and
printed the verdict for each: **all 18 are decided, and every one matches the document's table** —
nine `watch` cells accepted, three `observation` + `must` cells rejected with `E_OBSERVATION_MUST`, six
gating/handoff cells accepted with their required fields supplied.

That is a real result and nothing in your suite asserts it. `post_merge` still has **zero** instances
anywhere in the fixture corpus, so half of table row 3 is currently proven only by my probe. Same for
the `mutation` probe kind — the sensitivity-probe union has two members and one is uninstantiated.

The guard: generate the closed product rather than hand-instantiate samples of it, and assert every
cell is *decided* — never falling through to "no rule applied". Do the same for `baseline` ×
`test_role` (6 cells, 3 legal) and for `probe.kind`. Exhaustiveness over a closed enum is a property of
the enum space; no fixture can express it, and a generated one cannot rot as the enums grow.

## 4. Provenance — and you deleted your only instance in the same commit that took my advice

`0bdc14c` removed `realcase-BUG-4471.yaml`. That was the only fixture in the corpus whose content
originated outside your rule-writing, and it is the one that found the trace hole. Every one of the 22
fixtures that replaced it is something you authored to a rule you also authored.

No structural guard fixes this, because you author the guards too. What breaks the circle is
provenance, and it is a property of the *corpus*: **it must contain instances not authored by the rule
author.** Transcription was the right instrument and deleting the artifact was a real loss even though
its defect count was zero after the fix — its value was never its assertions, it was where it came
from.

The sharper version, and the reason this is class 4 rather than a footnote. Every fixture you can write
is one of two kinds: "I made this pass" or "I made this fail". Neither can express the third and most
valuable outcome — **a real case the schema cannot express at all.** By construction you will never
author one, because you would fix the schema instead of recording the failure. So:

- Keep a growing transcription corpus. Restore `realcase-BUG-4471.yaml` and add cases as you meet
  them, not as you need coverage.
- Admit `unrepresentable` as a legal expected outcome for a fixture, with the reason recorded. A
  transcription that cannot be expressed is a schema finding, and right now your fixture format has
  nowhere to put one — the only two verdicts are a code set and `[]`.
- When a transcribed case needs a schema change to express, that is the strongest evidence the pilot
  can produce, and it is the evidence the current corpus is structurally unable to generate.

## Ranked

1. **Guard 2** (evaluated-versus-fired) — a linter change, unlocks guard 1's denominator, and closes
   the exact hole that produced §2.6.
2. **Guard 1** (mutation / necessity) — demonstrated failure, eight checks deletable today.
3. **Guard 4** (provenance) — restore the transcription, add `unrepresentable` as a verdict.
4. **Guard 3** (generated totality) — currently passing; generate it so it stays that way, and get
   `post_merge` and `mutation` off zero.

And promote the rename test to the universal form: all id spaces, all fixtures, set preservation.

One thing not to do. Do not add more hand-written negative fixtures as the primary answer to "my
fixtures are suspect". Twenty-two hand-authored instances have the same blind spot as nine did; that
is what §2.6 demonstrated. Guards 1 through 4 are each machine-checkable and none of them requires you
to guess in advance what you got wrong — which is the only property that actually addresses the
circularity you opened with.
