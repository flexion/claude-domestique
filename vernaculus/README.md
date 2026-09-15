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

Installing this plugin does **not** start anything. That is deliberate: a plugin
that silently starts local code and reports daemon failures is a surprise for
anyone who does not run Ollama. Register the server explicitly:

```bash
claude mcp add vernaculus -- node <abs-path>/vernaculus/mcp/server.js
```

Codex uses `codex mcp add` with the same command vector. Remove with
`claude mcp remove vernaculus`.

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

A further trap worth knowing: `claude mcp list` reporting `✔ Connected` means a
live process, not current code. An MCP server edited on disk keeps serving the
old tool definitions until the host restarts it — observed at nearly three hours
stale, with the host still handing out superseded schemas.

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
