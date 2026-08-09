# Review round 3: cross-model plugin migration (Phase 0 + Phase 1)

**Date:** 2026-08-09
**Reviewer:** Claude (Opus 5)
**Branch:** `chore/make-all-plugins-available-to-claude-and-codex`
**Scope:** commit `94c58e4` plus 16 uncommitted files (+181/−109)
**Previous rounds:** `…-review.md` (round 1), `…-review-round-2.md` (round 2)

## Verdict

Every actionable item from round 2 is resolved, and I re-ran each verification rather than reading the diff and assuming. Phase 0 and Phase 1 are done as specified in the plan.

What remains is three trivia found this round. Nothing blocks merge.

**Amended after Codex's review of this document.** Three corrections, all mine:

- **M4 withdrawn.** I claimed both hosts render the marketplace description. Verified false — Codex surfaces it nowhere. Codex's position (keep the accurate Claude-side wording until Phase 2) is correct.
- **R3 fix corrected.** My proposed `<<<` here-string is as bash-specific as the process substitution it replaced. Codex's POSIX here-document is the right form; verified under `dash`.
- **Test counts corrected.** Codex's breakdown was right; mine misaligned the suite order.

The N1 fix is the substantive one: version-drift, invalid-semver, missing-manifest, and manifest-name-mismatch tests now exist, which closes the gap where CI depended on logic nothing exercised. Coverage went 71%→77% statements, 64%→71% branches, and the specific lines I called out (`200`, `202`, `160-165`, `188`, `194`) are all covered now.

---

## Round 2 items, all resolved

| # | Item | Fix | How I verified |
|---|---|---|---|
| N1 | Validator's version logic untested | 4 new tests: version drift across all three sources, invalid semver, missing `package.json` / Claude manifest, host manifest name mismatches. `fixture()` gained `marketplaceVersion` / `packageVersion` / `claudeVersion` / `codexVersion` / `claudeName` / `codexName` | `npm run test:coverage:scripts` → 14 tests pass, 76.97% stmts / 71.26% branch, previously-uncovered lines now covered |
| N2 | `validate:plugins` absent from agent-facing docs | `AGENTS.md:81-97` adds a validation block with the `validate:plugins`, Claude-schema, and Codex-smoke commands; Definition of done gained step 4 | `grep -n "validate:plugins" AGENTS.md` → `:63`, `:81`, `:136` |
| N3 | CI hardcoded the six plugin names | Now derived: `while IFS= read -r plugin … done < <(node -e "…plugins.forEach(…)")` | Ran the exact loop with the local binary — all six plugins enumerated and validated |
| N4 | `js-yaml` pinned to a legacy major | `package.json` → `js-yaml@^5.2.3`; call site → `yaml.load` at `scripts/validate-plugins.js:52` | `require('js-yaml')` resolves 5.2.3, `load` is a function, `safeLoad` undefined. CommonJS `require` works, so no ESM problem. Lock has 5.2.3 at top level; the 3.15.1 entry that remains is a transitive dep of jest's istanbul config loader, not the validator's |
| N5 | `implement` anchor sat below two relative paths; four anchors worded two ways | Anchor moved to `:9`, above everything; all five now read "Relative paths in this skill are resolved from this `SKILL.md`." | grep across all six SKILL.md |
| N6 | Plan didn't record the `skills/session.md` consequence | Plan `:176` now notes the flat skill duplicated the richer command, names `commands/session.md` as the Phase 2 source, and states `/memento:session` stays Claude-only until conversion | Read the plan |
| M1 | `agent-artifex` and `stilus` outside npm workspaces | Both added to `package.json` workspaces | `node_modules/@claude-domestique/` now symlinks all seven packages; `npm ci --dry-run` → "Done!  up to date" |
| B1 residual | Plan's "Air" wording unverifiable | Replaced with a disposable-`CODEX_HOME` command block and a version-agnostic cache path | Read the plan; reproduced the block below |

`agent-artifex` correctly bumped 0.2.0 → 0.2.1 for the anchor edits, and it's the only plugin this round touched.

---

## New findings

### R1. The derived plugin loop validates nothing — silently — if `node` fails

`.github/workflows/pr-check.yml:34-36` and the same snippet at `AGENTS.md:84-86`:

```bash
while IFS= read -r plugin; do
  npx … plugin validate "$plugin" --strict
done < <(node -e "require('./.claude-plugin/marketplace.json').plugins.forEach(…)")
```

Process substitution's exit status is invisible to the parent, so a failing `node` produces an empty stream, zero loop iterations, and a passing step. Confirmed:

```
$ bash -e -o pipefail -c 'count=0; while IFS= read -r p; do count=$((count+1)); done < <(node -e "throw new Error(\"boom\")" 2>/dev/null); echo "iterations: $count"; echo "exit: $?"'
iterations: 0
exit: 0
```

**In CI this is already defended by step order** — `Validate plugin metadata` (`:28`) runs first, and I confirmed `validate-plugins.js` exits 1 on a malformed marketplace (`marketplace: invalid JSON (Expected property name…)`). So the only way to reach the loop with an unreadable marketplace is if `validate:plugins` passed on it, which can't happen.

The `AGENTS.md` block has the same ordering, so a developer following it top-to-bottom is also covered. What's left is an implicit dependency: the loop's correctness rests on a check in a different step.

Codex proposed command substitution plus an explicit failure check and a POSIX here-document. **That's the right form and it's what I'd use** — verified below:

```sh
plugins=$(node -e "require('./.claude-plugin/marketplace.json').plugins.forEach(p => console.log(p.name))")
while IFS= read -r plugin; do
  npx … plugin validate "$plugin" --strict
done <<EOF
$plugins
EOF
```

Two properties I confirmed:

- **The failure check comes free from `set -e`.** A command substitution assignment carries the substitution's exit status, so `plugins=$(node -e 'throw new Error(1)')` aborts under `set -e`. Verified: exit 1, and the line after the assignment never ran.
- **The here-document is POSIX and the loop stays in the current shell**, so a failing `npx` inside the body propagates. Verified under real `dash`: three iterations, exit 0 on the happy path.

`for plugin in $plugins` is an even simpler POSIX option, but it relies on word splitting, which is only safe while plugin names contain no whitespace. Nothing currently enforces that — `validate-plugins.js` checks kebab-case for skill *directories*, not for plugin names. The here-document is newline-delimited and immune, so prefer it unless you also add a name-charset check.

### R2. `npm run validate:plugins` is listed twice in `AGENTS.md`

`:63` inside "Run a focused suite while developing", and `:81` heading the new validation block. The `:63` placement also files a validator under a list of test suites. Drop `:63` — the dedicated block below it is the better home, and step 4 of Definition of done already points at it.

### R3. The documented loop is bash/zsh-only

`< <(…)` is process substitution; it fails under `dash`. The block is fenced as ` ```bash ` and CI's default shell is bash, so this is defensible as-is. Mentioning it only because `AGENTS.md` is the reference a reader will copy from.

**Correction to my own R1 as first drafted:** I claimed the `<<< "$plugins"` here-string also fixed this. It does not — `<<<` is equally bash/zsh-specific. My first test appeared to show it working under `sh` only because macOS `/bin/sh` is bash 3.2.57 in POSIX mode, which still accepts here-strings. Under real `dash`:

```
$ dash -c 'plugins="a b"; while IFS= read -r p; do echo "$p"; done <<< "$plugins"'
dash: 1: Syntax error: redirection unexpected
```

The POSIX here-document in R1 is the form that actually travels. Thanks for catching it.

### R4. Branch state to be aware of before pushing

- `94c58e4 chore - add cross-model plugin foundation` is committed; this round's 16 files are uncommitted on top. A reader diffing the commit alone sees `agent-artifex` at 0.2.0, while the working tree has 0.2.1. Both states are internally consistent, so `validate:plugins` passes either way — but the branch is only correct as commit + working tree together.
- `docs/reviews/` is untracked, so these three reviews won't travel with the branch unless you `git add` them.
- `AGENTS.md` git conventions say "Do not commit unless the user explicitly asks." Worth confirming the commit was requested; the message format itself is right (`chore - lowercase description`, no attribution).

### R5. Optional: the cheap remainder of validator coverage

At 76.97%/71.26% the important paths are covered. If you want the rest, five of the uncovered branches guard rules the plan names explicitly and cost one test each:

| Line | Rule |
|---|---|
| `101` | skill directory not kebab-case |
| `104-105` | skill directory with no `SKILL.md` |
| `40-41`, `46-47`, `54-55` | missing / unclosed / non-mapping frontmatter |

The frontmatter trio is the same class as the original Stilus bug, so it's the most defensible of the group. The rest (`33-34` unreadable file, `76-77`/`117` empty descriptions, `134`/`140`/`145-146` marketplace shape, `214-221` `main()`) is diminishing returns.

---

## Still open from earlier rounds

- **M4 — withdrawn as a finding.** Codex is right on both points, and my premise was wrong.

  I asserted in round 1 that "both hosts render this catalog string." I never checked. Verified now, with the marketplace registered in a disposable `CODEX_HOME`: `codex plugin marketplace list` prints only `MARKETPLACE` and `ROOT`; `codex plugin list` prints only `PLUGIN`, `STATUS`, `VERSION`, `PATH`; and grepping the whole Codex home for the description string finds nothing. **Codex never surfaces this field.** It is a Claude-side catalog string, so describing the marketplace from a Claude Code perspective misleads nobody, and Codex's argument — that advertising the whole marketplace as cross-model while only Agent Artifex has a Codex manifest would be *less* accurate — is correct. Keeping the current wording through Phase 2 is the right call.

  To the question asked: yes, there is wording that stays accurate with no phase-boundary edits — stop making a host claim in the catalog description at all, and let the manifests be the source of truth, since `.codex-plugin/plugin.json` presence is what actually determines installability and `codex plugin list` already reports it per plugin:

  > `"Development workflow plugins: session persistence, behavioral rules, work-item automation, AI-service design and testing, herdr orchestration, and writing tools"`

  That is true at every phase and never needs editing. But it's a preference, not a correction — the current string is accurate, only Claude users see it, and the maintenance cost is one line per phase. Your call; I have no finding here.

- **M5.** `agent-artifex` descriptions remain 546–695 chars, under the 1024 limit and above the ≤500 guidance. Advisory; leave it if the trigger coverage is deliberate.

---

## Verified working

Re-run in this review, not carried over.

**Test suites** — all pass. Counts re-measured per suite after Codex flagged my original breakdown as mislabeled; Codex's numbers were correct:

| Suite | Tests |
|---|---|
| scripts | 14 |
| shared | 28 |
| mantra | 23 |
| memento | 42 |
| onus | 65 |
| comitatus | 105 |

My round-3 draft read "mantra 23+42, memento 65, onus 65" — I grepped the six `Tests:` lines from a single `npm test` run and misaligned them against the suite order, double-counting one and shifting the rest. Re-run individually via `npm run test:<suite>` to produce the table above.

**Validators:**

- `npm run validate:plugins` → "Plugin metadata and frontmatter validation passed."
- `claude plugin validate . --strict` → passed, plus the derived per-plugin loop: memento, mantra, onus, agent-artifex, comitatus, stilus all "✔ Validation passed".
- Negative control: replacing `marketplace.json` with `{bad json}` makes `validate-plugins.js` exit 1 with a clean error rather than a stack trace. Restored afterward.

**Codex install, exact CI/AGENTS.md commands, disposable `CODEX_HOME`:**

```
Added marketplace `claude-domestique` from /…/claude-domestique.
-- installing agent-artifex@claude-domestique
Installed plugin root: $CODEX_HOME/plugins/cache/claude-domestique/agent-artifex/0.2.1
agent-artifex@claude-domestique  installed, enabled  0.2.1
```

The `*/.codex-plugin/plugin.json` glob correctly selected only `agent-artifex`; the other five list as "not installed", which is right for Phase 1. Cache contains 6 `SKILL.md` files and 16 reference markdown files. Temp home removed.

**Dependency and workspace state:**

- `js-yaml` 5.2.3 top-level, `yaml.load` in use, `safeLoad` gone, `require()` works under CommonJS.
- `npm ci --dry-run` → "Done! up to date", so the lock matches `package.json` after the workspace and dependency changes.
- All seven packages symlinked under `node_modules/@claude-domestique/`.

**Version consistency** across `package.json` / `.claude-plugin` / `.codex-plugin` / `marketplace.json`: agent-artifex 0.2.1, memento 0.3.10, mantra 0.5.2, onus 0.3.7, comitatus 0.5.1, stilus 0.1.1.

---

## Suggested order

1. **R1 + R3** — command substitution plus POSIX here-document. Removes the cross-step dependency and the portability caveat in one edit.
2. **R2** — delete the duplicate `AGENTS.md:63` line.
3. **R5** — optional; the frontmatter trio first if you do any of it. If you take the `for plugin in $plugins` shortcut in R1 instead of the here-document, add a plugin-name charset check here too.
4. **R4** — decide what gets committed and whether `docs/reviews/` joins the branch.

M4 is withdrawn — no action.

All repository-only. No further plugin bumps needed unless you touch a plugin directory.
