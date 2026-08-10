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

The repository is an npm workspace using CommonJS. Runtime code targets Node.js 18 or newer; CI tests Node.js 24 only, so the declared floor is a compatibility intent rather than a tested one.

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
- Pull-request titles follow the same format.
- The usual branch formats are `issue/feature-N/description` and `chore/description`.

## Definition of done

Before handing off a change:

1. Review the diff for accidental generated files, duplicated guidance, and stale references.
2. Run the focused tests for every affected package, plus the full suite when the change crosses package boundaries.
3. Run `npm run build` and verify generated copies when `shared/index.js` changed.
4. Run `npm run validate:plugins` and the Claude and Codex manifest checks for every affected plugin.
5. Bump every modified plugin at the appropriate level.
6. Report what changed, what validation ran, and any remaining risks or unverified behavior.
