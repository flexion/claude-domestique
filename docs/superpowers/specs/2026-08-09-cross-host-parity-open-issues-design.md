# Cross-Host Parity Open Issues Design

**Date:** 2026-08-09
**Status:** Approved design

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

A fresh subagent context is available only when the active host exposes a
delegation capability that starts a new context window. The orchestrator checks
the capabilities available in the current session; it does not infer support
from the host name and does not launch another CLI process as a fallback.

When a fresh subagent context is available:

1. Run `review-correctness` and `review-voice` as independent read-only passes.
2. Run `review-summary` in a fresh context.
3. Give `review-summary` only the target prose or a path to that prose.
4. Compare its takeaway with the intended point during orchestration, after the
   isolated pass returns.

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

### Failure handling

If a host claims to support fresh subagents but spawning the blind specialist
fails, report AI perception as `UNAVAILABLE` and include the spawn failure in
the report. Do not fall back to the current context. Failures in correctness or
voice follow the existing review error policy and are not silently converted
into passing dimensions.

### Acceptance criteria

- No documented path runs `review-summary` sequentially in the orchestrator's
  existing context.
- The blind-summary delegation payload contains only the prose or its path.
- Reports support `AI perception: UNAVAILABLE`.
- Overall verdict calculation ignores unavailable dimensions without treating
  them as passing results.
- Tests cover fresh-context success, unavailable capability, and spawn failure.

## 2. Skill discovery policy

### Classification

Add `scripts/skill-catalog.json`, a repository-owned catalog that classifies
every fully qualified skill as exactly one of:

- `public`: selected from ordinary user intent and directly invocable.
- `internal`: selected only when a named orchestrator delegates a named phase.

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

An internal skill description must follow this semantic form:

> Use when the `<plugin>:<orchestrator>` skill delegates the `<phase>` phase.

It may add input preconditions needed to distinguish phases, but it must not
claim generic user intents. Internal skills remain addressable by their
orchestrator and by explicit fully qualified invocation; they should not win
ordinary automatic-discovery requests.

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

- Memento `resume` and `session-manager` versus Onus `status`.
- Mantra `assess`, `skeptic`, and `troubleshoot`.
- Stilus `review` and `deslop` versus the internal review specialists.
- Agent Artifex `guide` versus its atomic skills.

Ambiguous scenarios must name the expected outcome: select one skill, ask a
clarifying question, or select no skill. Tests must not infer success merely
because some skill ran.

### Acceptance criteria

- All skills are classified exactly once.
- Public descriptions contain only trigger conditions.
- Internal specialists cannot match their orchestrator's generic user intent.
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

Scenario assertions should prefer observable facts such as selected skill,
required report sections, command class, hook sentinel, exit status, and state
file contents. Wording and host UI presentation are outside parity scope.

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

Before publishing, run the scenario suite against the declared minimum and the
current supported version of each host.

- Run direct-invocation and installed-hook scenarios once per host/version.
- Run each automatic-discovery scenario three times per host/version.
- Require all clear positive and negative discovery trials to meet their
  declared outcome.
- Treat infrastructure failures separately from behavioral failures.
- Allow retries only for classified infrastructure failures. A behavioral
  failure remains a failed release result.
- Verify a plugin hook is skipped before trust and active after trust.
- Exercise at least one Claude-to-Codex and one Codex-to-Claude shared-state
  handoff.

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
- Shared project state is read correctly in both handoff directions.
- Release documentation states the tested host versions and any intentional UX
  differences.

## Delivery boundaries

This work does not:

- Require identical model prose.
- Add vendor credentials to pull-request CI.
- Create a fresh external process merely to emulate subagent isolation during a
  normal Stilus review.
- Change existing plugin names or shared `.claude` project-state locations.
- Treat installation success as behavioral parity.

## Implementation sequence

1. Implement the Stilus capability branch and `UNAVAILABLE` report state.
2. Add the skill catalog, rewrite descriptions, and extend static validation.
3. Add deterministic scenario schemas, fixtures, and CI checks.
4. Add the authenticated release runner and evidence format.
5. Run the initial Claude/Codex release matrix and resolve behavioral failures
   before declaring Phase 5 complete.
