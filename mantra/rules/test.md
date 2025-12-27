---
# MANTRA-MANAGED: This file is overwritten by /mantra:init --force
# To customize: create your own rule file in .claude/rules/
#
# Testing Conventions - Compact Reference

companion: .claude/context/test.md
type: actionable

MANDATORY-REREAD: before-implementation (use-thinking-block-verification)

## TDD WORKFLOW (BLOCKING REQUIREMENT)
trigger: user requests implementation, new feature, or bug fix
priority: BLOCKING
action: You MUST write test first, run to fail, then implement. STOP and follow TDD.
verify: "TDD: write test first, run to fail, then implement"
consequence: Skipping TDD leads to untested code and regression bugs

## CORE PRINCIPLES
independent: tests run in any order, parallelizable
deterministic: same input → same output (no flaky tests)
simple-first: start minimal, build complexity incrementally
never: big-bang (all code then all tests)

## FIRST PRINCIPLES
fast: unit-milliseconds, suite-<10s, integration-<60s
independent: no-shared-state, any-order, own-setup-per-test
repeatable: no-external-deps, inject-time, fixed-seeds
self-validating: pass-or-fail (no manual log inspection)
timely: test-immediately-after-method, failing-test-first-for-bugs

## TDD STEPS (per chunk)
1: write-test (defines expected behavior)
2: run-targeted-test (should fail)
3: implement-minimal-code
4: run-targeted-test (should pass)
5: check-coverage (for targeted code)
6: refactor-if-needed (keep tests green)
7: next-chunk (repeat 1-6)
then: run-full-suite → check-total-coverage → iterate-till-satisfactory
design: refactor-code-for-testability (DI, pure-functions, small-units)

## UNIT vs INTEGRATION
unit: pure-functions, mocked-deps, no-OS-resources (network, fs, db)
integration: real-resources-in-isolation (temp-dirs, test-db, real-git)
boundary: unit-tests-mock-at-module-boundary
clarification: temp-dir-tests = integration (not unit)

## TESTABILITY (DI PATTERN)
require: dependency-injection for external-deps
inject: fs, paths, child_process, Date.now, fetch
pattern: options-object-last-param (defaults in function)
never: global-mocks, monkey-patching, mock-at-top-of-file

## ISOLATION
unit: inject stubs/mocks (no real fs, network, db)
integration: temp-directory-per-suite, cleanup-after
never: shared-state-between-tests, hardcoded-paths

## EXECUTION
develop: run-targeted-tests (single file/describe)
validate: expand-to-full-suite (when targeted pass)
ci: full-suite, parallel-where-possible

## PARAMETERIZED TESTS
prefer: table-driven-tests (reduce code duplication)
when: same-logic-multiple-inputs, edge-case-variations
benefit: add-cases-without-new-test-functions

## COVERAGE
reports: write-to-gitignored-folder, reuse-existing-reports
require: new-logic, conditionals, edge-cases, error-paths
skip: trivial-getters, simple-wrappers, type-only-code
focus: behavior (not implementation-details)

## ANTI-PATTERNS
avoid: testing-implementation-details (test behavior, not internal calls)
avoid: overly-complex-setup (>10 lines = design smell, code too coupled)
prefer: one-logical-assertion-per-test (clear failure messages)
---
