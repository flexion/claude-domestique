# Herd naming: descriptive labels over collective nouns

- **Date:** 2026-06-22
- **Status:** Accepted
- **Plugin:** comitatus (`skills/herdr`)

## Problem

herdr renders each agent row as `<workspace> · <tab>` (e.g. `pack · fox ◆ claude`).
The branch/worktree is **not** shown in the row, so the **workspace label is the only
"what is this group doing" field**. The prior convention spent that field on an opaque
collective noun (`pack`, `flock`, …) claimed from a pool, and documented it as
"stable, decoupled from the branch." Result: scanning the sidebar you cannot tell which
herd is doing what.

## Decision

Label workspaces **descriptively**, by what they are / what they do:

| Tier | Labeled thing | Old | New |
|------|---------------|-----|-----|
| herder (orchestrator = repo main checkout) | workspace label | role-name pool (`shepherd`…) | **repo tag** (≤~10 chars), e.g. `claude-dom` |
| herd (worktree / task) | workspace label | collective-noun pool (`pack`…) | **task tag** (≤~10 chars), e.g. `comitatus` |
| member (agent) | handle | call-sign pool | **call-sign** (unchanged), e.g. `fox` |

- Task/repo tags are **short, hand-picked, readable** abbreviations of the branch/repo —
  judgment, not an algorithm. Keep them ≤~10 chars or they truncate the member's
  decorated tab label. Unique among live herds; qualify on a genuine collision.
- Member handles stay arbitrary call-signs: a handle is the addressable identity
  (`agent send fox`) and must stay short, unique, phonetically distinct, and stable across
  a model relaunch — so it cannot be task-derived (a task has many members).
- The fully-qualified path notation becomes `<repo>/<task>/<member>`
  (e.g. `claude-domestique/comitatus/fox`), which reads better than `shepherd/pack/fox`.

## Consequence (an intended reversal)

The label now **couples** to the task — that coupling is the point. Reassigning a herd to a
new branch means **relabeling** it (`workspace rename` to the new task tag); the existing
"reassign a herd" flow already calls `workspace rename`, so this is a guidance change, not a
new step. We drop the old "names are stable, decoupled from the branch" rule.

## Mechanics unchanged

herdr stores none of this convention. Herds are still "agents sharing a `workspace_id`";
roster sync still keys on `workspace_id`; worktree association is still by `cwd`. Only the
label convention changes — **no code, hook, or test changes**.

## Scope of change

- `skills/herdr/SKILL.md`: rewrite `## naming`; update the herd/herder framing in
  `## concepts`, the "assign / reassign a herd" guidance, and the "keep the workspace label
  short" gotcha.
- `skills/herdr/reference/names.md`: delete the herder and herd pools; keep the member
  call-sign pool; add task-tag / repo-tag guidance.
- `node scripts/bump-version.js comitatus patch` before merge.
- **Live application (done):** relabel the running session's herds — `pack → comitatus`,
  `flock → terraform`, herder `claude-domestique → claude-dom`.

## Alternatives rejected

- **Surface the task via herdr's worktree grouping** instead of the label — the agent row
  never shows the branch, so the label is the only lever.
- **Put the task in the tab label** — the task is per-herd (shared across its tabs); the
  workspace label is its natural home, the tab label already carries `<handle> <glyph> <type>`.
- **Composite `task+team` labels** (`cmt·pack`) — the ~10-char budget makes them cryptic.
- **Mechanical truncation of the branch** — produces ugly tails (`comitatus-`).

## Revision — 2026-06-22 (same day, after a live trial)

Exercising the convention in a live herdr session surfaced two refinements, now the accepted
scheme:

- **Subordinate (linked) worktree workspace → the full worktree directory name**
  (`chore-comitatus-fixes`), *not* a short ≤10-char task tag. Rationale: the label should name
  the worktree unambiguously. Accepted cost: the long label truncates the decorated tab label
  in the collapsed sidebar (the handle reappears when the workspace is focused/widened). The
  **herder** workspace still uses a short repo tag (`claude-dom`).
- **Agent tab label → `<handle> <glyph>`** (`fox ◆`), dropping the `<type>` word — the glyph
  already encodes the model, so the type was redundant.

Member handles (call-signs) and the "descriptive, not pooled" principle are unchanged. This
revision is reconciled into `SKILL.md` (`## naming`, recipes, gotchas), `reference/cli.md`,
and `reference/names.md`; comitatus bumped 0.1.1 → 0.1.2.

## Revision 2 — 2026-06-22 (same day): drop the herder tier and all label renaming

A further live finding collapsed the convention to its minimum: **herdr already labels a new
worktree's workspace with the worktree directory name by default** (verified with a throwaway
worktree), and a repo's main checkout with the repo name. So *no `workspace rename` and no
`worktree create --label` are needed at all* — the defaults already are the convention.

Accordingly:

- **The "herder" naming tier is removed.** The repo's main checkout is just that; it keeps
  herdr's default label (the repo name) and is never renamed. The coined term "herder" is
  dropped from the skill in favour of plain "main checkout / home repo".
- **No workspace or worktree renaming.** Recipes drop the `workspace rename` step and the
  `worktree create --label` flag; herds rely on herdr's default worktree-name label.
- **What you still assign:** only the **member handle** (`agent rename`, needed for
  `agent send`) and the decorated **tab** label `<handle> <glyph>` (`tab rename`).
- New gotcha recorded: `worktree create`/`open` must run from the repo's main-checkout
  workspace (`--workspace <main>`), else `linked_worktree_source`.

Reconciled across `SKILL.md` (`## naming`, `## concepts`, recipes, gotchas),
`reference/cli.md`, and `reference/names.md`; comitatus bumped 0.1.2 → 0.1.3.
