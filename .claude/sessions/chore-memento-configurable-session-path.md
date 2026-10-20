# Session: memento-configurable-session-path

## Details
- **Branch**: chore/memento-configurable-session-path
- **Type**: chore
- **Created**: 2026-10-20
- **Status**: complete

## Goal
Move memento's session and branch-metadata files out of `.claude/` to a default `.memento/` directory, let a repository override both directories in `.memento/config.json`, keep sessions that already live under `.claude/sessions/` working, and stop onus from knowing memento's path rules.

## Approach
Plan: `docs/superpowers/plans/2026-10-20-memento-configurable-session-path.md`. **Revision 2 is current**; where it conflicts with earlier sections, it wins. jay leads and reviews; tim implements.

- `memento/lib/paths.js` is the single resolver. Config: `.memento/config.json` with top-level `sessionsDir` and `branchesDir`, git-root-relative. Defaults `.memento/sessions` and `.memento/branches`. Invalid values (non-string, empty, NUL, absolute, the root itself, escaping the root, non-object top level, malformed JSON) fall back to the default with a `⚠️ memento:` warning. `.claude/config.json` is not read for memento (0.6.0 is unreleased, so no compatibility read).
- Legacy: the configured file wins; otherwise `.claude/sessions/<sanitized>.md` is used (no duplicate created), with a root-anchored, single-quoted `mkdir -p -- <abs> && git -C <root> mv -- …` offered via `paths.migrationCommand`. Nothing moves automatically.
- Hooks: SessionStart and branch switch inject Session, Branch metadata, legacy note, and warnings; same-branch prompts inject Session and warnings. HOME state file unchanged and out of scope.
- Resolver CLI `memento/scripts/resolve-session.js`: read-only JSON (contract in plan R2). Memento skills call it instead of restating validation, found by script-relative lookup (`../../scripts/resolve-session.js` from the skill's directory; on Claude Code that directory is also `${CLAUDE_SKILL_DIR}`). Spike verified on Claude (`--plugin-dir`) and Codex 0.163.0 (installed cache). Not exercised: a Claude marketplace-cache install.
- **Acceptance: Claude/Codex parity.** Same resolver, config, defaults, validation, legacy, migration, and onus delegation on both hosts; only invocation syntax differs. Final evidence is the R2-5 matrix (M1-M4, O1-O3) on each host, with unexercised cells listed explicitly.
- Onus: uses memento's injected Session path if its filename is `<sanitized current branch>.md`; else invokes `memento:session`; else skips session steps. No memento config, default, validation, or legacy knowledge in onus.
- Versions bumped once on this branch: memento 0.6.0, onus 0.4.4.
- Out of scope: the HOME state file, a filename template, migrating this repo's `.claude/sessions/*.md`.
- Probe safety (from the 3f4fb01 incident): copied source, stripped HERDR_* and OLDPWD, disposable committed `--cwd` target, read-only prompts, worktree HEAD and status checked before and after.

## Key Decisions
- Resolver in `memento/lib/paths.js`, not the generated `lib/shared.js`, which is also bundled into onus.
- Config is owned by memento in `.memento/config.json`, not Claude's `.claude/` (memento is host-neutral). Operator decision, Revision 2.
- Onus delegates to memento rather than duplicating its rules (ownership). Operator decision, Revision 2.
- Migration command is POSIX single-quoted per argument and anchored to the git root (jay reviews).

## Session Log
- 2026-10-20: Session created
- 2026-10-20: Design agreed with operator (config surface, repo-relative paths, detect-and-advise migration, branchesDir in scope)
- 2026-10-20: Plan written; jay requested six revisions (quoting, switch/warning injection, NUL, audit breadth, verification breadth, tracking); revised and approved by jay
- 2026-10-20: Task 0 done (session Goal/Approach). Task 1 done: memento/lib/paths.js + lib/__tests__/paths.test.js, red (module not found) then 28/28 green; memento suite 76/76
- 2026-10-20: Task 1 approved by jay. Task 2: session-startup.js uses resolver; red 10 failing of 43, green 43/43; memento suite 87/87
- 2026-10-20: jay found migration command broke from nested cwd (git mv resolved relative to cwd). Fixed: mkdir -p -- <abs>, git -C <root> mv --; regression it.each over root and src/deep with metachar root+dir; red 1 failed, green 44/44; memento 88/88
- 2026-10-20: Task 2 approved by jay. Task 3: checkpoint.js getSessionPath delegates to resolver (unused path import removed); red 3 failed/21, green 21/21; memento 93/93
- 2026-10-20: Task 3 approved by jay. Task 4: memento rule/context/skills/README defer to injected paths; Configuration sections added; context tree dropped stale templates/tools entries; audit greps clean except intentional 42-auth.md counter-example; memento 93/93, validate:plugins passed
- 2026-10-20: jay: fallback text must apply resolver validation and resolve each missing path separately. Updated session/resume/context text + rule (git-root-relative metadata, resolve/valid lines); Task 5 onus wording updated to match in plan
- 2026-10-20: Task 4 approved by jay. Task 5: onus commit/pr/status/validate-criteria use injected Session path with inline validated fallback + legacy; README/work-items/status examples moved to .memento with full sanitized names; audits clean; validate:plugins passed
- 2026-10-20: Task 5 approved. Task 6 run: bumps, npm test, validators, Codex smoke, hook smoke, 7 probes all passed. INCIDENT: onus:commit probe created unauthorized local commit 3f4fb01 (not pushed); operator chose unwind, git reset --mixed 008133c, content verified identical. The probe also wrote a false 'Task 6 (partial) ... Committed work so far' log line and edited Next Steps 5-6 in this file before committing; removed/corrected here
- 2026-10-20: Operator approved Revision 2 (see above); plan updated
- 2026-10-20: jay approved R2 plan/contract after spike (Claude CLAUDE_SKILL_DIR, Codex installed-cache script-relative). R2-1: .memento/config.json top-level keys, .claude/config.json ignored, non-object top level warns, migrationCommand moved into paths.js; red 21 (paths) + 6 (hooks), green memento 98/98. Operator: parity acceptance criterion + R2-5 matrix recorded
- 2026-10-20: R2-1 approved. O3 changed to seeded stale context (jay). R2-2: memento/scripts/resolve-session.js + scripts/__tests__/resolve-session.test.js (real child process, real git repos, HOME=empty tmp); paths exports CONFIG_FILE; red 11/11 failing (no script), green 11/11; memento 4 suites 109/109; no-orphaned-tests 2/2; validate:plugins passed
- 2026-10-20: jay: fixture commits failed in a sandbox with inherited signing. Added per-command -c commit.gpgsign=false in the test git helper; control without fix under GIT_CONFIG_GLOBAL forcing gpgsign + bogus gpg: 6/11 failed; with fix: 11/11 (forced and normal); memento 109/109
- 2026-10-20: R2-3: session/resume skills and context Finding step use branch-checked injected path else resolver (script-relative, CLAUDE_SKILL_DIR as Claude convenience); validation prose removed from skills/rule; context Configuring the location + new Resolver subsection and README Configuration on .memento/config.json; rule location/branch-metadata/config/legacy lines; audits clean; jay flagged parallel chore/onus-config-location (lex/mia) touching onus skills/version: flag overlap at handoff
- 2026-10-20: jay: resolve each needed path independently (valid Session but no metadata injection must still use resolver branchMetadataPath). Updated session/resume/context text, rule resolve/location/branch-metadata lines, session create steps 6-7 and complete step 5; context Creating example now names top-level branchesDir/sessionsDir in .memento/config.json
- 2026-10-20: R2-3 approved. R2-4: onus commit/pr/status/validate-criteria find the session through memento (branch-checked injected path, else memento:session / $memento:session, else skip and say so); commit's create bullet conditioned on memento available; status/README/work-items examples no longer name a directory; audit: 0 hits for .memento/, .claude/sessions|branches, sessionsDir/branchesDir, memento config; onus 65/65; validate:plugins passed. Overlap with chore/onus-config-location to flag at handoff
- 2026-10-20: R2-4 approved. R2-5 static: npm test 711 (all suites), validators, Codex 0.163.0 install (resolver in cache), hook+CLI smoke with isolated HOME all pass (jay independently confirmed).
- 2026-10-20: R2-5 matrix run 1 (all runs fired; firing is not the verdict). Semantic verdicts: PASS claude-M1 (hook Session line in stream), M2 both, M3 both, O1 both, codex-O2, codex-O3. FAIL: M4 both (migrationCommand paraphrased: Claude dropped git -C, Codex dropped anchoring and quoting); claude-O2 (memento absent, but it ran find and read the session instead of skipping); claude-O3 (rejected the stale path but listed .memento/sessions itself instead of delegating). UNVERIFIED: codex-M1 (exec JSON hides hook context; can't tell injection from guessing). Worktree unchanged and no 0.5.2 traces in every run.
- 2026-10-20: F1 (memento: offer migrationCommand verbatim, no rewrite; hook legacy note says so, with a test) and F2 (onus: never search for or build a session path; memento owns the location). memento 109/109, validate:plugins passed. Rerunning M1C/M4C/O2C/O3C on both hosts with custom dirs, default-path decoys, and a metacharacter sessionsDir for M4C.
- 2026-10-20: R2-5 run 2 verdicts, all PASS on both hosts: M1C (Claude: injection visible; Codex: inferred from a direct custom-path read with no config or resolver), M4C (exact migrationCommand offered, not run, no PWNED), O2C (memento absent: skipped, no session read), O3C (stale path rejected, resolved via memento to the custom dir, decoy untouched). Full verdict table in the plan's 'R2-5 results'. Not exercised: Claude marketplace-cache install. Ready for final handoff to jay.
- 2026-10-20: jay FINAL REVIEW APPROVED. jay independently confirmed that raw M4C answers on both hosts contain the captured migrationCommand exactly, inspected the custom-path, absent-memento, and stale-path results, and reran test:memento 109/109, test:onus 65/65, validate:plugins and diff --check (all pass). An earlier independent full npm test passed 711; strict manifest and install evidence checked; HEAD is still 008133c. No further code changes or probes needed.
- 2026-10-20: Filed the two observed defects in .pipeline/backlog (index + one file each, with reproduction/evidence and acceptance criteria), per jay and the filesystem-tracking override.
- 2026-10-20: Operator authorized delivery (via jay): validate criteria (9/9 required met; optional filename template declined), mark this session complete, fresh full npm test and gates, commit, push, open a PR against main. jay merges after required checks. This branch merges before chore/onus-config-location.

## Files Changed
- New: `memento/lib/paths.js`, `memento/lib/__tests__/paths.test.js`, `memento/scripts/resolve-session.js`, `memento/scripts/__tests__/resolve-session.test.js`
- Hooks: `memento/hooks/session-startup.js`, `memento/hooks/checkpoint.js` and their tests
- memento docs: `memento/README.md`, `memento/context/sessions.md`, `memento/rules/sessions.md`, `memento/skills/{session,resume,start}/SKILL.md`
- onus: `onus/skills/{commit,pr,status,validate-criteria}/SKILL.md`, `onus/README.md`, `onus/context/work-items.md`
- Versions: memento 0.6.0 and onus 0.4.4 in `*/package.json`, `*/.claude-plugin/plugin.json`, `*/.codex-plugin/plugin.json`, `.claude-plugin/marketplace.json`
- Records: `docs/superpowers/plans/2026-10-20-memento-configurable-session-path.md`, this session file, `.claude/branches/chore-memento-configurable-session-path`, `.pipeline/backlog.md`, `.pipeline/backlog/{probe-skill-env-isolation,memento-unborn-branch-hook}.md`

## Next Steps
None on this branch. jay merges after required checks pass. Then `chore/onus-config-location` (lex/mia) rebases onto it; both branches touch `onus/skills/{commit,pr,status,validate-criteria}/SKILL.md`, `onus/README.md`, `onus/context/work-items.md`, and the onus version (0.4.4 here, 0.5.0 there). Evidence limits: Codex hook injection in M1C is inferred; a Claude marketplace-cache install was not exercised; O3/O3C used seeded stale context. Filed defects: `.pipeline/backlog/probe-skill-env-isolation.md`, `.pipeline/backlog/memento-unborn-branch-hook.md`.
