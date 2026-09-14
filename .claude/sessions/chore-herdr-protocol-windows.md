# Session: herdr-protocol-windows

## Details
- **Branch**: chore/herdr-protocol-windows
- **Type**: chore
- **Created**: 2026-09-14
- **Status**: complete

## Goal
Make plugin hooks and the comitatus herdr agent-to-agent protocol run on Windows
without depending on the operating system's `.js` file association, and without
changing any public CLI or delivery semantics.

Two partitions, disjoint file sets: Tim took the hook manifests, the validator
rule, the invocation coverage, and CI; Jay took `herd.js`, its tests, and the
herdr skill docs.

## Approach
- Preserve `herd.js`'s argv-based `execFileSync` calls and public verbs.
- Reproduce Windows path quoting and lock-root/cleanup failures in `comitatus/__tests__/herd.test.js` before changing behavior.
- Cross-check each portability claim against Node and Microsoft documentation; do not treat `process.kill(pid, 0)` as broken because Node documents it as platform-independent.
- Send the findings to Tim before changing `herd.js`, then implement the smallest behavior changes and update the canonical herdr docs.

## Session Log
- 2026-09-14: Session created
- 2026-09-14: Tim and Jay split disjoint work; Jay owns `herd.js`, its tests, and herdr skill docs. Baseline comitatus suite passes (338 tests).
- 2026-09-14: Investigation isolated Windows risks in generated shell commands and per-recipient lock identity/cleanup; primary docs confirm signal 0 itself is portable.
- 2026-09-14: Added three RED regressions, sent findings to Tim, then implemented Windows helper-path quoting, per-user lock roots, and bounded lock cleanup retries. Tim kept the tests in the Windows CI job.
- 2026-09-14: The operator confirmed Herdr 0.9.0. Verified the local binary and upstream 0.9.0 integration source, advanced the protocol reference, and replaced the obsolete sibling OpenCode status-fix remedy with `herdr integration install opencode`.
- 2026-09-14: Verification passed: focused herd suite (124 tests), full repository suite (all suites, including 341 comitatus tests), metadata validation, strict Claude validation, isolated Codex install, skill activation probe, syntax check, and `git diff --check`.
- 2026-09-14: Tim's review found operational explanations lost while converting POSIX-flavored command blocks to neutral text. Restored every removed command comment as adjacent prose and reran the full repository suite, metadata validation, and `git diff --check` successfully.
- 2026-09-14: Tim's second review passed. Replaced the two newly introduced em dashes with the files' established spaced-hyphen style; metadata validation and `git diff --check` still pass.
- 2026-09-14: Tim integrated both partitions and independently passed the full branch gate: 624 tests, plugin metadata validation, strict Claude validation for all four affected plugins, isolated Codex installation for all seven manifests, syntax checks, `git diff --check`, and the style check. Branch work is complete but remains uncommitted pending operator approval.

## Files Changed

Hook execution (Tim):
- `comitatus/hooks/hooks.json`, `mantra/hooks/hooks.json`, `memento/hooks/hooks.json`, `onus/hooks/hooks.json`
- `scripts/validate-plugins.js`, `scripts/__tests__/validate-plugins.test.js`
- `scripts/__tests__/hook-invocation.test.js` (new)
- `.github/workflows/pr-check.yml`, `package.json`

herdr protocol (Jay):
- `comitatus/__tests__/herd.test.js`
- `comitatus/skills/herdr/scripts/herd.js`
- `comitatus/skills/herdr/SKILL.md`
- `comitatus/skills/herdr/reference/protocol.md`

Versions: comitatus 0.14.1, mantra 0.6.2, memento 0.5.2, onus 0.4.3.

## Withdrawn finding

Tim flagged `up.js`'s `execFileSync('herdr'|'git', argv)` as a Windows ENOENT
risk on the premise that `execFile` performs no extension resolution. That
premise is wrong: libuv's spawn probes extensions itself — which is why the
`.cmd` CVE existed at all — and the Node fix blocks only `.cmd` and `.bat`.
`herdr` ships as a native binary rather than an npm shim, so no `.cmd` path
exists to cover. No `up.js` change. `shell: true` would have been a regression,
putting arbitrary protocol message bodies through `cmd.exe` parsing.

## Residual risk

Every check run on this branch ran on macOS. The `hooks-windows` CI job is the
only thing that exercises the actual Windows failure paths for either partition,
and it cannot run until this branch is a pull request.
