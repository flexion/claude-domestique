# Vernaculus

Delegating well-specified coding work to a locally hosted model, over MCP.

*Vernaculus* — Latin, "domestic, native, of the household". The model runs on
your machine.

Three tools (`ollama_models`, `ollama_generate`, `ollama_refine`) and one skill
that says how to use them. The skill matters more than the tools: measured on
three real functions from this repository, cold single-shot delegation solved
**1 of 3**, and the same model solved **3 of 3** once the caller read the failing
draft and sent back a diagnosis naming the cause.

## Requirements

A running `ollama serve` and at least one installed model. The plugin can start
its adapter; it cannot start Ollama. `OLLAMA_HOST` overrides the default
loopback address.

## Registering it

The plugin declares its own server, so installing it is enough. Each host reads
the declaration from its own manifest: `.claude-plugin/plugin.json` for Claude
Code, `.codex-plugin/plugin.json` for Codex. Nothing to add by hand, and the
path survives a plugin upgrade.

The two manifests carry different path forms, and they are not interchangeable.
Claude Code requires `${CLAUDE_PLUGIN_ROOT}`; handed a relative `args` plus
`cwd` it fails to connect outright. Codex's plugin loader does the opposite: it
does not expand that token, and resolves a relative `cwd` against the plugin
root. There is deliberately no `.mcp.json` at the plugin root - Codex's loader
falls back to discovering one when its manifest declares no server, and a
Claude-shaped file is exactly what it must not find.

Declaring it means the server process starts with the host, so the cost of
installing this plugin without Ollama is three tool definitions in every
session's context. It is not a daemon failure: the adapter contacts Ollama only
inside a tool call, so an unused server on a machine with no daemon does
nothing. Disable it in the host if the context is worth more than the option.

**A manually registered server of the same name masks the declared one.** Observed
on both hosts: with a `vernaculus` entry in Claude's config or in Codex's
`mcp_servers`, the plugin's own server does not appear at all - not as a
conflict, just absent. If you registered it by hand before this plugin declared
it, remove that entry (`claude mcp remove vernaculus`, or delete the
`mcp_servers.vernaculus` block from `~/.codex/config.toml`).

To run it from somewhere else - another MCP client, or a checkout rather than an
install - register it manually:

```bash
claude mcp add vernaculus -- node <abs-path>/vernaculus/mcp/server.js
```

Codex uses `codex mcp add` with the same command vector. Remove with
`claude mcp remove vernaculus`.

Two ways a manual registration goes wrong, both observed:

**The script path gets dropped**, leaving `command: node` with empty `args`.
Bare `node` is a REPL: it reads stdin, answers no JSON-RPC, and the host waits
out its full handshake timeout before reporting `connection timed out`. The
error names the server, so it reads like a fault in `server.js` when the server
was never started. Confirm what was actually stored - `claude mcp list` prints
the whole command vector, and `node ` with nothing after it is the bug.

**The path points into a git worktree, or into a versioned plugin cache.**
Registration is keyed by the main repository path even when added from a
worktree, so the entry outlives the worktree that satisfied it. A plugin cache
directory carries the version or a content hash, so a hand-registered path there
breaks on the next upgrade. Both are reasons to prefer the declaration above.

## Verifying it works

Neither validator catches a broken MCP server. `scripts/validate-plugins.js`
never reads `mcpServers`, and `claude plugin validate --strict` has been observed
accepting a fixture whose stdio command was a binary that does not exist — exit
0, no warnings. **The smoke test is the acceptance criterion**, because it drives
a real server over real stdio:

```bash
npm run smoke              # protocol, schemas, inventory, every error path
npm run smoke:generate     # adds a real generation and a refine round-trip
```

`npm test` runs the unit suite, which needs no daemon.

Checking the declared server from a non-interactive `codex exec` needs
`--approve-for-me` or an equivalent MCP approval policy. The default policy
refuses to dispatch the call - "requires approval, but approval policy is
never" - which reads as a broken server when nothing was ever dispatched.

A further trap worth knowing: `claude mcp list` reporting `✔ Connected` means a
live process, not current code. An MCP server edited on disk keeps serving the
old tool definitions until the host restarts it — observed at nearly three hours
stale, with the host still handing out superseded schemas.

## Observability

Successful `ollama_generate` and `ollama_refine` results include a nested
`telemetry` object in `structuredContent`. `call`, `round`, and `done_reason`
identify the generation; `timing_ms` reports wall-clock and Ollama phase
durations in milliseconds; and `input_tokens_estimate` separates rough input
estimates for `spec`, `inline_context`, `files`, `history`, and `diagnosis`,
plus their `total`.

The input figures are estimates (`ceil(characters / 3.6)`), useful for locating
prompt growth rather than accounting. `prompt_tokens` and `output_tokens` are
the authoritative counts returned by Ollama. `model_digest` identifies the
weights that ran and must be retained with any measurement because a model tag
can change underneath it. `telemetry.digest_changed_from` appears only on a
refinement that accepted a mid-session weight change (below), and its absence is
the ordinary case. Claude/Codex cost and correctness remain outside MCP
visibility: this server observes only its local Ollama call, and every draft
still requires independent verification.

## Design notes

Each of these exists because the obvious alternative was measured and failed.

**Context goes by path, not by paste.** `files: ["src/a.js", "src/b.js:40-120"]`
is read locally. Pasting the same source into `inline_context` spends the
caller's *output* tokens to resend what is already on disk — measured at 24x the
cost of not delegating at all. Via `files`, 11,850 tokens of context cost the
caller ~90 output tokens.

**Oversized prompts are refused, never trimmed.** The server sends
`truncate: false` and `shift: false`. Without them Ollama retains
`C - max(floor((C-K)/2),1)` tokens, keeps the head and tail, drops the middle,
and reports nothing — leaving a starved model indistinguishable from an
incapable one. (Ollama v0.34.0: `llm/llama_server.go:279-330`, warning at `:317`;
message-level pruning at `server/prompt.go:76-77`.)

**`num_ctx` is always explicit.** Ollama's default is chosen by detected VRAM —
`<23 GiB → 4096`, `≥23 GiB → 32768`, `≥47 GiB → 262144`
(`server/routes.go:2062-2072`) — so a brief that fits on one machine silently
overflows on another.

**The model default is resolved from live inventory.** A hardcoded preference
list went stale the instant a better model was pulled: `qwen3-coder:30b` was
installed and absent from the list, so every default call got the
general-instruct tag that measured worst.

**A refinement runs against the weights its session started on.** Ollama tags are
mutable pointers, so `ollama pull` can replace a model underneath a live session
and leave a history whose earlier turns came from different weights. By default
`ollama_refine` refuses such a session outright, before inference, and says to
start again with `ollama_generate`. A caller who re-pulled the tag on purpose can
pass `allow_digest_change: true` to continue against the currently installed
weights; the result then reports the **new** digest as `model_digest` and the one
the session began with as `telemetry.digest_changed_from`, so the change is a
field rather than a footnote. The flag does not soften anything else: a model
that is no longer installed at all is refused whatever it is set to.

**`node:http`, not `fetch`.** A non-streaming 30B generation outlives undici's
300-second header timeout and surfaces as a bare `fetch failed` — indistinguishable
from the model returning nothing.

**Every result is structured.** Declared output schemas, with `code` already
extracted, plus `prompt_tokens`, `truncated`, `model_digest` and the context
budget as fields rather than prose. Ollama tags are mutable pointers, so a
measurement without the digest is undated.

## Layout

```
vernaculus/
├── mcp/
│   ├── server.js     zero-dependency stdio adapter
│   └── smoke.js      drives a real server over real stdio
├── skills/
│   └── delegate-to-local-model/
├── references/       measurements and the options considered
└── __tests__/
```

Zero runtime dependencies, deliberately. Claude Code installs a plugin's Node
dependencies only when the *plugin root* carries its own lockfile, and this
repository's lockfile sits at the workspace root, outside any copied plugin
directory. Nothing to install sidesteps that entirely — which is why the adapter
is hand-rolled JSON-RPC rather than the MCP SDK.

## What this is not

Not a way to make a weak model reliable. Agentic competence and generation
competence do not rank models the same way, and delegation does not rescue
either. It is a cost-and-locality option whose outputs the calling agent must
verify — `verified` is always `false`, and a passing test suite has been observed
to be necessary and not sufficient.

See `references/local-model-delegation-findings.md` for the measurements, and
`references/launch-surface.md` for the peer-agent topology this deliberately is
not.
