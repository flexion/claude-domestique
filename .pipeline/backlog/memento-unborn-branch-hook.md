# memento hooks report "not a git repo" on a branch with no commits

- **status**: open
- **type**: defect (pre-existing; reproduced at `008133c`, before `chore/memento-configurable-session-path`)
- **area**: memento, `hooks/session-startup.js` (`getBranch`, `onSessionStart`) and `hooks/checkpoint.js` (`getCurrentBranch`)
- **found in**: branch `chore/memento-configurable-session-path`, Task 6 hook smoke test, 2026-10-20

## Reproduction

```bash
tmp=$(mktemp -d) && mkdir "$tmp/home" "$tmp/repo"
git -C "$tmp/repo" init -q && git -C "$tmp/repo" checkout -q -b chore/smoke
printf '{"hook_event_name":"SessionStart","cwd":"%s"}' "$tmp/repo" \
  | HOME="$tmp/home" node memento/hooks/session-startup.js
```

The output carries `"systemMessage":"📍 Memento: No session (not a git repo)"`, and no
session is created, although `$tmp/repo` is a git repository on branch `chore/smoke`.
After `git commit --allow-empty -m init`, the same command creates
`.memento/sessions/chore-smoke.md`. The hook at `008133c` (pre-change) gives the same
"not a git repo" result.

## Cause

`getBranch` runs `git rev-parse --abbrev-ref HEAD`, which exits 128 on an unborn branch
("ambiguous argument 'HEAD'"), so it returns `null`. `onSessionStart` treats a null
branch exactly like a null git root and reports "not a git repo".
`checkpoint.js`'s `getCurrentBranch` has the same gap. `memento/scripts/resolve-session.js`
(added on this branch) already falls back to `git symbolic-ref --short -q HEAD`, and its
test `resolves a branch that has no commits yet` covers that path.

## Done when

1. SessionStart on an unborn branch resolves and creates (or reuses) the branch's
   session like any other branch, and UserPromptSubmit and checkpoint agree on the branch.
2. The hooks give distinct messages for "not a git repository" and "no current branch"
   (detached `HEAD`).
3. Branch detection has one implementation shared by both hooks and the resolver CLI
   (for example, moved into `memento/lib/paths.js` or a sibling module), not three copies.
4. Hook tests cover a real commitless repo and a detached `HEAD`, using per-command
   `-c commit.gpgsign=false` for any fixture commit.
