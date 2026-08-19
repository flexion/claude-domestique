# Claude Code: Memory, Rules, Skills — Research Notes (primary source)

Fetched directly from `https://code.claude.com/docs/en/memory` and `https://code.claude.com/docs/en/skills` (via search synthesis), 2026-08-17.

## THE key finding: official AGENTS.md/CLAUDE.md interop pattern

> "Claude Code reads `CLAUDE.md`, not `AGENTS.md`. If your repository already uses `AGENTS.md` for other coding agents, create a `CLAUDE.md` that imports it so both tools read the same instructions without duplicating them. You can also add Claude-specific instructions below the import."

```markdown
@AGENTS.md

## Claude Code
Use plan mode for changes under `src/billing/`.
```

A symlink also works if no Claude-specific content is needed: `ln -s AGENTS.md CLAUDE.md`.

**This is a purpose-built, officially documented mechanism for the front-door half of the CLAUDE.md/AGENTS.md duplication problem — but "zero duplication" overstates what it fixes (jay's correction, confirmed).** What it actually does: eliminates *copy-paste drift* between two independently-maintained top-level files (CLAUDE.md would stop needing its own restated copy of AGENTS.md content). What it does NOT do:

- It does not reduce token cost — Claude would still load all of AGENTS.md's content in full at launch, same as today; imports "still load and enter the context window at launch" per the docs.
- It does not touch the separate AGENTS.md-to-`.claude/rules/` duplication — that's a distinct problem requiring its own fix (trim the restatements, point to the canonical rule file).
- It does not touch Codex's own 32KiB-capped root→CWD AGENTS.md chain — the import only affects what Claude loads.

**Correct sequencing (jay):** slim/partition AGENTS.md's own content *first* (moving workflow-shaped and rules-duplicating content out), *then* have CLAUDE.md import the now-slimmer AGENTS.md, *then* independently verify (don't assume) that the combination of import + Claude-only additions doesn't reintroduce duplication. Recommending the import before that sequencing would just relocate the duplication problem, not solve it.

## `.claude/rules/` — official mechanics and audit implications

- Rules **without `paths:` frontmatter load unconditionally, every session**, at the same priority as `.claude/CLAUDE.md`. A repository whose rule files omit `paths:` therefore pays for all of them in every session — one of the conditions the trial will look for.
- Rules **with `paths:` frontmatter only load when Claude works with matching files** — official example scopes an API-rules file to `src/api/**/*.ts`.
- Direct official guidance: "Rules load into context every session or when matching files are opened. For task-specific instructions that don't need to be in context all the time, use skills instead."
- This gives a concrete per-file remediation path: rules that are inherently about a code area (e.g. a JSON-serialization rule scoped to JSON-handling files) can take `paths:` frontmatter; rules that are about a *workflow* rather than a *file area* (e.g. a release-process or git-workflow rule) aren't file-path-scopable at all — they're better candidates for becoming Skills (loaded when the relevant task/prompt matches) than for `paths:` scoping. "Path-scope everything" is not uniformly the right fix — it's path-scope where the content is file-driven, skill-ify where it's workflow-driven.

## Enforcement: CLAUDE.md/rules are context, not enforcement

> "Claude treats them as context, not enforced configuration. To block an action regardless of what Claude decides, use a PreToolUse hook instead."

Where a repository marks rules `BLOCKING` in prose, official guidance says that marker is a strong behavioral instruction, not a hard technical gate — the model may still deviate under ambiguity or long-session drift.

**Testable shape:** a prose rule that also documents a manual validation step is a hook or CI candidate. The rule has already specified a deterministic check; it just runs on human initiative rather than as a gate. An audit can detect this pattern generically — a `BLOCKING`-marked rule whose text contains an executable check, with no corresponding hook or CI job — and propose promoting the existing check into an enforced one. Whether that promotion is warranted still depends on the per-host support and validation gates.

## Skills — official mechanics

- SKILL.md requires YAML frontmatter (tells Claude *when* to use it) + markdown instructions. Optional supporting files: templates, example outputs, scripts, reference docs — referenced from SKILL.md so Claude knows when to load them.
- Progressive disclosure: frontmatter (~100 tokens) always visible to Claude; full SKILL.md body loads only when Claude judges it relevant; linked/reference files load only as further needed. Real-world report: 40+ skills coexisting at ~1,500 total tokens overhead versus thousands if all loaded eagerly.
- `.claude/commands/*.md` and `.claude/skills/*/SKILL.md` are functionally similar (both produce a `/name` command); skills are recommended since they support additional features (supporting files, subagent execution, dynamic context injection). A repo with both directories is worth checking in a later pass for whether any command should really be a skill or vice versa.
- Claude Code auto-loads `.claude/skills/` and `.claude/commands/` from `--add-dir`-added directories automatically (an explicit exception to the "no auto-config-discovery from added dirs" rule).

## Compaction / durability (general expertise)

- Project-root CLAUDE.md survives `/compact` — Claude re-reads it from disk and re-injects it.
- Nested CLAUDE.md files and `paths:`-scoped rules are **not** auto-re-injected after compaction — they reload only the next time Claude reads a matching file. An instruction given only in conversation, or via a not-yet-re-triggered path rule, can appear to "vanish" after compaction. Relevant to the plugin's own mission: this is a concrete mechanism behind exactly the kind of context-drift the plugin's working hypothesis about accreted configuration describes, worth citing as authoritative grounding rather than leaving it purely speculative.

## Sources
- [How Claude remembers your project — Claude Code Docs](https://code.claude.com/docs/en/memory) (primary, fetched directly)
- [Extend Claude with skills — Claude Code Docs](https://code.claude.com/docs/en/skills)
- [Agent Skills — Claude Platform Docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
