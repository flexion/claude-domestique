# Session: reduce hook injection

## Details
- **Branch**: issue/feature-213/reduce-hook-injection
- **Type**: feature
- **Created**: 2026-11-12
- **Status**: in-progress

## Goal

Issue #213: stop injecting standing guidance on every prompt and every tool call.
Keep each rule where it is used — at session start, or at the action it governs —
and fix the three defects that made the hooks fire when nothing had happened.

## Approach

The seven changes the issue asks for, in its own order:

1. mantra `behavior.js` injects on `SessionStart` only; removed from
   `UserPromptSubmit` in `hooks.json` and `codex.json`. The hook returns `{}` for
   every other event so a stale wiring stays silent.
2. `shared/index.js` no longer re-reads and re-injects the rule files every tenth
   prompt. `memento:session` now reads `rules/sessions.md` when it runs, as
   `onus:commit` and `onus:pr` already read `rules/git.md`. BLOCKING/STOP/MUST
   rewritten as plain `when:` conditions in all three rule files.
3. memento per-prompt context is the session path plus event-driven triggers.
   Removed "Read session file FIRST" (kept at session start), "assess if work
   warrants session update", and the every-fifth-prompt Session Check.
4. State files keyed by `session_id` (`shared.getStateFile`, plus onus's own
   `state.json`), so concurrent agents stop sharing a prompt counter and a branch.
5. mantra `resources.js` injects the observation only with the five-minute
   reflection, and `renderObservation` returns nothing when no token category has
   a measured value.
6. memento `checkpoint.js` parses the command and asks whether any invocation in
   it is `git commit`, instead of matching the substring anywhere. A valid session
   at a commit now produces no reminder at all; the placeholder check stays.
7. The precedence reminder moves from every prompt to session start.

## Session Log

- 2026-11-12: Implemented all seven items. Full suite green except a pre-existing
  comitatus failure (`comm.test.js` pins fixture dates to 2026-11-01 while the mail
  sweeper expires at seven days against `Date.now()`); jay reproduced it on clean
  `main` and it is filed at `.pipeline/backlog/comitatus-comm-test-expiry-bomb.md`.
  Hooks exercised directly: a prompt now carries only the status and session path,
  a `grep` for the words "git commit" no longer triggers the pre-commit check, and
  `behavior.js` returns `{}` on `UserPromptSubmit`.

- 2026-11-12: jay's review found three defects in the new command parser, all fixed
  and covered by tests: heredoc bodies and trailing `#` comments were read as
  commands (false positives), and `git \`-continuations, `env`/`sudo` wrappers and
  shell keywords (`if true; then git commit; fi`) hid real commits from the
  placeholder check. Also corrected a stale cross-reference in `rules/sessions.md`.
- 2026-11-12: second review round found three more parser defects, all fixed and
  tested: `<<<` was read as a heredoc operator and swallowed the rest of the
  command, `command -v git commit` counted as a commit, and wrapper options taking
  an operand (`sudo -u someone`, `env -u VAR`, `nice -n 10`) consumed the program
  name. 25 command-parsing cases are now pinned by tests.
- 2026-11-12: measured per-prompt injection, same hooks and input, HEAD vs working
  tree: 3,886 → 201 characters (mantra 2,757 → 0, memento 763 → 178, onus 142 → 23,
  resource line 224 → 0). What remains is each plugin's status line and the session
  path. Whether this changes how agents behave is untested — the issue proposes a
  day of herd work against the operator-intervention log.

- 2026-11-12: clyde reviewed and objected to the commit detector: ~310 lines of
  shell parsing for an advisory reminder, grown one edge case at a time, which is
  the trap the change exists to remove. Replaced with a shape test - `git`,
  optional global flags, `commit`, at a command position - which is +35/-5 against
  HEAD and fixes the observed defect. The forms it no longer sees (`sudo git
  commit`, `env VAR=x git commit`, `then git commit`) and the data it still fires
  on (a line in a heredoc body, text after `#`) are documented at the function and
  asserted as bounds in the tests.
- 2026-11-12: three smaller points from the same review. Per-session state files
  are now swept at session start after seven days (`shared.pruneStateFiles`, used
  by memento and onus) rather than accumulating per agent launch. The prompt
  counter is gone - nothing read it once the periodic refresh went, so it was a
  disk write and a line of context per prompt; the status line is now
  `📍 Memento ✓`. And the `behavior.js` comment no longer claims per-prompt
  restatement "did not make it more likely to be followed", which was untested.

- 2026-11-12: clyde found the shape test still fired on the grep that prompted the
  change. `|` was read as a separator inside quotes, so an alternation
  (`grep -n "a\\|git commit\\|b" file`) put a command position in front of the
  words. Every grep case in the suite had been written without a `|`, so the tests
  passed with the defect present. Fixed by blanking quoted strings before the
  test - quoted text is an argument, so a separator in it starts no command - and
  the two alternation forms are now regression tests, checked to fail against the
  previous detector. `echo "$(git commit -m x)"` becomes a miss, moved to the
  documented bounds.

- 2026-11-12: PR #214 opened, and its `test (24)` check failed. The only failure was
  the comitatus date bomb filed to the backlog — `comm.test.js` pinned `NOW` to
  2026-11-01, the concurrency test spawns the hook as a real process, and that
  process sweeps with `Date.now()` against a seven-day TTL, so all thirty fixtures
  expired before delivery. Deferring it would have left this PR and every later one
  red, so it is fixed here: `NOW = Date.now()`, which is what the backlog item's fix
  direction asked for. comitatus 2.4.1 → 2.4.2 for the plugin-directory edit.

## Files Changed

- `mantra/`: `hooks/behavior.js`, `hooks/resources.js`, `hooks/hooks.json`,
  `hooks/codex.json`, `lib/resource-inject.js`, README, DEVELOPMENT, context/resources.md
- `memento/`: `hooks/session-startup.js`, `hooks/checkpoint.js`, `rules/sessions.md`,
  `skills/session/SKILL.md`, README
- `onus/`: `hooks/work-item.js`, `rules/git.md`, `rules/work-items.md`, README
- `shared/index.js` (rebuilt into `memento/lib/shared.js`, `onus/lib/shared.js`)
- Tests updated or added in all three plugins and `shared/`
- `comitatus/hooks/__tests__/comm.test.js` (unrelated red CI check; version bump
  to 2.4.2 in its manifests and the marketplace)

## Next Steps

1. Wait for the re-run of PR #214's checks to go green.
