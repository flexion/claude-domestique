# Session: comitatus launch defaults

## Details
- **Branch**: chore/comitatus-launch-defaults
- **Type**: chore
- **Created**: 2026-10-08
- **Status**: in-progress

## Goal
Change comitatus to launch Codex sessions with --no-daemon, default Claude to Opus 5.5 and Codex to gpt-6.1-sol, and keep the launcher out of the spawned herd by default.
Expanded (operator, via jay, 2026-10-08): retire fan-out as a discoverable skill on this branch. herdr owns initialization, membership, role assignment and coordination.
Expanded again (operator chose "Delete on this branch", 2026-10-08): delete the run-workflow layer outright, keep messaging safeguards, seed, launch defaults/readiness and provisioning/setup, and put the shortcomings into concise herdr skill guidance.

## Approach
Inspect the existing launcher and protocol, verify supported CLI flags and exact model selectors, preserve explicit overrides, and designate a spawned working lead. Update focused tests and owning documentation, validate affected plugin metadata and skill invocation, and bump comitatus once after substantive edits.

Documentation pass (operator: "ensure all documentation at repo and plugin level is up-to-date"; split agreed with jay, disjoint files in one tree):
- tim: `comitatus/**` docs; `vernaculus/references/**`, scoped to their 0.14.1 snapshot with a "changed in 1.0.0" notice and corrected current-behaviour claims (one vernaculus patch bump); the `AGENTS.md` plugin inventory (plugin list, owning-plugin line, test commands); this session file.
- jay: root `README.md`, plus snapshot notices and links in historical repo research/docs. Historical measurements stay intact.

## Session Log
- 2026-10-08: Created isolated chore worktree and session; preparing Claude/Codex handoff.
- 2026-10-08 (tim, lead; jay reviewing): every launch path (`up`, `herd.js agent`, `fanout` via `up`) builds args in `up.js` `makeAgent`/`KINDS`, so one change covers all. Codex always gets `--no-daemon` (verified in `codex --help`, 0.161.0). Bare handles default to `claude-opus-5-5` / `gpt-6.1-sol`; explicit `model=` wins; `effort=`/`role=` alone keep the default model; effort is still inherited. Fan-out default selector and codex role files moved from gpt-5.6-sol to gpt-6.1-sol.
- Decision (agreed with jay): `seed` no longer makes the sender the lead. The lead defaults to the first handle in the normalized roster (target prepended if missing); an explicit or default lead outside the roster throws. A sender absent from `--roster` is named in the seed line as an outside launcher (not member, approval hop, or reviewer). Joining is opt-in by listing yourself in `--roster`; `withdraw` is unchanged for that case.
- Blocker resolved: worktree had no node_modules, so `npm run test:comitatus` exited 127 for jay; ran `npm run install:all`. Suite now passes.
- Reconciled with fan-out (jay): the outside launcher is "neither member nor coordinator" and members do not wait on it "unless your task names it as an approver". Fan-out's launcher keeps authorizing fan-in/teardown/completion on explicit operator say-so. Docs now require the launcher to stay in its own workspace, because sync/members infer membership from the workspace.
- Validation: comitatus suite passes; validate:plugins; claude strict validate (marketplace + comitatus); codex 0.147.0 marketplace add + plugin add (0.15.0); live `codex --no-daemon --model gpt-6.1-sol exec` answered; `claude --model claude-opus-5-5 -p` answered; probe-skill comitatus:herdr FIRED on claude and codex.
- Bumped comitatus 0.14.1 -> 0.15.0 (minor: launch defaults change behaviour). Superseded by the scope expansion below.
- Fan-out retirement (operator-authorized on this branch; jay audits):
  - Moved `skills/fan-out/SKILL.md` to `skills/herdr/reference/fan-out.md` (frontmatter dropped) and `skills/fan-out/roles/` to `skills/herdr/reference/roles/`. Removed `comitatus:fan-out` from `metadata/skill-catalog.json`.
  - "Which position you hold" now assigns positions explicitly: a seeded member keeps its role. A working lead may start a run within its existing scope and becomes that run's launcher; it asks the operator only for missing scope or authority (jay: no blanket new approval gate).
  - "Launcher" is a per-run position, not the herd's outside launcher. A working lead starting a run keeps its existing cwd. The stale `up` fetch claim was replaced with the real reason to use `fanout`.
  - Hook: roles ride the herdr stable copy (`~/.claude/comitatus/skills/herdr/reference/roles`). The orientation names the packaged absolute roles path on a Codex install or when the stable copy fails. The retired `~/.claude/comitatus/skills/fan-out` is removed only after the herdr copy lands. `DEFAULT_ROLES_DIR=.pipeline/roles` is unchanged, so a repo's own roles still win.
  - Added `__tests__/skill-layout.test.js`: only herdr and herd-setup are discoverable, and every relative Markdown link resolves.
  - Version: removing an invocable skill is breaking (AGENTS.md), so the single branch bump is 0.14.1 -> 1.0.0.
  - Left as historical: `vernaculus/references/local-model-delegation-findings.md`, `docs/`, `tmp/`.
- Probes. Prompt: a seeded working lead tim of tim,jay, launched by sly, describes role assignment and fan-in for two partitions.
  - The first Codex run made sly the run launcher and approver. Fixed by the per-run launcher wording.
  - Reruns: both hosts FIRED herdr, loaded `reference/fan-out.md`, kept tim as working lead and run launcher, and gave sly no position. Transcripts: `/tmp/tim-probe-codex.txt`, `/tmp/tim-probe-claude-2.txt`.
  - Side effect: the source-loaded probe hook reprovisioned `~/.claude/comitatus` from this branch. The installed plugin's hook recopies on its next session start (hash mismatch).
- Validation after expansion: comitatus suite passes (jay: full `npm test` exit 0); validate:plugins; claude strict validate (marketplace + comitatus); codex 0.147 add of comitatus 1.0.0 ships only `herd-setup` and `herdr` skills with roles under `herdr/reference/roles`.

- Run-workflow deletion (operator decision; jay recommended it with evidence):
  - Deleted: `scripts/fanout.js`, `fanin.js`, `branch-naming.js` and their tests; `reference/fan-out.md` and `reference/roles/`.
  - Deleted the helper verbs `role`, `fanout`, `wait-all`, `state`, `settled`, `fan-in`, `teardown`, plus `wait` and `send-wait-read`, which duplicated native verbs. `seed --wait` now calls `herdr agent wait --until idle --until done`.
  - `herd-setup`: `HELPER_VERBS` trimmed and `GATED_VERBS` removed (no gated verbs remain). The hook drops its roles line and still removes a stale `~/.claude/comitatus/skills/fan-out` once the herdr copy lands.
  - herdr SKILL.md, "roles and multi-agent work":
    - one writer per tree;
    - a timeout is not a failure to deliver (only `undeliverable` proves nothing was sent);
    - idle, a wait or a commit is not completion (reply plus criteria and evidence);
    - inspect a partial launch before retrying;
    - integrate in a stated order from a clean target tree; the target-tree owner resolves or aborts conflicts.
  - Cleanup adjudication: inspect dirty, untracked and unmerged work, then decide integrate, preserve or discard, and name each discard. `--force`/`-D` only for an explicit discard. Cleanup recipes no longer default to `--force`/`-D`.
  - Removed orphan tests; added tests that the removed verbs are unknown commands, that `seed --wait` uses native wait, and that a stale fan-out copy is removed only after the herdr copy lands.
  - The fan-in conflict-ownership backlog item is deleted (`.pipeline/backlog.md` and its item file, both created earlier this session). `fanin.js` is gone, and the ownership rule now lives in the skill.
  - Validation: full `npm test` passes (comitatus suite passes); validate:plugins; claude strict validate; codex 0.147 add of 1.0.0 ships skills `herd-setup` and `herdr`, scripts `herd.js` and `up.js`, references `names.md` and `protocol.md`; `herd.js wait` returns "unknown command"; `git diff --check` clean. Behavioural host probes: jay owns them.

- Final audit (jay) passed on the finished tree:
  - comitatus suite passes, validate:plugins and `git diff --check`, all re-run independently by jay; no active references to removed helpers remain in source, dispatch or docs.
  - Fresh host probes exited 0 and FIRED herdr on Claude and Codex. Jay read the complete answers, not just the invocation:
    - no blind resend, and no completion inferred from idle or a commit;
    - a partial launch is inspected before retrying;
    - the integration-tree owner handles a conflict;
    - useful evidence and changes are preserved, and an authorized failed experiment is explicitly discarded without extra approval;
    - sly gets no approval role.
  - Transcripts: `/tmp/jay-simplification-claude-full.txt` and `/tmp/jay-simplification-codex-full.txt`. Raw Claude events are in `/tmp/jay-simplification-claude.events.jsonl`. The Codex wrapper output `/tmp/jay-simplification-codex.txt` is truncated; the full answer was recovered from its rollout.
  - Optional, harmless: two test comments still describe the moved runbook or fanout/fanin.

- Doc pass (tim's files):
  - `vernaculus/references/launch-surface.md` now opens with a "changed in 1.0.0" notice: default models, `--no-daemon`, removed waits, and naming the model when routing a local Codex provider. Its line citations are pinned to 0.14.1 (`1e4ca45`), and its two current-behaviour claims (bare Codex inherits; the wait defaults) are corrected in place.
  - `local-model-delegation-findings.md` is scoped to the snapshot. The "auto-injected" claim is corrected: the hook injects an orientation and the skill loads on invocation. Fan-out is marked removed.
  - vernaculus 0.2.0 -> 0.2.1.
  - `comitatus/README.md` documents the seed/launcher default and the hook's deletion of a stale fan-out copy.
  - `AGENTS.md` lists every marketplace plugin (no count, which is how "six" went stale), with modus and vernaculus in the owning-plugin line and `test:vernaculus` in the test commands.
  - `mantra/README.md` intro (jay found it): rules are injected by session hooks, not loaded via native `.claude/rules/`, matching its Features section and `hooks/behavior.js`. mantra 0.6.2 -> 0.6.3. test:mantra and claude strict validate of mantra pass.
  - Checks: full `npm test` green; validate:plugins; claude strict validate for the marketplace, comitatus and vernaculus; codex 0.147 add of comitatus 1.0.0 and vernaculus 0.2.1; `git diff --check` clean.

- Doc pass (jay's files): root `README.md`; `research/comitatus-recommendations.md`, `research/herdr-briefing.md`, `research/herdr-plugins-catalog.md`; `docs/plans/2026-06-21-comitatus-design.md`, `docs/plans/2026-06-21-comitatus-implementation.md`, `docs/plans/2026-08-08-cross-model-plugin-architecture.md`; `docs/superpowers/specs/2026-06-22-herd-up-launcher-design.md`, `docs/superpowers/specs/2026-06-22-herd-naming-design.md`; `docs/superpowers/plans/2026-06-22-herd-up-launcher.md`, `docs/superpowers/plans/2026-06-24-herd-permissions-friction.md`, `docs/superpowers/plans/2026-06-22-comitatus-retro-fixes.md`; `docs/reviews/fan-out-skill-manifest.md`, `docs/reviews/2026-08-09-cross-model-migration-review.md` and its round-2 and round-3 files.
  - The root README covers every plugin, Node 24, the Jest/workspace checks, the current comitatus defaults and removed verbs, and hook discovery. It links to the owning guidance rather than duplicating it.
  - Historical docs get a snapshot notice linking the current guides; their bodies are unchanged. Jay link-checked them.
- Counts removed at the operator's prompt: `AGENTS.md` no longer states a plugin count, and this log reports "passes" instead of test totals.
- Brittle-claim sweep (operator asked why counts and line numbers persist):
  - `mantra/README.md` drops the ungrounded "turn 47", "turn 1 to turn 100" and "~89%" claims and keeps the configured refresh cadence.
  - `launch-surface.md` replaces its new current-behaviour `SKILL.md` line citation with a heading link; pinned 0.14.1 citations stay as historical evidence.
  - Jay removed decorative totals from the root README.
- Link check on my touched docs: every relative link and anchor resolves except `AGENTS.md` -> `.pipeline/backlog.md`. That link is pre-existing on main, which has no `.pipeline/` directory; per the override the file is created on first use. The one I created was deleted when its only item went moot. Resolved per jay: `AGENTS.md` and `CLAUDE.md` now give the path as literal code and say the index and item directory are created on first use.
- Final whole-tree check on the finished tree (tim):
  - `npm test` exits 0 with no failures, and validate:plugins passes.
  - Strict Claude validation passes for the marketplace root and for each marketplace plugin, run separately.
  - An isolated Codex 0.147 install succeeds for every plugin with a Codex manifest.
  - `git diff --check` is clean.

- Jay's final documentation audit passes: links and anchors in current repository guides, marketplace READMEs and canonical skills resolve; install and skill names match source; historical bodies are unchanged; `git diff --check` is clean. Ready for operator handoff.

- Live `up` launch (operator asked, 2026-10-08), run from this branch's `herd.js`:
  - `up --branch chore/up-live-test --base origin/main --claude ned --codex kit` succeeded and reported `claude-opus-5-5` and `gpt-6.1-sol`.
  - The live processes were `claude --model claude-opus-5-5` and `codex --no-daemon --model gpt-6.1-sol`. The panes showed Opus 5.5 and GPT-6.1-Sol, and both agents were idle in the new worktree.
  - `seed` sent from tim with roster `ned,kit`: both seeds were observed and named ned as working lead and tim as the outside launcher. Ned (claude) and kit (codex) each replied through the helper; kit used its installed Codex plugin copy (0.14.1) of the helper. Native `herdr agent wait --until idle --until done` returned for both.
  - Cleanup by the new rule: no commits ahead of `origin/main`. The only untracked file was memento's auto-created session file for the test branch, discarded as a test-only artifact. After that, `herdr worktree remove` ran without `--force` (`"forced":false`) and `git branch -d` succeeded; the agents are gone.
  - Open observation: kit's Codex TUI warned that the installed vernaculus MCP server failed its handshake ("connection closed: initialize response").
    - Not established whether `--no-daemon` is involved: without the shared daemon, codex starts MCP servers itself.
    - `codex exec` printed no MCP warning with or without `--no-daemon`, and `~/.codex/log` has no entry, so that comparison is inconclusive.
    - To settle it, launch a codex TUI with and without `--no-daemon` and compare the warnings panel (f2).
- Fixed a stale recipe found during the live test: `reference/names.md` piped `herdr agent list` into `node "$H" members`, but the helper never reads stdin and the skill forbids shell variables. It now says `node HERD members`.

## Next Steps
- Operator decides commit/PR; none is authorized. Bumps on this branch: comitatus 0.14.1 -> 1.0.0, vernaculus 0.2.0 -> 0.2.1, mantra 0.6.2 -> 0.6.3. The comitatus bump covers Codex `--no-daemon`, the default models, the launcher outside the herd, the deletion of the fan-out skill and run-workflow layer, and the new herdr multi-agent and cleanup guidance.
- Reinstall comitatus, vernaculus and mantra to make these versions active.
- Open: whether the vernaculus MCP handshake failure seen in a `--no-daemon` codex TUI depends on `--no-daemon` (see log).
- Side effect: source-loaded probe hooks reprovisioned `~/.claude/comitatus` from this branch. The installed plugin's hook recopies on its next herdr session start (hash mismatch).
