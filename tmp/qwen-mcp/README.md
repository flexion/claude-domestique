# qwen-local — trial MCP adapter

A throwaway, not a plugin. It sits in `tmp/` on purpose: ned's finding was that
giving a guidance-only plugin a runtime changes what installing it *does*, so
nothing here has been put under `agent-artifex/` or any other plugin root.

Two tools. `ollama_models` lists what is actually installed, with tool-calling
capability. `ollama_generate` drafts code against a local model and labels the
result unverified.

## Running it

```bash
node tmp/qwen-mcp/smoke.js             # protocol + inventory + error path
node tmp/qwen-mcp/smoke.js --generate  # adds one real generation call
```

Registered for this project with:

```bash
claude mcp add qwen-local -- node <abs-path>/tmp/qwen-mcp/server.js
```

Remove it with `claude mcp remove qwen-local`. It writes to the project entry in
`~/.claude.json` and touches nothing in the repository.

Needs a running `ollama serve`. `OLLAMA_HOST` overrides the default loopback
address.

## Three decisions worth keeping if this ever becomes real

**Zero dependencies.** Claude Code installs a plugin's Node dependencies only
when the *plugin root* carries its own lockfile, and this workspace's lockfile
sits outside any copied plugin directory. Nothing to install sidesteps that
entirely, and it is why this is hand-rolled JSON-RPC rather than the MCP SDK.

**No hardcoded model tag.** `qwen3-coder:30b` is the tag the obvious
configuration names and it is not installed on this machine. A hardcoded tag
loads fine and fails on the first generation call. Instead the adapter resolves
against live inventory and, when a tag is missing, says what *is* installed.

**The tool description states the risk.** Probing found `qwen2.5:7b` and
`mistral:7b` both wrote confident, plausible, wrong code for the first-colon
rule in `comitatus/skills/herdr/scripts/up.js:64-70` — a spec that named the
trap and gave the worked example. The caller has to verify, so the description
says so and every draft is prefixed as unverified.

## What the smoke test is for

Neither validator catches a broken server. `scripts/validate-plugins.js` never
reads `mcpServers`, and `claude plugin validate --strict` accepted a fixture
whose command was a binary that does not exist. Pointing the adapter at a dead
port reproduces the gap in miniature: it starts, negotiates the protocol, and
lists both tools — then fails only at call time. Everything short of actually
calling a tool reports success.
