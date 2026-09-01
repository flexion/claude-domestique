# Session: remove-attribution-rule

## Details
- **Branch**: chore/remove-attribution-rule
- **Type**: chore
- **Created**: 2026-09-01
- **Status**: complete

## Goal
Remove the attribution prohibition outright from Onus and every Mantra mention, while retaining independent emoji and amend safeguards; kit owns source edits and the Onus/Mantra patch bumps.

## Session Log
- 2026-09-01: Session created
- 2026-09-01: Inventory found the primary rule in `onus/context/git.md` and compact enforcement in `onus/rules/git.md`; related skill copies are delegated to kit. Source edits are blocked pending the operator's decision because attribution requirements are combined with independent emoji guidance.
- 2026-09-01: The operator, via kit's session, chose outright deletion across Onus and Mantra, including `FORMAT.md` examples. Preserve the non-attribution portions of `onus/rules/git.md:31`; kit is applying edits and version bumps.
- 2026-09-01: Edits applied to four Onus files and four Mantra files. The emoji, HEREDOC, lowercase-title, and `--amend` rules survive in every file that carried them. Modus had no copy and `AGENTS.md` had already dropped its own, which is what left Onus and Mantra as the stale holdouts. Historical records under `docs/` and `.claude/sessions/` keep their original wording.
- 2026-09-01: Bumped Onus 0.4.1 to 0.4.2 and Mantra 0.6.0 to 0.6.1. Validation: `npm run validate:plugins`, `claude plugin validate --strict` for the marketplace and both plugins, and the Onus (65), Mantra (23), and scripts (80) Jest suites all pass. Installing dependencies in this fresh worktree also synced a pre-existing `package-lock.json` drift for Modus (0.1.0 to 0.2.0).

## Next Steps
1. Review kit's source edits, ensuring no emoji or amend restrictions were removed incidentally.
2. Verify the Onus and Mantra patch bumps and affected plugin metadata.
