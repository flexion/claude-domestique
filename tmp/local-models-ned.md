# Mechanical local-model launch surface

Scope: the current `comitatus` launcher and the installed CLIs. I inspected
`herdr` 0.9.0, OpenCode 1.18.30, Claude Code 2.1.270, and Codex CLI 0.154.0.
I did not launch an agent or change an integration.

## A. What `--opencode <handle>:<model>` does today

For this command:

```text
node comitatus/skills/herdr/scripts/herd.js up \
  --branch chore/example \
  --opencode bob:ollama/qwen2.5:7b
```

the path is:

1. `up` recognizes `--opencode` and calls `makeAgent('opencode', value)`.
   The launcher defaults `--base` to `origin/main` and `--timeout` to 45,000
   ms (`comitatus/skills/herdr/scripts/up.js:131-153`).
2. `parseSelector` splits on the first colon. The result is handle `bob` and
   model `ollama/qwen2.5:7b`; the model character set permits the second colon
   (`comitatus/skills/herdr/scripts/up.js:58-103`).
3. OpenCode requires a model selector. The helper rejects `effort=` because
   the interactive OpenCode TUI has no corresponding option
   (`comitatus/skills/herdr/scripts/up.js:105-128`).
4. The OpenCode kind translates the model into the argv pair
   `-m ollama/qwen2.5:7b` (`comitatus/skills/herdr/scripts/up.js:19-47`).
5. `up` checks only whether the handle is already live, creates the worktree,
   and calls `launchAgent` for each requested agent
   (`comitatus/skills/herdr/scripts/up.js:246-306`). `launchAgent` creates a tab
   and issues the equivalent of:

   ```text
   herdr agent start bob --kind opencode --pane <pane> --timeout 45000 \
     -- -m ollama/qwen2.5:7b
   herdr agent wait bob --until idle --timeout 45000
   ```

   (`comitatus/skills/herdr/scripts/up.js:193-243`). `herdr agent start --help`
   identifies `opencode` as a supported kind and says success means that the
   expected interactive agent was detected in the pane and is ready for input.
6. OpenCode interprets `-m` as `provider/model`. For an `ollama/...` value it
   resolves the provider and endpoint from OpenCode, not from comitatus.
   Current OpenCode documentation says it discovers Ollama at
   `http://127.0.0.1:11434` and supports an alternate `baseURL` in OpenCode
   configuration: [OpenCode local-model documentation](https://opencode.ai/v2/docs/models#local).

The selector therefore reaches a local model only when OpenCode can resolve
that provider/model and the local server is available. Comitatus supplies the
model string and starts the TUI. It does not configure the endpoint, install or
start Ollama, pull a model, configure authentication, check API compatibility,
check context or tool-call support, or send an inference request. It also
cannot set an OpenCode variant or effort level. The returned `model` field is
the requested selector echoed from the launch object, not a query of the live
provider (`comitatus/skills/herdr/scripts/up.js:229-243`).

## B. Claude and Codex kinds

### Claude

The comitatus selector can pass only `--model` and `--effort` to Claude
(`comitatus/skills/herdr/scripts/up.js:19-27`). It has no endpoint selector or
generic argv passthrough. Unknown selector keys fail validation
(`comitatus/skills/herdr/scripts/up.js:74-101`).

Claude Code itself can target a local HTTP endpoint when its ambient
environment or settings define `ANTHROPIC_BASE_URL`; the helper-launched
process inherits that configuration. `--model` chooses the model at that
endpoint. Anthropic documents `ANTHROPIC_BASE_URL` as a proxy or gateway
override and states that changing it does not choose the model:
[environment variable reference](https://code.claude.com/docs/en/env-vars#environment-variables),
[model configuration](https://code.claude.com/docs/en/model-config#available-models).
Anthropic also states that routing Claude Code to non-Claude models through a
gateway is unsupported:
[gateway support boundary](https://code.claude.com/docs/en/llm-gateway).

Result: the `claude` kind can use a locally hosted Anthropic-format gateway
through ambient Claude configuration. `--claude <handle>:<model>` alone cannot
select a local endpoint, and a local non-Claude model is outside Anthropic's
supported surface.

### Codex

The comitatus selector can pass `--model` and the
`-c model_reasoning_effort=<level>` override
(`comitatus/skills/herdr/scripts/up.js:28-39`). It cannot express Codex's
`--oss`, `--local-provider`, `model_provider`, or `base_url` settings because
the selector accepts only `model`, `effort`, and the label-only `role`
(`comitatus/skills/herdr/scripts/up.js:53-62`,
`comitatus/skills/herdr/scripts/up.js:74-101`).

Codex itself supports local endpoints. The installed `codex --help` exposes
`--oss` and `--local-provider <lmstudio|ollama>`. Official OpenAI documentation
also defines `oss_provider`, `model_provider`, and
`model_providers.<id>.base_url`:
[Codex CLI reference](https://learn.chatgpt.com/docs/developer-commands?surface=cli),
[Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).

There are two mechanical routes today:

- Configure a local provider in user-level Codex configuration, then launch a
  bare `--codex <handle>` or add only the model selector. The helper deliberately
  inherits ambient Codex configuration
  (`comitatus/skills/herdr/SKILL.md:59-80`). Official documentation says
  project-local `.codex/config.toml` cannot override provider routing, so this
  must be machine/user configuration.
- Bypass the comitatus helper and use native herdr's argv tail, for example
  `herdr agent start ned --kind codex --pane <pane> -- --oss --local-provider ollama --model qwen2.5:7b`.
  Native `agent start` accepts arbitrary agent arguments, while the helper
  constructs only its fixed model/effort vector
  (`comitatus/skills/herdr/scripts/up.js:6-16`,
  `comitatus/skills/herdr/scripts/up.js:193-198`).

Result: the `codex` kind can use local Ollama, LM Studio, or a custom compatible
endpoint. The `--codex` convenience selector cannot choose the provider or
endpoint per pane.

## C. OpenCode operational failure modes

### Status integration and waits

`herdr integration status` currently reports:

```text
opencode: not installed
  (/Users/dpuglielli/.config/opencode/plugins/herdr-agent-state.js)
```

The repository says herdr ships the integration but does not activate it;
`herdr integration install opencode` installs it in the user's OpenCode plugin
directory. Without it, OpenCode status waits are unreliable
(`comitatus/skills/herdr/SKILL.md:343-348`). This is machine-level mutable
state outside the plugin and worktree. Neither `up` nor `agentCmd` checks its
status or installs it (`comitatus/skills/herdr/scripts/up.js:246-306`,
`comitatus/skills/herdr/scripts/herd.js:662-679`).

This matters during launch because `agent start` confirms interactive
readiness, then comitatus separately waits for exact state `idle`
(`comitatus/skills/herdr/scripts/up.js:210-230`). An absent or stale status
integration can leave a usable OpenCode TUI reported as `unknown` and make the
second command time out. If any launch throws, `up` has no rollback: it has
already created the worktree and at least one tab, and it closes the root shell
tab only after every agent launches (`comitatus/skills/herdr/scripts/up.js:291-306`).

### Timeout behavior

- `up` uses one per-agent timeout, 45 seconds by default, for both `agent start`
  and the later `wait --until idle` (`comitatus/skills/herdr/scripts/up.js:131-143`,
  `comitatus/skills/herdr/scripts/up.js:217-230`). One agent can therefore use
  roughly two timeout windows. Agents launch synchronously, so delays add
  across a mixed herd (`comitatus/skills/herdr/scripts/up.js:298-299`).
- A fresh tab that is not yet at a shell prompt is retried only for
  `agent_pane_busy`, for at most 10 seconds or the requested timeout, whichever
  is lower (`comitatus/skills/herdr/scripts/up.js:167-207`). Other start errors
  fail immediately.
- Helper sends use a hard 6-second `agent prompt --wait --until working`
  observation window (`comitatus/skills/herdr/scripts/herd.js:237-245`,
  `comitatus/skills/herdr/scripts/herd.js:278-309`). With unreliable status, a
  prompt can be submitted but reported only as `accepted`; the helper correctly
  treats a timeout or `agent_prompt_stalled` as unconfirmed submission and does
  not resend it.
- Completion waits are separate and fixed by helper defaults: 45 seconds for
  `wait`, 60 seconds for `send-wait-read`, and 120 seconds for `seed --wait`
  (`comitatus/skills/herdr/scripts/herd.js:55-80`,
  `comitatus/skills/herdr/scripts/herd.js:406-417`,
  `comitatus/skills/herdr/scripts/herd.js:533-550`). A slow local inference can
  exceed these even after launch succeeds.

The single `--timeout` on `up` covers process/readiness state only. It does not
bound or prove model loading and first-token latency.

### Model availability

No comitatus preflight checks the provider, daemon, or model. `parseSelector`
checks syntax and `makeAgent` checks only that OpenCode received a model string
(`comitatus/skills/herdr/scripts/up.js:58-128`). The sole `up` preflight queries
live herdr handles (`comitatus/skills/herdr/scripts/up.js:246-257`).

OpenCode exposes the missing inventory operation as
`opencode models [provider]`. On this machine, `opencode models ollama` returned:

```text
ollama/devstral:latest
ollama/qwen2.5:7b
ollama/qwen3:30b-32k
```

The command did not finish within the initial 30-second execution window. A
future preflight would need its own timeout and should run before worktree
creation. Even a catalog hit proves only that OpenCode discovered the model;
first inference is the check for loadability, context limits, and tool-call
behavior.

## Mechanical options for a later design

1. Add a read-only preflight before worktree creation: verify
   `herdr integration status`, provider reachability, and exact model inventory.
   Keep status-install mutation explicit rather than silently writing user
   configuration.
2. Give provider/endpoint selection its own typed surface. A generic argv string
   would bypass the current selector validation and make results hard to audit.
3. Separate shell readiness, agent-state readiness, inventory, and first-turn
   timeouts. They fail at different layers.
4. Return partial launch state on failure or clean it up explicitly. The current
   exception path strands the worktree/tabs that were created before the failing
   agent.

## D. MCP delegation shape

This topology is distributable, but it is a different product from a local
peer. Claude or Codex remains the agent and calls a narrow `generate` or
`search` tool. A bundled MCP adapter translates that tool call into Ollama's
HTTP API on `127.0.0.1:11434`; the local model never sees herdr and does not
need to select or invoke tools.

### No existing server in this marketplace

An exhaustive JSON parse of the root manifest plus every plugin's Claude and
Codex manifest found 15 manifests and zero `mcpServers` keys. No `.mcp.json`
exists in the worktree. Agent Artifex's MCP references are subject matter, not
a bundled service: its README calls it a suite of skills and describes the
same skills and references on both hosts (`agent-artifex/README.md:1-10`), its
documented tree contains only skills and references plus the two manifests
(`agent-artifex/README.md:120-161`), and its package has no dependencies or
runtime script (`agent-artifex/package.json:1-21`). Both complete host
manifests have no runtime registration: Claude's is metadata-only, while
Codex's adds a skills path and interface metadata
(`agent-artifex/.claude-plugin/plugin.json:1-21`,
`agent-artifex/.codex-plugin/plugin.json:1-41`).

The marketplace would ship a server placed under a plugin root because each
catalog entry points at that complete directory, including Agent Artifex at
`./agent-artifex` (`.claude-plugin/marketplace.json:7-50`). It would still be a
material scope change for Agent Artifex: installing a guidance-only plugin
would begin starting local code and reporting daemon failures. A separate,
optional local-delegation plugin keeps that runtime and its prerequisites out
of the current guidance product. Extending Agent Artifex is mechanically
possible, but has the larger surprise cost.

### Claude Code packaging and runtime boundary

Claude Code supports either a root `.mcp.json` or an inline `mcpServers` object
in `.claude-plugin/plugin.json`; it starts declared servers when the plugin is
enabled and exposes their tools to Claude
([Claude plugin MCP reference](https://code.claude.com/docs/en/plugins-reference#mcp-servers)).
For a bundled Node adapter, the normal declaration is a bare `node` command
with the script under `${CLAUDE_PLUGIN_ROOT}`. Claude expands that variable in
stdio `command`, `args`, and `env`, and provides `${CLAUDE_PLUGIN_DATA}` for
dependencies and caches
([Claude plugin path variables](https://code.claude.com/docs/en/plugins-reference#environment-variables)).

The distribution still has prerequisites:

- This repository targets Node 24 (`package.json:39-40`). A Node adapter can
  follow the existing CommonJS baseline, but the user's machine must expose an
  appropriate `node` executable. Agent Artifex's current package supplies no
  SDK and has no plugin-local lockfile (`agent-artifex/package.json:1-21`).
- For copied marketplace plugins, Claude installs Node dependencies only when
  the plugin root has `package.json` plus a supported npm or Bun lockfile. It
  uses `npm ci --ignore-scripts` or the Bun equivalent, stops after 60 seconds,
  and cannot build packages that require lifecycle scripts
  ([Claude dependency installation](https://code.claude.com/docs/en/plugins-reference#node-js-package-dependencies)).
  The root workspace lockfile is outside the copied Agent Artifex directory,
  so it does not satisfy this rule.
- Python is not automatically provisioned. A Python adapter either requires
  `python3` plus bundled pure-Python code, or uses a `SessionStart` hook to
  create a virtual environment under `${CLAUDE_PLUGIN_DATA}`. The latter adds
  an install-time network/package-manager failure path; Claude documents the
  persistent-data hook pattern for dependencies its automatic Node install
  cannot provide
  ([persistent plugin data](https://code.claude.com/docs/en/plugins-reference#persistent-data-directory)).
- The plugin can start the adapter, not Ollama. Ollama, the selected model, and
  any model files remain separately installed machine state. The adapter must
  turn connection refusal and `model not found` into short, actionable tool
  errors. The present `opencode models ollama` inventory contains
  `devstral:latest`, `qwen2.5:7b`, and `qwen3:30b-32k`, but not
  `qwen3-coder:30b`; hard-coding the latter therefore loads the MCP
  configuration successfully and fails on the first generation call.

Ollama's native HTTP API is not itself an MCP server. Pointing Claude directly
at port 11434 is insufficient unless another process exposes an MCP transport
there. A small stdio adapter is the lowest-distribution-cost shape because it
can call Ollama over loopback without opening another listening port.

### What validation proves

Two validators cover different layers. The repository command
`npm run validate:plugins` invokes `scripts/validate-plugins.js`
(`package.json:15-25`). That script reads both host manifests, checks names and
versions, then validates skills, prompt frontmatter, and hooks; it never reads
or validates `mcpServers` (`scripts/validate-plugins.js:335-423`). A new MCP
declaration could be invalid while this check remains green.

Claude's `plugin validate` does understand the component schema, but it is
static. In a temporary fixture, Claude Code 2.1.270 accepted under `--strict`
an inline stdio server whose command was `definitely-not-installed-ned`, whose
script path did not exist, and an HTTP server at an unused loopback port. Exit
was 0 with no warnings. A marketplace-root fixture did traverse its referenced
`plugin.json` and rejected a numeric `mcpServers` field. However, after the
manifest pointed to `./.mcp.json`, both marketplace-root and per-plugin strict
validation exited 0 with empty `contents` arrays even though the companion file
contained an invalid numeric `mcpServers`. Current validation therefore checks
the inline manifest field's schema but does not validate the companion MCP file
or close that gap through the repository's per-plugin loop. The documented
contract is syntax and schema validation, with `--strict` promoting warnings
to errors
([Claude validator reference](https://code.claude.com/docs/en/plugins-reference#plugin-validate));
actual initialization belongs in a fresh-session smoke test and `/mcp` or
debug output.

### Codex support and cross-host shape

Codex supports the same registration concept. The installed Codex 0.154.0 CLI
has `codex mcp add NAME (--url URL | -- COMMAND...)`, and OpenAI documents both
local stdio and streamable HTTP servers plus MCP servers supplied by installed
plugins
([Codex MCP reference](https://learn.chatgpt.com/docs/extend/mcp#plugin-provided-mcp-servers)).
The current Codex loader accepts a `mcpServers` object or a path, and otherwise
auto-discovers `.mcp.json`
([`codex-rs/core-plugins/src/loader.rs:1113-1129`](https://github.com/openai/codex/blob/main/codex-rs/core-plugins/src/loader.rs#L1113-L1129),
[`codex-rs/core-plugins/src/loader.rs:1535-1583`](https://github.com/openai/codex/blob/main/codex-rs/core-plugins/src/loader.rs#L1535-L1583)).
None of this repository's seven `.codex-plugin/plugin.json` files uses it.

The server implementation can be shared, but the safest registration is
host-specific inline configuration in the two manifests. Claude documents
`${CLAUDE_PLUGIN_ROOT}`; Codex's native plugin parser instead resolves a
relative `cwd` against the plugin root and then applies the ordinary MCP
configuration
([`codex-rs/codex-mcp/src/plugin_config.rs:243-299`](https://github.com/openai/codex/blob/main/codex-rs/codex-mcp/src/plugin_config.rs#L243-L299)).
One untested `.mcp.json` containing a host-specific path placeholder is not a
portable contract. Codex also provides no plugin-validation subcommand in
0.154.0, so its side needs an isolated install plus fresh-thread tool smoke
test rather than relying on Claude's validator.

### Feasibility, cost, privacy, and capability limit

This shape is feasible when installation can state three external facts:
supported Node or Python runtime, reachable Ollama daemon, and an actually
installed model chosen from live inventory. It reduces delegated inference
API charges, but Claude or Codex still incurs its normal tokens, selects what
context to send to the tool, and consumes the result. It also moves cost to
model downloads, disk, memory, power, and latency.

Privacy is narrower than "everything stays local." The Ollama request and
generation stay local, but the cloud agent can see the tool arguments and
result and may already have seen source context before calling it. A `search`
tool stays local only if its corpus and retrieval are local; giving the adapter
network access changes that claim.

Finally, this is not a capability workaround. It removes pane status, herd
protocol, and tool-calling demands from the weak model, but not reasoning
errors. Mae's probes found both `qwen2.5:7b` and `mistral:7b` confidently wrote
wrong code after misreading the explicitly documented first-colon selector
rule (`comitatus/skills/herdr/scripts/up.js:64-70`). Treat delegation as a
cost/privacy option whose outputs the primary agent must verify, not as a way
to make a weaker model reliable.
