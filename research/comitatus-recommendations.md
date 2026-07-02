# comitatus × herdr: first-principles review and recommendation

Written 2026-07-02 after full review of herdr docs + local 0.7.1 CLI verification (see `herdr-briefing.md`) and the plugin ecosystem (see `herdr-plugins-catalog.md`). Current comitatus at 0.4.2.

## Design constraints (from the operator, 2026-07-02 — FIRM)

1. **Simplicity above all.** The only current use case is seamless local terminal (hands-on-keyboard) agent-to-agent communication. Success = reduction in maintained code and friction. Functionality can always be added later; do not add any now.
2. **Heterogeneous co-equal agents.** Claude is not privileged: every change must be understandable and executable by any herd member (claude, codex, opencode, future types). The `herdr` binary is the one substrate all members share.
3. **Platform-agnostic.** herdr runs on Linux, macOS, and Windows; node is the scripting language *because* it is portable. No bash-isms in the protocol path (guards, `$(…)` threading, `< /dev/null` redirects are Unix-only). Shell out to `herdr`, never the raw socket (OS-specific transport).
4. **Local autonomy.** Eliminate permission prompts via tight per-harness allowlists of stable exact commands. No remote/phone approval channels.
5. **No additional plugins** (third-party or our own) unless they substantially reduce comitatus's maintained code. None currently qualify.

## What comitatus is today

| Piece | Lines | Role |
|---|---|---|
| `skills/herdr/scripts/herd.js` | 329 | stdin JSON extractors (pane/status/members/field/submit-keys) + composite verbs (wait/send/send-wait-read/agent) |
| `skills/herdr/scripts/up.js` | 112 | one-shot worktree + herd launcher |
| `hooks/herdr-orient.js` | 201 | SessionStart: stable-copy provisioning (~/.claude/comitatus, ~/.codex) + orientation injection |
| `scripts/herd-setup.js` | 120 | permission allowlist writer |
| `skills/herdr/SKILL.md` | 409 | concepts, recipes, from/to protocol, 20 gotchas |

## Root-cause analysis: why the bugs keep coming

The bug parade (stdin hang, `$H`-empty-evaluates-JSON-as-JS, submit-keys fallback bypass, codex swallowed-Enter, permission matcher blindness to `$H`) traces to **two design decisions** made when herdr's surface was smaller, both now obsolete:

**1. The stdin JSON pipe (`herdr agent list | node $H <verb>`).**
Built so herd.js could be a pure extractor. Costs so far: the readStdin hang class, the mandatory `: "${H:?…}"` guard liturgy, un-allowlistable pipes, the submit-keys fallback bug, Unix-only shell ceremony, and ~80 lines of SKILL.md. What it saves: one ~30ms `herdr agent list` subprocess.
herdr resolves handles natively now (verified, 0.7.1): `agent get|send|read|wait <handle>` all work by name. The pipe optimizes a subprocess that mostly doesn't need to exist.

**2. Blind type-then-Enter submission, verified by client-side status polling.**
`submitWithVerify` is ~50 lines of retry/poll (3×4×750ms sleeps) because a blind Enter races the recipient TUI's ingest. herdr has deterministic primitives for both halves: `herdr wait output <pane> --match <fragment>` blocks until the text is visibly in the composer (ingest confirmed → Enter cannot be swallowed), and `herdr agent wait <handle> --status working` is a server-side blocking wait for the turn start. The retry loop becomes two waits.
Known limitation to document (not build around): two agents sending to the same recipient concurrently can interleave keystrokes in one composer. Note it in SKILL.md ("one sender at a time per recipient; the reply confirms delivery"); solve it only if it bites.

Finding that held up under scrutiny: **the from/to protocol itself is sound.** Agents perceive only their pane; herdr has no inbox; typed delivery is the only channel. Every failure has been submit mechanics and helper plumbing. Keep the protocol; fix the delivery.

## The recommendation: one change set, three files-worth of deletion

### JS changes

1. **Delete stdin reading wholesale.** Every verb self-fetches (`loadAgentList` already can). This deletes `readStdin`, `STDIN_VERBS`, the JSON-parse error path, and the `pane` and `field` public verbs. The hang-bug class becomes structurally impossible — including the fix we just shipped for it.
2. **Public surface shrinks to** `status`, `members`, `wait` (comma-status OR — native lacks it), `send`, `send-wait-read`, `agent`, `up`. `submit-keys` goes internal to `send`.
3. **Deterministic send** (replaces submitWithVerify's poll/retry): `agent get <handle>` → `agent send <handle> <body>` → `herdr wait output <pane> --match <tail-fragment> --source recent-unwrapped` → `pane send-keys <pane> Enter[ Enter]` → `herdr agent wait <handle> --status working` (short timeout; `agent get` fast-turn fallback). All child-process calls to `herdr` — portable, testable with the existing deps-injection pattern.
4. **`agent` verb on `herdr agent start`** (pane+run+name in one command, replacing run→wait→rename) — only if the placement spike (below) confirms `--tab` gives tab-per-agent grouping; otherwise keep the current sequence, just stdin-free.
5. **No changes to up.js** (already stdin-free and the highest-value prompt-collapser) and **no changes to herdr-orient.js provisioning** (the stable path is still how both harnesses find the helper; replacing it is deferred work, not simplification today). The orientation *text* shrinks: no `H=` capture, no guard, no pipe warning — just the stable path and the verb list.

Estimated: herd.js 329 → ~180 lines, and the 110-test suite mostly carries over since surviving verbs keep their contracts.

### SKILL.md changes (409 → ~250)

- Delete: the `hsend` wrapper, all manual pipe recipes, every `$H`-guard/`H=` gotcha, the `< /dev/null` workaround note, the submit-keys/pane-resolution plumbing examples.
- Rewrite rule: **native `herdr` verbs by handle first** (`agent send/read/wait/get`), helper only for `send`/`up`/comma-waits/roster.
- Add one line: one sender at a time per recipient (interleave limitation).

### settings.json / herd-setup changes

- Fewer baked helper rules (send, send-wait-read, agent, up — status/members/wait become rare or native).
- Drop `Bash(sleep:*)` (no more client-side poll sleeps).
- Keep `pane run`/`send-keys` **out** of the allowlist (unchanged injection posture — the tight list is the point).
- **Per-harness authorization becomes part of member seeding** (constraint 2): `/herd-setup` covers Claude's settings.json only. Document the equivalent allowlist recipe for codex and opencode config formats, authorizing the same command set. An agent that prompts mid-protocol stalls the herd; pre-authorization is seeding, not an afterthought.

### Spike results (run live 2026-07-02 against herdr 0.7.1 — all questions answered)

1. **Composer ingest detection: YES.** `herdr wait output <pane> --match <fragment> --source recent-unwrapped` matched text sitting unsubmitted in a live codex composer in **115ms** (also present in `--source visible`). The full deterministic send was then validated end-to-end against jay: `agent send` → `wait output` (115ms) → `send-keys Enter Enter` → `agent wait --status working` (219ms, and it emits the `pane.agent_status_changed` event JSON). Total ~350ms, zero polling, zero retries, submit landed first try. This replaces `submitWithVerify` outright.
2. **`agent start` placement: splits, never creates its own tab.** With `--tab <id>` it adds a second pane beside the tab's root; without `--tab` it splits the currently active tab (unacceptable). But the winning shape is **3 calls with no wait**: `tab create` → `agent start <handle> --tab <id> --cwd … --no-focus -- <argv>` (name assigned instantly, survives detection — verified `agent get` shows name+type+idle) → `pane close <root>` (tab survives with the agent as its only pane). That beats the current 4-call sequence (tab create → pane run → wait idle, up to 45s → rename) on both simplicity and latency. herdr rejects duplicate handles at `agent start` (`agent_name_taken`), so the only preflight still needed is up.js's fail-before-worktree-create check.
3. **Preview channel: no native `agent send --submit`** in preview docs or blog. Preview does mention CLI events commands (irrelevant now; useful only for the deferred store-and-forward). The deterministic send stands as our design.

## Explicitly deferred (recorded so we stop re-litigating them)

- Packaging the helper as a herdr plugin (would eventually delete the 201-line provisioning hook, but adds a distribution mechanism now — revisit only if provisioning causes real friction).
- Store-and-forward / deliver-on-idle messaging (solves the interleave race and `submitted:false`; build only if the deterministic send proves insufficient in practice).
- All third-party plugins (catalog kept in `herdr-plugins-catalog.md` for reference; none reduce comitatus code).
