# Testing Mantra

This is an on-demand reference. Repository instructions in `AGENTS.md` determine
required tests and validation; this file adds no timing quotas, coverage targets,
or separate development workflow.

## Mechanical checks

From the repository root:

```bash
npm run test:mantra
npm run validate:plugins
```

The Mantra Jest suites cover:

- Behavior-hook delivery on session start and prompt submission, unchanged text
  across those events, and absence of the removed external-source quota.
- Resource projection and aggregation: native identities, repeated snapshots,
  category semantics, overlapping intervals, missing records, and unknown values.
- Collector I/O: automatic registration and storage retention, bounded reads, local snapshots,
  concurrent appends, malformed input, and passive stdout.
- Automatic context injection: separate token categories, explicit unknowns and coverage,
  silent passive events and unsupported hosts, fresh observations after tool use, interval resets, concurrent claims and subagent exclusion.
- The optional standalone Claude statusline, which is separate from both hooks.

Test public behavior and meaningful failure cases. Pure aggregation functions can
use small fixtures and explicit observation times. Filesystem and subprocess
checks use disposable directories with cleanup; keep reports outside the repository.
Mock a dependency when the test needs to isolate it or reproduce an otherwise
unavailable failure. Use real interactions when their behavior is the property
under test. Neither mocks nor real I/O are mandatory for every test.

[Jest's mock documentation](https://jestjs.io/docs/mock-functions) describes
replacement functions and modules; [Node's filesystem documentation](https://nodejs.org/docs/latest-v24.x/api/fs.html)
describes temporary directories and file operations. Choose based on what the
assertion needs to establish, rather than a universal mocking rule.

## Skill invocation and behavior

Passing Jest and manifest validation establishes mechanical properties. It does
not show that a skill fires or that the guidance improves an agent's decisions.
Use [the repository evaluation guide](../../docs/plugin-evaluation.md) to launch
fresh agents from source in neutral workspaces on the affected hosts.

Compare outcomes on the relevant boundaries: sound and flawed proposals,
consequential versus routine ambiguity, explicit discussion pauses, retained
answers and authorization, and research needed for an active objective. Preserve
the exact source and prompt tested. Record misses and limitations rather than
inheriting results from an earlier paragraph or claiming a benefit from a single
sample. Check observable actions and outputs; do not inspect private reasoning.

The [host hook reference](https://code.claude.com/docs/en/hooks) describes when
Claude delivers context. A successful hook response establishes delivery, not
whether the model follows it.

## Resource measurements

Follow [the measurement contract](resources.md) when testing collection. Keep human
permission stops, clarification, automation, hook brackets, and execution distinct.
Missing evidence is unknown, not zero. Native token categories have different
host semantics and must not be combined into a billing or efficiency score.

Measure collector overhead separately from task outcomes. Record injected text
size when evaluating feedback, but do not call character counts exact model
tokens. Collector accuracy, lower consumption, and useful delivered work are
separate findings; a cheaper run that misses a requirement is not a success.
