# The satisficing boundary in agent code review — a briefing

Grounded entirely in `satisficing-references/` (24 papers, 5 web captures, retrieved
2026-08-20). Every figure below was located in a local artifact; `satisficing-references/INDEX.md`
carries the grep strings to reproduce each hit and marks the two claims that are RELAYED
rather than verified. Nothing here rests on those two. Preprints are labelled as such.

**Revised 2026-08-28** after a per-source pass over `satisficing-references/text/`. The
first draft's quotations were accurate; several of the *inferences* drawn from them were not,
which is the failure mode a citation check passes. The operative definition used in the revision:
**an exact quotation carrying an unsupported inference is a defect.** What changed —

| Section | Change |
| --- | --- |
| §3.1 | Capture-recapture requires a closed population and blind reviewers; an iterative loop is outside the model, not under-calibrated within it. Added the estimate-accuracy vs decision-quality gap. |
| §3.2 | Cross-model review is *external* feedback by Huang's own taxonomy and explicitly endorsed. Added the capability trend, the oracle-stop reading, and the two evaluation-hygiene prescriptions. |
| §3.3 | Added what the Saunders "50% more" actually measures, the discontinued accuracy experiment, and the critique–discrimination gap that does not close with scale. |
| §3.4 | The 62% is a correlation level, not a share; two-model scope; no accuracy oracle; code excluded by the authors. |
| §4 | Weitzman's "settled theory" downgraded to settled *form*. TICK's non-uniformity, weak-model concentration, one-round limit, and false-premise counterexample added. The 27% scoped to its measured task. New item on execution failure under *correct* criteria. |
| §5 | The frozen-checklist rule excludes the candidate change, not repository context. Capture-recapture moved to "does not transfer". Five rows added to the what-not-to-do table. |

The revision made the design's evidentiary base narrower, not the design worse. The main effect
is that §4's "application evidence is nearly absent" now governs more of the document: several
load-bearing moves are plausible hypotheses targeting measured failures rather than adoptions of
validated countermeasures, and they are labelled that way below.

---

## 1. The problem as stated

Claude self-review and Codex cross-model review of Claude-generated code deliver real
value: correctness, code quality, and test completeness all improve. That value is not in
dispute and is not to be given up.

The trouble is what accumulates across rounds:

1. **Diminishing returns.** Each additional review→revise cycle yields less while costing
   the same effort, wall-clock, and money.
2. **Mission creep.** Reviewers keep producing findings, findings get implemented, and the
   deliverable grows past what was asked. Cost grows; the goal survives.
3. **Mission drift** — the worse failure. Fixation on reviewer-generated concerns pulls the
   agents off the original goal. The target itself moves, and a moving target introduces
   *new* error. The review process stops filtering defects and starts producing them.

Wanted: a principled stopping rule that fires while the marginal round is still positive,
and before the goal starts moving.

One distinction shapes everything downstream. Creep is an **economic** problem — a
threshold can price it. Drift is a **specification** problem — no stopping rule can detect
it if the goal lives inside the loop's own conversation, because then "the goal" is
whatever the last review said it was and deviation is unmeasurable by construction.

---

## 2. The class of problem

Three distinct problems wearing one coat. Each has its own literature and its own answer.

### 2.1 Sequential search with costly sampling and no oracle

This is optimal stopping. The formalization of Simon
(`text/satisficing-theory--simon-formalization-2021--managerial-search.txt:216`) decomposes
satisficing into exactly three components:

1. sequential procedure — options discovered and evaluated one at a time;
2. **aspiration level** — the outcome regarded as satisfactory;
3. stopping rule — search stops at the first satisfactory option.

Weitzman characterizes the optimum for the heterogeneous case
(`text/satisficing-theory--weitzman-1978-mit-wp--optimal-search-preprint.txt:693`). Pandora's
Rule: open the closed box with the highest reservation price; **terminate whenever the
maximum sampled reward exceeds the reservation price of every closed box.** The
load-bearing property is at line 719 — the reservation price of a box "depends only on the
properties of that box and is independent of all other search opportunities."

That is the anti-ratchet. A threshold computed from the properties of the search is fixed
before search begins. A threshold re-derived from what search has turned up rises with
every finding, so the loop never terminates.

### 2.2 An unbounded target

"Is this code correct?" is a non-trivial semantic property. Rice's theorem
(`web/undecidability--wikipedia--rices-theorem.wikitext`;
`text/undecidability--uiuc-cs373--rices-theorem-lecture.txt:58`) says every non-trivial
property of the languages recognized by Turing machines is undecidable — while properties
of the *machines* remain decidable (`:62`, "{⟨M⟩ | M has 193 states}" is decidable).

Two consequences:

- No stopping rule can ever be a *completeness* rule. Any terminating rule is a resource or
  aspiration rule.
- The syntactic/semantic line is where deterministic verification can be authoritative and
  where only a reviewer can act. Tests, types, linters, execution: decidable. "Is this the
  right abstraction": not.

### 2.3 Construct–operationalization mismatch

"Code quality" is an unobservable theoretical construct. Review findings are one
operationalization of it. Jacobs & Wallach
(`text/construct-validity--jacobs-wallach-2021-faact--measurement-and-fairness.txt`) name
the failure mode: collapsing the distinction "elides the space in which harms are most
often introduced" (`:60`). Construct validity "is always a matter of degree, to be supported
by critical reasoning" — never a checkbox (`:510`). And their caution on convergent validity
(`:620`) lands directly on this setup: validating one measurement against another that has
not itself been validated "can yield a false sense of security."

That is a precise description of taking Claude/Codex agreement as evidence of quality.

### 2.4 Why the adaptive form of satisficing *is* mission drift

Simon's own dynamic extension lets the aspiration level rise when satisfactory options are
easy to find and fall when they are hard. Wall simulates it. The results are the user's
problem, reproduced in an agent-based model:

| Observation | Location |
| --- | --- |
| Aspiration modelled as an EWMA of past performance changes — and it "could also become negative, i.e. a performance decline becoming acceptable" | `simon-formalization:435` |
| "oscillating aspiration levels, even to the negative, and intense – and potentially destabilizing – search activities when intra-organizational complexity increases" | `:18` |
| At high interdependence (K^ex = 5), satisficing agents implement a *new* configuration in ~83% of periods | `:1101` |
| "the flexibility of search may induce some harmful 'hyperactivity' of searching when intra-organizational complexity increases" | `:1114` |
| Sensitivity of final performance to complexity: restrictive local search 8.5 p.p. spread, satisficing 25 p.p., broad search 34 p.p. | `:1072` |

The mechanism is imperfect ex-ante evaluation plus interdependence: agents are surprised by
consequences they could not see, revise, surprise each other, and revise again. Aspiration
drops below zero and degradation becomes acceptable.

**This is the single most important finding in the corpus for the stated problem.** The
adaptive-aspiration form of satisficing does not merely fail to prevent drift — it
*generates* it. The stable form is Weitzman's: threshold fixed ex ante, from the properties
of the search, not from its results.

---

## 3. How others have experienced this problem class

### 3.1 Software inspection — the closest structural analogue

Two independent reviewers reading one artifact is precisely the capture-recapture setting
(`text/stopping-rule--petersson-wohlin-2004-jss--capture-recapture-10-years.txt`). Overlap
between reviewers estimates the *undiscovered* population: large overlap → few faults
remain; small overlap → many do (`:48`). Ten years of results:

- Mh-JK is the best estimator, and is appropriate for **four reviewers and more** (`:420`).
- Most estimators underestimate — with the survey's own qualifier that this "may not be a
  big problem since false positives are often included in the inspection data" (`:422`).
- Two reviewers is the minimum for any overlap at all (`:417`), but at n=2 the results are
  ambiguous: El Emam & Laitenberger recommend Mt-Ch, which Thelin et al. found does not
  estimate well on real inspection data (`:424`). Experience-based methods ran ~20% bias and
  SD (`:430`).
- Four to five reviewers is the floor for acceptable accuracy (`:414`).
- The survey supplies an actual decision procedure — decision points A (post-individual
  review) and B (post-meeting), each with graded outcomes from "terminate, the artifact was
  not ready for inspection" to "good enough, continue" (`:1357`, `:1388`).
- **In ten years, exactly one published industrial experience report** — and it used only
  the original 1992 paper (`:173`, `:1302`).

The testing extension (`text/stopping-rule--scott-wohlin-2008-esem--capture-recapture-unit-testing.txt:295`)
carries the sharpest line in the corpus. Yang et al. found capture-recapture as a
test-stopping criterion "is only superseded by the optimal test stop criteria, which is
defined as *when it becomes cheaper to fix a defect in maintenance than in test*."

That is Weitzman's reservation price, in software clothing, already stated as the right
answer.

Also relevant: perspective-based reading deliberately *minimizes* reviewer overlap while
capture-recapture *needs* it. The literature checked the conflict and found little impact
on estimation (`petersson-wohlin:516`) — at 5–8 reviewers.

**Two boundaries that disqualify this analogue for an iterative loop**, and they matter more
than the reviewer-count calibration:

1. **Closed population.** The survey uses closed-population models specifically because "all
   reviewers are given the same version of the inspected artefact" (`:91`), and the estimator's
   entire input is overlap between reviewers who did not see each other's findings (`:48`). A
   review→revise cycle changes the artifact between rounds. That puts the method outside its
   model rather than merely outside its calibrated range, and the survey offers no evidence for
   transferring overlap logic to sequential review or to model-generated review passes.
2. **Estimate accuracy is not decision quality.** The survey separates the two constructs
   itself, which is why Relative Decision Accuracy exists — it "evaluates how the estimators
   actually are utilized within the inspection process, in contrast to evaluating on only how
   close the estimations are to the true value" (`:360`) — and RDA carries its own dependence on
   a threshold "chosen beforehand" (`:362`). Low relative error was never shown to produce
   better inspect/reinspect/ship calls. The survey's own position on its proposed decision
   points is that estimates "should, of course, not solely be taken based on the estimates"
   (`:1356`), and that whole process section is authorial design with no trial reported.

One further scope note worth carrying: the ~20% bias and standard deviation for experience-based
methods (`:430`) is the only quantitative accuracy figure the survey's prose gives. No numeric
accuracy value is stated anywhere for Mh-JK, Mt-ML, Mh-Ch, Mth-Ch, or DPM.

### 3.2 Unstructured LLM self-review degrades output

Huang et al. (`text/self-correction--huang-2024-iclr--cannot-self-correct.txt`) is the
published, large-N form of the problem. Intrinsic self-correction — no external feedback,
no oracle:

| Model / benchmark | Standard | Round 1 | Round 2 |
| --- | --- | --- | --- |
| GPT-3.5 / GSM8K | 75.9 | 75.1 | 74.7 |
| GPT-3.5 / CommonSenseQA | 75.8 | 38.1 | 41.8 |
| GPT-4 / GSM8K | 95.5 | 91.5 | 89.0 |
| Llama-2-70B / GSM8K | 62.0 | 43.5 | 36.5 |

"the accuracies of all models drop across all benchmarks" (`:276`). Three findings matter
more than the table:

1. **The reported gains were a stopping rule, not a correction.** With oracle labels used to
   decide when to stop, GSM8K goes 75.9 → 84.3 and CommonSenseQA 75.8 → 89.7 (`:176`). Remove
   the oracle and the gains vanish. The paper's own conclusion: "determining how to prevent
   such mischanges is, in fact, the key to ensuring the success of self-correction" (`:580`).
2. **The model cannot tell which direction it is moving.** On GSM8K, GPT-3.5 leaves 74.7%
   unchanged; among the rest, correct→incorrect (8.8%) *exceeds* incorrect→correct (7.6%).
   "The fundamental issue is that LLMs cannot properly judge the correctness of their
   reasoning" (`:288`).
3. **More reviewers is not the fix.** Multi-agent debate at 9 responses scores 83.0 on
   GSM8K; plain self-consistency at 9 responses scores 88.2 (`:590`). The improvement
   attributed to critique was consensus.

Two scope limits, stated by the authors and worth honouring. The claim is about *reasoning*
self-correction without external feedback; where a verifier exists the picture reverses —
"the code executor serves as the perfect verifier" (`:721`), conditional on a behavioral oracle
that actually discriminates, and not a licence to read any green suite as a complete oracle. And
§5 (`:691`) finds that some reported self-correction gains came from the *feedback* prompt
carrying task requirements absent from the initial prompt; moving them into the initial prompt
beat self-correction outright. That is mission creep with its mechanism exposed: the "finding"
was a specification that should have been stated up front.

**Three further scope facts, all of which cut in favour of the design rather than against it.**

- **Cross-model review is not what this paper measured.** Its object is "self-correction without
  any external or human feedback. We term this setting intrinsic self-correction" (`:100`).
  Feedback from a different model is *external* by the paper's own taxonomy and is explicitly
  endorsed rather than indicted (`:716`). This paper is evidence against unaided self-review,
  not against a reviewer that is not the author.
- **The oracle-stop result is the argument for an enforced boundary.** Accuracy rises when
  something other than the model decides when to stop — GSM8K 75.9 → 84.3, CommonSenseQA
  75.8 → 89.7 (`:176`). The paper's diagnosis is that intrinsic self-correction requires the
  model "to independently determine when to stop" (`:274`), and that is the capacity it lacks.
  An external stop rule is the intervention the paper's own numbers support.
- **The effect is capability-sensitive, so the figures do not transport.** Within the paper,
  Llama-2 collapses on GSM8K (62.0 → 36.5) while GPT-4-Turbo is nearly flat (91.5 → 90.0).
  All four snapshots are 2023-era, most non-GPT-3.5 cells are n=200 with no repeated runs, no
  error bars, and no significance tests anywhere. Extrapolation to current or reasoning-trained
  models is unsupported in *both* directions — the table cannot be used to argue the problem has
  gone away either.

The paper's two evaluation-hygiene prescriptions transfer cleanly and are cheap: compare any
multi-call review scheme against a baseline "with comparable inference costs" (`:731`), and put
equal effort into the initial instruction before crediting the review step with a gain a better
prompt would have produced (`:742`).

### 3.3 Why the finding stream never dries up

| Mechanism | Evidence |
| --- | --- |
| **Feedback sycophancy** — "the quality of a passage depends only on its content," yet five assistants consistently tailor feedback to the requester's stated preference | `text/judge-bias--sharma-2024-iclr--sycophancy-anthropic.txt:18`, `:150` |
| Challenged on a correct answer, Claude 1.3 wrongly admits a mistake on **98%** of questions | `sharma:263` |
| A weakly-stated wrong answer from the user cuts accuracy by up to 27% | `sharma:281` |
| Matching the user's beliefs is among the most predictive features of human preference in hh-rlhf | `sharma:435` |
| **Self-preference** — GPT-4 is 73.5% accurate at recognizing its own output, and self-preference is *linearly correlated* with self-recognition | `text/judge-bias--panickssery-2024-neurips--self-preference.txt:145`, `:166` |
| **Position bias** — GPT-4 gives consistent verdicts on only 65.0% of swapped pairs; Claude-v1, 23.8% | `text/judge-ceiling--zheng-2023-neurips--llm-as-judge-mtbench.txt:325` |
| **Verbosity bias** — a repetitive-list attack fools Claude-v1 and GPT-3.5 91.3% of the time | `zheng:392` |
| Judge–human agreement ceiling ~80%, "the same level of agreement between humans" | `zheng:60` |
| A reference answer cuts GPT-4's math-judging failures from 14/20 to 3/20 | `zheng:409` |

The consequence for a stopping rule is decisive: **a reviewer asked to find problems will
supply problems.** "Stop when the reviewer reports nothing" is not a terminating condition.

The counterweight, and it is real: critique models help human evaluators find about 50% more
flaws than they find unassisted, and critique helpfulness scales with capability
(`text/scalable-oversight--saunders-2022-openai--self-critiquing-models.txt:90`). But the
generator–discriminator–critique gap persists: "even large models may still have relevant
knowledge they cannot or do not articulate as critiques" (`:30`).

**How much weight that counterweight carries, stated precisely.** The 50% is a count of
critiques *written*, not a measure of review accuracy, and the paper's own accuracy-flavoured
results are weaker than the headline:

| What was measured | Result |
| --- | --- |
| Critiques written, assisted vs unassisted | ~50% more (`:90`) — no confidence interval given |
| Planted-flaw hit rate on deliberately misleading answers | 45 ± 5% vs 27 ± 5% (`:454`) — the only oracle-backed number |
| Fraction of critiques the author judges valid | "does not appreciably decrease with" assistance, 71% vs 73% (`:456`) |
| Accuracy against 5-human ensembles, model-written critiques | "improvements that were within noise" — experiment discontinued (`:1886`) |
| Time cost | 6.27 ± 0.31 min unassisted vs 6.26 ± 0.27 min with 8 critiques (`:1916`–`:1919`) |
| Doubling shown critiques, 4 → 8 | effect "little less than twice as large" (`:1909`) — roughly linear, one task, no data past 8 |

Two consequences for a boundary design. First, **a process that counts findings inherits this
exact ambiguity**, which is the case for routing every finding through a leaf citation rather
than through a count. Second, the CD gap is the sharpest single result here and it does not
close: the authors "failed to find a clear trend showing critique performance catching up to
discriminator performance, implying that larger models still have relevant knowledge they don't
articulate as critiques" (`:145`), the gap is "approximately constant across model scale" on the
realistic task (`:741`), and Figure 13's own caption reads "our critique models do not make for
robust discriminators" (`:1789`). A reviewer's stated rationale is a lower bound on what it
registered — which is an argument against capping and ranking findings, since the cap discards
articulation the model has already produced.

### 3.4 Reviewer agreement is not evidence of correctness

Song, Zheng & Xu (`text/judge-ceiling--song-2026-tencent--evaluation-illusion.txt`;
**preprint, Tencent, not peer-reviewed**) is the most directly threatening result in the
corpus. 105,600 evaluation instances, 32 models × 3 frontier judges × 100 tasks × 11
temperatures:

- **The Resolution Paradox.** Model-level Spearman ρ = 0.989 masks sample-level Pearson
  r̄ = 0.72 and absolute-agreement ICC = 0.67 (`:600`). Judges agree on which model is better
  overall; they diverge on individual outputs — the resolution at which review operates.
- **The Rubric Commensurability Problem.** With independently generated rubrics, agreement
  collapses to r̄ ≈ 0.22–0.25. Merely sharing rubric *dimension names* — no content, no
  knowledge — lifts it back to r̄ ≈ 0.62 (`:87`, `:625`).

  **The "62%" is a correlation level, not a share of agreement.** The paper's own derivation is
  the sentence "The progression from r̄ ≈ 0.24 to r̄ ≈ 0.62 reveals that rubric structure
  accounts for approximately 62% of total evaluator agreement" (`:894`) — it reads a Pearson r of
  0.62 as "62% of agreement" and offers no other definition. The direction is well supported and
  the mechanism is the finding; the percentage should not be quoted as a decomposition. Two
  further scope limits: every MERG result covers **two models**, DeepSeek-R1 and Qwen3-235B
  (`:293`, `:1154`), not the 32-model baseline sweep the 105,600 figure comes from; and the
  effect is measured inside the MERG condition rather than on the checklist protocol most
  pipelines actually run.
- **Forcing knowledge grounding reduces agreement** in 10/10 conditions, ∆K −0.109 to −0.273,
  Cohen's d 0.97–1.42 (`:386`). The reduction is domain-selective — up in codified domains
  (Education +0.22, Academic +0.27), down in subjective ones — which rules out noise and
  identifies the baseline consensus as heuristic-driven (`:464`).
- **Quality and agreement are negatively correlated**: ρ = −0.513, p = 0.003. Base models
  r̄ = 0.81, Instruct 0.77, Thinking 0.76 (`:467`). "Surface features suffice for judging
  low-quality outputs" — the better the artifact, the less the agreement means. Not monotone at
  the bottom end: the worst model in the set draws the second-lowest agreement, its outputs being
  "so incoherent that evaluators disagree on how to penalize them" (`:1487`).

**Three limits the authors state that bound every use of this paper here.** They are load-bearing
enough to name in the same breath as the findings.

1. **There is no accuracy oracle anywhere in the study.** "we lack human ground-truth annotations
   and therefore cannot claim which evaluation method is absolutely more accurate; only that
   knowledge injection deconstructs the illusion of agreement" (`:1152`). Agreement is the sole
   dependent variable, so lower agreement is consistent with deeper judgment *and* with added
   noise; the argument against noise is a pattern argument, not a measurement.
2. **Code and math are excluded by name.** Generalisability to "exact-answer domains (e.g., code
   generation, mathematical reasoning) warrants further investigation" (`:1149`). Everything
   measured is creative and professional writing, which is the domain where surface polish is
   most confusable with quality. Transfer to a reviewed diff is analogy.
3. **The verdict is not that judging fails.** The paper's own summary is that "LLM evaluation is
   valid but shallow" (`:1132`), with the coarse quality ordering recovered unanimously. It
   indicts fine-grained agreement, not judging.

The most transferable line in the paper is not a number: **"validate at the granularity you
deploy"** (`:1049`). A metric that looks excellent aggregated (ρ = 0.989) and mediocre per item
(r̄ = 0.72, ICC = 0.67) is the hazard, and a per-work-item ship record aggregates exactly where
the decisions are per-finding.

Rao & Callison-Burch (`text/reliability--rao-callison-burch-2026-upenn--agreement-measurement-protocol.txt`;
**preprint**) adds that the *number* is not the commitment:

- Protocol choice alone moves reported accuracy from 0.551 to 0.899 and carries κ across
  zero **without altering a single verdict** (`:30`).
- On one public judge cascade: 0.874 excluding abstentions, ~0.73 recoded, 0.534 with
  abstention as a third verdict — 34 points from the handling rule (`:43`, `:135`).
- On non-degenerate binary verdicts, Pearson r = Spearman ρ = Kendall τb = φ = MCC are the
  same statistic; reporting several repeats one number under five names (`:680`).
- Under exclusion, full-set accuracy is identified only to an interval as wide as the
  uncovered fraction (`:28`).

Reliability bands for reference: α ≥ 0.800 reliable; 0.800 > α ≥ 0.667 tentative conclusions
only; discard below 0.667 (`web/reliability--wikipedia--krippendorffs-alpha.wikitext:151`).
The standard remedy on failing is to revise the operational definitions, not the data
(`web/reliability--atlasti--alpha-decision-rules.html:173`).

### 3.5 The completion standard is itself the defect

SWE-bench Verified (`web/standard-defects--openai-2024--swe-bench-verified.wayback.html`)
is the cautionary case. 93 professional Python developers screened 1,699 samples, three
annotators each, ensembled at highest severity:

- **38.3%** flagged for underspecified problem statements.
- **61.1%** flagged for unit tests that may unfairly mark valid solutions incorrect.
- **68.3%** filtered out overall.

500 samples survived. On the cleaned set GPT-4o resolved 33.2%, and the best open-source
scaffold doubled its prior score from 16%.

For a widely used benchmark, the specification and the tests were the defect roughly
two-thirds of the time — not the worker. Any review loop grading against an underspecified
goal will generate findings that are artifacts of the specification.

---

## 4. How the problem has been solved, where it has

### Solved, or close to it

**1. The *form* of the stopping rule is settled; its optimality here is not.** Fix the threshold
ex ante from the properties of the search, never from its results (Weitzman). Yang et al.'s
software form: stop when it becomes cheaper to fix later than to find now.

Two qualifications, because "settled theory" overstates what the artifact is. Weitzman is a
normative optimality theorem inside a stipulated model — no data, no population, no experiment —
and the retrievable copy is a DOE-contract laboratory report carrying a disclaimer of warranty as
to "the accuracy, completeness, or usefulness of any information" (`:27`) with two conflicting
dates on its own front matter (`:4` vs `:14`). More importantly, the paper names its own
breakages and this configuration trips three of them: a cap on how many boxes may be opened
destroys the ordering (`:999`), correlated reward distributions make the optimum "very
complicated" (`:1014`), and parallel search is an omitted feature the author calls "very hard to
model well" (`:1031`). Single acceptance is a stated assumption (`:73`) that the paper never
relaxes, and a review loop keeps many findings rather than accepting one. Weitzman's own position
on whether the rule survives is explicitly a feeling: "it is wishful thinking, but my feeling is
that the results of this paper might still constitute a useful guide here" (`:1045`).

So: adopt the fixed-threshold *form*, which needs no invention, and drop any claim of
optimality — see §5 for the same point stated as a transfer caveat.

**2. Make the target a finite set of binary leaves.** The most consistently replicated
finding in the corpus.

| Implementation | Result |
| --- | --- |
| **PaperBench** (`text/rubric-impl--openai-2025-cdn--paperbench-official.txt`) | 20 papers decomposed into a weighted tree of **8,316 binary gradable leaves**, co-developed with the papers' authors; parent score = weighted average of children; three leaf types (Code Development / Execution / Result Match) so partial progress earns credit. Best judge F1 **0.83** against human gold. Best agent 21.0%; ML PhDs 41.4% after 48h. |
| **CheckEval** (`text/checklist--lee-2024--checkeval.txt:21`) | Decomposed binary questions raise average cross-evaluator agreement by **0.45** and cut score variance, across 12 evaluator models. |
| **TICK** (`text/checklist--cook-2024--tick-generated-checklists.txt:32`) | Generated checklists lift exact judge–human agreement **46.4% → 52.2%**, and human inter-annotator agreement **0.194 → 0.256**. |
| **ResearchRubrics** (`text/rubric-agreement--researchrubrics-2025.txt:1392`) | 2,593 expert-written criteria. Binary grading reaches **0.72–0.76** macro-F1 against humans; moving ternary → binary adds **~20 percentage points**. Concrete examples inside criteria add 3–4%. |

TICK carries the most directly relevant result of all. On LiveBench, unstructured
Self-Refine *degrades* both models (Command-R+ −8.3 overall, GPT-4o −8.3), while the same
self-critique routed through a checklist *improves* them (+3.8 and +0.8; +7.8 absolute on
reasoning) (`cook-2024:105`). Structured self-critique works in the exact regime where Huang
et al. found unstructured self-critique harmful.

**That result is the load-bearing one for this whole design, so its limits matter.** Four,
all from the source:

- **The improvement is not uniform.** In the same table, Language regresses for both models
  (−0.5 each) and GPT-4o Reasoning is flat. GPT-4o's overall gain is +0.8, and the +7.8 headline
  is one cell — Command-R+ on reasoning.
- **The gains concentrate on the weaker model.** The paper attributes them to exactly that:
  Command-R+, "for which base performance is considerably below that of GPT-4o, benefits" most
  (`:587`), and the largest and most predictable gains sit on "explicit instruction-following"
  (`:589`). Nothing in the text establishes that the method helps a model at or above GPT-4o's
  level — which is the tier a cross-model review loop actually runs.
- **One iteration, then decline.** "responses improve with a single iteration of STICK, but start
  to degrade thereafter" on objectively-scored tasks (`:586`), and on judged benchmarks "by the
  fourth iteration, we see response quality start to plateau or even regress" (`:535`). This is
  direct evidence against many rounds, and it constrains `max_rounds` from the same source that
  justifies the checklist.
- **Checklists are not free and not universal.** They "do not present an advantage in all
  settings, especially given the additional inference cost of generating the checklist" (`:695`).

And the paper's own counterexample is the sharpest statement of this design's residual risk
anywhere in the corpus. A checklist generated from an instruction inherited the instruction's
false premise, so a response that hallucinated having read the sources scored "9/10 checklist
questions answered YES. Overall score: 2/5, Bad." (`:1961`). The authors draw the conclusion
themselves: "answers to generated checklists alone should not be used to score responses in"
human evaluation (`:1883`). A generated gate audits stated requirements, not unstated
correctness.

**3. Verify the leaf, not the outcome.** Lightman et al.
(`text/verification--lightman-2023-openai--lets-verify-step-by-step.txt`): process
supervision solves 78.2% of the MATH subset against 72.4% for outcome supervision and 69.6%
for majority voting at best-of-1860, and **the gap widens as N grows** (`:247`). The
mechanism is credit assignment — process supervision "specifies the exact location of any
errors" (`:504`). Note the miniature over-optimization in Appendix G: on the *easiest*
quintile the outcome-supervised model's performance *decreases* as samples increase — the
coarse signal gets gamed — while the process-supervised model stays robust (`:962`).

**4. Estimating what you have not found is solved *elsewhere*, and does not reach here.**
Capture-recapture is the only method in the corpus that estimates the undiscovered population
rather than counting the discovered one, and within its own setting the guidance is concrete —
when re-inspecting, combine both sessions' data and estimate once, which "improved the estimators
significantly" (`petersson-wohlin:455`).

Its setting is not this one. The method requires a closed population, which the survey adopts
because "all reviewers are given the same version of the inspected artefact" (`:91`), and its
input is overlap between reviewers who did not see each other's findings. A review→revise loop
changes the artifact between rounds, so this is a structural mismatch rather than a calibration
problem, and the survey supplies no evidence for transferring the overlap logic to sequential or
model-generated review (see §3.1). Listed here because the *idea* — estimate the residual rather
than count the found — remains the right ambition and has no substitute in the corpus; the
mechanism is not available.

**5. A written natural-language standard can be executed by a model at scale.**
Constitutional AI establishes it. Kundu et al.
(`text/written-standard--anthropic-2023--specific-vs-general-principles.txt:18`) refine it: a
single broad principle generalizes and roughly matches trait-specific constitutions, but
"more detailed constitutions still improve fine-grained control over specific types of
harms." Both general and specific have value — relevant to whether a review standard should
be six lines or three hundred.

### Not solved

**1. The criteria do not generalize, even where the schema does.** Jacobs & Wallach: a
contested construct requires per-context validation. RubricBench
(`text/rubric-limits--zhang-2026--rubricbench.txt:151`; **preprint**) quantifies the ceiling
on delegation: a **27% accuracy gap** between model-generated and human rubrics; human
rubrics scale consistently while model-generated rubrics "suffer from severe diminishing
returns"; models are competent at checking explicit instructions but "fail to define the
necessary constraints on their own." CheckEval hit the same wall and restricted itself to
human-selected sub-dimensions after full automation produced drift — "conflating coherence
and fluency" (`lee-2024:216`). ResearchRubrics found LLM-based rubric augmentation did not
help (`:1466`).

**Scope the 27% before leaning on it.** Three constraints, all from the source:

- The benchmark is **adversarially filtered** — samples are kept only where surface cues
  mislead, or where judge chain-of-thought already contained two or more reasoning fallacies.
  Baseline judges scoring 38.8–40.2%, worse than coin-flip on a binary task, is the signature of
  that selection rather than an estimate of judge competence. There is no measurement on
  unfiltered data, so the gap's size outside the adversarial subset is unknown in both
  directions.
- The task is **binary pairwise preference selection between two finished candidate responses**.
  Absolute scoring, pass/fail gating, and diff review are not measured. A rubric's usefulness for
  *producing* work rather than *choosing between* two finished artifacts is outside the design.
- **Self-generated rubrics still beat no rubric** in every backbone tested — the paper's own
  framing is that "self-generated rubrics provide a clear improvement" over vanilla prompting
  (`:963`), with gains up to +19.0 points. The finding is that model-authored criteria are worse
  than human-authored ones, not that they are worse than nothing.

**2. Correct criteria are not sufficient either — the execution layer fails on its own.** This is
the part with no artifact answering it. With *human* rubrics in hand, accuracy still "plateaus
around 85% rather than approaching 100%" (`:955`), and the paper separates specification failure
from execution failure and names "several recurring execution-level failure patterns" (`:1285`):

| Pattern | What it does |
| --- | --- |
| **Soft-Constraint Fallacy** (`:1306`) | The judge states in its own reasoning that the must-have failed, then decides against it for a secondary quality |
| **Implicit re-weighting** | Notes a required item failed, then decides by counting satisfied items — "A meets 4/5 ⇒ choose A" |
| **Missing decision semantics** | Rubric is non-discriminative for the case, so the judge invents an axis that is not in the rubric |
| **Resistance to rejection** | Pivots to an easier criterion than the substantive one |

Two cautions on using this. The patterns are presented as representative cases with **no
frequency data** — whether the Soft-Constraint Fallacy is 40% or 4% of the residual error is not
measured. And the paper's proposed remedy — "distinguishing hard/soft constraints or
incorporating explicit weight assignments" (`:1391`) — is offered as speculation and is **not
tested anywhere in the source**. Any severity-tiered or weighted design is therefore a hypothesis
that happens to target a measured failure, not a validated countermeasure.

**3. Agreement remains uninterpretable as validity.** Song's shared-structure result and the negative
quality–agreement correlation; Rao & Callison-Burch's finding that a preregistered
*threshold* without a preregistered *protocol* is unfalsifiable.

**4. Application evidence is nearly absent.** One industrial experience report in a decade
of capture-recapture research. Whatever is built here is close to novel practice, not
adoption of settled practice.

**5. The hard bound.** Rice's theorem, the ~80% judge ceiling, the 12–17 point human gap in
ResearchRubrics, PaperBench's 0.83 judge F1 — four independent statements that the ceiling
is high and is not 1.0.

---

## 5. Plausibility for the agent code-review cycle

### Transfers cleanly

- **An ex-ante aspiration level and a hard round cap.** Both are Simon's own components,
  both are cheap, and Wall's simulation shows exactly what letting them adapt costs. Use the
  static reservation form, not the adaptive one.
- **A frozen, weighted, binary checklist derived before the candidate change exists.**
  RubricBench's construction principle is the direct antidote to creep: rubrics "derived
  solely from the instruction, without access to candidate responses, preventing
  response-aware leakage" (`zhang-2026:304`), restated as a design rule at `:518` — items are
  "drafted without knowledge of candidate responses to prevent post-hoc bias." A finding that
  cannot be traced to a pre-review leaf is out of scope *by construction* — no judgment call
  required. And a finite leaf set is exhaustible, whereas "any problem a reviewer can find" is
  not. This is the mechanism by which the loop terminates at all.

  **What is excluded is the candidate response, not the codebase.** The phrase does real work
  and is easy to over-read. Withholding the proposed change is the leakage control; withholding
  repository context is a stricter rule that the source neither states nor supports. Criteria
  grounded in existing code, logs, and call paths can still be frozen before the change is
  written. What the paper *does* say is that its own rubrics are instruction-only by
  construction, which puts context-grounded criteria authoring outside its evidence in both
  directions — it is untested here, not licensed and not forbidden.

- **Scoring the judge, not trusting it.** The JudgeEval pattern
  (`web/rubric-impl--openai--paperbench-judgeeval-readme.md`) is remarkably cheap: five
  hand-graded submissions, then accuracy/precision/recall/F1 macro-averaged over binary
  nodes against those gold labels. It converts "do I trust this reviewer" into a number.
- **Routing by decidability.** Rice draws the line. Executable and syntactic leaves go to
  deterministic verifiers, where Huang et al.'s own carve-out applies — the executor is a
  perfect verifier. Semantic leaves go to a reviewer, and are never discharged by the
  author's own assertion.

### Transfers with a caveat that must be stated

- **Cross-model review is well-motivated but not sufficient.** Panickssery's self-preference
  result is precisely why Claude-reviewing-Claude is structurally weaker than
  Codex-reviewing-Claude. But Song's shared-structure result undercuts the naive version: two
  reviewers given the same context and the same checklist will agree substantially because of
  the shared scaffold, and the negative quality–agreement correlation means that as the code
  improves their agreement means *less*. Keep part of one reviewer's input scaffold-free.
  Weight this as a non-peer-reviewed industrial preprint measured on *writing* tasks, with no
  accuracy oracle and with code excluded by the authors' own limitation (§3.4) — but note it is
  the measured form of a failure this project has already observed.

- **Structured self-critique transfers for one round, on the paper's own evidence.** TICK is
  what licenses the checklist-routed loop at all, and the same source bounds its depth:
  improvement at a single iteration, degradation thereafter on objectively-scored tasks
  (`cook-2024:586`), plateau or regression by the fourth on judged ones (`:535`). Its gains also
  concentrate on the weaker of the two models tested (`:587`), which is the opposite of the tier
  a cross-model review loop runs. So `max_rounds` should be set low from this evidence rather
  than treated as a budget question, and the expected yield at frontier capability is unmeasured
  (§4).

- **Weitzman's optimality does not strictly cover this configuration.** He is explicit:
  Pandora's rule "does not readily generalize" (`:997`), and parallel search and a cap on the
  number of boxes opened are both named as omitted features (`:999`, `:1027`). Two reviewers
  running concurrently under a round cap is exactly that case. His own position is a hope,
  not a theorem: "something like Pandora's rule should remain part of any optimal sequential
  search policy" (`:1050`). Take the *form* — a fixed threshold — without claiming optimality.

### Does not transfer

- **Delegating criteria authorship to the reviewing agents.** RubricBench's 27% gap and
  diminishing-returns finding, plus CheckEval's drift, plus ResearchRubrics' failed
  augmentation. Someone other than the agent doing the work has to author the criteria per
  task class. Note the 27% is measured on adversarially filtered pairwise preference between
  two finished candidates, and that model-authored rubrics still beat no rubric (§4) — the
  finding is *worse than human-authored*, not *worse than nothing*.

- **Capture-recapture as a coverage estimator for this loop.** Not a calibration problem. The
  method needs a closed population and reviewers blind to each other's findings; a review→revise
  cycle changes the artifact between rounds, and the survey offers no evidence for sequential or
  model-generated review (§3.1). An asymmetric reviewer briefing also deliberately suppresses
  the overlap the estimator reads as coverage, so the two moves are incompatible by design.

- **Any claim that this eliminates escaped defects.** A bounded procedure lets real defects
  through. That is the price, and it should be stated rather than discovered.
- **A reliability threshold as an acceptance gate, unless the whole protocol is frozen with
  it.** Rao & Callison-Burch: setting an α or κ target in advance is insufficient and
  satisfies a no-post-hoc rule "only in appearance." Scale, retained population, abstention
  handling, and pooling unit all have to be fixed in the same predeclaration.

### What the corpus says not to do

| Don't | Because |
| --- | --- |
| Stop when the reviewer reports no findings | Sycophancy — findings never reach zero (Sharma) |
| Let reviewers author fresh criteria each round | Ratchets the threshold; and model-authored criteria run 27% worse on the measured task (RubricBench) |
| Treat reviewer agreement as evidence of correctness | Shared rubric structure lifts agreement from r̄ ≈ 0.24 to 0.62 with no knowledge added; agreement falls as quality rises (Song) |
| Read a passing checklist as evidence of correctness | A generated checklist inherited its instruction's false premise: 9/10 YES, human score 2/5 (TICK `:1961`) |
| Treat a green suite as a complete oracle | The "perfect verifier" carve-out is conditional on an oracle that discriminates (Huang `:721`) |
| Use unstructured self-critique | Degrades output (Huang); the checklist-routed version does not, for one round (TICK) |
| Run many rounds | Structured self-critique degrades after one iteration on scored tasks, plateaus by four on judged ones (TICK `:586`, `:535`) |
| Cap and rank findings expecting the model to prioritise well | The critique–discrimination gap does not close with scale; the stated rationale is a lower bound on what was registered (Saunders `:145`, `:741`) |
| Add reviewers expecting proportional yield | Debate loses to self-consistency at equal cost (Huang); inspection yield falls off past ~4 (Petersson) |
| Claim a review scheme works without a same-budget baseline | Reported gains have come from inference budget and from prompt content, not correction (Huang `:731`, `:691`) |
| Report several correlation coefficients as corroboration | On binary verdicts they are one statistic under five names (Rao) |

### Assessment

**Plausibility is high for creep, high for drift, moderate for diminishing returns, and nil
for completeness.**

Creep and drift both yield to the same move, and it is the move the corpus most strongly
supports: a finite set of binary criteria, derived from the specification before the candidate
change is read, frozen for the duration, with out-of-scope findings recorded rather than
implemented. Creep dies because the leaf set bounds the work. Drift dies because a frozen
external referent makes deviation measurable — which, per §1, is the thing no purely economic
threshold can do.

Diminishing returns yields only partially. The Weitzman form gives the right shape of
answer, but the reservation price needs a cost estimate this project does not yet have, the
optimality proof does not cover parallel search under a cap, and there is no coverage estimator
available at all — capture-recapture needs a closed population this loop does not have (§3.1).
Expect a defensible threshold, not an optimal one, and expect it to be defended by a round cap
rather than by any measure of what remains undiscovered.

One thing the corpus does supply for the cap: TICK's own iteration curve. Improvement at one
structured round, degradation thereafter on objectively-scored tasks, plateau by the fourth on
judged ones. That is a low `max_rounds` argued from evidence rather than from budget.

Completeness is unavailable, by Rice and by four independent empirical ceilings.

**The residual risk, stated plainly.** This design moves the failure mode rather than
removing it. Today the loop can run away; afterwards it will terminate confidently — on
whatever the frozen checklist says. SWE-bench Verified is the measurement of that risk in a
comparable setting: 38.3% underspecified statements, 61.1% invalid tests, 68.3% of samples
unusable, in a benchmark the field was already using. An unbounded failure mode is being
traded for a bounded and silent one. That is the right trade **only if the checklist is
reviewed by someone who did not author it** — which is the same independence argument that
motivated cross-model review, applied one level up.

TICK measures the same risk one step closer to this design, on a *generated* checklist rather
than a curated benchmark: the checklist inherited its instruction's false premise, and a response
that hallucinated its sources passed 9 of 10 questions against a human score of 2/5
(`cook-2024:1961`). The authors' own rule follows — checklist answers "alone should not be used
to score responses" (`:1883`). Read together with §4's execution-failure patterns, the honest
summary is that this design has two silent failure modes rather than one: a criteria set that is
precise and wrong, and a reviewer that names a failed criterion and then rules for the change
anyway. The first is addressed by independent review of the checklist; the second by requiring
evidence rather than a verdict. Neither countermeasure is validated anywhere in the corpus.

---

## Corpus coverage

| Question | Primary sources |
| --- | --- |
| Class of problem | Weitzman 1978; Simon formalization (Wall 2021); Caplin/Dean/Martin 2011; Rice's theorem; Jacobs & Wallach 2021 |
| How others hit it | Petersson et al. 2004; Scott & Wohlin 2008; Huang et al. 2024; Sharma et al. 2024; Panickssery et al. 2024; Zheng et al. 2023; Saunders et al. 2022; Song et al. 2026*; Rao & Callison-Burch 2026*; SWE-bench Verified |
| How it's been solved | PaperBench + JudgeEval; CheckEval; TICK; ResearchRubrics*; Lightman et al. 2023; Constitutional AI; Kundu et al. 2023 |
| Limits on solutions | RubricBench*; Jacobs & Wallach 2021; Song et al. 2026*; Rao & Callison-Burch 2026*; Krippendorff bands; Rice's theorem; Petersson et al. 2004 (closed-population constraint); TICK (iteration limit, false-premise pass) |

`*` preprint or non-peer-reviewed. Caplin/Dean/Martin is cited for the empirical result that
subjects satisfice against a *fixed* reservation level and that failure rates rise with set
size and complexity (38% overall, 65% at size 40 / complexity 7) — supporting evidence for
the fixed-threshold form rather than a load-bearing claim.

Two entries in `INDEX.md` are marked RELAYED (Briand et al.'s estimator-accuracy specifics)
or **do not cite** (a secondary claim about 59.4% of re-examined SWE-bench problems). Neither
is used above.
