# Review: parity implementation plans (1–3)

**Date:** 2026-08-09
**Reviewer:** Claude (Opus 5)
**Branch:** `chore/make-all-plugins-available-to-claude-and-codex`

**Under review:**

1. `docs/superpowers/plans/2026-08-09-parity-scenario-foundation.md` (256 lines)
2. `docs/superpowers/plans/2026-08-09-skill-discovery-and-stilus-isolation.md` (260 lines)
3. `docs/superpowers/plans/2026-08-09-cross-host-parity-release-gate.md` (262 lines)

**Against:** `docs/superpowers/specs/2026-08-09-cross-host-parity-open-issues-design.md`

## Verdict

Three well-structured plans. RED-first throughout, dependency-injected, credential-free by default, with the model boundary drawn in the right place. I checked every external CLI surface the adapters assume and all of them exist.

Two blocking items, five should-fix, three minor. B2 is a five-minute fix. **B1 is the one worth pausing on**, because it asks whether roughly 800 lines of new harness should exist at all.

---

## Blocking

### B1. The plans rebuild an eval harness Claude Code already ships, and never say why

`claude plugin eval` exists today. Its options overlap heavily with what Plan 1 and Plan 3 build from scratch:

```
--ablation <mode>   Run a no-plugin baseline arm and report the score delta
                    (none | with-without; default: with-without when targeting
                    a plugin by name (installed or skills-dir))
--runs <n>          Override per-case runs (default: case.runs ?? 3)
--threshold <0..1>  Exit 1 if any case score is below this threshold
--json [path]       Full run result (prompts, graders, per-run scores) as JSON
--judge-model       Override LLM-grader model
--max-cost-usd      Hard cost ceiling, exit 2 on breach
--case <glob>       Filter cases by name glob
--tag <tag...>      Filter cases by tag
```

Cases live at `evals/**/case.yaml` with `graders/*.md`, and `claude plugin eval init` authors a suite interactively. That is a scenario format, a control arm, multi-trial runs, thresholds, and machine-readable results — the substance of `scripts/parity/scenarios.js`, `invariants.js`, `control-copy.js`, and the Claude half of `hosts/claude.js`.

Neither the spec nor any of the three plans mentions it. Grep confirms: the only `ablation` hits in the whole set are the design's own S8 disposition row and Plan 1's `control-copy.js` filename.

**This does not make the plans wrong.** There are good reasons a bespoke runner may still be needed:

- Codex has no equivalent, and parity requires one harness spanning both hosts.
- `plugin eval` won't cover Codex hook trust or the shared-state handoff scenarios.
- Most importantly, `--ablation with-without` removes **the entire plugin**, which is precisely the candidate-set contamination S8 rejected. Your description-level ablation is the better instrument for discovery-collision work.

That last point is the strongest argument for building your own — and it is exactly the argument that should be written down. Right now a reader cannot tell whether the native harness was evaluated and rejected or simply not noticed.

**Requested change.** Add a short section to Plan 1 (or the spec) recording the decision. It should state:

- whether the Claude arm delegates to `plugin eval` or reimplements;
- why `--ablation with-without` is insufficient for discovery scenarios (candidate-set change);
- whether the scenario schema will align with `evals/**/case.yaml` so cases are portable, or deliberately diverge;
- whether `plugin eval` is nonetheless used for any Claude-only case class.

### B2. Plan 2 contradicts itself on `memento:session-manager`

Task 4 Step 3 (`:163`–`:170`) classifies **only** the three Stilus specialists as internal, and says so explicitly:

> "`memento:session-manager` remains a supported lifecycle workflow and `onus:work-item-handler` remains a supported generic read/triage workflow until a separate compatibility decision removes or redirects them."

Task 6 Step 1 (`:229`) then supplies this internal-description example:

```yaml
description: Internal branch-session lifecycle phase of memento:session. Not a standalone user workflow.
```

That reclassifies `session-manager` as internal. An implementer following Task 6 will contradict the catalog built in Task 4, and the Task 4 validator will reject the result.

**Fix:** delete the second example, or replace it with a genuine internal skill (`stilus:review-voice` or `stilus:review-correctness`).

---

## Should fix

### S1. The ablated description dissuades rather than ablates

Plan 1 `:162`:

```javascript
const NEUTRAL_DESCRIPTION = 'Internal parity control. Not for selection.';
```

That is not the absence of guidance; it is negative guidance. It will depress selection below a true no-guidance baseline, inflating the control arm's miss rate and making scenarios appear more diagnostic than they are — which directly weakens the `:236` "at least three of five control trials must miss" rule that the whole control design rests on.

`validate-plugins.js` requires a non-empty description, so blanking is not an option. Use something contentless — the bare skill name, or `Skill.` — rather than a phrase arguing against selection.

### S2. The trial boolean silently changes meaning per kind

Plan 1's threshold table (`:103`–`:114`):

```javascript
['control',              [false, false, false, true, true], true ],
['positive',             [true,  true,  true,  true, false], true ],
['ordinary-negative',    [true,  true,  true,  true, false], true ],
['side-effect-negative', [true,  true,  true,  true, true ], true ],
```

For `control`, `false` is the desired outcome (a miss). For `positive` and `ordinary-negative`, `true` is desired. The table is described as pinning "every approved threshold," but nothing states what the boolean denotes, and it inverts between rows.

**Fix:** define the array element uniformly as "this trial met its declared expectation," so every kind reads the same direction — or document the per-kind semantics in the `evaluateTrials` contract in Step 3.

### S3. Plan 2 Task 4 deliberately ends RED, breaking the execution model

Step 5 (`:188`–`:190`):

> "Run GREEN only after Task 5 scenarios exist. Keep these tests RED while descriptions/scenario references are intentionally incomplete."

The plan header mandates task-by-task execution with review checkpoints. A task that intentionally ends red makes a deliberate RED indistinguishable from a regression at the checkpoint, and gives a subagent executor no signal for "done."

**Fix:** split the validator work. Catalog completeness and reference integrity can go green within Task 4; description-shape checks land in Task 6 alongside the rewrites that satisfy them.

### S4. The `2.1.226` floor is justified by what CI pinned, not by capability

Plan 3 Task 4 requires Claude Code `2.1.226` in README, AGENTS, CI, and the migration plan. The spec justifies raising the floor by the need for `skills:` preloading and fresh subagents — but `2.1.226` is simply the version already pinned in CI, not the version that introduced those capabilities.

The Claude subagent reference dates other features precisely (`permissionMode` "requires Claude Code v2.1.200 or later"; name rules changed "Before v2.1.218"). The floor should be the version that introduced `skills:` preloading, cited as such. Otherwise the next routine CI pin bump silently moves a user-facing support floor.

Related: `README.md:88` annotates the current floor with "plugin system introduced in v2.0.12". Raising the number without rewriting that note leaves a justification that no longer explains the number beside it.

### S5. The bump constraint assumes the branch never merges

Plan 2 `:19`:

> "The current branch already contains one release bump for all affected plugins. Do not bump them again."

True on this branch today. But these plans modify 31 shipped `SKILL.md` descriptions plus Stilus skills and agent wrappers. If they land after this branch merges, that content ships unbumped.

**Fix:** make the constraint conditional — no second bump *on this branch*; a fresh branch bumps normally at the appropriate level.

---

## Minor

- **Plan 3 `:145` — the handoff assertion can be masked by an existing fallback.** The scenario forbids "filename search," but `memento/hooks/session-startup.js:92`–`:107` deliberately scans the sessions directory when no exact match is found ("This helps when sessions were manually renamed or created with different naming"). A handoff could pass via that fallback while the exact-path read fails — masking the exact regression the fixture exists to catch. Assert that the exact-path read succeeded *and* the scan fallback did not fire.
- **Plan 1 `:254` uses `rg`.** Not listed in the repo's tooling or `AGENTS.md`; every other command in these plans is `npm`/`node`/`git`. Use `grep -rn` for consistency.
- **Plan 3 `:187` pins Codex smoke to `0.147.0`, which is currently `latest`.** The release gate also tests "current." State whether minimum and current are allowed to be the same version, or the matrix silently collapses to one cell today.

---

## Verified working

Every external surface the adapters assume is real. Checked directly:

| Assumption | Source | Result |
|---|---|---|
| `claude plugin marketplace add`, `claude plugin install` | `claude plugin --help` | both exist (`install\|i`, `marketplace`) |
| `claude -p`, `--output-format`, `--no-session-persistence` | `claude --help` | all present |
| `codex exec --json --ephemeral --sandbox` | `codex exec --help` | all present |
| Codex `0.147.0` minimum | `npm view @openai/codex` | exists; is current `latest`; installed CLI is `codex-cli 0.147.0` |
| `0.0.0-control.<runId>` version format | `SEMVER` regex, `scripts/validate-plugins.js:9` | valid (prerelease matches `[0-9A-Za-z.-]+`) |

Also confirmed sound:

- Threshold arithmetic matches the spec: 3/5 control-miss, 4/5 positive, 4/5 ordinary-negative, 5/5 side-effect-negative, all-5-in-set for ambiguous.
- Plan 3 Task 6 correctly refuses `--dangerously-bypass-hook-trust` as trust evidence and requires a hash-linked manual `/hooks` transition — matching what I observed, that a clean `CODEX_HOME` records only `[plugins."<name>@<marketplace>"] enabled = true` with no trust field or trust store.
- The handoff fixture (`issue/feature-42/auth` → `.claude/sessions/issue-feature-42-auth.md` plus matching `.claude/branches/` metadata) is exactly the path that regressed earlier on this branch.
- Plan 1's evidence allowlist and redaction targets cover the realistic leak surface (vendor keys, bearer/basic auth, `/Users/*`, `/home/*`, repo absolute path, unrelated transcript turns).
- The RED-before-rewrite sequencing in Plan 2 (scenarios precede description changes) correctly implements the spec's inverted implementation order.

---

## Suggested order

1. **B2** — delete or replace the contradictory Task 6 example.
2. **B1** — write the `claude plugin eval` decision down before any of `scripts/parity/` is built.
3. **S1, S2** — both are edits to Plan 1 Task 2/3 text, before implementation starts.
4. **S3** — re-split Plan 2 Task 4 / Task 6 so every task ends green.
5. **S4, S5** — version-floor justification and the conditional bump rule.
6. **Minor three** — handoff fallback assertion, `rg` → `grep`, min-vs-current version note.

Items 1–5 are all plan-text edits; none requires code. The cheapest moment to make them is now, before Plan 1 Task 1 creates the first schema.
