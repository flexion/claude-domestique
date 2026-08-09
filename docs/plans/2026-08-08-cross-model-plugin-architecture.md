# Cross-model plugin architecture and migration plan

**Date:** 2026-08-08

**Status:** Complete — Phases 0–5 implemented; authenticated model-level smoke testing remains an operational release check

**Target hosts:** Claude Code and Codex

## Implementation progress

Completed on the initial vertical slice:

- Fixed the Stilus YAML errors found by per-plugin Claude validation and established a strict manifest-validation baseline.
- Added synchronized versions to Claude manifests and repository validation for package, manifest, and marketplace versions.
- Extended the version-bump script to update both host manifests.
- Added Codex manifests for all six plugins.
- Converted every legacy flat command into a canonical folder-based skill shared by both hosts.
- Added Codex tool aliases and portable hook response envelopes for hook-driven plugins.
- Added capability-aware Stilus review orchestration with isolated sequential fallback.
- Normalized all Agent Artifex skill names and made references self-contained within the plugin.
- Reproduced Codex installation from a disposable `CODEX_HOME`; the marketplace and Agent Artifex installation commands both succeeded.
- Invoked the shared `guide` skill successfully through Claude.

The installation can be reproduced without modifying an existing Codex profile:

```bash
export CODEX_HOME="$(mktemp -d)"
codex plugin marketplace add .
codex plugin add agent-artifex@claude-domestique
codex plugin list
```

Fresh isolated Codex installation now succeeds for all six plugins, and the cache contains both manifests plus every canonical skill and bundled reference. Deterministic hook fixtures cover both host tool names. Model-level skill invocation still requires an authenticated interactive Codex thread and remains a release smoke check rather than a repository test.

## Goal

Make every Claude Domestique plugin installable and useful from Claude Code and Codex while keeping one canonical copy of each workflow, reference, template, script, and hook implementation.

Cross-model means host parity, not identical internals:

1. Both hosts can discover and install the same six named plugins.
2. The same user intent activates the same workflow and produces equivalent outcomes.
3. Shared hooks and scripts behave correctly under both event schemas.
4. Host-specific manifests and thin adapters may differ, but substantive instructions do not fork.

## Research findings

The current plugin systems have more overlap than the repository layout suggests:

- Codex requires `.codex-plugin/plugin.json` and supports `skills/`, `hooks/hooks.json`, `.mcp.json`, and assets at the plugin root. Claude uses the same root locations, with `.claude-plugin/plugin.json` for its manifest.
- Both hosts use folder-based skills with `skills/<skill-name>/SKILL.md`. Claude still accepts flat files under `commands/`, but its current documentation recommends skills for new plugins.
- Codex can read a repository's existing `.claude-plugin/marketplace.json` as a legacy-compatible marketplace. A second catalog is therefore not required for the first implementation.
- Codex deliberately exports `CLAUDE_PLUGIN_ROOT` and `CLAUDE_PLUGIN_DATA` alongside its native variables for compatibility with existing plugin hooks.
- Both hosts support the hook events used here: `SessionStart`, `UserPromptSubmit`, `PreToolUse`, and `PostToolUse`. The event names and broad JSON contract align, but tool matchers and some output fields differ.
- Codex does not trust plugin hooks merely because a plugin is installed. Users must review and trust hook definitions.
- Installed plugins are cached and cannot depend on files outside their own plugin root. Repository-relative references such as `docs/...` or `../shared` are not portable.
- Claude supports plugin-defined named agents. The current Codex plugin package contract centers on skills, hooks, MCP servers, and assets, so named-agent orchestration needs a portable skill fallback.

Primary sources:

- [OpenAI: Package your plugin](https://developers.openai.com/plugins/build/plugins)
- [OpenAI: Plugin architecture](https://developers.openai.com/plugins/concepts/plugins)
- [OpenAI: Skills](https://developers.openai.com/plugins/concepts/skills)
- [OpenAI: Hooks](https://learn.chatgpt.com/docs/hooks)
- [Anthropic: Plugins reference](https://code.claude.com/docs/en/plugins-reference)
- [Anthropic: Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)

## Current-state audit

| Plugin | Reusable core | Host-specific gaps | Migration size |
| --- | --- | --- | --- |
| `mantra` | Four prompt workflows and one JSON-emitting hook | Workflows are legacy flat commands; product wording is Claude-specific | Medium |
| `memento` | Session rules, templates, JavaScript hooks, and skills | Duplicate/invalid skill layouts; Claude tool-name matchers; checkpoint output is not in the portable hook shape | Large |
| `onus` | Work-item guidance, scripts, shared runtime, and hook | Nine workflows are flat commands; init locates Claude's installed-plugin registry; config/cache paths and examples assume Claude | Large |
| `agent-artifex` | Six folder-based skills and local references | Skill names contain plugin namespace punctuation; some references escape the installed plugin; a Claude-only external skill is named | Small-to-medium |
| `comitatus` | The `herdr` skill already addresses Claude and Codex | Codex support is provisioned indirectly into the user's home; setup workflow edits Claude permissions only | Medium |
| `stilus` | Review methodology, voice guidance, and specialist prompts | Orchestration depends on Claude named agents; review and one agent have invalid YAML frontmatter; all paths and wording assume Claude | Large |

The initial per-plugin `claude plugin validate <plugin>` run found invalid YAML in two Stilus frontmatter descriptions because their unquoted scalar values contained colons. Those errors are fixed. The root `claude plugin validate .` command validates only the marketplace, so repository validation must run once for the marketplace and once for every plugin.

## Recommended structure

Keep each existing plugin directory as the distributable unit. Add the Codex manifest beside the Claude manifest and converge all substantive behavior under common root-level components.

```text
claude-domestique/
├── .claude-plugin/
│   └── marketplace.json             # shared catalog; Claude-native, Codex-compatible
├── scripts/
│   ├── bundle-shared.js
│   ├── bump-version.js              # updates both host manifests
│   └── validate-plugins.js           # validates shared invariants
├── shared/
│   └── index.js                     # source for bundled JS helpers
└── <plugin>/
    ├── .claude-plugin/
    │   └── plugin.json              # Claude metadata and optional Claude-only components
    ├── .codex-plugin/
    │   └── plugin.json              # Codex metadata; no duplicated workflows
    ├── skills/
    │   └── <skill>/
    │       ├── SKILL.md             # canonical workflow for both hosts
    │       ├── references/           # skill-local progressive disclosure
    │       ├── scripts/              # skill-local executables when appropriate
    │       └── assets/
    ├── hooks/
    │   ├── hooks.json               # shared default hook registration
    │   └── *.js                     # shared handlers with host normalization
    ├── references/                  # plugin-wide canonical guidance
    ├── templates/                   # shared templates
    ├── agents/                      # Claude-only thin wrappers, only where useful
    └── package.json
```

### Why this structure

- The installed plugin remains self-contained for both cache implementations.
- `skills/` and `hooks/hooks.json` are convention-based discovery points on both hosts.
- The Codex manifest can omit `hooks`; default discovery avoids the current local `plugin-creator` validator's stale rejection of the `hooks` manifest field while matching current OpenAI documentation.
- The two small manifests isolate host metadata without forking workflow prose.
- Existing marketplace URLs and package locations do not change.

Do not move the six plugins under a new `plugins/` directory in the first migration. That change would touch npm workspaces, documentation URLs, scripts, and marketplace sources without improving runtime sharing. Revisit only if a real Codex marketplace test proves the legacy-compatible catalog insufficient.

## Sharing rules

### One canonical workflow

Convert every flat `commands/<name>.md` file into `skills/<name>/SKILL.md`. Both hosts load that file. Do not keep a full command copy.

If an older Claude version must retain a flat command, generate or symlink a minimal wrapper that points to the canonical skill; never maintain two complete instruction bodies. Current Claude versions should use the skill directly.

Skill frontmatter names are local kebab-case names such as `assess` and `work-item-handler`. The plugin host supplies the plugin namespace. Remove values such as `agent-artifex:assess` and `memento:resume` from `name` fields.

**Rewrite the description when converting.** A command's `description` was help text for a workflow the user invoked by typing it. A skill's `description` is the trigger the model reads to decide whether to invoke it unprompted. Carrying the old text over leaves a skill that is simultaneously too vague to fire when wanted and broad enough to fire when not — and nine of the converted Onus skills take real actions (`commit`, `pr`, `close`, `create`, `update`).

Each converted description therefore states triggering conditions, not a summary of the workflow. Action skills require explicit user intent ("Use when the user asks to commit…") so that merely discussing an issue cannot invoke them; read-only skills (`status`, `fetch`, `validate-criteria`) may trigger on the question itself. `argument-hint` is preserved so the explicit `/onus:commit` path is unchanged.

### One canonical reference tree

All files a skill may load must live inside that plugin. Use paths relative to the selected `SKILL.md` or explicit plugin-root variables only where both hosts demonstrably substitute them.

Move canonical AI-service material needed by `agent-artifex` into its own `references/` tree. Repository documentation may link to the plugin-owned source, but the installed plugin must never rely on root-level `docs/`.

### One canonical hook implementation

Use the shared `hooks/hooks.json` when matcher semantics can be made portable. Normalize input and output in JavaScript:

- Recognize both Claude tool names (`Task`, `TodoWrite`, `EnterPlanMode`, `ExitPlanMode`) and Codex names or aliases (`Agent`, `spawn_agent`, `update_plan`, `apply_patch`).
- Match `Bash` at registration time and inspect `tool_input.command` inside the handler for `git commit`; Codex matchers filter tool names, not command text.
- Emit context as `hookSpecificOutput.additionalContext` with the matching `hookEventName`.
- Treat absent host-only fields as normal and preserve fail-open behavior.
- Use `CLAUDE_PLUGIN_ROOT` in hook commands because Claude provides it and Codex exposes it for compatibility.

Add a small shared hook-normalization module only after two plugins need the same normalization. Bundle it into each consuming plugin; never import `../shared` at runtime.

### Thin host adapters only

Host-only components are allowed when a shared primitive does not exist:

- Claude `agents/*.md` wrappers may delegate to canonical specialist skills.
- Installation and permission instructions may have separate Claude and Codex sections.
- Manifest presentation metadata may differ by host.
- A script may branch on an explicit host capability, but the domain logic stays shared.

## Data compatibility

Keep the existing `.claude/sessions`, `.claude/branches`, and `.claude/config.json` project contract for the first cross-model release. Although the name is host-specific, retaining it lets Claude and Codex collaborate on the same session and work-item state without a data migration.

Likewise, continue reading existing user cache locations before introducing any neutral replacement. If the project later adopts `.domestique/`, implement dual-read, new-location-write, and a documented migration period. Renaming storage is not required to achieve plugin portability.

## Plugin-specific design

### `mantra`

1. Move `assess`, `skeptic`, `troubleshoot`, and `make-rule` into canonical skill directories.
2. Keep the behavior hook shared; verify both session and prompt injection in direct hook fixtures.
3. Replace claims about Claude's personality with model-neutral behavioral goals where the model name is not material.
4. Retain project `.claude/rules` support as a backward-compatible user convention, not as a host capability claim.

### `memento`

1. Keep `skills/session`, `skills/session-manager`, and `skills/resume` as a deliberate set with distinct direct-management, lifecycle, and resumption triggers. The removed flat skill was superseded by the canonical `skills/session/SKILL.md` workflow.
2. Normalize checkpoint matchers and hook output as described above.
3. Add Codex event fixtures for `update_plan`, `Agent`/`spawn_agent`, `apply_patch`, and `Bash`.
4. Verify session creation under Codex sandbox approval rules; hooks must degrade cleanly when the workspace is read-only.
5. Preserve `.claude/sessions` so a branch can move between hosts.

### `onus`

1. Convert all nine commands into folder-based skills.
2. Replace the `~/.claude/plugins/installed_plugins.json` lookup in the init workflow with a portable bundled-script invocation. Prove the chosen plugin-root reference in both installed hosts.
3. Keep work-item domain guidance shared and change examples from `Claude:` to `Agent:` where no host distinction matters.
4. Test missing `gh`, authentication failures, read-only config, and existing `.claude/config.json` in both host fixtures.
5. Preserve the shared memento integration and existing cache fallback.

### `agent-artifex`

1. Change skill frontmatter names to local kebab-case names.
2. Rewrite cross-skill references to local names and portable relative paths.
3. Move or bundle every required external `docs/ai-services` reference into the plugin root.
4. Replace the hard dependency on `claude-api:mcp-builder` with capability-based guidance: use an installed MCP/plugin creation skill when present, otherwise continue with the local design workflow.

### `comitatus`

1. Add a Codex manifest that exposes the existing `herdr` skill directly. **Done.**
2. When running as a Codex plugin, use the installed skill rather than copying it into `~/.codex/skills`. **Done.**
3. ~~Retain Claude-side Codex provisioning temporarily for users who install only the Claude plugin, but mark it as a compatibility path~~ — **superseded: the provisioning path is removed outright.** Once comitatus is installable as a Codex plugin, a Claude-side hook writing into `$CODEX_HOME/skills/` has no remaining justification and two active hazards: it deletes the destination before swapping (`provisionInto`), and it creates a second, separately-versioned `herdr` skill alongside the real install. The hook now only **reports** whether comitatus is installed as a Codex plugin, in the status line (`(codex: installed)` / `(codex: not installed)`) and in the injected orientation, which also names `codex plugin add comitatus@claude-domestique`. Each host installs for itself.

   The `directCodex` guard that was meant to disable provisioning was derived from `process.env.PLUGIN_ROOT`, a variable neither host sets, so it never fired. Detection is now path-based — `isCodexInstall()` compares the plugin's own realpath against `$CODEX_HOME/plugins/cache` — and is still used to skip the Claude-only stable copy when comitatus *is* the Codex-installed copy.

   The one remaining write outside the plugin directory is `~/.claude/comitatus/`, which gives `herd.js` a version-independent absolute path for Claude's permission allowlist. That is Claude-side infrastructure, unrelated to cross-model support.
4. Split `herd-setup` into a shared explanation plus host-specific permission setup. Claude's settings allowlist must not be presented as Codex configuration.
5. Test direct Codex installation inside and outside `HERDR_ENV=1`.

### `stilus`

1. Fix invalid YAML frontmatter before structural migration.
2. Convert `review` and `deslop` into canonical skills.
3. Convert each review specialist's substantive prompt into a canonical skill or reference.
4. Keep Claude named-agent files as thin wrappers around those canonical specialist instructions.
5. Make the review orchestrator capability-aware: run specialists in parallel when the host offers subagents; otherwise execute the same three isolated review passes sequentially while preserving blind-summary isolation.
6. Support both project voice lookup conventions only if a Codex-native convention is documented and needed. Until then, keep `.claude/rules/voice.md` as the shared on-disk profile and describe it as a Stilus path.

## Manifest and marketplace strategy

Add `.codex-plugin/plugin.json` to all six existing plugin roots. Start with the smallest valid manifest:

- `name`, `version`, `description`
- `author`, `repository`, `homepage`, `license`, and keywords
- `skills: "./skills/"` when skills exist
- `interface` metadata required by the current Codex validator

Omit `hooks` because both hosts discover `hooks/hooks.json` by convention. Do not declare `apps` or `mcpServers` unless the corresponding files exist.

Keep `.claude-plugin/marketplace.json` as the single catalog for the first vertical slice because current Codex documentation explicitly recognizes it. Add a dedicated `.agents/plugins/marketplace.json` only if an installed test demonstrates that the legacy catalog cannot represent required Codex policy or UI metadata. If a second catalog becomes necessary, generate both catalogs from one checked-in metadata source rather than editing duplicate plugin lists.

Make versioning deterministic:

1. Ensure every plugin has a `package.json`, including `agent-artifex`.
2. Update `scripts/bump-version.js` to write the package version, Claude manifest, Codex manifest, and marketplace entry.
3. Add a validation test that all declared versions match.
4. Use normal semver for releases; use Codex cachebuster metadata only for local reinstall iteration, never as the published version.

## Delivery plan

### Phase 0: establish a clean baseline — complete

- Fix the two Stilus YAML errors.
- Remove or ignore generated coverage and platform artifacts from plugin validation inputs.
- Add strict Claude validation to CI and record all remaining warnings.
- Add a manifest/version consistency test.

**Exit:** strict Claude validation passes for the marketplace and each plugin, and all existing Jest suites pass.

### Phase 1: prove one vertical slice with `agent-artifex` — complete

- Add its package metadata and Codex manifest.
- Normalize skill names and references.
- Make every required reference self-contained.
- Install from the repository marketplace in Claude and Codex.
- Exercise one direct invocation and one description-triggered invocation in each host.

This plugin is the lowest-risk slice because it has no hooks or named agents. It proves marketplace discovery, dual manifests, skill naming, reference resolution, cache behavior, and version updates before hook complexity is introduced.

**Exit:** the same skill source works from fresh Claude and Codex sessions with no copied content.

### Phase 2: migrate shared skill packaging — complete

- Convert Mantra, Memento, and Onus flat commands to canonical folder skills.
- Remove duplicate Memento session workflows.
- Add Codex manifests for all three.
- Update user-facing docs with parallel install and invocation examples.

**Exit:** every non-Stilus workflow is discoverable on both hosts and command bodies have one source.

### Phase 3: normalize hooks — complete

- Add cross-host event fixtures to the existing Jest suites.
- Normalize context outputs and tool matching.
- Test read-only, malformed input, and absent optional-tool behavior.
- Document Codex's hook trust step.

**Exit:** Mantra, Memento, and Onus automation fires on both hosts without host-specific handler copies.

### Phase 4: migrate orchestration plugins — complete

- Make Comitatus a directly installable Codex plugin and demote home-directory copying to compatibility behavior.
- Refactor Stilus specialists into canonical instructions with thin Claude agent wrappers and a Codex-compatible orchestration path.
- Add capability-degraded sequential execution tests for Stilus.

**Exit:** both plugins preserve their core outcomes on both hosts; parallelism is an optimization, not a correctness requirement.

### Phase 5: distribution and documentation — complete

- Add a support matrix to the root README and each plugin README.
- Document Claude and Codex installation, update, uninstall, hook trust, and new-session requirements.
- Run fresh-cache installation tests for all six plugins.
- Bump each changed plugin once at the appropriate semver level.

**Exit:** a new user can install any plugin from either host using only repository documentation.

## Validation strategy

### Static validation

- `claude plugin validate . --strict`, followed by `claude plugin validate <plugin> --strict` for each plugin
- `python3 <plugin-creator>/scripts/validate_plugin.py <plugin>` for every Codex manifest
- A repository validator for:
  - manifest names matching directory names
  - strict semver and cross-file version equality
  - valid skill frontmatter and local kebab-case names
  - no required reference escaping its plugin root
  - no duplicate canonical workflow names
  - no `apps` or `mcpServers` declaration without its companion file

The bundled `plugin-creator` validator and current public documentation disagree about whether an explicit `hooks` manifest field is accepted. Default `hooks/hooks.json` discovery avoids that discrepancy. The Codex CLI has no standalone plugin-validation command, so CI pins the CLI version and installs every plugin that declares a Codex manifest in an isolated home.

### Deterministic behavior tests

- Feed representative Claude and Codex hook JSON directly to each handler.
- Assert context, block/reminder behavior, and fail-open handling.
- Test both tool naming schemes and missing optional fields.
- Run `npm test` and `npm run test:coverage`.

### Installed smoke tests

For each plugin and host:

1. Start from an empty plugin cache or a unique local version.
2. Add/refresh the marketplace and install the plugin.
3. Start a new session or thread.
4. Verify plugin inventory and skill discovery.
5. Invoke one representative workflow.
6. For hook plugins, review/trust hooks and verify one lifecycle event.
7. Uninstall and confirm no required shared source was external to the package.

### Parity acceptance matrix

| Capability | Claude | Codex | Required result |
| --- | --- | --- | --- |
| Install/list/update | Yes | Yes | Same plugin name and release version |
| Direct skill invocation | Yes | Yes | Equivalent workflow |
| Automatic skill triggering | Yes | Yes | Equivalent intent coverage |
| Session/prompt hooks | Yes | Yes | Equivalent injected guidance |
| Tool hooks | Yes | Yes | Equivalent reminders or decisions |
| Named specialists | Native agents | Generic subagents or sequential passes | Equivalent final review dimensions |
| Shared project state | `.claude/...` | `.claude/...` | Both hosts see the same branch/session data |

## Risks and mitigations

- **Codex plugin behavior is evolving.** Pin tested minimum host versions and validate against current official docs before each release.
- **Legacy marketplace compatibility may omit Codex UI policy.** Prove the single-catalog path in Phase 1; generate a Codex catalog only if necessary.
- **Hook matchers look compatible but differ semantically.** Keep registration broad and filter in tested JavaScript handlers.
- **Named-agent isolation may weaken on Codex.** Preserve the blind-review contract explicitly and test sequential fallback.
- **Cached installs hide changes.** Use semver for releases and the documented Codex cachebuster/reinstall loop only during local development; always test in a new thread.
- **Host-neutral renaming could break existing users.** Preserve current plugin names, skill intent, and `.claude` data locations through the first portable release.
- **Documentation can drift into two model-specific copies.** Keep one workflow document and isolate only commands, permission steps, and host limitations.

## Decisions to defer

- Publishing to either vendor's universal/public directory. First prove repository marketplace installation.
- Moving plugin directories under `plugins/`. Current locations are valid and moving them creates unrelated churn.
- Renaming `.claude` project/state directories. Compatibility and shared continuity are more valuable in the first release.
- Adding MCP servers or apps. None of the current workflows needs a server to achieve cross-model use.
- Exact feature parity for status-line UI. Behavioral parity matters; host UI presentation may differ.

## Definition of done

The migration is complete when all six plugins pass both manifest validators, install from a clean repository marketplace in both hosts, expose the same canonical skills, pass cross-host hook fixtures where applicable, keep all runtime dependencies inside each installed plugin, and document any intentional host-specific UX differences.
