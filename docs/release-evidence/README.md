# Cross-host parity release evidence

Pull-request CI validates schemas, adapters, deterministic hook fixtures, exact
session handoffs, and sanitization. It does not authenticate to either model
host and does not establish model-level parity.

## Operator-run release gate

Run from an interactive terminal with an explicit disposable root:

```bash
PARITY_RELEASE=1 \
  npm run parity:release -- \
  --release candidate-1 \
  --temp-root /absolute/disposable/parity-root \
  --claude-current 2.1.226 \
  --codex-current 0.147.0
```

No API key is required. Both hosts may be authenticated by CLI subscription
login, and neither carries an API-key environment variable, so authentication is
proved by probing each host's own status command rather than by inspecting the
environment. Any `GITHUB_EVENT_NAME` disqualifies the run: the gate is
operator-run, and the other prerequisites are all reachable from a workflow.

### Subscription login inside an isolated host home

Each trial runs in a fresh `CLAUDE_CONFIG_DIR` / `CODEX_HOME` so plugin caches,
session state, and the candidate set cannot leak between the control and guided
arms. Subscription logins are directory-scoped, so a fresh home starts
unauthenticated:

```bash
CODEX_HOME=$(mktemp -d) codex login status         # Not logged in
CLAUDE_CONFIG_DIR=$(mktemp -d) claude auth status  # {"loggedIn": false}
```

The two hosts need different answers, because they store a subscription login
differently.

**Claude: a token, no seeding.** On macOS the subscription login lives in the
Keychain under service `Claude Code-credentials`, and an isolated config directory
cannot reach it — confirmed by copying a near-complete `~/.claude` into a
temporary directory, which still reported `loggedIn: false`. Mint a long-lived
token instead and pass it through the environment, where it reaches every trial
home without any file being written:

```bash
claude setup-token   # run in a real terminal; it is an interactive OAuth flow
export CLAUDE_CODE_OAUTH_TOKEN=...
CLAUDE_CONFIG_DIR=$(mktemp -d) claude auth status
# {"loggedIn": true, "authMethod": "oauth_token", ...}
```

Keep the token out of the repository, out of shell history, and out of argv. With
the 1Password CLI, inject it for the single command so it never enters the
ambient shell:

```bash
op run --env-file=<(echo 'CLAUDE_CODE_OAUTH_TOKEN=op://<vault>/Claude Code parity token/credential') -- \
  env PARITY_RELEASE=1 npm run parity:release -- --release candidate-1 \
  --temp-root /absolute/disposable/parity-root
```

`op run` masks secrets only in its own output, so the token's protection in
retained evidence comes from `sanitizeEvidence`, which redacts it under the
`TOKEN` name rule, and from `verify-release-evidence`, which rejects a bundle
where an unsanitized value survives.

**Codex: a seeded login file.** `auth.json` copied into the isolated `CODEX_HOME`
authenticates it (`Logged in using ChatGPT`). The runner seeds only the login
artifact and carries nothing else, because settings, plugin state, and history all
influence the behavior under test. Discovery matches `credentials.json`,
`auth.json`, and `token.json`, with or without a leading dot. The seeded file is
overwritten and removed as soon as the host invocation returns, so residency stays
at a few files rather than one per trial across the matrix.

Seeding is an allowlist and can be wrong, so preflight probes each host's status
command inside a seeded home before any scenario runs. A host that is not
authenticated there stops the run with a message naming what was seeded and from
where. Override discovery when a host keeps its login elsewhere:

```bash
PARITY_CLAUDE_AUTH_FILES=".credentials.json,session.json"
PARITY_CODEX_AUTH_FILES="auth.json"
PARITY_CLAUDE_HOME=/absolute/path/to/real/claude/home
PARITY_CODEX_HOME=/absolute/path/to/real/codex/home
```

The minimum cells are fixed at Claude `2.1.226` and Codex `0.147.0`. When a
current version equals its minimum, execute it once and record both role labels.
Behavioral failures are not retried; one classified infrastructure failure may
be retried and both attempts remain evidence.

Before spending the full matrix, calibrate with a single scenario. The spawn path
in `scripts/parity/process.js` is exercised only by injected fakes in CI, so the
first authenticated run is also its first real execution:

```bash
node scripts/run-parity.js --mode deterministic --scenario stilus-review-positive
```

`--scenario` accepts a comma-separated list of scenario ids and applies to both
modes. An unknown id fails the run rather than yielding an empty pass. Unknown
options are rejected outright, so a misspelled `--claude-current` can no longer
fall back to the minimum while the manifest still stamps a `current` role. Each
host cell's binary is probed with `--version` and the run aborts unless the
binary reports the declared version.

## Manual Codex hook trust checkpoint

Hook trust is intentionally interactive and cannot be satisfied with
`--dangerously-bypass-hook-trust`:

1. Record the SHA-256 hash of the installed `hooks/hooks.json`.
2. Run the hook scenario before trust and record that Codex skipped it.
3. Open `/hooks`, inspect the same hash, and approve it.
4. Run the scenario again and record the expected sentinel.
5. Store `reviewed_hook_hash`, the identical `approved_hook_hash`,
   `approved_via: "/hooks"`, `before.skipped: true`,
   `after.sentinel: true`, and `bypass_used: false` in `manifest.json`.

The runner must stop with `manual_trust_required` and print the isolated Codex
home before this checkpoint. Approval evidence is a human-reviewed release
artifact; PR CI never fabricates or bypasses it.

## Retention and validation

Evidence records use an allowlist and redact credentials, authorization values,
and home paths before writing. Inspect the bundle before retaining it. If a
credential or unrelated history appears, delete the unsafe bundle, fix the
sanitizer, and rerun rather than editing the leaked record in place.

Validate a completed bundle with:

```bash
npm run parity:verify-evidence -- docs/release-evidence/<release-directory>
```

Only a bundle containing all minimum/current host roles, the hash-linked manual
trust transition, and passing required scenarios can support a parity claim.
