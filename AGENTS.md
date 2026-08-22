# AGENTS.md

This file gives coding agents the repository-specific context needed to work safely and efficiently in Claude Domestique.

## Project overview

Claude Domestique is a Claude Code plugin marketplace. It contains six independently installable plugins:

- `memento`: branch-based session persistence
- `mantra`: behavioral rules and context refresh
- `onus`: GitHub, JIRA, and Azure DevOps work-item automation
- `agent-artifex`: guidance for designing and testing AI services
- `comitatus`: herdr orchestration workflows
- `stilus`: prose drafting, editing, and review tools

The repository is an npm workspace using CommonJS and targets Node.js 24. The root `package.json` declares `engines.node` as `>=24`, `.npmrc` sets `engine-strict=true` so an older runtime fails `npm install` rather than warning, `.nvmrc` pins 24 for local shells, and CI tests 24. Nothing verifies an older runtime, so do not reintroduce an older floor without adding a matrix entry for it.

## Repository map

- `.claude-plugin/marketplace.json`: marketplace catalog and published plugin versions
- `<plugin>/.claude-plugin/plugin.json`: per-plugin Claude manifest
- `<plugin>/.codex-plugin/plugin.json`: per-plugin Codex manifest when supported
- `<plugin>/hooks/`: Claude Code hook implementations
- `<plugin>/skills/`: canonical cross-host skill definitions and supporting references/scripts
- `<plugin>/rules/`: compact, automatically injected rules
- `<plugin>/context/`: detailed documentation loaded on demand
- `shared/`: common JavaScript utilities bundled into plugins
- `scripts/bundle-shared.js`: copies `shared/index.js` into consuming plugins
- `scripts/bump-version.js`: synchronizes a plugin version across its package, host manifests, and marketplace entry
- `docs/`: architecture, design, research, and implementation records
- `.beads/`: beads workspace — tracked config and hook shims only; the issue database itself is not in git
- `.agents/skills/`: skills shared across hosts that read the `.agents` convention, currently Codex
- `.codex/`: Codex session hooks and the project-level feature flag that enables them

Not every plugin uses every directory. `agent-artifex` and `stilus` are primarily prompt/documentation plugins and currently have no Jest suites.

## Working principles

- Inspect the nearest README, tests, and existing implementation before changing a plugin.
- Keep concepts in their owning plugin. Session lifecycle belongs to `memento`; behavioral and formatting rules to `mantra`; git and work-item behavior to `onus`; herdr orchestration to `comitatus`; AI-service guidance to `agent-artifex`; prose guidance to `stilus`.
- Prefer cross-references to duplicated guidance. Each behavior should have one source of truth.
- Treat this repository as self-referential: source files here are not necessarily the installed plugin instances active in the current agent session. Source changes do not take effect until a plugin is rebuilt/reinstalled.
- Do not edit generated `memento/lib/shared.js` or `onus/lib/shared.js` directly. Edit `shared/index.js`, then run `npm run build`.
- Preserve the established CommonJS style (`require`, `module.exports`), two-space indentation, semicolons, and trailing newline.
- Hook executables read one JSON object from stdin and write a valid JSON response to stdout. Keep diagnostic output off stdout.
- Maintain graceful behavior around missing files, malformed hook input, absent optional tools, and partial configuration where the surrounding code already follows that pattern.

## Setup, build, and tests

Install workspace dependencies from the repository root:

```bash
npm run install:all
```

Run all JavaScript test suites:

```bash
npm test
```

Run a focused suite while developing:

```bash
npm run test:scripts
npm run test:shared
npm run test:mantra
npm run test:memento
npm run test:onus
npm run test:comitatus
```

Run the CI-equivalent coverage suites:

```bash
npm run test:coverage
```

Validate repository metadata and every Claude plugin declared by the marketplace:

```bash
npm run validate:plugins
npx --yes @anthropic-ai/claude-code@2.1.226 plugin validate . --strict
plugins=$(node -e "require('./.claude-plugin/marketplace.json').plugins.forEach(plugin => console.log(plugin.name))") || exit 1
while IFS= read -r plugin; do
  npx --yes @anthropic-ai/claude-code@2.1.226 plugin validate "$plugin" --strict
done <<EOF
$plugins
EOF
```

Smoke-test every plugin that declares a Codex manifest from an isolated Codex home:

```bash
export CODEX_HOME="$(mktemp -d)"
npx --yes @openai/codex@0.147.0 plugin marketplace add .
marketplace=$(node -p "require('./.claude-plugin/marketplace.json').name")
for manifest in */.codex-plugin/plugin.json; do
  [ -e "$manifest" ] || continue
  plugin=${manifest%%/*}
  npx --yes @openai/codex@0.147.0 plugin add "${plugin}@${marketplace}"
done
```

Rebuild bundled shared code after changing `shared/index.js`:

```bash
npm run build
```

Use the narrowest relevant test command during iteration, then run all affected suites before finishing. Add or update Jest tests for behavior changes in JavaScript hooks, scripts, and shared utilities. For prompt-only plugins, validate manifests, paths, internal references, and consistency with neighboring content.

## Plugin manifests and versions

Any branch that modifies files under a plugin directory must bump that plugin before merge:

```bash
node scripts/bump-version.js <plugin> <patch|minor|major>
```

Use `patch` for fixes and small content updates, `minor` for new commands, skills, or features, and `major` for breaking changes. Bump each affected plugin once, after substantive edits are complete. The script updates the plugin's `package.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json` when present, and `.claude-plugin/marketplace.json`; review all changed metadata files. Do not bump versions for repository-only changes such as this file or general documentation outside plugin directories.

When adding or renaming plugin files, verify paths referenced by plugin manifests, hook configuration, commands, skills, and marketplace metadata. Keep a plugin self-contained: workspace dependencies are unavailable after Claude Code installs it into its cache.

## Git conventions

- Do not overwrite unrelated work in a dirty worktree.
- Do not commit unless the user explicitly asks.
- Commit titles use `#N - verb description` for issue work or `chore - description` otherwise, in lowercase.
- `#N` is a GitHub issue. Bead IDs are not commit-title material — they are hash-suffixed and mean nothing to a reader of the log — so work tracked only in beads commits as `chore - description` and the bead carries the file paths.
- Pull-request titles follow the same format.
- The usual branch formats are `issue/feature-N/description` and `chore/description`.
- The beads `prepare-commit-msg` shim can append agent identity trailers. It stayed quiet on an ordinary commit in testing — `bd` scopes it to orchestrator agents — so expect it only in that context, and leave the trailers alone when they do appear.

## Definition of done

Before handing off a change:

1. Review the diff for accidental generated files, duplicated guidance, and stale references.
2. Run the focused tests for every affected package, plus the full suite when the change crosses package boundaries.
3. Run `npm run build` and verify generated copies when `shared/index.js` changed.
4. Run `npm run validate:plugins` and the Claude and Codex manifest checks for every affected plugin.
5. Bump every modified plugin at the appropriate level.
6. Report what changed, what validation ran, and any remaining risks or unverified behavior.

## Beads workspace setup

Issue data does not travel with a normal clone. The Dolt database lives in `.beads/embeddeddolt/`, which is gitignored; its contents are pushed into this repository as git objects under `refs/dolt/data`. Git's default refspec fetches only branches and tags, so `git clone` and `git pull` move no issue data. Only `bd dolt push` and `bd dolt pull` do.

What is tracked: `.beads/metadata.json` (backend and project id), `.beads/.gitignore`, and the hook shims under `.beads/hooks/`. Everything else under `.beads/` is per-machine, including `.beads/config.yaml` — `bd` rewrites that file on its own, and it is where `bd config set` stores secret keys such as `github.token`, so it stays out of git.

Run these once per clone:

```bash
chmod 700 .beads                         # bd warns on every command while this is 0755
bd bootstrap                             # create the local database from refs/dolt/data
bd hooks install --beads                 # install to .beads/hooks/ and set core.hooksPath
git config beads.role maintainer         # see below; unset means writes may be misrouted
bd config set validation.on-create warn  # description-section checks, local to this clone
```

Nothing tells `bd bootstrap` where to look — it detects `refs/dolt/data` on `origin`, wires that remote for later push and pull, and writes the resulting `sync.remote` into its own untracked `.beads/config.yaml`. The database name comes from tracked `.beads/metadata.json`, so every clone lands on the same database and project id. A fork inherits its own `origin` rather than this one.

Use `bd bootstrap`, not `bd init`. Bootstrap never destroys existing data. `bd init` creates a fresh database with its own project id, which diverges from everyone else's and cannot be reconciled by syncing.

Pass `--beads` to `bd hooks install`. Bare, it installs into `.git/hooks/` and never sets `core.hooksPath`, which leaves the shims committed under `.beads/hooks/` unreachable. The third option, `--shared`, writes a byte-identical copy of those shims to `.beads-hooks/` and points `core.hooksPath` there — a second hooks directory to commit and keep in step, for no gain over the one already tracked.

Roles live in git config, not in `bd`'s own configuration, and a fresh clone has none. Every `bd` command warns until one is set. The `maintainer` role is what this repository wants. The alternative, `contributor`, sets `routing.contributor` to `~/.beads-planning` and routes writes to a personal planning repository outside this project — the fork workflow, where task updates never reach the team.

Three settings are per-machine and cannot be shipped here: `core.hooksPath`, which `bd` writes as an absolute path however it is spelled on the command line; `beads.role`; and beads telemetry, which defaults to enabled in `~/.config/bd/config.yaml`. Disable the last with `bd config set metrics.disabled true`.

Sync in both directions, and sync explicitly. Run `bd dolt pull` at the start of a session, before `bd ready`, or two people will claim the same issue from stale local state. Run `bd dolt push` when you are done, or the issues you created and closed stay on your machine.

Do not assume the hooks cover the outbound half. A `git push` from a clone with hooks installed, an unpushed local bead, and `sync.remote` pointing at the receiving remote produced no `refs/dolt/data` on that remote — and `bd dolt push` itself reported `Push complete.` while `bd dolt show` listed no configured remote. Whatever the shim does, treat `bd dolt push` as a step you run, not one that happens for you. Tracked as `domestique-t49`.

## What belongs in beads

The managed Beads block below says to use `bd` for all task tracking rather than markdown lists. That governs *work items*. It does not mean prose and evidence move into the database.

Beads holds state that someone needs to query: what is ready, what is blocked, who claimed it, what closed it. Everything else stays a file in git, where it diffs and gets reviewed:

- `docs/plans/`, `docs/research/`, `docs/reviews/` — designs, analyses, briefings
- reference corpora, extracted text, and archived sources
- any document whose value is that a reviewer can read it in a pull request

The test is not whether something concerns the work. It is whether it has a state worth querying. A paper has no state. A claim awaiting verification has exactly one.

Beads issues reference files by repository path. Files do not reference bead IDs — paths are stable and readable, while bead IDs are hash-suffixed and are not.

Use the type vocabulary rather than defaulting everything to `task`:

- `spike` — timeboxed investigation to reduce uncertainty before committing to work
- `decision` — an architecture decision record
- `epic` with children — a body of work whose parts have dependencies
- the `pinned` status — a question that stays open across branches

Set `validation.on-create` to `warn` during setup, so `bd` checks that a description carries the sections its type requires and prints what is missing. The requirements are per type — a `spike` wants `## Goal` and `## Findings`. The warning is advisory and the issue is still created; `bd lint` audits existing issues the same way.

Give research and verification issues an acceptance criterion another person can run, so closing the issue is an observation rather than a judgment:

```bash
bd create --type=spike \
  --title="Verify the judge-agreement ceiling figure" \
  --description="## Goal
Confirm the >80% human-agreement ceiling is stated in the source, not relayed.

## Findings
(fill in when complete)" \
  --acceptance="grep -n '80% agreement' text/judge-ceiling--zheng-2023-neurips--llm-as-judge-mtbench.txt returns a hit"
```

Speculative captures use `bd create --ephemeral`. Ephemeral beads are stored outside Dolt versioning, so they never reach teammates. Promote the ones that survive with `bd promote <id> --reason "..."`, which preserves the ID, labels, dependencies, and comments. Nothing collects the rest automatically — this repository leaves compaction disabled — so run `bd purge` to delete closed ephemeral beads when they accumulate.

## About the two managed blocks below

Everything from here down is generated by `bd` — the first block by `bd init`, the second by `bd setup codex` — and both are marked with their own begin and end comments. `bd` rewrites them in place, so edits inside the markers do not survive. Put repository guidance in the sections above instead.

They repeat a heading and overlap in content because each is generated for a different host, not because either is authoritative over the other. Where they disagree with the sections above, the sections above win: they are this repository's decisions, and the blocks are a vendor default. One known disagreement — the blocks describe `.beads/issues.jsonl` as a passive export, but auto-export is off here, so no such file exists and nothing is expected to produce one.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:970c3bf2 -->
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
   bd dolt push
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->

<!-- BEGIN BEADS CODEX SETUP: generated by bd setup codex -->
## Beads Issue Tracker

Use Beads (`bd`) for durable task tracking in repositories that include it. Use the `beads` skill at `.agents/skills/beads/SKILL.md` (project install) or `~/.agents/skills/beads/SKILL.md` (global install) for Beads workflow guidance, then use the `bd` CLI for issue operations.

### Quick Reference

```bash
bd ready                # Find available work
bd show <id>            # View issue details
bd update <id> --claim  # Claim work
bd close <id>           # Complete work
bd prime                # Refresh Beads context
```

### Rules

- Use `bd` for all task tracking; do not create markdown TODO lists.
- Run `bd prime` when Beads context is missing or stale. Codex 0.129.0+ can load Beads context automatically through native hooks; use `/hooks` to inspect or toggle them.
- Keep persistent project memory in Beads via `bd remember`; do not create ad hoc memory files.

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.
<!-- END BEADS CODEX SETUP -->
