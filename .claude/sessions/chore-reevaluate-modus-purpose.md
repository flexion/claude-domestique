# Session: reevaluate-modus-purpose

## Details
- **Branch**: chore/reevaluate-modus-purpose
- **Type**: chore
- **Created**: 2026-09-05
- **Status**: in-progress

## Goal
Reconsider whether modus helps agents complete work items autonomously without stopping early or expanding the work unnecessarily. The operator reports that boundary authoring has moved dithering earlier and failed to enable completion. Prefer no added structure; any proposed structure must earn its cost and accommodate improving models.

## Session Log
- 2026-09-05: Session created
- 2026-09-05: Assessed the source README, agent-work-item skill, workflow design, and satisficing research. The small-item route still requires approval and freezing. Boundary validation leaves the judgment of whether the requested outcome is achieved unresolved. Several research findings motivate investigation without validating the prescribed workflow.
- 2026-09-05: Compared these assumptions with Huang et al.'s intrinsic self-correction study and Anthropic's harness design experience. External evidence remains useful; the amount of orchestration needed depends on the task and model. No comparative execution experiment was run.
- 2026-09-05: Considered guidance for tests, deterministic tools, refactoring, and reviews. Proposed concise defaults with the most specificity around tests that detect relevant failures and review findings that warrant action. Corrected the earlier defect-only framing: local simplification and improved testability can justify work through present engineering benefit. Follow-up review should verify repairs and their effects; another broad review needs a concrete reason. These remain recommendations for evaluation.

## Key Decisions
The operator authorized replacing agent-work-item with the lightweight guidance discussed here and removing its supporting scripts, code, and documentation while keeping all research. Preserve human-work-item and remove its dependencies on the retired boundary workflow. No commit or push was requested.

## Approach
Replace the skill in place; align plugin descriptions and human-work-item references; remove the boundary runtime, fixtures, operational design, and obsolete test/CI wiring. Preserve papers, analyses, recorded runs, and measurement evidence. Validate metadata and the remaining test suites, then exercise the replacement from source in disposable workspaces on both hosts. Track implementation state in Beads.

## References
- Current behavior: `modus/skills/agent-work-item/SKILL.md`
- Research interpretation: `modus/docs/research/satisficing-boundary-briefing.md`
- Baseline design: `modus/docs/autonomous-workitem-workflow.md`, section "Offline — not in the run loop"
- Huang et al.: https://arxiv.org/abs/2310.01798
- Anthropic harness experience: https://www.anthropic.com/engineering/harness-design-long-running-apps

## Next Steps
The authorized replacement and cleanup are in progress; implementation state is tracked in Beads.
