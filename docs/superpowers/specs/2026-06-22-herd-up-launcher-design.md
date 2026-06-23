# `up` — one-shot worktree + herd launcher

**Date:** 2026-06-22
**Plugin:** comitatus (herdr skill)
**Status:** approved design

## Problem

Launching a worktree and a herd of agents from inside herdr currently runs a
multi-step shell recipe (SKILL.md quickstart, steps 1 & 3, and the composed
flows). Each launch threads ids between commands with variable assignment
(`H=…`, `OUT=$(…)`) and command substitution (`$(echo "$OUT" | node "$H" field …)`).

Claude Code **refuses to auto-approve any command it cannot statically parse**,
and `$(…)` substitution plus variable assignment are exactly what trip that
check. So a two-agent herd launch produces 5–9 permission prompts, and the
`$()`-bearing ones **re-prompt every session no matter what is allowlisted** — an
allowlist entry can never suppress them. (Verified from a live transcript: the
pure-`herdr` block with literal ids was *not* flagged; only the blocks containing
assignment + substitution were.)

## Goal

Collapse the entire launch flow into a **single helper invocation** so a whole
herd comes up in one command:

```
node "$H" up --branch chore/x --base origin/main \
  --claude sly \
  --codex jay \
  --opencode bob:ollama/qwen2.5:7b
```

That command has no `$(…)` and no assignments — it is a single, simple command,
so it costs **one prompt per herd launch** instead of 5–9, and is a candidate for
a `node` allowlist entry.

## Non-goals

These stay as manual building blocks / recipes in SKILL.md:

- Reattach / open an existing branch or worktree (`worktree open`, `git worktree add`).
- Teardown (`worktree remove`, `workspace close`).
- from/to protocol seeding and inter-agent messaging.
- Auto-rollback of a partially-built worktree on mid-flight failure.

## Components

1. **`skills/herdr/scripts/up.js`** (new module). Exports `up(args, deps)`. All
   process execution goes through an injected `deps.run(file, argv) -> { stdout }`
   (default backed by `execFileSync`). This keeps spawning logic out of the
   currently-pure `herd.js` and makes the orchestrator unit-testable with a fake
   runner.
2. **`skills/herdr/scripts/herd.js`** (modified). `main()` branches when
   `argv[0] === 'up'`: it does **not** read stdin, parses the `up` flags, calls
   `up()`, and prints the JSON result. The existing filter commands
   (`pane`/`status`/`members`/`field`) and their stdin-driven path are untouched.
3. **`__tests__/up.test.js`** (new). Dependency-injected fake runner asserting the
   ordered sequence of herdr calls and the final JSON result.
4. **`skills/herdr/SKILL.md`** (modified). Rewrite the quickstart and the two
   composed flows (paired reviewer, assign-a-herd) to use `up`; keep the
   lower-level building blocks for the non-goal/edge cases.
5. **Version bump** — `node scripts/bump-version.js comitatus minor` (new feature;
   0.1.4 → 0.2.0).

## CLI surface

```
node "$H" up --branch <branch> [--base origin/main] [--timeout 45000] \
  --claude <handle> [--codex <handle>] [--opencode <handle>:<model>] …
```

- `--branch` required.
- `--base` defaults to `origin/main`.
- `--timeout` (ms) defaults to `45000`, applied to each agent's idle wait.
- **At least one agent flag is required.** Agent flags are repeatable and may be
  mixed. **Flag order = tab order:** the first agent lands in the worktree's root
  pane (tab `t1`); each subsequent agent gets its own new tab.
- Model → `{ run argv, glyph }`:

  | flag | run argv | glyph |
  |---|---|---|
  | `--claude <handle>` | `claude` | `◆` |
  | `--codex <handle>` | `codex` | `◇` |
  | `--opencode <handle>:<model>` | `opencode -m <model>` | `⬨` |

  `--opencode` requires the `:<model>` suffix; its absence is an error.

## Sequence

1. **Pre-flight handle check.** Collect all requested handles. Error if any
   duplicate within the request. Run `herdr agent list` and error on a global
   collision (handles are globally unique — herdr would reject with
   `agent_name_taken`, but only *after* the worktree is built; pre-checking avoids
   a half-finished worktree).
2. `git fetch origin <base-branch>` — derived from `--base` (e.g. `origin/main`
   → `git fetch origin main`). The local `--base` ref is otherwise stale.
3. `herdr worktree create --branch <b> --base <base> --no-focus --json` → parse
   `result.worktree.path`, `result.worktree.open_workspace_id`,
   `result.root_pane.pane_id`.
4. **Agent[0]** (worktree root pane, tab `t1`):
   `herdr tab rename "<ws>:t1" "<handle> <glyph>"`
   → `herdr pane run "<root>" "<argv>"`
   → `herdr wait agent-status "<root>" --status idle --timeout <t>`
   → `herdr agent rename "<root>" <handle>`.
5. **Agent[i>0]** (new tab each):
   `herdr tab create --workspace "<ws>" --cwd "<path>" --label "<handle> <glyph>" --no-focus`
   → parse `result.root_pane.pane_id`
   → `herdr pane run` → `herdr wait agent-status … idle` → `herdr agent rename`.
6. Print JSON to stdout:

   ```json
   {
     "worktree": { "path": "…", "workspace_id": "wR" },
     "agents": [
       { "handle": "sly", "model": "claude", "pane_id": "wR:p1", "tab": "wR:t1" }
     ]
   }
   ```

## Error handling

Any `git` or `herdr` call returning non-zero aborts immediately: write a stderr
message naming the failing step (and, for agent steps, which handle), exit 1.
Partial state (a created worktree, some launched agents) is left in place for the
operator to inspect or tear down with the existing building blocks — no
auto-rollback.

## Testing approach

`up.js` exports `up(args, deps)` with `deps.run` injected. Tests supply a fake
`run` that matches on `(file, argv-prefix)` and returns canned JSON, then assert:

- the **ordered** list of issued commands (fetch → create → per-agent
  rename/run/wait/rename, with extra agents getting `tab create` first);
- the final result JSON (handles, models, pane ids, tabs);
- opencode `<handle>:<model>` parsing into `opencode -m <model>` + `⬨`;
- pre-flight rejection of an in-request duplicate handle;
- pre-flight rejection of a globally-taken handle (fake `agent list`);
- error when no agent flag is given, and when `--opencode` lacks `:<model>`;
- failure propagation when a fake `run` returns non-zero.

## Risk to verify during implementation

Whether `node "$H" up …` is itself allowlistable, or whether the `$H` expansion
still forces exactly one prompt. Either outcome is a strict improvement over the
status quo (1 vs. 5–9 prompts). The actual behavior will be documented in
SKILL.md rather than overpromising zero.
