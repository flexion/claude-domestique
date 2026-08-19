# Fixture Observations (pre-trial)

Observations about the trial fixture (`claude-domestique`) recorded **before** the blind ledger runs. Everything here is **known in advance and therefore non-gating**: it cannot later be counted as something the blind ledger surfaced that the incumbents missed. Same treatment already applied to the `agnix`/`ctxlint` contamination.

Recording these rather than acting on them. Acting first would destroy them as trial evidence.

---

## OBS-1: Retention failure — content persisted on disk, recall did not

**Defect shape, named carefully.** Call this a **retention/adherence failure**, not a placement failure. Placement is *one candidate remedy*; naming the shape after a remedy would presuppose the answer, which is the error this note exists to avoid.

**What is observed versus what is inferred — and the distinction changes the remedy.** Observed: the content persisted on disk, and recall of it failed at a later turn. **Not observed:** whether that content was absent from model context at the recall turn, or present and not retrieved. No runtime trace was captured at that turn, so availability and provenance are `UNK`.

This is not a technicality. If the content was **absent**, re-injection is the indicated remedy. If it was **present but not retrieved**, re-injection may do nothing, and emphasis, positioning, or enforcement would be indicated instead. Asserting absence would select a remedy the evidence does not support. Resolving it requires a trace at the failing turn — `/context`, `InstructionsLoaded`, or an assembled-request capture — not another recall test.

**Axis note, to keep two things separate.** This is a new *defect shape* on the detection axis. It is **not** a fourth finding class alongside Correction, Retirement, and Enhancement — those are the remedy axis. A retention failure is detected as a defect shape and, if remediated, would be emitted as an **Enhancement**.

**Observation.** This repository keeps per-branch session notes under `.claude/sessions/`, carrying a `Goal` section and accumulated key decisions. The file persists correctly and is committed.

**The mechanism is not absent — it is by reference rather than by value.** `memento/hooks/session-startup.js` injects the session **path** plus a read-first instruction (`Session found: <path>` / `Read the session file to restore context.`), and the resume skill reads `Goal` on demand. Neither injects `Goal` **contents**. That distinction is the crux: a pointer requires an act of compliance to become context, whereas injected content is present regardless. An instruction to read something is itself context subject to the same decay as anything else.

**Observed consequence.** Across an extended multi-day session, two agents on different model families were independently asked to recall the project's original goal from memory. Both retained the initial framing and the single most emphatic correction. Both lost the same class of content: goals stated *later*, after the framing was established. Three later-stated goals were absent from the recall of at least one agent. The session file containing them was unchanged and available on disk throughout.

**Evidence strength.** N=2 agents across two model families. That supports a **local repeatable observation** — the same decay class reproduced independently on the same fixture — and says nothing about general prevalence. It is not a survey result and must not be cited as one.

**Why it is a distinct shape.** It is not covered by the five existing defect classes: nothing here is duplicated, stale, contradictory, or unnecessarily loaded. The content is correct, current, singular, and warranted — and it still failed to govern behaviour at the moment it was needed. The existing classes all describe content that should not be there or should be somewhere else; this one describes correct content that did not take effect. Whether the cause was absence or non-retrieval is `UNK` and is what a trace would settle.

**Candidate class.** Enhancement. Running the gate honestly, three of five conditions are unmet:

| Gate condition | Status |
|---|---|
| Evidenced repeatable gap | **Met** — two agents, two model families, same decay class |
| Existing/native capability ruled out first | **Not met** — sibling plugins already hook the relevant events and already perform periodic re-injection of other content; whether either covers or should cover this is unexamined |
| Host/version support proven | **Largely met** — a shared `hooks/hooks.json` is loaded by both hosts, and `SessionStart` with a `compact` source is documented on both. Caveat: Codex holds plugin hooks until reviewed and trusted, and trust is hash-bound, so any hook change requires re-approval |
| Smallest opt-in addition identified | **Not met** — not compared against the ranked placement levers in `sources/claude-live-debugging-and-hierarchy.md` |
| Rollback and before/after validation | **Not met** — validating "the goal stayed front-of-mind" requires an adherence measure that does not currently exist |

By the plugin's own rules this is an **opportunity logged, not an Enhancement emitted**.

**Explicitly not decided.** Where re-injection should live. The obvious candidate is not automatically correct: managing a durable artifact does not establish ownership of re-injecting it, and this plugin audits and recommends rather than assigning architecture to siblings. `sources/claude-live-debugging-and-hierarchy.md` ranks the available levers; that comparison is trial work, not a prior assumption. v1 non-goals also forbid building a parallel refresh engine or durable session-memory store.

---

## GAP-1: The rehydration token budget is required but never stated

`sources/cross-host-context-degradation-synthesis.md` makes an explicit design rule: *any "add a rehydration hook" suggestion must come with an explicit token budget, not an unbounded "reinject the rules."* No budget is stated anywhere in this research.

The inputs to derive one are recorded but were never combined:

- Codex per-handler `additionalContextLimit` defaults to roughly 2,500 tokens, and context from multiple hooks and plugins accumulates.
- Claude re-injects invoked skill bodies after compaction capped at 5,000 tokens per skill and 25,000 total, oldest dropped first.
- Both hosts' guidance converges on a small curated subset over a rule dump.

Deriving a number from these without measurement would be the same unevidenced move this research rejects elsewhere.

**Blocking rule.** No rehydration recommendation may be emitted until a measured budget exists. That budget must be specified as:

- a limit **per host and per event** — the constraints differ by host and a handler firing on every prompt is not equivalent to one firing on compaction; and
- an **aggregate cap** across all handlers, because injected context accumulates across hooks and plugins regardless of any single handler's compliance; and
- validated by **before/after measurement of both cost and adherence**, on the same task and configuration — the same paired-baseline standard the go gate applies, since a rehydration hook is itself a change that spends tokens to buy retention.

Recorded here so the requirement is not quietly dropped.
