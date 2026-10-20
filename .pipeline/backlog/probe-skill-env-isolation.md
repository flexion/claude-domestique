# probe-skill children inherit the caller's herdr pane and installed plugins

- **status**: open
- **type**: defect
- **area**: repository tooling, `scripts/probe-skill.js`
- **found in**: branch `chore/memento-configurable-session-path`, Task 6 skill probes, 2026-10-20

## What happened

The probes were run from a herdr pane in the `chore/memento-configurable-session-path` worktree:

```bash
node scripts/probe-skill.js --plugin onus --expect onus:commit --prompt "Commit my changes"
```

No `--cwd` was given, so the probe started in a neutral temp directory, as documented. The child
`claude` process still inherited the caller's environment, including `HERDR_ENV`,
`HERDR_PANE_ID` (the invoking pane, `w3F:p2`), `HERDR_TAB_ID`, `HERDR_WORKSPACE_ID`,
`HERDR_SOCKET_PATH`, `HERDR_BIN_PATH` and `OLDPWD` (the worktree path). All five Claude
probes in that batch `cd`'d into the invoking worktree by absolute path. Their
transcripts are under `~/.claude/projects/-private-var-folders-…-T-probe-cwd-{WvkTsN,7l94V5,t6uHpC,50zqUL,KaRskh}`.
The installed comitatus hook most likely oriented them to the pane. The `onus:commit`
probe (`50zqUL`) then:

1. edited the branch's session file twice, adding a false "Task 6 (partial) …
   Committed work so far" log line;
2. ran `git add -A` and `git commit`, creating local commit `3f4fb01` with every
   uncommitted change on the branch.

It was not pushed. The operator had it unwound with `git reset --mixed 008133c`, and
the content was verified byte-identical.

Two related gaps showed up in the same work:

- `requireCleanTree` protects only `--cwd` runs. A run without `--cwd` that escapes
  its temp directory is unguarded, even though permissions are `bypassPermissions`.
- The Claude arm loads the user's installed plugins alongside `--plugin-dir`. Here, the
  user-scope `memento@claude-domestique` 0.5.2 and `onus@claude-domestique` 0.4.3 were
  enabled, so a probe of the source copy could also run the installed older copy.

## Mitigation used meanwhile

The R2-5 matrix runs (plan `docs/superpowers/plans/2026-10-20-memento-configurable-session-path.md`,
"Probe safety") took these precautions:

- They ran from a copied source tree.
- They used `env -u HERDR_ENV -u HERDR_PANE_ID -u HERDR_TAB_ID -u HERDR_WORKSPACE_ID -u HERDR_SOCKET_PATH -u HERDR_BIN_PATH -u OLDPWD`.
- They targeted a disposable committed `--cwd` repo.
- They passed `--settings '{"enabledPlugins":{"memento@claude-domestique":false,"onus@claude-domestique":false}}'`.
- They recorded the invoking worktree's `HEAD` and status hash before and after each run.

All 22 matrix runs left the worktree unchanged.

`chore/onus-config-location` hit the same gap from the other side. With `--cwd` on a
disposable committed repo, the user-installed memento's SessionStart hook wrote
`.claude/sessions/` into the target, so the following Codex `--cwd` runs refused on the
dirty-tree guard. Disabling one plugin is not enough when other installed plugins have
hooks. Running `claude` directly with `--setting-sources project,local` (no user
settings) loaded only `onus@inline` plus built-ins, and the runs left the targets clean.
Evidence: `/tmp/lex-probe-M5mo` (contaminated) and `/tmp/lex-probe2-v0yW` (isolated).

## Done when

1. Both arms of `scripts/probe-skill.js` spawn the agent with `HERDR_*` and `OLDPWD`
   removed from its environment. A unit test asserts the spawned env omits them.
2. The Claude arm loads only the plugin under test, with the user's installed copy of
   that plugin (same name) disabled for the run. A test asserts the argument list.
3. A probe started from inside a herdr pane cannot change the invoking repository.
   Either the guard covers non-`--cwd` runs, or the probe records the caller repo's
   `HEAD` and `git status --porcelain` before and after and exits 2 if they differ.
4. `docs/plugin-evaluation.md` states these isolation guarantees and their limits.
