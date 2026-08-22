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


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:6cd5cc61 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->

## Correction to the managed session-close steps

The team-maintainer branch of the block above omits `bd dolt push`. Taken literally it pushes code and leaves every issue, dependency, and memory on the local machine, where the next person to clone sees none of it. The `AGENTS.md` copy of the same block has the step; this one does not.

When the active profile authorizes a push, the order is:

```bash
git pull --rebase
bd dolt push
git push
git status
```

`bd dolt push` writes the issue database to `refs/dolt/data` on the git remote. It is a separate operation from `git push` — git's default refspec moves branches and tags only, so no amount of pushing code carries issue data with it.

This section sits outside the managed markers deliberately. Editing the block above would be reverted the next time anything regenerates it.
