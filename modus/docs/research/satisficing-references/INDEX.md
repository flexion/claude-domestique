# Satisficing references — local grounding set

External evidence bearing on whether the satisficing goal is achievable: *"Produce a
definition of satisficing — 'good enough, stop' — that is operational (executable as a
check, not a judgment call) and generalizable (applies across artifact types, not just
the one it came from)."*

Retrieved 2026-08-20. Nothing here is authored by this project; every entry is an
external source held locally so claims can be checked without a network call.

## Layout

| Path | Contents |
| --- | --- |
| `papers/` | 24 PDFs, primary sources |
| `text/` | `pdftotext` extractions of each PDF — greppable, for locating quotes |
| `web/` | 5 non-PDF sources (archived HTML, MediaWiki wikitext, one repo README) |

Provenance follows the owner's commit-plus-path ruling: files are identified by path in
this repository at a given commit, not by standalone digest markers. No `.sha256` files
are created here.

## Verification status of every figure cited

Two levels are distinguished, because they are not the same evidence:

- **VERIFIED-IN-FILE** — the figure was located inside the artifact in this directory.
  Grep string given so a third party can reproduce the hit.
- **RELAYED** — the figure came from a web-search summary and has *not* been located in
  a local artifact. Treat as `UNK` pending a check against the file.

| Claim | Figure | Status | Locate with |
| --- | --- | --- | --- |
| Self-correction degrades performance | "even degrades after self-correction"; "the accuracies of all models drop across all benchmarks" | VERIFIED-IN-FILE | `grep -n "even degrades" text/self-correction--huang-2024-iclr--cannot-self-correct.txt` |
| Sycophancy is general across assistants | "five AI assistants consistently exhibit sycophancy across four varied free-form text-generation" | VERIFIED-IN-FILE | `grep -n "consistently exhibit" text/judge-bias--sharma-2024-iclr--sycophancy-anthropic.txt` |
| Self-preference tracks self-recognition | "linear correlation" | VERIFIED-IN-FILE | `grep -n "linear correlation" text/judge-bias--panickssery-2024-neurips--self-preference.txt` |
| Judge–human agreement ceiling | ">80% agreement", stated as the level humans reach with each other | VERIFIED-IN-FILE | `grep -n "80% agreement" text/judge-ceiling--zheng-2023-neurips--llm-as-judge-mtbench.txt` |
| Rubric decomposition at scale | 8,316 gradable leaf nodes; rubrics co-developed with paper authors; best judge F1 0.83; best agent 21.0% | VERIFIED-IN-FILE | `grep -n "8,316" text/rubric-impl--openai-2025-cdn--paperbench-official.txt` (then `0.83`, `21.0%`, `co-develop`) |
| Checklists raise human agreement | 46.4% → 52.2% exact agreement | VERIFIED-IN-FILE | `grep -n "46.4" text/checklist--cook-2024--tick-generated-checklists.txt` (then `52.2`) |
| Binary decomposition raises cross-model agreement | +0.45 average agreement | VERIFIED-IN-FILE | `grep -n "0.45" text/checklist--lee-2024--checkeval.txt` |
| Process supervision beats outcome supervision | 78% of MATH subset | VERIFIED-IN-FILE | `grep -n "78%" text/verification--openai-2023-cdn--lets-verify-official.txt` |
| Broad principles beat narrow ones | single principle "do what's best for humanity" generalizes | VERIFIED-IN-FILE | `grep -n "best for humanity" text/written-standard--anthropic-2023--specific-vs-general-principles.txt` |
| Optimal stopping is a threshold rule | "reservation price" rule | VERIFIED-IN-FILE | `grep -n "reservation price" text/satisficing-theory--weitzman-1978-mit-wp--optimal-search-preprint.txt` |
| Satisficing needs an aspiration level | "aspiration level" as a distinct model component | VERIFIED-IN-FILE | `grep -n "aspiration level" text/satisficing-theory--simon-formalization-2021--managerial-search.txt` |
| Completion standards themselves are defective | 1,699 samples screened by 93 developers; 38.3% underspecified; 61.1% bad tests; 68.3% filtered | VERIFIED-IN-FILE | `grep -o "38.3%" web/standard-defects--openai-2024--swe-bench-verified.wayback.html` (then `61.1%`, `68.3%`, `1,699`) |
| Capture-recapture needs ≥4 reviewers | "For four reviewers and more, Mh-JK is the most preferable model"; "most models underestimate" | VERIFIED-IN-FILE | `grep -n "four reviewers" text/stopping-rule--petersson-wohlin-2004-jss--capture-recapture-10-years.txt` |
| Non-trivial semantic properties undecidable | "non-trivial" property formulation | VERIFIED-IN-FILE | `grep -n "non-trivial" web/undecidability--wikipedia--rices-theorem.wikitext` |
| Reliability thresholds | α ≥ .800 reliable; ≥ .667 tentative | VERIFIED-IN-FILE | `grep -o "\.800" web/reliability--wikipedia--krippendorffs-alpha.wikitext` (then `\.667`) |
| Binary rubric grading agreement | 0.72–0.76 macro-F1, 12–17 pts below best human | VERIFIED-IN-FILE (range present) | `grep -nE "0\.7[26]" text/rubric-agreement--researchrubrics-2025.txt` |
| Briand et al. estimator accuracy specifics | "<4 inspectors inaccurate", exact relative-error figures | RELAYED — primary is paywalled | corroborated only indirectly at `text/stopping-rule--petersson-wohlin-2004-jss--capture-recapture-10-years.txt:415,420,422` |
| A later audit found 59.4% of re-examined SWE-bench problems defective | 59.4% | RELAYED — secondary source only, **do not cite** | no primary source located |

## Two findings that sharpen the conversational answer

Read before designing the acceptance procedure. Both came from primary sources, not from
search summaries, and both bear directly on `bootstrap-boundary.md` §3 AC5 and §8.

### 1. A preregistered agreement *number* is not enough — the protocol must be preregistered too

`papers/reliability--rao-callison-burch-2026-upenn--agreement-measurement-protocol.pdf`
(Rao & Callison-Burch, UPenn, arXiv:2606.00093v2, 31 Jul 2026 — cover page observed):

> On a rubric benchmark carrying per-criterion human labels, protocol choice alone moves
> reported agreement from 0.551 to 0.899 and carries κ across zero, without altering a
> single verdict.

And on one public judge cascade, reconstructed accuracy is 0.874 with abstentions
excluded, ~0.73 recoded, 0.534 if abstention counts as a third verdict. Same predictions,
three numbers.

Consequence: "set an α or κ target in advance" is insufficient and would satisfy the
no-post-hoc rule only in appearance. The judgment scale, abstention handling, retained
cases, and the unit over which criteria are pooled all have to be fixed in the same
predeclaration, or the threshold is unfalsifiable. The paper distills a reporting
checklist for exactly this.

### 2. Shared rubric structure manufactures agreement — quantified

`papers/judge-ceiling--song-2026-tencent--evaluation-illusion.pdf` (Song, Zheng & Xu,
Tencent, arXiv:2603.11027v1, 11 Mar 2026 — cover page observed). Preprint, industrial
lab, not peer-reviewed; weight accordingly. 105,600 evaluation instances:

- Model-level agreement Spearman ρ = 0.99 **masks** sample-level Pearson r̄ = 0.72,
  absolute agreement ICC = 0.67.
- **Merely sharing rubric structure restores 62% of total agreement.**
- High-quality outputs receive the *least* consistent evaluations.
- Agreement rises in codified domains (Education +22%, Academic +27%) and falls in
  subjective ones.

Consequence: if a reader and the author both run the standard's own checklist, their
agreement is substantially an artifact of the shared scaffold. This is the measured form
of the failure already in this project's record — two reviewing agents on different model
families missing what a fresh reader caught, because both shared the context. It is a
live threat to the current one-reader design, and the 62% figure is a reason to keep at
least part of the reader's input scaffold-free.

## Sources by claim

### Undecidability — the hard boundary
- `web/undecidability--wikipedia--rices-theorem.wikitext` — Rice's theorem: all
  non-trivial *semantic* properties are undecidable; syntactic properties are not. Fixes
  where a deterministic verifier can work and where only a reviewer can.
- `papers/undecidability--uiuc-cs373--rices-theorem-lecture.pdf` — UIUC CS373, proof by
  reduction from A_TM.

### Satisficing and optimal stopping — settled theory
- `papers/satisficing-theory--weitzman-1978-mit-wp--optimal-search-preprint.pdf` —
  Weitzman, MIT working paper version of *Optimal Search for the Best Alternative*
  (Econometrica 47(3), 1979, 641–654). Reservation-price rule is optimal; order
  non-adaptive, stopping adaptive. **The Econometrica version is paywalled** and the
  Harvard-hosted copy returned HTTP 403; this working paper is the retrievable substitute.
- `papers/satisficing-theory--caplin-dean-martin-2011--search-and-satisficing.pdf` —
  satisficing threshold as a model of search termination, with revealed-preference tests.
- `papers/satisficing-theory--simon-formalization-2021--managerial-search.pdf` —
  formalization of Simon (1955) into sequential search + aspiration level + stopping
  rule, including Simon's *dynamic* aspiration adjustment. Simon 1955 (QJE) itself is
  paywalled; this is the retrievable formalization.

### Implemented completion standards — existence proofs
- `papers/rubric-impl--openai-2025-cdn--paperbench-official.pdf` — OpenAI-hosted
  authoritative copy. `papers/rubric-impl--starace-2025-openai--paperbench.pdf` is the
  arXiv copy (2504.01848) of the same work.
- `web/rubric-impl--openai--paperbench-judgeeval-readme.md` — the JudgeEval harness:
  judges scored on accuracy/precision/recall/F1 macro-averaged over binary nodes against
  human gold labels. This is the calibration pattern worth copying.
- `web/standard-defects--openai-2024--swe-bench-verified.wayback.html` — Wayback capture,
  because `openai.com` returns HTTP 403 to direct retrieval. Evidence that the completion
  standard, not the worker, was the defect.
- `papers/written-standard--bai-2022-anthropic--constitutional-ai.pdf` — a written
  natural-language standard executed by a model at scale.
- `papers/written-standard--anthropic-2023--specific-vs-general-principles.pdf` — short
  broad principles outperformed long specific ones. Relevant to a 315-line standard.
- `papers/verification--openai-2023-cdn--lets-verify-official.pdf` and
  `papers/verification--lightman-2023-openai--lets-verify-step-by-step.pdf` — process
  supervision beats outcome supervision; leaf-level checking argument.
- `papers/scalable-oversight--saunders-2022-openai--self-critiquing-models.pdf` — critique
  models help humans find flaws they would otherwise miss; also the caution that models
  may hold knowledge they do not articulate as critiques.

### Making a check executable rather than a judgment call
- `papers/checklist--cook-2024--tick-generated-checklists.pdf` — TICK.
- `papers/checklist--lee-2024--checkeval.pdf` — CheckEval.
- `papers/rubric-agreement--researchrubrics-2025.pdf` — ResearchRubrics; also reports
  ternary→binary raising agreement ~20 points.

### Why self-certification cannot discharge semantic items
- `papers/self-correction--huang-2024-iclr--cannot-self-correct.pdf` — Huang et al.,
  ICLR 2024. The published, large-N form of this project's N=1 observation. Scope caution:
  the claim is about *reasoning* self-correction without external feedback; it supports
  "an author model cannot reliably discharge its own semantic items" and does not support
  a universal about self-review.
- `papers/judge-bias--panickssery-2024-neurips--self-preference.pdf` — NeurIPS 2024.
- `papers/judge-bias--sharma-2024-iclr--sycophancy-anthropic.pdf` — Anthropic, ICLR 2024.
  Together these give a named, measured mechanism for the drift `disposition-v1.md`
  records as "the author's claims tended to run in whichever direction justified
  continuing the work."

### Limits on reliability as a substitute for decidability
- `papers/judge-ceiling--zheng-2023-neurips--llm-as-judge-mtbench.pdf` — the ~80% ceiling
  plus position, verbosity, and self-enhancement biases.
- `papers/reliability--rao-callison-burch-2026-upenn--agreement-measurement-protocol.pdf`
  — see finding 1 above.
- `papers/judge-ceiling--song-2026-tencent--evaluation-illusion.pdf` — see finding 2.
- `papers/rubric-limits--zhang-2026--rubricbench.pdf` — 1,147 pairwise comparisons;
  substantial gap between human-annotated and model-generated rubrics, i.e. models
  struggle to autonomously specify valid criteria. Bounds how far criteria generation can
  be delegated. Preprint (CityU HK / Tencent Hunyuan / MBZUAI / McGill-Mila / UIS,
  arXiv:2603.01562v2 — cover page observed).
- `papers/construct-validity--jacobs-wallach-2021-faact--measurement-and-fairness.pdf` —
  operationalizing a contested construct requires per-context validation; construct–proxy
  mismatch is the named failure mode. This is the formal reason the *criteria* cannot
  generalize across artifact types even where the *schema* can.
- `web/reliability--wikipedia--krippendorffs-alpha.wikitext`,
  `web/reliability--atlasti--alpha-decision-rules.html` — the .800/.667 bands, and the
  standard remedy on failing them: revise the operational definitions, not the data.
  Krippendorff (2004) itself is a book and not retrievable here.

### Stopping without a completion standard
- `papers/stopping-rule--petersson-wohlin-2004-jss--capture-recapture-10-years.pdf` —
  survey; ≥4 reviewers, and most estimators underestimate. Note the survey's own
  qualifier at line 422: underestimation "may not be a big problem since false positives
  are often included in the inspection data."
- `papers/stopping-rule--scott-wohlin-2008-esem--capture-recapture-unit-testing.pdf` —
  extension to testing.

## Not retrievable

Cited in the analysis but absent here. Any claim resting solely on these is `UNK` for
local-grounding purposes.

| Source | Reason |
| --- | --- |
| Briand, El Emam, Freimut et al., IEEE TSE — comprehensive capture-recapture evaluation | Paywalled (IEEE Xplore) |
| *An Empirical Evaluation of Capture-Recapture Estimators*, IEEE 7365794 | Paywalled |
| Experience-based capture-recapture, *Empirical Software Engineering* | Paywalled (Springer) |
| Simon (1955), *A Behavioral Model of Rational Choice*, QJE | Paywalled |
| Weitzman (1979), Econometrica published version | Paywalled; MIT working paper substituted |
| Krippendorff (2004), *Content Analysis* | Print book |
| Harvard-hosted Weitzman PDF | HTTP 403 |
| UNSW Rice's theorem lecture | HTTP 403 |
| `openai.com` SWE-bench Verified page, direct | HTTP 403; Wayback capture substituted |

## Housekeeping

36 MB of PDFs, 2.1 MB of extracted text, 564 KB of web captures — 29 files, all
untracked. Whether these belong in version control or behind a `.gitignore` with a
fetch script is a repository-owner call and has not been made.
