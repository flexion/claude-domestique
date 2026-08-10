# Cross-host parity release evidence

Pull-request CI validates schemas, adapters, deterministic hook fixtures, exact
session handoffs, and sanitization. It does not authenticate to either model
host and does not establish model-level parity.

## Operator-run release gate

Run from an interactive terminal with an explicit disposable root:

```bash
PARITY_RELEASE=1 CLAUDE_API_KEY=... OPENAI_API_KEY=... \
  npm run parity:release -- \
  --release candidate-1 \
  --temp-root /absolute/disposable/parity-root \
  --claude-current 2.1.226 \
  --codex-current 0.147.0
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
