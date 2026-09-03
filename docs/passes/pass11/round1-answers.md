# Pass 11, round one — answers as returned

Receipt as reported by the reviewer: `docs/passes/pass11/round-prompt.txt` sha256
`dbc5557245509aec9642710083808faca44ba86794e31e9b913239863ae23fe5`, 3324 bytes.
Matches the frozen digest. The round is valid.

Reviewer: a fresh agent, dispatched by reference to `round-prompt.txt`, no history
with the artifact. Answers below are as returned, condensed only where the reviewer
restated a field it had already quoted.

## Q1 — decisions not evaluable against their own observation

**OB-7.** The observation's first term is "the digest the reviewer reported for the
skill file it read." In the dispatch this boundary's own reviews use, the reviewer is
given a boundary, an item and a prompt and is *forbidden to read the skill*. It reads
no skill file and reports no digest for one. This round is the instance: the reviewer
read no skill file, and the digest it was asked to report is of the round prompt.
Holding only what the observation yields — one digest, of `SKILL.md` at head, with no
counterpart — there is nothing to compare, so the decision is neither true nor false.

If "the reviewer" instead means the pass runner that read `SKILL.md` to assemble the
prompt, the decision is evaluable, but then it concerns a different party from the one
whose return OB-1 to OB-4 read. **The entry does not say which party it means.**

All other entries evaluable, including OB-4, whose reference count of three is fixed
by the observation's own description of the input.

## Q2 — blocking question about what is wanted

None. Both open candidates are chosen: `comment#3` leaves the falsifiability check's
scope open and the boundary routes it to `domestique-37o`; the item does not say
whether the three conditions are answered from the boundary alone or from the pair,
and the boundary settles it as the pair in OB-4's observation and its pass-11 note.

## Q3 — can you state what must keep working

Yes. The two questions step 8 already asks and the three conditions they establish;
the two-round limit and AC5's round behaviour, split into first-round findings to the
drafter and a second-round finding to a person; the rule that a reviewer names a
specific requirement it could not decide. Plus two the item does not state: the
linter's verdicts on its fixture corpus, and repository plugin validation.

## Q4 — can you state what is out of scope

Yes. Changing what the stopping rule requires; the falsifiability check;
`refinement-loop.md`'s misattribution; the return shape and any per-entry verdict row;
`boundary-prose.md`'s enforcement table; the manifest schema and any linter verdict;
rebuilding, reversioning past the bump, or reinstalling the plugin in this session;
`human-work-item`.

## Q5 — can you state what is handed off, and to whom

Yes. Falsifiability check to `domestique-37o`; `refinement-loop.md`'s misattribution
to `domestique-crl`; `boundary-prose.md`'s table to `domestique-13n`; the return shape
to gh-172, also CPL-7's destination; W-1 to whoever runs the next pass, with trigger,
method, evidence destination and failure transition. CPL-6 is `uncovered` and defers
no work, which C5's own text excludes from the test. Freezing is handed to a person at
step 10. The step-1 citation collapse is recorded as a property of the item's
labelling rather than deferred work, so it is not a residual needing a route.

## Q6 — an input where the decision returns true while the failure occurs

**OB-1, OB-2, OB-3, PRES-3.** The reviewer answers the pass's hand-assembled prompt,
not step 8 — CPL-2 says no committed artifact holds the prompt. `round-prompt.txt`
asks the three conditions verbatim as Q3 to Q5, asks for the entry-id list and the
blocking question, and forbids reading the skill. **Run that same prompt against base
and all four decisions return true**, because the return answers each condition and
carries both original items. The failure occurs: nothing establishes that step 8 *at
head* asks them, and the next pass that assembles a prompt differently gets nothing.
No entry reads step 8's text at head for the three questions, while the preservation
side has both halves — PRES-1 for the text and PRES-3 for the behaviour.

**OB-4.** Same mechanism, one step sharper: the round prompt's own "If no, name the
specific thing missing" makes a reviewer produce three named missing things on a pair
stating none of the three. A verifier reading "that round's findings" counts three and
returns true on a head where step 8 never says an unstatable condition is a finding —
which is AC4, the thing OB-4 traces.

**OB-7.** The pass runner reads `SKILL.md` at head to assemble the prompt and reports
that digest, so the two digests are equal and the decision is true, while the review
whose return fed OB-1 to OB-4 was dispatched through the installed 0.3.0 skill and
read the pre-change step 8. The entry does not require the reporting party and the
answering party to be the same.

**PRES-1.** Head keeps both questions' wording verbatim and adds a qualifier outside
them — for example that Q1 and Q2 may be skipped for a boundary marked NOT FROZEN. The
two wordings are unchanged, so true, while the questions no longer establish what
bullet one protects. The pass-11 repair moved dilution from inside the question's
wording to its surrounding context.

**PRES-2.** Head names the same six conditions and redefines one — for example step 9
gaining "handed off is satisfied by the per-entry handoff object." The two lists are
equal, so true, while the requirement is deleted by narrowing, and that narrowing is
the vacuous reading C5 exists to refuse.

**PRES-4.** Head still states two rounds and adds an operator-extension clause. The
two limits are equal, so true, while the review no longer stops after two rounds. Not
hypothetical: this boundary's own header records pass 10 cap-stopping and the operator
authorizing pass 11.

**PRES-7.** Head keeps the rule and scopes it to the two original questions, so a "no"
on one of the three new conditions need not name a specific requirement. The rule is
present, so true, while the unactionable findings bullet three protects against arrive
on precisely the answers this item adds.

**PRES-8.** The change adds an optional schema field and a code that fires only when
the field is present. No fixture carries the field, so the per-file code sets are
identical on both revisions and the decision is true, while the schema changed and the
set of verdicts the linter can return grew — the C10 failure. C10's own note calls
adding a field an available way to satisfy this item.

**W-1.** A condition first named after the cap, in a post-cap round, or never named at
all. Neither is "first named in a second round", so the decision is true while C11's
stated cost has occurred. This boundary is the instance: pass 10's second round named
two findings, the pass stopped unfixed, and pass 11 exists only by operator
authorization.

**None:** OB-5, OB-6, OB-8, PRES-5, PRES-6, PRES-9.
