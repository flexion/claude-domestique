# Local model integration — findings and options

Exploratory. Nothing here is implemented. Mechanical launch-surface detail is in
[`launch-surface.md`](launch-surface.md) and is not repeated.

## The question has two different shapes

The repository currently contemplates exactly one: a local model as a **peer** —
an agent in a herdr pane, driving a TUI, calling tools, participating in the
messaging protocol. That is what `--opencode <handle>:ollama/...` builds.

A second shape exists: the local model as a **subordinate** — a tool Claude
calls (an MCP server over `localhost:11434`) that generates or searches and has
no agency at all. It never emits a tool call, never sees the herd protocol,
never knows it is in a run.

These are not variations on one feature. They have different failure modes,
different distribution artifacts, and different reasons to want them. Most of
what follows is about telling them apart.

## What was measured

Six models already cached on this machine, driven through Ollama's
`/api/chat`. Two tasks.

**Task A — protocol.** The herd seed preamble (handle, roster, the "run this as
a real shell command, never print it" rule, the one-line rule) as system prompt,
a `bash` function tool exposed, and an incoming `reply` message to answer.

**Task B — generation.** Write `parseSelector(spec)`, splitting on the first
colon only so that `bob:ollama/qwen2.5:7b` yields model `ollama/qwen2.5:7b`. The
prompt states the rule and gives that worked example. This is not a synthetic
task: it is `comitatus/skills/herdr/scripts/up.js:66`, which exists with a
comment explaining the same trap, so the repository supplies ground truth.

| model | Task A — protocol | Task B — generation |
| --- | --- | --- |
| `qwen3:30b-32k` | correct, 5/5 | correct |
| `devstral:latest` | 1/3 called the tool, and that one dropped `--reply`; 2/3 answered in prose | correct |
| `qwen2.5:7b` | empty response — no tool call, no content | wrong |
| `mistral:7b` | printed the tool call as text; `\n` inside the message body | wrong |
| `llama3.2:3b` | tool call with `<handle>` left unsubstituted, garbled body, `--fyi` for a `reply` | not run |
| `deepseek-coder-v2:16b` | `does not support tools` | not run |

Sample sizes are small — 5 trials for `qwen3` and 3 for `devstral` on Task A,
single trials elsewhere. The point is the shape of the failures, not a ranking.

## Every Task A failure is one the protocol already names as a hazard

`reference/protocol.md` is a list of the ways this goes wrong. The local models
reproduced them without being prompted toward any of them:

- `mistral` printed the command instead of running it — the thing the seed
  preamble puts in capitals — *and* put a newline in the body, which
  `protocol.md:9-14` and the seed line itself warn truncates the message at
  submission. One response, both hazards.
- `qwen2.5` returned nothing at all. This is the expensive one. A `reply` is the
  protocol's only end-to-end evidence that a recipient processed a message
  (`protocol.md:16-21`), so an agent that silently never answers is
  indistinguishable from one that is still thinking. The sender's correct
  behaviour is to not resend, and the run stalls.
- `llama3.2` sent to the literal string `<handle>`, which the helper rejects
  with `herd: no agent: <handle>` — a loud failure, and therefore the best of
  them.
- `devstral` is the worst kind: it worked once in three. Intermittent protocol
  compliance is harder to detect than uniform failure and will survive a smoke
  test.

A separate full-stack check — `opencode run -m ollama/qwen2.5:7b` in a neutral
temp directory, given the same seed — produced zero output in fifteen minutes
before being killed, consistent with the empty API response.

## But delegation is not the escape hatch it looks like

The obvious reading of Task A is "stop asking weak models to be agents; call
them as tools instead." Task B is the check on that, and it does not hold.

On a task whose spec **named the trap and gave the worked example**, `qwen2.5`
split on every colon and threw an error on the very input the prompt supplied,
then explained its reasoning confidently. `mistral` never split at all — its
`model` regex was `/.*/` against the whole string, so the handle was included in
the model. Both produced plausible, well-formatted, wrong code.

So the failures are **orthogonal, not tiered**. Agentic competence and
generation competence do not rank these models the same way — `devstral` is a
good coder and an unreliable agent — but no model in this set is a bad agent and
a good coder *in a way that delegation rescues*. The tier that can write code
for this repository is roughly the tier that can hold the protocol.

That matters for the subordinate design, because its safety rests entirely on
one instruction: never accept the output as-is, review and test it. Task B is
precisely the case where that review is the whole job — the bug is subtle, it
defeats the rule the spec emphasized, and catching it requires understanding the
requirement as well as the generator was supposed to. The delegation saves
generation tokens and spends review tokens, and carries a wrong-code risk that
lands on the reviewer.

## Context is a hard ceiling, and this repository is heavy

`qwen3:30b-32k` is Qwen3 30B-A3B MoE at Q4_K_M. Its architecture allows 262144
tokens; the local tag pins `num_ctx` to **32768**, which is the practical figure
on this hardware, not an arbitrary one.

Against that budget, `comitatus/skills/herdr/SKILL.md` is about 8k tokens and is
*auto-injected* whenever `HERDR_ENV=1` (`comitatus/hooks/herdr-orient.js:180`).
A fan-out participant loads `fan-out/SKILL.md` and a role file on top. A peer
local model therefore spends something like a quarter to a third of its window
on orientation before it reads a single repository file — and the fan-out
orchestrator role is explicitly written as a loop that *survives compaction*
(`comitatus/skills/fan-out/roles/orchestrator.md:13-33`), which assumes a model
that can be compacted and resume, not one that ran out of room.

Note also that `qwen3:30b-32k` is the base Qwen3 instruct tag, not Qwen3-Coder.
There is no `qwen3-coder:30b` on this machine, so any config naming that tag
would fail at first call.

## What the plugins would need

Beyond the launcher gaps in `launch-surface.md`:

- **There is no third-host manifest.** `scripts/validate-plugins.js:361-398`
  hard-requires `.claude-plugin/plugin.json` *and* `.codex-plugin/plugin.json`
  and recognizes nothing else. Every "opencode" mention in the repository is a
  herd member, never a host.
- **`scripts/probe-skill.js` silently mis-targets.** `:254` dispatches on
  `host === 'codex'` and falls through to spawning the `claude` binary for any
  other value. A third host needs a new runner *and* a new transcript parser —
  and since a local model has neither Claude's `Skill` tool nor Codex's habit of
  shell-reading `SKILL.md`, both existing detectors would report a false
  negative, the failure `docs/plugin-evaluation.md:102-106` calls worse than no
  harness.
- **Hooks are a Claude Code contract wholesale.** All four hook-bearing plugins
  use Claude event names, `${CLAUDE_PLUGIN_ROOT}`, and stdin-JSON/stdout-JSON.
  `memento/hooks/hooks.json` matches literal tool names from the two known hosts
  (`Task|TodoWrite|Agent|spawn_agent|...`); a host naming its tools anything
  else never fires memento at all, silently.
- **`mantra` needs the web.** Its injected behavior block demands documented
  examples and forbids guessing from training data — unavailable to a bare
  Ollama host.
- **One cheap opening exists.** The local opencode config already carries a
  `skills.paths` entry, so opencode reads SKILL.md directories natively. Pointing
  it at `<plugin>/skills` distributes the prompt-only plugins to a third host
  with no new manifest — though it distributes none of the hooks.

And if the subordinate shape is pursued, two more (ned's section D):

- **Nothing here ships an MCP server today.** Zero `mcpServers` keys across all
  fifteen host manifests, and no `.mcp.json`. `agent-artifex` discusses MCP as
  subject matter and has no runtime; adding one would change what installing it
  *does* — a guidance-only plugin would start local code and report daemon
  failures. That argues for a separate optional plugin over extending
  `agent-artifex`.
- **An MCP declaration can be broken and still validate green.** This is the
  finding to act on. `scripts/validate-plugins.js:335-423` never reads
  `mcpServers` at all. And Claude Code's own `plugin validate --strict` accepted
  a fixture whose stdio command was a binary that does not exist and whose
  script path did not exist — exit 0, no warnings — then, once the manifest
  pointed at a companion `./.mcp.json`, skipped that file entirely even though
  it contained an invalid numeric `mcpServers`. Both validators would pass a
  server that cannot start. Verification has to be a fresh-session smoke test,
  the same lesson `AGENTS.md` already records about skills that validate but
  never fire.

## Options

**1. Do nothing beyond a preflight.** Keep local models as peers, accept that
they work at the 30B tier and fail below it, and spend the effort on making the
failure loud: check daemon reachability, model inventory, and tool-call support
before `up` creates a worktree, and fail the launch rather than parking a mute
agent in a pane. This is the smallest change and it addresses the failure that
actually costs the most — the silent one. Ned's option 1 is the mechanical form
of this.

**2. Typed provider/endpoint selection.** Give the selector a real surface for
`--oss`/`--local-provider`/`base_url` so the `codex` kind can be pointed at a
local endpoint per pane rather than only through machine-level config, and so
the choice is auditable. Moderate work, no new topology.

**3. Subordinate delegation via MCP.** A separate artifact, not a herdr feature:
a small stdio adapter exposing generation and symbol search over
`localhost:11434`. Ollama's HTTP API is not itself MCP, so pointing a host at
port 11434 does nothing — something has to speak the transport.

Feasible, and distributable on both hosts (`codex mcp add` exists; none of the
seven Codex manifests use it). Three constraints shape it: Claude installs a
plugin's Node dependencies only when the *plugin root* has its own lockfile, and
this workspace's lockfile sits outside any copied plugin directory — so the
adapter wants zero dependencies or its own lockfile. Python is not provisioned
at all. And the plugin can start the adapter but not Ollama, so connection
refusal and `model not found` have to become short actionable tool errors rather
than stack traces.

Justified by *token cost and privacy*, not by rescuing weak models — Task B says
it does not do that. Both of those are narrower than they sound: the orchestrator
still pays its own tokens to choose the context and consume the result, and
"stays local" covers the generation but not the tool arguments and results, which
the cloud agent sees. If pursued, the symbol-index half (ctags/ripgrep, no model)
is worth separating out — it is deterministic, instantly useful, and not
local-model integration at all.

**4. Third-host distribution for prompt-only plugins.** Point opencode's
`skills.paths` at the skill directories, teach `validate-plugins.js` a third
manifest kind, extend `probe-skill.js`. Largest surface, and it only pays off if
someone actually wants to run these plugins on a non-Claude, non-Codex host.

## Recommendation

Options 1 and 2 are the ones the evidence supports. The measured problem is not
that local models cannot participate — `qwen3:30b-32k` did, 5 for 5 — it is that
when they cannot, nothing says so, and the run discovers it as a stall. That is
a preflight and a timeout-layering problem, and it is worth fixing whether or
not anything else here is.

Option 3 should not be sold as a way to use smaller models. If it is wanted, it
is wanted for cost or for keeping code off a vendor's servers, and the review
burden it creates should be stated in whatever policy accompanies it. Whatever
ships needs a fresh-session smoke test as its acceptance criterion, because
neither validator catches a server that cannot start.

There is a theme across 1 and 3. Both failures this exploration actually
measured are *silent*: an agent that never replies looks like an agent still
thinking, and an MCP server that cannot start validates green. The repository
already knows this shape — `AGENTS.md` says every static check it runs is static,
and a skill that passes all of them may never fire. Local-model support adds two
more places where passing checks means nothing, and the work worth doing is
making both of them say so.

Option 4 needs a stated user before it needs a design.

## Open questions for the operator

- Is the goal token cost, privacy, parallelism, or offline capability? Each
  picks a different option above, and they are being conflated.
- Should the subordinate/MCP shape live in this repository at all, or is it a
  separate artifact that merely gets mentioned in `agent-artifex`?
- `.pipeline/` does not exist on main. These notes are in `tmp/`; say where they
  should end up.
