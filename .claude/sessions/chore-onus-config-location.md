# Session: onus-config-location

## Details
- **Branch**: chore/onus-config-location
- **Type**: chore
- **Created**: 2026-10-20
- **Status**: complete
- **Herd**: lex (working lead, implementer), mia (independent reviewer); launched by jay (outside herd)

## Goal
Move new Onus project config to host-neutral `.onus/config.json` with top-level Onus keys.
- New config wins; legacy `.claude/config.json` `onus` (or `workItem`) section is read only when the new file is absent.
- Malformed new config is surfaced, never silently replaced by stale legacy settings.
- New init writes `.onus/config.json`.
- Explicit migration extracts only Onus settings, preserves unrelated legacy-file contents, no automatic destructive move.
- Claude and Codex are equal acceptance targets. No HOME state relocation.
- Bump onus minor once after substantive edits.

## Constraints
- No commits/pushes. No beads (filesystem `.pipeline/backlog/` override).
- Probes: copied plugin source, disposable committed target, strip HERDR_* and OLDPWD, read-only prompts; fixture commits disable signing per command.
- Memento sibling branch changes onus session-integration text and bumps onus: merge overlap expected on onus version files; do not touch its files.

## Session Log
- 2026-10-20: Session created; acked jay and mia; starting consumer inventory.
- 2026-10-20: Design approved by mia with amendments: warn on UserPromptSubmit too; init skill allows explicit --force repair despite resolver error; migration/skip stop before Step 3 commit-pattern edits; wording fix in repeated skill block. All applied.
- Correction to design note: Codex does run onus hooks once trusted (README), so hook + skills both matter for Codex.
- Implemented: `onus/scripts/config.js` (resolver + CLI), hook delegation + warnings, init writes `.onus/config.json`, `--migrate`, skills/README/templates updated, index exports `migrate`/`resolveProjectConfig`. Tests: new `scripts/__tests__/config.test.js`, rewritten init tests, hook-output tests (spawned hook, valid JSON, HOME state unchanged).
- Bumped onus 0.4.3 → 0.5.0. Full `npm test`, `test:coverage`, `validate:plugins`, Claude strict validate (marketplace + onus), Codex 0.163.0 isolated install all pass. `package-lock.json` change from `install:all` reverted.
- Probe round 1 (`/tmp/lex-probe-M5mo`): Claude A/B resolved correctly but inherited user memento wrote `.claude/sessions/` into targets, so Codex arms refused (dirty-tree guard). Showed resolver semantics only, not skill invocation.
- mia found nested-cwd gap (hook in subdir saw source none). Fixed: `findProjectRoot` (git top-level, else cwd) inside resolver; init/migrate CLI uses same root. Tests added; onus 120/120.
- Probe round 2 (`/tmp/lex-probe2-v0yW`): fresh copied src, fresh per-host committed targets, HERDR_*/OLDPWD stripped, Claude isolated with `--setting-sources project,local` (only onus@inline + builtins), Codex throwaway home + trusted hooks. All four fired onus:status and ran copied/cached config.js: A → jira `[PRB-{number}]` from .onus; B → parse error, defaults, no LEGACY fallback. All target HEAD/status/checksums unchanged; worktree HEAD 008133c unchanged.
- Final: npm test 705 pass, validate:plugins + Claude strict (marketplace, onus) pass. mia approved.
- 2026-10-20: Operator authorized commit; session marked complete.
- 2026-10-20: Rebased onto origin/main 3c3c6a3 (memento PR #197, memento 0.6.0, onus 0.4.4). Conflicts: onus version lines (kept 0.5.0) and `.pipeline/backlog.md` (adopted upstream table, added onus row; onus item reformatted to upstream style; appended this branch's probe-isolation evidence to `probe-skill-env-isolation.md`). Overlapping onus skills auto-merged with memento delegation text intact plus Resolve Project Config step.
- Backlog: `.pipeline/backlog/onus-rules-ignore-configured-commit-format.md` (injected rules/git.md hardcodes default format; out of scope).

## Next Steps
1. mia integration review; rerun full gates and post-rebase host probes
2. Push and open PR; operator merges note: memento sibling branch also edits onus session-integration text and bumps onus version (package.json, both plugin.json, marketplace.json) — expect conflicts on version lines; re-bump once after merge.

## Design (sent to mia for review)
Consumers found: `hooks/work-item.js` `loadProjectConfig` (Claude hooks only; Codex has no onus hooks, so skills are the Codex path), `scripts/init.js` (writer + `hasExistingConfig`), 10 skills (only init/create/fetch/pr name the file today), `templates/config/*`, `README.md`.

1. New `onus/scripts/config.js` = single source of truth. `resolveProjectConfig(cwd)` returns `{ source: 'onus'|'legacy'|'none', path, config, error }`.
   - `.onus/config.json` exists → parse; invalid JSON or non-object → `config: {}`, `error` set, legacy NOT consulted.
   - absent → `.claude/config.json` `onus || workItem` (existing silent tolerance of malformed legacy preserved; reported as source none).
   - CLI `node scripts/config.js` prints that JSON to stdout, exit 0 ok / 1 when `error`. Skills call it instead of re-implementing precedence.
2. Hook: `loadProjectConfig(cwd)` delegates to resolver (2nd arg kept, ignored-compatible). On new-file error SessionStart appends a warning to additionalContext (stdout stays valid JSON via shared.processHook), defaults used.
3. Init writes `.onus/config.json` with top-level keys. Plain init: if new file exists (even malformed) → skip unless `--force`; if legacy onus/workItem section exists and no new file → skip and point to `--migrate` (no shadowing legacy custom settings with defaults); `--force` writes new (merging over a valid existing new file) and leaves legacy untouched.
4. `init.js --migrate [--force]`: copy legacy `onus` (else `workItem`) section verbatim to `.onus/config.json`; legacy file untouched byte-for-byte; refuse if new exists without `--force`; error on missing/malformed legacy or no section. Message: legacy section is now inert, remove manually if wanted.
5. Skills: one shared reference `onus/skills/references/config.md`? -> instead each of 10 skills gets a short "Resolve config" step before platform/format use that runs `../../scripts/config.js` relative to SKILL.md; init skill documents new location and migrate. Templates/README updated; example drops unrelated `context` key.
6. HOME state/cache untouched. Onus minor bump once at end. Repo's own `.claude/config.json` left as-is (legacy path still works).
