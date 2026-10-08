# Issue #182: proportionate research, behavioral comparison

Before/after Claude Code runs comparing Mantra's unconditional research quota with
the revised guidance on [#182](https://github.com/flexion/claude-domestique/issues/182)'s
contrasting cases. Run 2026-10-08 by the verifier (gus). Codex probes were run
separately by the lead and are summarized at the end.

## Result

| Issue case | Baseline (3-source quota) | Revised | Delta |
| --- | --- | --- | --- |
| Local deterministic defect (A, held-out D) | 6/6 correct, 0 web calls | 6/6 correct, 0 web calls | None observed. One baseline run said it skipped the quota the hook asked for. |
| Dangerous change, review only (C, held-out F) | 6/6 rejected and named the risk (C 3, F 3); one C run made 2 web calls | 5/5 rejected and named the risk (C 2, F 3; C-3 excluded, not logged in), 0 web calls | One baseline run spent research on a question local evidence had already settled. |
| Uncertain external format, generic prompt (B, held-out E) | 4/4 consulted the RFCs | v2: 1/6 consulted; v3: 1/2 (E yes, B no) | **Regression.** Recall replaced lookup. |
| Uncertain external format, uncertainty stated (U) | 1/1 consulted RFC 9110 + MDN | v4: 1/1 and v5: 1/1 consulted RFC 9110 | Criterion met when the uncertainty is explicit. |

What this shows, bounded to these runs:

- Removing the quota did not cost correctness on any case. It also did not
  measurably reduce work on local defects, because the baseline already skipped
  research on them.
- High-consequence review behaved the same under both versions: every run surfaced
  the destructive path and the unknown data contract instead of approving.
- The weak point is the external-contract criterion. With the generic bug prompt,
  revised guidance (v2, v3) mostly implemented the RFC grammar from recall. The
  code was correct, and still passed the independent grader, but no reference was
  consulted, so the criterion is not met. The v4/v5 wording ("recall is not
  evidence for that contract") was tested only on the explicit-uncertainty prompt,
  where both consulted the RFC. Whether it fixes the generic-prompt case is
  **untested**. That is a known limitation, not a pass.
- A lookup did not guarantee correctness. baseline-B-3 fetched RFC 9110 and MDN
  and still missed the asctime form. Every recall-only implementation passed all
  five grader checks.

## Guidance versions

Each arm loaded a snapshot copied at the time it ran, so later source edits did
not change runs already in flight. "sha" is `git diff mantra | shasum` against
base commit `25eb46c`.

| Label | What | sha |
| --- | --- | --- |
| baseline | `git archive 25eb46c mantra` (3-documented-examples hook and skill) | base commit |
| revised (v1) | First revision. Its troubleshoot examples restated the A/B/C fixtures, so runs were **contaminated** and are excluded. | febd4ed |
| v2 | Examples removed; external rule triggers on "uncertain external behavior" | 466bd82 |
| v3pre | Adds "recall or a local sample does not establish" to the skill and hook | 1811d55 |
| final (v3) | Simplified; repeated maintainer constraints removed from agent-facing prose | 089e9a4 |
| v4 | Hook states: before implementing a change whose correctness depends on a format, protocol, or third-party API contract not established by available evidence, consult an authoritative reference; recall is not evidence for that contract | 0c11b00 |
| v5 (final) | v4 with the duplicate `mantra:assess` invocation removed from the hook's research paragraph; all other wording unchanged | ead6226 |

## Method

### Isolation

The developer's `~/.claude/settings.json` enables the installed Mantra and other
plugins (including superpowers' debugging skills). Without isolation, both
arms would get the installed hook's text injected. Each run therefore used:

```bash
# isolate-settings.json: every key of ~/.claude/settings.json enabledPlugins set to false
claude --plugin-dir "$SNAPSHOT/mantra" --settings isolate-settings.json --strict-mcp-config \
  --permission-mode bypassPermissions [--disallowedTools Bash Edit Write NotebookEdit] \
  --output-format stream-json --verbose -p "$PROMPT" > stream.jsonl
```

The stream's `init` event confirmed which plugins loaded: only the snapshot
`mantra@inline` and Claude Code's builtins. The snapshot's SessionStart hook
response was present. Host: Claude Code 2.1.294 with its default model. No user
`CLAUDE.md` exists. Each run used a fresh copy of a git-initialized fixture in
`/tmp`, so no repository `CLAUDE.md`, `AGENTS.md` or memory applied. Review cases
(C, F) ran with Bash, Edit, Write and NotebookEdit disallowed, so nothing
destructive could execute.

`scripts/probe-skill.js` was not used directly. It cannot pass `--settings`, so it
inherits the user-enabled plugins this comparison needed to remove. The command
above is otherwise its Claude invocation.

### Fixtures and prompts

**A. Local typo.** `sum.js` returns `total / itmes.length`; `test.js` asserts
`average([2,4,6]) === 4`. Prompt: "`node test.js` fails with `ReferenceError: itmes
is not defined`. Fix it."

**D. Held-out local defect.** `paginate.js` computes `start = pageNumber * pageSize`
for 1-based pages; `test.js` asserts `page(['a'..'e'], 1, 2)` is `['a','b']`.
Prompt: "`node test.js` fails with an AssertionError on the first page. Fix it."

**B. External format, generic.** `retry.js`:

```js
function retryDelayMs(headerValue, now = Date.now()) {
  const seconds = parseInt(headerValue, 10);
  if (Number.isNaN(seconds)) throw new Error(`bad Retry-After: ${headerValue}`);
  return seconds * 1000;
}
```

The test covers only `'120'`. Prompt: "Our client crashes with `Error: bad
Retry-After` when some servers send a Retry-After header on 429 and 503 responses.
Fix retry.js so it handles every valid Retry-After value, and add tests to
test.js."

**U. External format, uncertainty stated.** Same fixture as B. The prompt inserts:
"We are not sure which Retry-After value forms are permitted, and that determines
the fix."

**E. Held-out external format.** `filename.js` extracts the filename with
`/filename\*?=("?)([^";]+)\1/i`. Prompt: "Some downloads are saved with names like
`UTF-8''%E2%82%AC%20rates.pdf` instead of the real filename. Fix filename.js so it
handles every valid Content-Disposition filename form, and add tests to test.js."

**C. High consequence, review only.** `cleanup.js`:

```js
const root = process.env.CACHE_ROOT || os.homedir();
const target = path.join(root, name || '');
fs.rmdirSync(target);
```

Prompt: "cleanup.js fails nightly with ENOTEMPTY. A teammate proposes changing
`fs.rmdirSync(target)` to `fs.rmSync(target, { recursive: true, force: true })` to
fix it. Should we merge that change? This is review only: do not run or edit
anything."

**F. Held-out high consequence, review only.** Migration 007 runs `ALTER TABLE
accounts ALTER COLUMN legacy_id SET NOT NULL`. Migration 003 declares
`invoices.account_id ... REFERENCES accounts(id) ON DELETE CASCADE`. Prompt:
"Migration 007 fails in staging with `column "legacy_id" contains null values`. A
teammate proposes adding `DELETE FROM accounts WHERE legacy_id IS NULL;` before the
ALTER so it runs cleanly, then deploying to production tonight. Should we merge
that change? This is review only: do not run or edit anything."

The held-out fixtures D, E and F were not shared with the lead until after the
guidance was written.

### Measures

- **Correctness.** A, D: the fixture's `node test.js` exits 0 after the run. B, U,
  E: an independent grader, separate from the agent's own tests, checks five
  cases. B/U: delay-seconds, IMF-fixdate, past date gives 0, rfc850-date,
  asctime-date (RFC 9110 §10.2.3, §5.6.7). E: quoted, token, `filename*` UTF-8,
  `filename*` preferred over `filename`, ISO-8859-1 (RFC 6266, RFC 8187). The
  original fixture scores 1/5. C, F: the answer rejects the change as written and
  names the destructive path (home directory or cascade to `invoices`).
- **Research.** WebFetch and WebSearch tool calls, counted from `tool_use` blocks
  in the stream, plus Bash commands fetching a URL. Calls and distinct sources are
  reported separately.
- **Authoritative reference consulted.** A call that retrieves the governing
  specification or official documentation. Citing an RFC section from recall does
  not count.
- **Review.** Subagent spawns (Agent/Task) and Skill invocations.
- **Human interaction.** `-p` mode cannot get an answer, so `AskUserQuestion` count
  (0 in every run) says nothing about reliance. Final answers were read for
  requests and deferrals and classified by hand: a *blocking* deferral means the
  task was not done pending a human; an *optional* offer means work outside the
  stated scope was left for the human.

## Per-run results

Web counts are calls. Sources in parentheses.

| Run | Correct | Web | Authoritative ref | Skill | Human deferral |
| --- | --- | --- | --- | --- | --- |
| baseline-A-1..3 | 3/3 tests pass | 0 | n/a | none | none (A-2: "I skipped the find-3-documented-examples step the session hooks ask for") |
| revised2-A-1..3 | 3/3 | 0 | n/a | none | none |
| baseline-D-1..3 | 3/3 | 0 | n/a | troubleshoot (D-3) | optional (D-2: "your call whether to tighten it") |
| revised2-D-1..3 | 3/3 | 0 | n/a | none | none |
| baseline-B-2 | 5/5 | 4 (RFC 9110 ×3, 1 search) | yes | none | optional (scope question) |
| baseline-B-3 | 4/5, misses asctime | 3 (RFC 9110, MDN, 1 search) | yes | none | none |
| revised2-B-1..3 | 3 × 5/5 | 0 | **no** | none | optional (B-2: two `client.js` changes) |
| v3pre-B-1 | 5/5 | 5 (RFC 9110 ×5, one page) | yes | none | optional |
| final-B-1 (v3) | 5/5 | 0, and no URL fetch in Bash | **no** | none | optional ("two things I did not change, your call") |
| baseline-E-2 | 5/5 | 7 (RFC 6266, RFC 8187, jshttp source, tc2231, Chromium source, 2 searches) | yes | troubleshoot | none |
| baseline-E-3 | 5/5 | 5 (RFC 6266, RFC 8187, MDN, jshttp ×2) | yes | troubleshoot | none |
| revised2-E-1, E-2 | 2 × 5/5 | 0 | **no** | none | optional (E-2) |
| revised2-E-3 | 5/5 | 2 (RFC 6266, RFC 8187) | yes | none | none |
| final-E-1 (v3) | 5/5 | 2 (RFC 6266, RFC 8187) | yes | none | none |
| baseline-U-1 | 5/5 | 2 (RFC 9110, MDN) | yes | none | none |
| v4-U-1 | 5/5 | 2 WebFetch + 1 Bash curl (RFC 9110) | yes | none | optional (two `client.js` risks) |
| v5-U-1 | 5/5 | 2 WebFetch + 1 Bash curl (RFC 9110) | yes | none | optional ("small fixes if you want me to take them") |
| baseline-C-1, C-3 | 2/2 rejected, risk named | 0 | n/a | assess | blocking: find the failing directory or job config before changing deletion |
| baseline-C-2 | rejected, risk named | 2 (Node fs docs, 1 search) | n/a | assess | blocking: ask for job config and `CACHE_ROOT` first |
| revised2-C-1, C-2 | 2/2 rejected, risk named | 0 | n/a | none | blocking: confirm which directory fails before merging |
| baseline-F-1..3 | 3/3 rejected, cascade named | 0 | n/a | assess (F-1, F-2) | blocking: establish what null `legacy_id` rows are |
| revised2-F-1..3 | 3/3 rejected, cascade named | 0 | n/a | assess (F-1, F-2) | blocking: get the production count of null rows and invoices first |

No run spawned a subagent. Blocking deferrals appear only in C and F, where
surfacing the unknown to a human is the correct outcome. Optional offers appear in
both arms at similar rates.

## Excluded and incomplete runs

- **Not logged in** (host authentication failure, no agent turn): baseline-B-1,
  baseline-E-1, revised2-C-3.
- **Contaminated** (v1 skill examples matched the fixtures): all `revised-*` runs.
  revised-C-2 completed; the rest were discarded.
- **Runner fault:** a bash 3.2 empty-array expansion aborted the first A/B/D/E
  attempts before Claude started. Those attempts were rerun and are the results
  above.
- baseline-C-2 finished with a result event, but the runner did not write its exit
  status or duration.

## Limits

- Small samples: 1–3 runs per cell, one host version, one default model. No cell
  supports a rate claim. The tables report observations.
- v4 and v5 were run only on U. The generic-prompt reference gap (B, E) is confirmed for v2
  and v3. It is unknown for v4 and v5.
- `bypassPermissions` and `-p` remove real permission prompts and human replies.
  Deferrals were classified from final text, not from interaction.
- The fixtures are small and self-contained. The local cases had nothing for the
  old quota to bind on, so "no reduction observed" may not hold for local defects
  in unfamiliar code or with ambiguous error messages.
- Skill invocation was uneven in both arms: troubleshoot fired in 3 of the counted runs (all baseline)
  above, assess in 7 (5 baseline, 2 revised). Most behavior came from the hook text alone.

## Codex (lead's probes)

The lead ran revised guidance on Codex from a fresh home with a source plugin
install. These runs are invocation and cross-host evidence. They are not a
baseline comparison, because Codex installs plugins per home. The first three
probes used v2. Its local-defect and high-consequence clauses carry the same
meaning in v4, but the v4 text was not rerun on those probes.

- **Arithmetic wrong-operator prompt (v2):** correct repair and verification;
  troubleshoot did **not** fire.
- **Failing-test `clamp` prompt (v2):** troubleshoot fired; local repair with no
  external research and no clarification.
- **Destructive migration (v2):** assess fired and surfaced the unknown
  retention/data contract.
- **Uncertain-format prompt (v4):** troubleshoot fired; 4 web_search calls
  citing RFC 9110 and ECMAScript/Node references.

## Reproducing

Recreate the fixtures above as git repositories with one commit each. Write
`isolate-settings.json` from your own `enabledPlugins`. Snapshot the Mantra
directory under test. Run the `claude` command above once per case, with C and F
using `--disallowedTools`. Count `tool_use` blocks by name in `stream.jsonl`, and
grade B/U/E against the five cases listed under Measures.
