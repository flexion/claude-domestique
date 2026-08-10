# Review: cross-model plugin migration (Phase 0 + Phase 1)

**Date:** 2026-08-09
**Reviewer:** Claude (Opus 5)
**Branch:** `chore/make-all-plugins-available-to-claude-and-codex`
**Scope:** uncommitted working-tree diff, 39 files, +856/−214
**Plan under review:** `docs/plans/2026-08-08-cross-model-plugin-architecture.md`

Read this top to bottom. Findings are ordered by severity and anchored to `file:line`. Everything in "Verified working" was executed, not inferred — commands and output are named so you can reproduce them.

---

## Summary

The plan is good and the Phase 0/Phase 1 work mostly matches it. Dual manifests, synchronized versions, the repository validator, skill-name normalization in `agent-artifex`, and the self-contained reference tree are all in place and pass every validator I could run.

Two things need to be fixed before merge: the plan's own status section claims a Codex installation that does not exist on this machine, and one reference-path replacement in `agent-artifex/references/evidence.md` is a dangling self-reference. Five more should be fixed because they leave the new invariants unenforced or the repo's own instructions stale.

---

## Blocking

### B1. The plan claims a Codex install that is not present

`docs/plans/2026-08-08-cross-model-plugin-architecture.md:5,18,21` states:

> **Status:** In progress — Phase 0 complete; Phase 1 packaged and installed
> - Registered the existing legacy-compatible marketplace in Codex and installed Agent Artifex `0.2.0` from it.
> - The installed Codex cache contains the manifest, all six skills, and all bundled references.

None of that is observable here:

| Check | Result |
|---|---|
| `ls ~/.codex/plugins/cache` | only `openai-curated-remote/openai-templates` |
| `grep -i marketplace ~/.codex/config.toml` | no matches |
| `find ~/.codex ~/.agents -iname "*artifex*"` | no matches |
| `find ~/.codex -name "*marketplace*"` | no matches |

So the Phase 1 exit criterion — "the same skill source works from fresh Claude and Codex sessions with no copied content" (`:246`) — is unmet, and the parity matrix row for install/list/update is unproven on the Codex side.

Note that `~/.codex/skills/herdr` *does* exist, which is the comitatus home-directory copy path the plan wants demoted (`:191`). That's the only Domestique content Codex currently sees.

**Fix:** either re-run the install and paste the exact commands and output into the progress section, or downgrade the status line to "Phase 1 packaged; Codex installation not yet verified" and move the install into the open-work list. Don't leave a progress log that a later reader will trust.

### B2. `evidence.md` replaced a real pointer with a dangling self-reference

`agent-artifex/references/evidence.md:75` (last line of the file):

```
The source citations below are the portable evidence index bundled with this plugin.
```

The citations are *above* this line, and "bundled with this plugin" points at the file the sentence is inside. The line it replaced (`Full source documents: docs/ai-services/sources/`) was a working pointer to real content that is not in the plugin — so removing it was right, but the replacement tells the reader to look somewhere that doesn't exist.

**Fix:** delete the line, or replace with something that states the actual situation, e.g. `Each citation above names its source document; the plugin carries no external source files.`

---

## Should fix

### S1. Relative reference paths have no stated anchor

Every `agent-artifex` skill now points at `../../references/framework.md` and friends. All of these resolve on disk — I checked every path introduced in the diff, including `../design/references/*` and `../implement/references/*`, and all targets exist.

The problem is that nothing says what the path is relative to. `agent-artifex/skills/assess/SKILL.md:13-19` is a bare table of `../../references/*.md`. When a host injects skill content rather than handing the agent a file path, `../..` has no anchor and the agent has to guess — which is the same failure mode the old `agent-artifex/references/framework.md` form had, just inverted.

**Fix:** one line under each `## Shared References` heading — "Paths in this table are relative to this `SKILL.md`." Applies to `assess`, `design`, `foundations`, `learn`, `implement`. `implement/SKILL.md:418-439` mixes bare (`references/`) and `../design/references/` forms in adjacent tables; they share the same anchor, so stating it once resolves the apparent inconsistency too.

The plan (`:125`) leaves the door open to `${CLAUDE_PLUGIN_ROOT}` "only where both hosts demonstrably substitute them," and your own research note (`:41`) says Codex exports it. Worth a Phase 1 experiment, but stating the anchor is the cheap fix that works regardless.

### S2. Skill-name normalization is incomplete and nothing enforces it

Plan `:121` says to remove namespaced values from `name` fields, and names `memento:resume` explicitly. Still present:

- `memento/skills/resume/SKILL.md:2` → `name: memento:resume`
- `memento/skills/session-manager/SKILL.md:2` → `name: memento:session-manager`
- `onus/skills/work-item-handler/SKILL.md:2` → `name: onus:work-item-handler`

Deferring these to Phase 2 is fine. The gap is that `scripts/validate-plugins.js` does not implement the "valid skill frontmatter and local kebab-case names" check the plan lists at `:292`, so nothing catches a regression in `agent-artifex` and nothing will fail when Phase 2 starts.

**Fix:** add the check now — parse every `<plugin>/skills/*/SKILL.md`, assert the frontmatter is a YAML mapping and `name` matches the directory name in kebab-case. Let it fail on the three known-stale files, or allowlist them with a `TODO(phase-2)` comment so Phase 2 begins with a failing test instead of a memory.

### S3. Root `CLAUDE.md` is now factually wrong, and CLAUDE.md/AGENTS.md will drift

`CLAUDE.md:82`:

> This updates `package.json` and `marketplace.json`. Version is only maintained at the marketplace level, not in plugin.json.

That is exactly what this diff changed. Versions now live in four places per plugin. `CLAUDE.md:45` also still shows a structure block with no `.codex-plugin/`. The new `AGENTS.md:` version section is correct — so the two files now disagree about a rule an agent will act on.

The structural issue is worth deciding deliberately: Claude Code auto-loads `CLAUDE.md` and not `AGENTS.md`; Codex reads `AGENTS.md` and not `CLAUDE.md`. You now have two full-length instruction documents covering the same ground, neither of which is read by both hosts. That is a guaranteed drift source in a repo whose stated principle is "each behavior should have one source of truth" (`AGENTS.md`, Working principles).

**Fix:** make `CLAUDE.md` a short pointer to `AGENTS.md` plus the Claude-only deltas (self-referential-project note, status line, plugin-install mechanics). Keep the substantive content in one file.

### S4. `bump-version.js` reports success for a manifest it may not have written

`scripts/bump-version.js` (in the new block):

```js
updateVersionIfPresent(pluginJsonPath, newVersion);
console.log(`  ✓ ${plugin}/.claude-plugin/plugin.json`);
if (updateVersionIfPresent(codexPluginJsonPath, newVersion)) {
  console.log(`  ✓ ${plugin}/.codex-plugin/plugin.json`);
}
```

The Codex line is guarded; the Claude line is not. If `.claude-plugin/plugin.json` is missing or renamed, the script prints a checkmark, bumps `package.json` and `marketplace.json`, and leaves the manifest behind. `validate-plugins.js` would catch the resulting inconsistency in CI, but the tool shouldn't claim work it didn't do.

**Fix:** guard it the same way, and consider erroring rather than skipping — a plugin with no Claude manifest is a bug, not an optional configuration.

### S5. The Phase 0 CI exit criterion isn't in CI — and the named validator wouldn't have caught what you fixed

Plan `:234` sets the Phase 0 exit as `claude plugin validate . --strict` and all Jest suites passing. `.github/workflows/pr-check.yml:28-29` adds only `npm run validate:plugins`.

More importantly, I ran the Claude validator and it does less than the plan assumes:

- `claude plugin validate . --strict` → "Validating marketplace manifest… ✔ Validation passed". It validates the marketplace file only.
- `claude plugin validate ./<plugin> --strict` → "Validating plugin manifest: …/plugin.json ✔ Validation passed", for all six.

It never reads `skills/`, `agents/`, or `commands/` frontmatter. So the Stilus YAML failures the plan attributes to it (`:67`) were not found by that command, and adding it to CI would not have prevented them.

The two Stilus fixes themselves are correct and worth keeping — `stilus/agents/review-summary.md` had `takes away: the point` and `stilus/commands/review.md` had `Usage: /stilus:review` inside unquoted scalars, both genuinely invalid YAML, both now folded into `>-` blocks that parse. A YAML parse across every `*.md` frontmatter in the repo now passes for all plugin skill, agent, and command files.

**Fix:** add the frontmatter parse to `validate-plugins.js` (it belongs with S2), add `claude plugin validate` to CI if you want the manifest schema pinned, and correct the plan's claim about which tool found the Stilus errors so the next reader doesn't rely on it.

*Aside:* `memento/rules/sessions.md` and `onus/rules/git.md` will fail a naive YAML frontmatter parse — they open with `---` but the body is mantra's compact-rule notation, not YAML. That's the documented format and no host discovers `rules/` as skills, so it's not a bug. Just make sure whatever check you add for S2 scopes itself to `skills/`, `agents/`, and `commands/` rather than all markdown.

### S6. New script, no test

`scripts/validate-plugins.js` is 74 lines of new logic with no tests, and `scripts/` has no `__tests__/`. The `AGENTS.md` you wrote in this same diff says "Add or update Jest tests for behavior changes in JavaScript hooks, scripts, and shared utilities."

Also: `readJson` (`scripts/validate-plugins.js:11-13`) throws an uncaught `SyntaxError` on malformed JSON, so a bad manifest produces a stack trace rather than joining the error list the rest of the script builds so carefully.

---

## Minor

### M1. Workspace and package-name inconsistency

`agent-artifex/package.json` and `stilus/package.json` exist but neither plugin is in root `package.json:6-12` workspaces (`shared`, `mantra`, `memento`, `onus`, `comitatus` are). `npm run install:all` won't touch them. Neither has dependencies today, so nothing breaks — but the new plugins are outside the mechanism the old ones use.

`stilus/package.json:2` is also named `stilus` while every other plugin uses `@claude-domestique/<name>`. Pick one convention and have `validate-plugins.js` enforce it.

### M2. `mantra/DEVELOPMENT.md` documents a directory that doesn't exist

`mantra/DEVELOPMENT.md` structure block lists:

```
├── rules/                # Lean rules injected by the hook
│   └── behavior.md
```

There is no `mantra/rules/`. The rules text is a `BEHAVIOR` template literal in `mantra/hooks/behavior.js:9`. The claim was inherited verbatim from the deleted `mantra/CLAUDE.md`, so it isn't a regression — but a full rewrite was the moment to fix it. The same block's "Detailed on-demand references" list is accurate.

Separately: deleting `mantra/CLAUDE.md` means Claude Code no longer auto-loads mantra guidance when working inside `mantra/`, and `DEVELOPMENT.md` is auto-loaded by neither host. If the intent is that root-level instructions cover it, that's defensible — the root `CLAUDE.md` does cover the same ground. Just say so in the file, so the next person doesn't restore `mantra/CLAUDE.md`.

### M3. Duplicated sentence in `foundations`

`agent-artifex/skills/foundations/SKILL.md:176` and `:180` say the same thing four lines apart:

```
Read `../../references/evidence.md` for the full source index and key numbers.
...
The source index and citations are bundled in `../../references/evidence.md`.
```

Line 180 is the rewrite of the old `docs/ai-services/sources/` pointer and is now redundant. Delete it.

### M4. Marketplace description will need editing every phase

`.claude-plugin/marketplace.json:6`: "Claude Code development workflows, with Agent Artifex also available for Codex". This is the catalog description both hosts render, so a Codex user browsing sees a Claude-first framing plus a per-plugin caveat that goes stale at each phase boundary. Something host-neutral — "Development workflow plugins for Claude Code and Codex" — matches the root `package.json` change you already made and stops being a maintenance item.

### M5. Skill descriptions exceed the ≤500-char guidance

`agent-artifex` descriptions run 546–695 characters (`implement` is longest at 695). All well under the 1024 frontmatter limit, and the trigger-phrase stuffing is clearly deliberate for discovery. Noting it only because the current skill-authoring guidance suggests ≤500 where possible. Leave as-is if the trigger coverage is intentional.

---

## Verified working

Executed, not inferred:

- **`npm test`** — all suites pass: shared, mantra, memento, onus (65 tests), comitatus (105 tests).
- **`npm run validate:plugins`** — passes.
- **`claude plugin validate . --strict`** — marketplace passes. Per-plugin runs pass for all six.
- **`python3 ~/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py agent-artifex`** — "Plugin validation passed". The plan's decision to omit `hooks` from the Codex manifest (`:214`) holds up, and the `interface` block is accepted as written.
- **Version consistency** — all six plugins agree across `package.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json` where present, and `marketplace.json`. Every plugin touched in this diff was bumped: memento 0.3.10, mantra 0.5.2, onus 0.3.7, agent-artifex 0.2.0, comitatus 0.5.1, stilus 0.1.1.
- **Codex CLI commands in `agent-artifex/README.md` are real.** `codex plugin marketplace add <SOURCE>` accepts `owner/repo[@ref]`, and `codex plugin add <PLUGIN[@MARKETPLACE]>` accepts the `@marketplace` form. `.claude-plugin/marketplace.json:2` is `"name": "claude-domestique"`, so `agent-artifex@claude-domestique` resolves. (The commands are valid; whether the install succeeds end-to-end is B1.)
- **Reference containment** — no `docs/ai-services` path and no `agent-artifex:`-namespaced skill reference remains inside any plugin directory; the only hits are in `docs/plans/`, which is expected. Every relative path introduced in the diff resolves to an existing file.
- **`claude-api:mcp-builder` dependency fully removed** from `agent-artifex` skills and README, replaced with capability-based wording per plan `:186`.
- **All six `agent-artifex` skill `name` fields match their directory names** in kebab-case.
- **`agent-artifex/README.md` structure tree matches the real directory contents.**
- **`.DS_Store`** is gitignored and untracked; nothing generated is staged.

---

## Suggested order of work

1. B1 — decide: verify the Codex install, or correct the plan's status. (Everything else in Phase 1 rests on this claim.)
2. B2, M3 — two-line prose fixes in `agent-artifex`.
3. S1 — add the path anchor line to five SKILL.md files.
4. S2 + S5 + S6 — grow `validate-plugins.js` (frontmatter parse, skill-name check, package-name convention), and give it a Jest suite. This is the single change that makes the rest of the migration self-policing.
5. S3 — collapse `CLAUDE.md` into a pointer plus Claude-only deltas.
6. S4 — guard the log line.
7. M1, M2, M4 — cleanup.

Items 2–7 are all repository-only or plugin-content changes; note that 2, 3, and M2/M3 touch plugin directories, so `agent-artifex` and `mantra` need another patch bump before merge.
