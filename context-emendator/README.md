# context-emendator

> Correct the context, clear the noise, free the work.

Latin `emendator`: one who corrects a text — the term of art in textual scholarship for reconciling a document from multiple, possibly conflicting sources into one clean, canonical version. That's the job: a repository's Claude/Codex agent context (`CLAUDE.md`, `AGENTS.md`, `.claude/rules/`, `.codex/`, skills, hooks) accretes over time, often across both hosts independently, and ends up duplicated, stale, inconsistent, or unconditionally loaded when it shouldn't be.

**Status: design phase.** No skill or hook ships yet. This directory currently holds the manifests and the grounding research; see [Roadmap](#roadmap).

## What it does (v1 scope)

An audit-first, host-neutral auditor for a target repository's agent context — not a runtime injection engine (see [Relationship to mantra](#relationship-to-mantra)). It:

1. Builds a complete inventory of the target repo's agent-workflow configuration across both hosts (CLAUDE.md, AGENTS.md, `.claude/rules/`, `.claude/context/`, `.claude/skills/`, `.codex/`, hooks).
2. Assesses that inventory against official Claude/Codex documentation and each host's actual, verified load path — not assumption.
3. Surfaces findings in three gated classes:
   - **Correction** — deduplicate, trim, or scope content that's redundant, stale, or unconditionally loaded when it doesn't need to be.
   - **Retirement** — recommend replacing a bespoke mechanism with a proven native or plugin-provided capability that now does the same job, only when capability-equivalence, host compatibility, and a migration validation plan are all demonstrated.
   - **Enhancement** — recommend a genuinely new capability: a verification loop, an adversarial-review step, or turning a judgment-requiring BLOCKING rule into an actual gate — a `prompt`/`agent` hook on Claude, or CI/a bounded subagent on Codex, where a plain deterministic hook can't evaluate judgment at all. Gated on an evidenced repeatable gap or a confirmed goal, ruling out an existing capability first, proven host/version support, the smallest viable addition, and a rollback/validation plan. Otherwise it logs a lower-confidence opportunity or stays silent.
4. Every finding follows one output rubric: **observed cost, load path, retention confidence, safe remedy, validation plan** — never a bare "this looks wasteful."
5. All corrections and remediations are human-approved before anything is applied. This plugin diagnoses; it does not autonomously rewrite a target repo's configuration.

## Relationship to mantra

`context-emendator` is a standalone plugin, not a mantra extension. mantra *delivers* curated, opinionated behavioral rules via automatic injection; this plugin *audits* whatever configuration a target repo already has — which may not use mantra at all. Where a target repo's config could benefit from mantra's injection/refresh mechanism, this plugin's remediation output can recommend adopting it (a Retirement or Enhancement finding), but it does not depend on mantra's hooks, release cadence, or curated content. If a future version needs its own runtime hook for trace verification, it will use a generic, extracted shared hook contract rather than coupling to mantra's behavior-specific lifecycle.

## Grounding

Every claim this plugin makes about how Claude or Codex actually load, manage, or degrade context is sourced from official documentation, not inference — see [`docs/research/`](docs/research/) for the primary-sourced research this design is built on, and a catalog of tooling that overlaps or complements this plugin's scope.

## Roadmap

- [ ] Define the smallest useful v1 skill surface (single invoked skill vs. a small family).
- [ ] Decide inventory format (what "the target repo's agent context" means as structured data before analysis).
- [ ] Prototype the audit against a real target repository end-to-end, producing a real finding set in the three-class taxonomy.
- [ ] Human review workflow for applying an approved correction/retirement/enhancement.
