# Cross-Host Parity Open Issues Design

**Date:** 2026-08-09
**Status:** Revised design, approved section by section
**Approval:** Repository owner, interactive review on 2026-08-09

This revision incorporates the blocking and should-fix findings from the
post-approval design review. In particular, it resolves the conflict between
Claude skill preloading and `disable-model-invocation`, replaces inferred host
capabilities with an observable predicate, and defines statistical release-gate
rules.

## Purpose

Close the three design gaps left after the Claude/Codex plugin migration:

1. Preserve Stilus blind-review integrity on hosts that cannot create a fresh
   specialist context.
2. Make automatic skill discovery predictable when all six plugins are
   installed together.
3. Add behavioral evidence for Claude/Codex parity beyond manifest validation
   and installation smoke tests.

The design compares workflow behavior across hosts. It does not require
identical wording or UI presentation.

## 1. Stilus blind-review isolation

### Decision

The `review-summary` pass may run only in a genuinely fresh subagent context.
The orchestrator must never simulate blindness by running the summarizer in a
context that has already seen the purpose, audience, intended point, voice
profile, rubric, or other specialists' findings.

### Host behavior

A fresh subagent context is available only when the active session exposes a
host-native delegation tool whose contract starts a new agent thread with fresh
context. Claude exposes this as `Agent`; Codex exposes `spawn_agent`, which its
hook tool-coverage contract also aliases as `Agent`. The orchestrator uses the
available tool contract as a fast-path predicate, then attempts the delegation;
it does not treat preflight success as proof that isolation occurred, infer
support from the host name, or launch another CLI process as a fallback.

When a fresh subagent context is available:

1. Run `review-correctness` and `review-voice` as independent read-only passes.
2. Generate a fresh UUID v4 isolation canary for this run. Place the canary
   adjacent to the purpose, audience, intended point, voice profile, rubric, and
   prior findings in the orchestrator-only context. Never put its value in the
   delegation payload.
3. Run `review-summary` in a fresh context. The only substantive content in its
   task payload is the target prose or a path to that prose. The payload also
   carries a fresh request ID and the attestation schema below as isolation
   control metadata.
4. Validate the returned attestation before reading or using the summary.
5. Compare the takeaway with the intended point during orchestration only after
   the attestation passes.

The canary and request ID are generated anew for every pass. Their uniqueness
prevents a cached or replayed attestation from satisfying the current run. The
canary sits beside the forbidden parent-only material so the contaminated-path
fixtures exercise the same leak boundary as the real workflow.

### Isolation attestation

`review-summary` must begin its result with this machine-readable object:

```json
{
  "isolation": {
    "request_id": "<exact delegated request ID>",
    "received_fields": ["prose"],
    "forbidden_context": {
      "purpose": false,
      "audience": false,
      "intended_point": false,
      "voice_profile": false,
      "rubric": false,
      "prior_findings": false
    },
    "canary_seen": false,
    "observed_canary": null
  }
}
```

`received_fields` inventories substantive task content and must be exactly
`["prose"]` or `["path"]`; it excludes the request ID and attestation schema.
`rubric` means the parent review's scoring or synthesis rubric, not the
specialist's own preloaded instructions. Every field shown above is required.
If the specialist sees a value labelled as an isolation canary, it sets
`canary_seen` to `true` and copies that value into `observed_canary`.

The orchestrator discards the pass and reports AI perception as `UNAVAILABLE`
when delegation fails, the attestation is absent or malformed, the request ID
does not match, `received_fields` contains anything else, any forbidden-context
flag is true, or the current canary is reported. The attestation is a tested
guardrail for cooperative models, not cryptographic proof of isolation.

When a fresh subagent context is unavailable:

1. Skip `review-summary`.
2. Continue with correctness, voice, and human-perception review.
3. Report `AI perception: UNAVAILABLE` with a short explanation that the host
   could not provide a fresh context.
4. Calculate the overall verdict from the available dimensions.

`UNAVAILABLE` does not raise or lower the overall verdict. Sequential execution
remains valid for non-blind specialists when their inputs do not violate their
independence, but the workflow must not describe sequential execution as
isolated.

A host may offer this degraded review, but a host/version that cannot expose a
fresh delegation tool does not satisfy the migration plan's full-parity promise
of equivalent final review dimensions.

### Failure handling

If the delegation tool is absent, spawning fails, or attestation validation
fails, report AI perception as `UNAVAILABLE` and include the reason in the
report. Do not fall back to the current context. Failures in correctness or
voice follow the existing review error policy and are not silently converted
into passing dimensions.

### Acceptance criteria

- No documented path runs `review-summary` sequentially in the orchestrator's
  existing context.
- The current instruction to ignore leaked intent is removed from
  `stilus/skills/review-summary/SKILL.md`; leaked context is a failed isolation
  precondition, not an input the specialist can repair.
- The blind-summary delegation contains only the prose or its path as
  substantive content; the request ID and attestation schema are permitted
  control metadata.
- Isolation canaries and request IDs are unique per pass, and the canary is
  adjacent to the forbidden parent-only context.
- Attestations use the required schema and fail closed when missing, malformed,
  mismatched, contaminated, or replayed.
- Reports support `AI perception: UNAVAILABLE`.
- Overall verdict calculation ignores unavailable dimensions without treating
  them as passing results.
- Tests cover fresh-context success, unavailable capability, spawn failure,
  missing and malformed attestations, stale request IDs, and deliberate leakage
  of every forbidden context type and the canary.

## 2. Skill discovery policy

### Classification

Add `metadata/skill-catalog.json`, a repository-owned catalog that classifies
every fully qualified skill as exactly one of:

- `public`: selected from ordinary user intent and directly invocable.
- `internal`: an orchestrated phase that is not a supported standalone user
  workflow.

The catalog is repository validation metadata, not plugin frontmatter. This
avoids depending on either host's treatment of custom frontmatter fields.

### Public descriptions

A public skill description must:

- Start with `Use when`.
- State triggering conditions only.
- Exclude workflow steps, output summaries, invocation syntax, implementation
  details, and persuasive claims about the skill.

Each public skill points to scenarios under `scenarios/parity/discovery/` with
coverage for:

- A clear positive intent.
- A clear negative intent.
- An ambiguous or neighboring intent.

### Internal descriptions

Internal Stilus specialists remain model-invocable because Claude plugin agents
preload them through the agent `skills:` field. Claude cannot preload a skill
that sets `disable-model-invocation: true`, so the design does not use that
field. This preserves one canonical specialist body shared by both hosts.

An internal skill description must follow this non-triggering semantic form:

> Internal `<phase>` phase of `<plugin>:<orchestrator>`. Not a standalone user
> workflow.

It may name phase-specific inputs, but it must not start with `Use when`, claim
generic user intents, summarize the workflow, or advertise direct invocation.
Internal skills remain technically visible to the model so Claude can preload
them. Therefore suppression is a tested behavioral property, not a
host-enforced visibility guarantee. The catalog and discovery scenarios are the
enforcement points.

### Static enforcement

Extend the repository validator so that:

- Every discovered skill appears exactly once in the catalog.
- Catalog entries refer to existing skills.
- Public and internal descriptions follow their respective mechanical shape.
- Descriptions contain no Claude or Codex invocation syntax.
- Each public skill has the required discovery scenarios.
- Each internal skill names an existing public orchestrator.

Static checks do not claim to prove semantic exclusivity. They prevent missing
classification, malformed descriptions, stale references, and obvious workflow
leakage.

### Collision scenarios

Behavioral discovery tests must install the complete six-plugin catalog and
cover at least these groups:

- Memento `session`, `session-manager`, `start`, and `resume`, including shared
  prompts such as "what is next" and "continue this session", plus their
  boundary with Onus `status`.
- Mantra `assess`, `skeptic`, and `troubleshoot`.
- Stilus `review` and `deslop` versus the internal review specialists.
- Agent Artifex `guide` versus its atomic skills.
- Side-effecting Onus skills `commit`, `pr`, `create`, `update`, and `close`,
  with negative prompts that discuss those actions without authorizing them.

Ambiguous scenarios must name the expected outcome: select one skill, ask a
clarifying question, or select no skill. Tests must not infer success merely
because some skill ran.

### Acceptance criteria

- All skills are classified exactly once.
- Public descriptions contain only trigger conditions.
- Internal specialists cannot match their orchestrator's generic user intent.
- `stilus:review` contains no invocation syntax in its description.
- The validator rejects missing classifications and malformed descriptions.
- The full-catalog scenario suite has positive, negative, and collision cases.

## 3. Model-level parity evidence

### Scenario suite

Add checked-in scenarios under `scenarios/parity/` for four behavior classes:

1. Direct skill invocation.
2. Automatic skill discovery.
3. Installed hook behavior.
4. Shared-state handoff between Claude and Codex.

Each scenario declares:

- A common user intent.
- Its fixture workspace and preconditions.
- Host-specific invocation syntax only where direct invocation requires it.
- Required observable behavior.
- Forbidden behavior.
- Expected files or state changes.
- Output invariants rather than exact prose.
- A paired no-guidance control using the same prompt, fixture, installed plugin
  set, and candidate skill set. The runner creates a test-only copy of the
  target plugin that changes only the target skill's description to neutral,
  non-triggering text. It preserves the target name, body, plugin enablement,
  neighboring descriptions, and all other candidates. Each copy uses isolated
  host state and a unique test version so caches cannot cross-contaminate arms.

Scenario assertions should prefer observable facts such as selected skill,
required report sections, command class, hook sentinel, exit status, and state
file contents. Wording and host UI presentation are outside parity scope.

### Native Claude eval decision

Codex CLI `0.147.0` has no eval command at the top level or under `plugin`, and
no eval-related feature flag. That absence is the primary reason the repository
needs a host-neutral harness: no vendor-native command can execute the required
matrix on both hosts.

Claude Code does ship `claude plugin eval`, including `evals/**/case.yaml`
cases, graders, repeated runs, thresholds, JSON results, and `--ablation
with-without`. Its ablation removes the whole plugin, which changes the
candidate set and cannot serve as the description-only control required for
discovery-collision scenarios.

The repository scenario schema therefore deliberately remains host-neutral
instead of mirroring `evals/**/case.yaml`; maintaining two partially compatible
sources would make one of them stale. The release gate also does not use the
native command only for Claude direct-invocation or isolation cases: doing so
would add a case generator, native-result translator, and second evidence path
while the Codex adapter and common invariant evaluator remain necessary. Hook
handler fixtures are deterministic, and hook trust plus shared-state handoff
remain outside the native eval contract. Native graders and HTML reports do not
replace the release gate's observable invariants and sanitized JSON evidence.
`claude plugin eval` remains available as an optional Claude-only authoring
diagnostic, but no parity case class depends on it and its output is not
release-gate evidence.

[Caliper](https://github.com/edonadei/caliper) was also evaluated as cross-host
prior art, not adopted as a dependency. Its closed skill neighborhood and
activation assertions validate the general approach, but it installs standalone
skills by unqualified frontmatter name; this repository has distinct
`agent-artifex:assess` and `mantra:assess` skills that both declare local name
`assess`. Caliper's ablation removes a skill rather than preserving it with a
neutral description, and its scope does not cover plugin hook trust or the
shared-state handoff. Adapting those differences would retain most of the custom
surface while adding a Python runtime dependency.

### Pull-request CI

Credential-free CI will:

- Validate scenario schemas and skill-catalog coverage.
- Run hook handlers against representative Claude and Codex event fixtures.
- Install every plugin into isolated host homes.
- Verify skill inventory, internal paths, and packaged runtime dependencies.
- Test scenario-runner parsing, sanitization, and invariant evaluation with
  deterministic fixtures.

CI will not call authenticated models and will not claim model-level parity.

### Authenticated release gate

The initial tested support floors are Claude Code `2.1.226` and Codex
`0.147.0`. These are conservative cross-host release baselines, not claims
about when each underlying feature first appeared: Claude's changelog records
the subagent `skills:` preload field in `2.0.43`, and its subagent documentation
states that `Task` became `Agent` in `2.1.63`. Claude `2.1.226` is intentionally
higher because it is the first release this migration validates end-to-end
across plugin installation, skill preloading, fresh delegation, and the parity
scenarios. It remains fixed until an explicit support-floor decision; routine
CI updates may test a newer current version without moving the floor. These
replace the stale README minimums of Claude Code `2.0.12` and Codex `0.141.0`.
CI, the root README, and the parity matrix must declare the same support
floors.

Before publishing, run the scenario suite against those minimums and the
current supported version of each host.

- Run direct-invocation and installed-hook scenarios once per host/version.
- Run five paired control and guided trials for each automatic-discovery
  scenario per host/version.
- Require at least three of five control trials to miss the skill-specific
  behavioral invariants. Otherwise the scenario is not diagnostic.
- Require clear positive guided scenarios to select the expected skill and meet
  its invariants in at least four of five trials.
- Require ordinary negative scenarios to leave the target skill unselected in
  at least four of five trials.
- Require all five side-effect negative trials to avoid unintended invocation
  and side effects.
- Give every ambiguous scenario an explicit allowed-outcome set. All five
  trials must remain inside that set, and any forbidden action fails the
  scenario immediately.
- Treat infrastructure failures separately from behavioral failures.
- Allow retries only for classified infrastructure failures. A behavioral
  failure remains a failed release result. A new behavioral run requires a
  relevant skill, scenario, or model-version change.
- Verify a plugin hook is skipped before trust and active after trust. The trust
  transition is a manual release-gate step: an operator opens `/hooks`, approves
  the exact reviewed hook hash, and records the interaction in the evidence
  bundle. `--dangerously-bypass-hook-trust` may test hook execution separately
  but does not satisfy the trust scenario, and the runner must not edit an
  undocumented trust store.
- Exercise at least one Claude-to-Codex and one Codex-to-Claude shared-state
  handoff.

The shared-state handoff fixture uses branch `issue/feature-42/auth`, session
file `.claude/sessions/issue-feature-42-auth.md`, and a matching
`.claude/branches/issue-feature-42-auth` metadata file. The receiving host must
read that exact session through the normal workflow without searching for an
alternative filename. Run the fixture once with Claude writing and Codex
reading, then with Codex writing and Claude reading. Start the receiver on the
fixture branch and assert Memento `SessionStart` returns the exact session path
with `isNew: false`; this path has no directory-scan fallback.

The release fails if either host violates a required invariant, performs a
forbidden action, or produces materially different workflow behavior.

### Evidence

Store sanitized release evidence under
`docs/release-evidence/YYYY-MM-DD-<release>/`. Each result records:

- Scenario identifier and input.
- Plugin and host versions.
- Sanitized transcript or relevant output excerpt.
- Observable state changes.
- Each invariant and its result.
- Infrastructure classification, if applicable.
- Overall pass or fail.

Sanitization must remove credentials, user-home paths, repository secrets, and
unrelated prompt history before evidence is retained. Evidence must be detailed
enough to reproduce a failure without preserving sensitive content.

### Acceptance criteria

- CI proves packaging, deterministic hook behavior, and scenario integrity.
- Release evidence proves direct invocation and automatic discovery on both
  hosts.
- Hook evidence covers the untrusted and trusted states.
- Trusted-hook evidence records the reviewed hash and manual `/hooks` approval.
- Shared project state is read correctly in both handoff directions.
- Release documentation states the tested host versions and any intentional UX
  differences.

## Delivery boundaries

This work does not:

- Require identical model prose.
- Add vendor credentials to pull-request CI.
- Create a fresh external process merely to emulate subagent isolation during a
  normal Stilus review.
- Cover ACP or the historical Air-scoped installation path. Those surfaces are
  out of scope until the repository defines a reproducible installation,
  invocation, and capability contract for them.
- Change existing plugin names or shared `.claude` project-state locations.
- Treat installation success as behavioral parity.

## Implementation sequence

1. Add the scenario schema, no-guidance controls, and failing discovery and
   isolation fixtures before changing skill text.
2. Reconcile host minimums across the README, CI, and parity matrix. Replace the
   named-specialists row's `Generic subagents or sequential passes` wording with
   Codex `spawn_agent` subagents, and state that equivalent final dimensions are
   required on supported minimums; `UNAVAILABLE` is degraded operation, not full
   parity.
3. Implement the Stilus capability branch, remove the simulated-blindness
   fallback, and add the `UNAVAILABLE` report state.
4. Add the skill catalog and failing validator tests, then rewrite descriptions
   until the validator and discovery fixtures pass.
5. Add deterministic CI installation, hook, scenario-parser, sanitization, and
   invariant checks.
6. Add the authenticated release runner and evidence format.
7. Run the initial Claude/Codex release matrix and resolve behavioral failures
   before declaring Phase 5 complete.

## Review disposition

| Finding | Resolution |
| --- | --- |
| B1 preload versus discovery suppression | Keep internal skills model-invocable so Claude agents can preload them; use non-trigger descriptions and behavioral enforcement. |
| B2 internal descriptions looked like triggers | Internal descriptions no longer start with `Use when` and cannot claim user intent. |
| S1 capability check was inferred | Predicate is the presence of a fresh-thread delegation tool in the available tool list. |
| S2 degraded Codex contradicted parity | Current supported Codex uses fresh subagents; versions without that capability may degrade but do not qualify as full parity. |
| S3 discovery gate was flaky and ambiguous | Five paired trials use explicit positive, negative, side-effect, and ambiguous thresholds. |
| S4 no control arm | Every discovery scenario has a paired no-guidance control. |
| S5 design contradicted current code and versions | The implementation criteria remove invocation syntax and simulated blindness, and raise both host minimums. |
| S6 collision coverage was incomplete | Coverage now includes all Memento session entry points and side-effecting Onus skills. |
| S7 handoff fixture was vague | Both directions use the nested branch and exact sanitized session path that previously regressed. |
| B3 tool-list predicate was challenged | Withdrawn after checking the official Codex tool-coverage table; `spawn_agent` is a local function tool. The design still adds attempt-then-verify and fail-closed isolation attestation. |
| S8 control changed the candidate set | Test-only description ablation preserves every skill and plugin candidate while removing only target guidance. |
| S9 hook trust was not automatable | `/hooks` approval is an explicit manual release step with hash-linked evidence; bypass mode cannot satisfy it. |
| S10 parity row remained stale | Implementation step 2 now specifies the named-specialists row replacement and degraded/full-parity boundary. |
| Minor provenance, location, sequencing, ACP/Air | Added approval history, moved catalog data under `metadata/`, made scenarios precede rewrites, and declared ACP/Air out of scope. |

## Host documentation references

- [Claude Code skills](https://code.claude.com/docs/en/skills#control-who-invokes-a-skill):
  `disable-model-invocation` removes skills from model discovery and prevents
  subagent preloading.
- [Claude Code subagents](https://code.claude.com/docs/en/sub-agents): named
  subagents start with fresh context and the `skills:` field injects complete
  skill content.
- [Claude Code changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md):
  `skills:` preloading was added in `2.0.43`.
- [Claude Code subagents](https://code.claude.com/docs/en/sub-agents#restrict-which-subagents-can-be-spawned):
  `Task` was renamed to `Agent` in `2.1.63`, with the old name retained as an
  alias.
- [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents):
  current Codex releases expose subagent workflows and can delegate when skill
  instructions request it.
- [Codex hooks](https://learn.chatgpt.com/docs/hooks): `spawn_agent` is a local
  function tool that matches the `Agent` alias, and non-managed plugin hooks
  require review through `/hooks` unless explicitly bypassed for a one-off run.
