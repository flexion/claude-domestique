# Session: teams-discovery-preflight

## Details
- **Branch**: issue/feature-209/teams-discovery-preflight
- **Type**: feature
- **Created**: 2026-11-02
- **Status**: in-progress

## Goal
Issue #209: make `comitatus:teams` discoverable, check the Microsoft 365 connector
before the PowerShell route, and cover first-run setup (module, tenant ID, chat
link, one-shot shells, device code, quiet output, send safety).

## Approach
Skeptical intake in `.pipeline/209-intake.md`, verified by ned in
`.pipeline/209-intake-review.md`. User decisions: keep #207's no-shipped-helper
rule (document a single-script pattern only); PowerShell fallback is a different
OAuth client and needs the user's confirmation; always-on SessionStart pointer to
the skill, inside herdr or not. ned's corrections adopted: read scopes are
`Chat.Read` or `Chat.ReadWrite`; any existing chat ID works, not only meeting
chats; reject `/meet/` and `/l/chat/0/0` links; keep `-TenantId` explicit.

## Session Log
- 2026-11-02: Live `get_granted_scopes` call returned `{"grantedScopes":[...]}`;
  this account has `Chat.Read` but neither `ChatMessage.Send` nor `Chat.ReadWrite`,
  matching the reported 403.
- 2026-11-02: TDD. Hook emits the Teams pointer always (alone outside herdr, with
  no status line). SKILL.md rewritten: description, Choose a route, Prerequisites,
  Inputs, one-line scope check, quiet disconnect, Run as one script, send safety.
  Fixture now observes example output; mutation checks confirmed the scope-line,
  quiet-disconnect and no-install tests fail when the skill regresses.
- 2026-11-02: comitatus 89/89, full `npm test` passes; `validate:plugins`, Claude
  marketplace and comitatus `--strict` validation pass; isolated Codex 0.166.0
  install of comitatus 2.3.0 carries the new skill. Bumped comitatus to 2.3.0.

- 2026-11-02: Fresh-host probes (`scripts/probe-skill.js`, how-to prompt for
  posting Hello to a meeting chat, no send requested): Claude fired
  `comitatus:teams` and answered connector-first with confirmation before the CLI;
  Codex 0.166.0 fired `teams`. One run per host, no baseline arm.

- 2026-11-02: ned's diff review (`.pipeline/209-diff-review.md`): fixed both P2s
  test-first. Chat ID now also comes from `/l/message/<chat ID>/...` links, with
  channel posts (`@thread.tacv2`, `groupId=`) excluded; the one-script header no
  longer trims the message file. Added connector read (`read_resource`) and listing
  scope notes; qualified README statements that the hook is silent outside herdr.
  comitatus 89/89, full suite, validators and `git diff --check` pass.

- 2026-11-02: ned rechecked and approved: both P2s resolved, no remaining
  blockers (verdict appended to `.pipeline/209-diff-review.md`).

- 2026-11-02: Live test in a user-supplied meeting chat (IDs kept out of the repo).
  Connector `read_resource` on `teams:///chats/<chat ID>/messages` returned recent
  messages (not documented in the tool description). Message webUrls carry
  `tenantId=`. User confirmed the PowerShell fallback and the test text; the
  one-script pattern ran in the background with `-NonInteractive`, the device-code
  line appeared in the output file and was relayed, scope line printed
  `ChatMessage.Send: True; Chat.Read: True`, the send returned an ID, and a
  connector read-back showed the exact text. Skill updated with these facts and
  tests added; the temporary script was deleted.

- 2026-11-02: User direction: the command-line send is how Teams messages are
  sent. Removed the connector send and the confirm-before-fallback gate; the
  connector is now a read route only. Do not try the connector send until the user
  says `ChatMessage.Send` has been granted. comitatus 88/88, validators pass;
  Claude probe re-run fired `comitatus:teams` and planned a PowerShell send.

- 2026-11-02: Live conversation test (fox Claude, ned Codex) in the user's chat.
  fox signed in once via an improvised background session and sent/read; first
  device code expired at 120 s. ned was blocked by the Codex sandbox twice:
  PSReadLine history, then `~/.mg/mg.authrecord.json` denied. `codex sandbox`
  (0.166.0) confirmed: `~/.mg` write denied by default, allowed as writable root;
  Graph unreachable without `network_access`. Logs: `.pipeline/209-live-friction-*.md`.
- 2026-11-02: Fixed test-first: Codex sandbox requirements (`~/.mg` writable root,
  network access, `-NonInteractive -File`) in skill and README; 120 s device-code
  window; "Hold a conversation" sign-in-once request-file loop; ask for a message
  link first; one-line receive output skipping system events; connector page-read
  note. Mutation checks pass. comitatus 93/93, full suite, validators pass.

- 2026-11-02: Added a Codex sandbox section with a pre-sign-in check (~/.mg
  write, Graph DNS) and the `codex resume` flags; the test caught a missing
  `-ErrorAction Stop`. Under `codex sandbox`, the check reports "no network"
  without grants and passes with both. The `~/.mg` denial seen earlier (`touch`
  under `codex sandbox`, and twice in ned's session) no longer reproduces under
  `codex sandbox` with unchanged config; requirement kept on ned's evidence.
- 2026-11-02: Rebased onto origin/main (#208, which took 2.3.0): resolved
  hooks.json, SKILL intro and README conflicts; comitatus bumped to 2.4.0.
  comitatus 148/148, full suite, validators and diff check pass.

- 2026-11-02: Live three-round conversation, fox (Claude Code) and ned (Codex
  0.166.0, relaunched with `--add-dir ~/.mg` and sandbox network). Both used the
  documented header + Prerequisites (+ Codex check) + Connect + Hold a
  conversation loop: one sign-in each, herdr rings after each send, clean stop and
  quiet disconnect. ned's first code expired once (120 s). Inputs came from one
  message link. New findings fixed test-first: multi-line bodies broke the
  one-line read output (now `\n`-escaped); message handling now says Teams wakes
  no idle agent and points at the herdr/mail doorbells. comitatus 149/149.

- 2026-11-02: Consistency pass against 2.3.0 (#208): Teams message handling now
  names senders `[from <me> (<alias>) ...]` from the `[comitatus] you are` line,
  and prefers the comitatus mail doorbell over the herdr protocol. comitatus 150/150.

## Validation Limits
No connector send: not granted, and not to be tried until the user says so. `Install-Module -Force` behavior and the
default tenant without `-TenantId` remain unverified and are worded as such.
The scope line ignores `Chat.ReadWrite`. 

## Next Steps
1. Commit and open a PR for #209 once the user approves.
