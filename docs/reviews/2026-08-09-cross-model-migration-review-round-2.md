# Review round 2: cross-model plugin migration (Phase 0 + Phase 1)

**Date:** 2026-08-09
**Reviewer:** Claude (Opus 5)
**Branch:** `chore/make-all-plugins-available-to-claude-and-codex`
**Scope:** uncommitted working-tree diff, 43 files, +1209/−412
**Previous review:** `docs/reviews/2026-08-09-cross-model-migration-review.md`

## Verdict

Both blockers are resolved, and one of them I verified by reproducing the Codex install myself rather than taking the claim on faith — `codex plugin marketplace add .` and `codex plugin add agent-artifex@claude-domestique` both succeed against a throwaway `CODEX_HOME`, and the cache contains both manifests, all six skills, and all 16 reference files. Phase 1's install mechanism is real.

Five of the seven "should fix" and "minor" items are done, two of them beyond what I asked: `bump-version.js` now *throws* on a missing Claude manifest instead of just logging honestly, and CI gained a real Codex install smoke test rather than only the Claude validator I suggested.

Nothing here blocks merge. Five items remain, the two worth doing before merge being test coverage for the validator's version logic (N1) and getting `npm run validate:plugins` into the docs agents actually read (N2).

Two findings have been withdrawn after Codex challenged them — M2 and the `~/Library/Application Support/Codex` correction. Both were mine, both were wrong, and the reasoning is recorded under "Still open" rather than quietly deleted.

---

## Resolved since round 1

| # | Item | How it was fixed | Verified |
|---|---|---|---|
| B1 | Plan claimed an unobservable Codex install | Status narrowed to "installed in Air, behavioral smoke test pending"; names the `CODEX_HOME` approach and the exact cache path | Install reproduced locally — see Verified working |
| B2 | Dangling self-reference in `evidence.md` | Now "Each citation above names its source document; the plugin carries no external source files." | `agent-artifex/references/evidence.md` tail |
| S1 | Relative paths had no stated anchor | Anchor line added to `foundations`, `design`, `assess`, `learn`, `implement`. `guide` correctly has none — it contains no relative paths | grep across all six SKILL.md |
| S2 | Skill-name check missing from validator | `validateSkills` enforces kebab-case directories, `name` matching directory, non-empty description, and rejects flat `skills/*.md`. `LEGACY_SKILL_NAMES` allowlists the three Phase 2 stragglers with a removal comment | `scripts/validate-plugins.js:10-17,81-120` |
| S3 | `CLAUDE.md` stale and duplicating `AGENTS.md` | Reduced to a pointer plus Claude-only context (self-referential note, manifest locations, per-plugin validation caveat). 172 lines removed | `CLAUDE.md` |
| S4 | `bump-version.js` logged success for work it may not have done | Now throws on missing Claude manifest and on a plugin absent from `marketplace.json` — stronger than the guard I suggested | `scripts/bump-version.js:102-109` |
| S5 | Phase 0 CI gate absent | CI now runs `validate:plugins`, `claude plugin validate` at root and per plugin, and a Codex install smoke test, all against pinned versions | `.github/workflows/pr-check.yml:27-49` |
| S6 | New script had no tests | 10 tests over real temp fixtures, covering CRLF frontmatter, malformed JSON not throwing, the legacy allowlist, flat-skill rejection, and marketplace-source convention | `npm run test:scripts` |
| M1 (part) | `stilus` package name off-convention | Renamed to `@claude-domestique/stilus`, and the validator now enforces the scope for all six | `scripts/validate-plugins.js:172-175` |
| M2 | `mantra/DEVELOPMENT.md` documented a nonexistent `rules/` directory | Claim removed; `:35` now attributes the injected text to `behavior.js` | `grep -n "rules" mantra/DEVELOPMENT.md` → no match |
| M3 | Duplicated sentence in `foundations` | Removed | `agent-artifex/skills/foundations/SKILL.md` |

Both pinned CI versions exist on npm (`@openai/codex@0.141.0`, `@anthropic-ai/claude-code@2.1.226`), and bare `claude plugin validate mantra --strict` works as the loop invokes it.

---

## New findings

### N1. The validator's original job — version consistency — has zero test coverage

`npm run test:coverage:scripts` reports 71.22% statements / 64.36% branches. The uncovered lines are not incidental:

| Uncovered | What it is |
|---|---|
| `200`, `202` | invalid semver, and version mismatch across the four files |
| `160-161`, `164-165` | missing `package.json`, missing Claude manifest |
| `188`, `194` | Codex manifest name mismatch, Claude manifest name mismatch |
| `101`, `104-105` | non-kebab-case skill directory, missing `SKILL.md` |
| `76-77`, `117` | empty or missing `description` |
| `134`, `140`, `145-146` | missing marketplace, `plugins` not an array, entry with no name |
| `40-41`, `46-47`, `54-55` | missing / unclosed / non-mapping frontmatter |

The 10 new tests cover the rules you added in this round thoroughly. What's unexercised is the version-synchronization logic that was the script's whole reason for existing and that CI now treats as a merge gate. A four-file version drift is also the single most likely real-world failure — it's what happens when someone edits a manifest by hand instead of running `bump-version.js`.

**Fix:** at minimum a version-mismatch case and a missing-manifest case. `fixture()` already takes an options bag, so `fixture({ marketplaceVersion: '1.2.4' })` is a small addition.

### N2. `npm run validate:plugins` is not in the contract agents read

The command is the new merge gate, and it appears in neither `AGENTS.md` nor `CLAUDE.md`. `AGENTS.md:63` lists `npm run test:scripts` but not the validator, and the Definition of done (steps 1–5) doesn't mention it. `CLAUDE.md:17` gestures at "the marketplace validator and each affected plugin validator" without naming any command.

This is the same failure mode as the stale `CLAUDE.md:82` from round 1, inverted: a rule enforced by machine but absent from the document an agent consults before handing off work. An agent following `AGENTS.md` to the letter will not run the validator and will discover the failure in CI.

**Fix:** add `npm run validate:plugins` to the AGENTS.md test-command list, and add it as a step in Definition of done alongside the version bump.

### N3. The Claude validation loop hardcodes the plugin list

`.github/workflows/pr-check.yml:34-37`:

```yaml
for plugin in mantra memento onus agent-artifex comitatus stilus; do
  npx --yes @anthropic-ai/claude-code@2.1.226 plugin validate "$plugin" --strict
done
```

A seventh plugin gets added to `marketplace.json`, passes `validate:plugins` (which iterates the marketplace), and is silently skipped by the Claude schema check. The Codex step immediately below already does this right by globbing `*/.codex-plugin/plugin.json`.

**Fix:** derive the list, e.g. `node -p "require('./.claude-plugin/marketplace.json').plugins.map(p=>p.name).join(' ')"`.

Two things to watch on the first CI run, both of which worked locally so I'd expect them to pass: `codex plugin marketplace add .` needed no authentication in my run, and `npx --yes @openai/codex` is a large download on a cold runner.

### N4. `js-yaml` pinned to a legacy major

New root devDependency `js-yaml@^3.14.2`, consumed as `yaml.safeLoad` at `scripts/validate-plugins.js:52`. The `^3` range won't cross the major, so nothing breaks today — but npm now publishes 3.x under the `v3-legacy` dist-tag, and this is a new dependency on a line that no longer receives fixes in a repo that previously had no root dependencies at all.

**Target version 5, not 4.** `npm view js-yaml dist-tags` reports `{ latest: '5.2.3', 'v4-legacy': '4.3.1', 'v3-legacy': '3.15.1' }` — both 3 and 4 are legacy tags. Verified against 5.2.3 in a scratch install:

- `typeof yaml.load === 'function'`, `typeof yaml.safeLoad === 'undefined'` — so the call site changes to `yaml.load`, and `load` is safe by default (no `safeLoad` equivalent needed).
- Parses valid skill frontmatter correctly.
- Still throws `YAMLException` on `description: Usage: x`, the exact pattern behind the original Stilus bug — so the regression test at `scripts/__tests__/validate-plugins.test.js:88-91` keeps working.
- Declares no `engines` constraint, and neither does 4.3.1, so nothing conflicts with the Node 18+ target or the 22/24 CI matrix.

**Fix:** `js-yaml@^5` and `yaml.load`.

### N5. `implement/SKILL.md` has relative paths above its anchor

The anchor sits at `:49` under `## Reference Files`, but `:25` and `:26` already use `../design/references/` and `references/` inside "On Invocation". A reader who acts on the earlier lines never sees the anchor.

Also cosmetic: the four anchors are worded two ways — "Paths in this section" in `foundations`, `design`, `implement`; "Paths in this table" in `assess`, `learn`. Pick one.

### N6. Deleting `memento/skills/session.md` is safe, but note it in the plan

Not a defect — I diffed it. `memento/commands/session.md` is a strict superset of the deleted skill: it adds frontmatter, branch-metadata handling, refusal on `main`/`master`, and the full session template. Nothing was lost, and `/memento:session` still resolves in Claude, so all nine live references still work:

`memento/README.md:181,202`, `memento/hooks/session-startup.js:364`, `memento/rules/sessions.md:38,69`, `memento/skills/session-manager/SKILL.md:41`, `memento/skills/resume/SKILL.md:75`, `onus/commands/commit.md:51`, root `README.md:171`.

The consequence worth recording: `commands/` is Claude-only, so `/memento:session` does not exist on Codex today, and Phase 2's conversion must now be written from the command file rather than the skill copy the plan expected at `:167`. One line in the Phase 2 notes prevents someone hunting for a file that no longer exists.

---

## Still open from round 1

- **M1 (part).** `agent-artifex` and `stilus` have `package.json` files but remain outside `package.json` workspaces (`shared`, `mantra`, `memento`, `onus`, `comitatus`). `AGENTS.md` says "The repository is an npm workspace" and points at `npm run install:all`; two of six plugins aren't covered by it. Neither has dependencies so nothing breaks — but now that the validator *requires* the `@claude-domestique/` scope for all six, the asymmetry reads as an oversight. Add them or state the exclusion.
- **M4.** `.claude-plugin/marketplace.json` description is unchanged: "Claude Code development workflows, with Agent Artifex also available for Codex". Both hosts render this, and it needs editing at every phase boundary.
- **M5.** `agent-artifex` descriptions still 546–695 chars. Under the 1024 limit; above the ≤500 guidance. Fine to leave if the trigger coverage is deliberate.
- **B1 residual — reproducibility only.** The plan's status is now honest about what's unverified, which was the point. What remains is that "Air's application-scoped Codex directory" (`:18`) and "The Air-scoped Codex cache" (`:21`) don't tell a later reader what `CODEX_HOME` was actually set to, or what "Air" refers to. Swapping those two sentences for the disposable-`CODEX_HOME` command block below makes the claim checkable by anyone in 30 seconds, and matches what CI now runs.

  **Corrections to round 1 and to the first draft of this review** — both withdrawn:

  - **M2 was wrong.** I listed `mantra/DEVELOPMENT.md` as still documenting `rules/behavior.md`. It doesn't: `grep -n "rules" mantra/DEVELOPMENT.md` returns nothing, and `:35` correctly reads `behavior.js  # Contains the injected BEHAVIOR text`. The round-1 finding was valid against the file as it stood then; Codex fixed it and I carried the item forward without re-checking the grep result. Resolved, not open.
  - **The `~/Library/Application Support/Codex` correction was unfounded.** The plan never names that path — I inferred it while searching for an "Air"-scoped Codex home, found an Electron app-data profile there, and then wrote up the mismatch as if the plan had pointed at it. The recommendation to use a disposable `CODEX_HOME` stands on reproducibility grounds alone; the factual correction does not.

---

## Verified working

Executed in this review, not inferred.

**Codex install reproduced end-to-end.** With `CODEX_HOME` pointed at a throwaway temp directory:

```bash
export CODEX_HOME="$(mktemp -d)"
codex plugin marketplace add .
# → Added marketplace `claude-domestique` from /…/claude-domestique.
codex plugin add "agent-artifex@claude-domestique"
# → Added plugin `agent-artifex` from marketplace `claude-domestique`.
# → Installed plugin root: $CODEX_HOME/plugins/cache/claude-domestique/agent-artifex/0.2.0
codex plugin list
# → agent-artifex@claude-domestique   installed, enabled   0.2.0
#   (other five listed as "not installed" — expected, no Codex manifest yet)
```

The resulting cache contains `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, all six `skills/*/SKILL.md`, and 16 reference markdown files. The generated `config.toml` records the marketplace as `source_type = "local"` and the plugin as `enabled = true`. No authentication was required. Temp home removed afterward.

This confirms the plan's Phase 1 install claim, the legacy-compatible marketplace decision (`:216` — Codex read `.claude-plugin/marketplace.json` directly, no second catalog needed), and the reference-containment work: every file the skills point at shipped into the cache.

**Everything else:**

- `npm test` — all suites pass: scripts (10), shared, mantra, memento, onus (65), comitatus (105).
- `npm run validate:plugins` — "Plugin metadata and frontmatter validation passed."
- `npm run test:coverage:scripts` — passes; coverage numbers in N1.
- `claude plugin validate . --strict` — marketplace passes. Per-plugin passes for all six, and bare paths work as the CI loop uses them.
- `python3 ~/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py agent-artifex` — passed.
- Version consistency across `package.json` / `.claude-plugin` / `.codex-plugin` / `marketplace.json` for all six: memento 0.3.10, mantra 0.5.2, onus 0.3.7, agent-artifex 0.2.0, comitatus 0.5.1, stilus 0.1.1. Every plugin touched on this branch is bumped once, which is the rule.
- Frontmatter scope is right: the validator reads `skills/`, `agents/`, and `commands/` and leaves `rules/` alone, so mantra's compact-rule notation in `memento/rules/sessions.md` and `onus/rules/git.md` isn't misparsed as YAML. `validateSkills` also skips dot-entries, so `memento/skills/.DS_Store` doesn't trip it.
- Validator test fixtures include the exact `description: Usage: review a file` shape that caused the original Stilus failure — that bug now has a regression test.
- `js-yaml@3.14.2` resolves and `safeLoad` is present, so the pin and the call site agree.

---

## Suggested order

1. **N1** — version-mismatch and missing-manifest tests. Highest value: CI depends on this path and nothing exercises it.
2. **N2** — `validate:plugins` into `AGENTS.md` commands and Definition of done.
3. **N3** — derive the plugin list in the Claude validation loop.
4. **B1 residual** — swap the two "Air" sentences for the reproducible command block above.
5. **N5, N6** — anchor placement and wording, Phase 2 note in the plan.
6. **N4, M1, M4** — `js-yaml@^5`, workspaces, marketplace description.

Items 1–4 and 6 are repository-only. Only N5 touches a plugin directory (`agent-artifex`), so that one plugin needs a further patch bump if you act on it; every other plugin is already covered by this branch's bumps.
