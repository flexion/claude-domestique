# CLAUDE.md

Read and follow `AGENTS.md` before working in this repository. It is the single source of truth for repository structure, commands, testing, versioning, and git conventions.

## Claude-specific context

This repository is self-referential: it contains the source for plugins that may also be installed in the active Claude Code session. Source edits do not change the running plugin instance until that plugin is rebuilt, versioned, and reinstalled.

| Concept | Source being developed | Active Claude instance |
| --- | --- | --- |
| Plugin files | `<plugin>/` | Claude's versioned plugin cache |
| Session data | Memento source and templates | `.claude/sessions/` in the current project |
| Work-item behavior | `onus/` | Onus state and cached issue context |

Claude Code uses `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`. Codex metadata lives alongside it under `.codex-plugin/`; shared skills, hooks, scripts, references, and templates remain at each plugin root.

When validating changes, run the marketplace validator and each affected plugin validator separately. Validating the repository root checks the marketplace but does not replace per-plugin validation.
