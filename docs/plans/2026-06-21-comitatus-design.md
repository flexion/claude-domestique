# Design: comitatus Plugin

**Date:** 2026-06-21
**Status:** Design
**Branch:** chore/add-comitatus-plugin (proposed)

## Summary

Add **comitatus**, a fifth claude-domestique plugin that packages the herdr
agent-orchestration skill so it installs cleanly from the marketplace, auto-
orients Claude when running inside herdr, ships a small Node helper for
roster/state queries, and **also serves codex agents** (herds mix claude and
codex) by auto-provisioning the *same* skill into codex's skill-discovery path.

`comitatus` is Latin for "keeper/guardian" (root of "custodian") — one who tends
and guards the herd. It follows the family's evocative-Latin naming convention
(memento = "remember", onus = "burden"). The name deliberately avoids herdr's
own reserved orchestrator-role labels (shepherd / drover / wrangler) so there is
no collision when those labels are used inside herdr.

The plugin does **not** reimplement herdr or duplicate herdr's runtime
integration. herdr is a terminal-native agent multiplexer with its own `herdr`
CLI; comitatus packages a curated workflow skill over that CLI. Canonical herdr
docs live upstream at herdr.dev.

## Key decision: one identical skill for all runtimes

The origin repo keeps two near-duplicate copies of the skill — a "pretty"
claude copy (Unicode typography) and an ASCII codex copy — which drift apart
because they are hand-maintained. comitatus collapses this: the skill is authored
**once, in plain ASCII**, and that single directory is what both claude and
codex use, byte-for-byte.

- The decorative punctuation (em dashes, `->` arrows, ellipses, smart quotes) is
  cosmetic for the human reading SKILL.md; no model needs it and claude reads
  ASCII fine. Removing it costs nothing functional and eliminates the only
  reason the two copies differed in content.
- "Plain ASCII" means no decorative punctuation — **not** stripping every non-
  ASCII byte. herdr's literal UI glyphs `◆ ◇ ⬨` and the row separator `·` stay
  verbatim: they are the actual characters herdr prints for tab labels, so the
  skill must reference them as-is. Both runtimes already accept these.

Result: **no build step, no generated tree, no transform.** One source of truth.
The only thing that remains runtime-specific is *delivery*, not content.

## Delivery: same skill, two paths

A herd mixes claude and codex agents in panes. Each runtime discovers skills
differently, so the same files reach them by different routes:

| Runtime | How it gets the skill | What comitatus does |
|---|---|---|
| **claude** | comitatus installed globally as a marketplace plugin → every claude agent in every pane/worktree has `comitatus:herdr`. | Ship `skills/herdr/`. |
| **codex** | Codex reads `~/.codex/skills/<name>/` (global) and `<repo>/.codex/skills/<name>/` (project). No plugin concept. | Auto-provision: copy `skills/herdr/` verbatim into `~/.codex/skills/herdr/`. |

The codex skill-interface manifest `agents/openai.yaml` lives inside the single
skill dir. It is **inert for claude** (Claude Code only reads SKILL.md and the
files it references) and **used by codex**, so it can ship in one place and be
copied along with everything else.

Per codex's schema (`skill-creator/references/openai_yaml.md`), `openai.yaml` is
UI/harness metadata only — it has **no content-pointer field**, which is why
codex needs the actual `SKILL.md` copied into its path (it cannot redirect to
the claude copy). The shipped manifest carries `interface.display_name`,
`interface.short_description` (25–64 chars), and `interface.default_prompt`
(must reference the skill as `$herdr`); the origin repo's values already satisfy
these and are reused.

## Scope

In scope:

- One plain-ASCII herdr skill (`SKILL.md` + `reference/{cli.md,names.md}` +
  `agents/openai.yaml` + `scripts/herd.js`) serving both runtimes.
- A SessionStart hook that, when `HERDR_ENV=1`, orients Claude **and** auto-
  provisions the skill into codex's skill path.
- A Node roster/state helper (`herd.js`) replacing the inline `python3`
  JSON-parsing one-liners in the skill.
- Jest tests, version registration, and docs wiring consistent with the other
  plugins.

Out of scope (explicit):

- **herdr's own codex integration.** herdr installs and manages
  `~/.codex/herdr-agent-state.sh` and a SessionStart entry in
  `~/.codex/hooks.json` (version-stamped, self-overwriting, agent-state
  reporting over the socket). comitatus **never reads or writes** those files and
  ships no codex hook of its own.
- Slash-command wrappers around herd plays — workflows stay as prose "composed
  flows" inside the skill.
- Domestique convention glue (onus branch naming, memento session hints).

## Skill

One skill, kept at its existing identity so its trigger description is unchanged:

| Skill | Invoked as | Description (frontmatter, unchanged) |
|---|---|---|
| `herdr` | `comitatus:herdr` | Control herdr from inside it — worktrees, workspaces, tabs/panes, agents, messaging, waiting on state, via the `herdr` CLI. Use when `HERDR_ENV=1`. |

Imported from the origin skill with two edits: (1) ASCII the decorative
punctuation (keeping herdr's literal glyphs), and (2) rewrite the inline
`python3 -c '...'` JSON parsing to call `herd.js`. The skill's self-gate
("before using this skill, check that `HERDR_ENV=1` … otherwise stop") is
preserved.

## Activation & provisioning hook (`herdr-orient.js`)

Registered like onus's SessionStart hook (`hooks/hooks.json` →
`${CLAUDE_PLUGIN_ROOT}/hooks/herdr-orient.js`). Behavior:

- Read `HERDR_ENV`. If not `1`: **emit nothing, do nothing** — fully silent and
  side-effect-free outside herdr.
- If `1`:
  1. **Orient claude** — return `additionalContext` (the standard SessionStart
     contract domestique uses): you are inside herdr; invoke `comitatus:herdr` for
     worktree/herd/pane/agent workflows; the helper is at the resolved absolute
     `herd.js` path. Kept lean (consistent with mantra's context-budget trim).
  2. **Provision codex (only if codex is present)** — if `~/.codex/` exists,
     ensure `~/.codex/skills/herdr/` matches `skills/herdr/`: compare a content
     hash to the installed copy; if missing or stale, recursively copy the skill
     dir in (excluding `__tests__/` and `node_modules/`) and note it in the
     orientation text ("provisioned herdr skill for codex"). Idempotent — no
     write when current.

Provisioning guardrails:

- Skip entirely when `~/.codex/` does not exist (codex not installed).
- Write **only** under `~/.codex/skills/herdr/`. Never touch
  `~/.codex/hooks.json` or `~/.codex/herdr-agent-state.sh` (herdr-managed).
- Content-hash gated so it does not rewrite every session.
- Failure-tolerant: any provisioning error is swallowed (logged at most) and
  never blocks session start or suppresses the claude orientation.

## Roster/state helper (`herd.js`, Node)

A single Node CLI replacing the repeated `herdr ... | python3 -c '...'` one-
liners. Reads herdr JSON on **stdin** (recipes keep today's shape,
`herdr agent list | node .../herd.js pane jay`) → trivially Jest-testable with
fixtures. Subcommands:

| Command | Input (stdin) | Output |
|---|---|---|
| `pane <handle>` | `herdr agent list` JSON | pane_id for that handle |
| `members --workspace <ws>` | `herdr agent list` JSON | handles whose `workspace_id` == `<ws>` |
| `status <handle\|pane>` | `herdr agent list` JSON | that agent's `agent_status` |
| `field <dot.path>` | any herdr `--json` output | value at that path |

Pure stdin→stdout, no network, no herdr invocation of its own. Lives inside the
skill dir (`skills/herdr/scripts/herd.js`) so it rides along in the codex copy
automatically. Claude agents reach it via the path the hook surfaces; codex
agents reach the copied file under `~/.codex/skills/herdr/scripts/herd.js`.

## Directory structure

```
comitatus/
├── .claude-plugin/plugin.json     # manifest: skills + hooks, no version field
├── hooks/
│   ├── hooks.json                 # SessionStart → herdr-orient.js
│   ├── herdr-orient.js            # orient claude + copy skill to codex; silent unless HERDR_ENV=1
│   └── __tests__/herdr-orient.test.js
├── skills/herdr/                  # SINGLE source, plain ASCII, serves all runtimes
│   ├── SKILL.md                   # decorative punctuation ASCII'd; python → herd.js
│   ├── reference/{cli.md,names.md}
│   ├── agents/openai.yaml         # inert for claude, used by codex
│   └── scripts/herd.js            # roster/state helper, copied wholesale into codex
├── __tests__/herd.test.js         # helper tests (outside skill dir → copy stays clean)
├── package.json                   # test script
├── jest.config.js
└── README.md
```

## Testing

Jest, matching the other plugins (`cd comitatus && npm test`):

- **Hook** — `HERDR_ENV=1`: orientation `additionalContext` contains the skill
  name + resolved helper path; with a temp `HOME`/codex dir present it copies
  `skills/herdr/` → `~/.codex/skills/herdr/`, refreshes when stale, no-ops when
  current, excludes `__tests__/`, and **never** writes `hooks.json`; with no
  codex dir it skips provisioning. `HERDR_ENV` unset/non-`1`: no output, no
  writes. (Paths injected per domestique's dependency-injection test approach.)
- **Helper** — fixture JSON per subcommand: `pane`, `members` (filter by
  `workspace_id`), `status`, `field` (dot-path), plus missing-handle / empty-
  input edge cases.

## Versioning & wiring

- New plugin starts at **0.1.0** (as agent-artifex did).
- Add a `comitatus` entry to `.claude-plugin/marketplace.json`.
- **Add `comitatus` to the hardcoded `PLUGINS` array in `scripts/bump-version.js`.**
  (agent-artifex's plugin.json has no `version` field; comitatus follows the same
  pattern — version lives only at the marketplace level.)
- Update `CLAUDE.md`:
  - the version-bump IMPORTANT line (add comitatus);
  - the repository-structure section;
  - the Context Ownership table — add a comitatus row ("herdr orchestration",
    `skills/herdr/SKILL.md`).

## Provenance

The skill derives from herdr's upstream documentation (origin copies currently
live in a separate project). The README states that canonical herdr docs live
upstream (herdr.dev) and that comitatus packages a curated workflow skill over the
`herdr` CLI. There is one skill source under `skills/herdr/`; codex uses the
same files via the auto-provisioned copy.
