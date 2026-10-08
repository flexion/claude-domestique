# Static validation and invocation evidence

The scope-restored compact source has hook SHA
`2a0d673a5953b17c50e4119538ba4ab1429283bf4659782c0f60115aa2f3cef6`:
76 words/558 characters, 16.7% fewer characters than the prior 92 words/670
characters. The word "campaign" is retained to preserve the original research
boundary. This is a text-size measurement, not a model-token measurement. All
569 tests passed again on this exact source; metadata and whitespace checks
also passed. Its exact-snapshot matched-case evidence is the `compact-scope` arm,
one repetition of each of the five cases, distinct from the earlier compact arm.

The initial compression follow-up changed only the recurring objective paragraph:
92 to 75 words, 670 to 549 characters (18.1% fewer characters, not a measured
model-token reduction). Hook SHA: `b689e61f8b3c64121c69087600b98e2bd53590fa50c6add49c946e1db19eb2ef`.
Full `npm test` passed again (569 tests), as did metadata validation and whitespace
checks. Earlier snapshot/probe results remain attributed to their earlier text;
the compact comparison is reported separately. The assessment skill and manifests
are unchanged by this follow-up.

Validated on Node.js v24.15.0, 2026-10-08. These checks establish delivery,
packaging, and compatibility; the paired multi-turn comparison reports agent
behavior separately.

- `npm ci`: completed; its build regenerated the shared bundles without a diff.
- `npm run test:mantra`: 25 tests passed. Before the hook change, the two new
  event-specific delivery checks failed because the objective guidance was absent.
  These are delivery checks, not proof that an agent follows the guidance.
- `npm test`: 569 tests passed across all seven root-command suite groups.
- `npm run validate:plugins`: passed.
- `git diff --check`: passed after the plugin edits and version bump.
- `node scripts/bump-version.js mantra minor`: changed Mantra 0.6.3 to 0.7.0
  in its package, Claude and Codex manifests, and the marketplace entry.
- Codex invocation probe: `node scripts/probe-skill.js --host codex --plugin
  mantra --expect assess --prompt "Assess the tradeoffs of adding Redis caching
  to a small CLI that reads one local JSON file. This is a discussion only;
  explain correctness, architecture, alternatives and risks." --full` exited 0.
  It installed the marketplace and Mantra into a temporary Codex home, observed
  `Skill:assess` through a SKILL.md read, and returned a discussion assessment
  without an implementation or research campaign. This is a single-turn skill
invocation probe, not a Codex multi-turn comparison or hook trust check.

After the operator's simplification preference was relayed by hal, the explicit
ban on ledgers/approval stages was removed from the hook, skill, and companion.
No runtime state or decision machinery was added. Mantra's 25 tests and repository
metadata validation passed again after this wording change. The final Codex probe
also exited 0 and observed `Skill:assess`; its complete output is in
`codex-final-probe.txt`. The final Claude comparison identifies the final wording
separately.

The pinned Claude validator initially failed inside the sandbox with npm DNS
`ENOTFOUND`. The required retries outside the sandbox passed for both
`npx --yes @anthropic-ai/claude-code@2.1.226 plugin validate mantra --strict`
and `npx --yes @anthropic-ai/claude-code@2.1.226 plugin validate . --strict`.

The duplicated new companion section was removed after review; the stateless
behavior hook injects its own constant. The delivery test was reduced to one
marker, leaving behavioral correctness to the agent comparisons. Mantra's 25
tests passed again. Earlier README descriptions of periodic refresh and additional
rule injection predate this branch and are not established by these checks. The
new feature bullet names the behavior hook explicitly.

The tracked lockfiles already contained older Mantra package versions before this
branch. The repository bump script does not modify lockfiles; this branch retains
that existing convention. All affected plugin manifests agree on 0.7.0. Other
Mantra branches will need one reconciled version when their changes integrate.
