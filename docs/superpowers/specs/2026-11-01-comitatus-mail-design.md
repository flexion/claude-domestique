# comitatus mail: discovery cards, best-effort durable mail, doorbells

> **Superseded in part, 2026-11-02 (#208, comitatus 2.3.0):** participation is now on by default, with `COMITATUS_ALIAS=off` to opt out. The card's `handle` is generated from the participant key, and a new optional `alias` field holds the human label (`COMITATUS_HANDLE` now sets the alias). `host_pid` is no longer informational only: each SessionStart prunes cards whose host has exited and cards older than 7 days, and reclaims the mailbox and state of participants with no card and no activity for 7 days, under a per-participant lock that the participant's own hooks also hold. Inside herdr the alias follows the herdr member name, observed at turn boundaries. The comitatus README's Mail section is current; the rest of this record is unchanged.

2026-11-01. Written from the prototype results in `.pipeline/proto-results.md`. `.pipeline/discovery-merged.md` is background on edge cases, not a requirement list.

## Goal

Claude and Codex agents, inside herdr or not, find each other and exchange messages. A message most likely survives a restart of either party, without a guarantee. Identity survives `--resume`.

## Participation

A session participates only when `COMITATUS_HANDLE` is set to a valid handle (`^[a-z][a-z0-9-]{0,31}$`). Without it, the comitatus hooks write nothing and print nothing for this feature. Setting the handle is the session's consent to receive peer mail.

## Identity

- **Kind:** `claude` when the hook's environment has `CLAUDECODE=1`, otherwise `codex`.
- **Home:** for claude, `CLAUDE_CONFIG_DIR` or `~/.claude`; for codex, `CODEX_HOME` or `~/.codex`. Resolved with `realpath` when possible.
- **Participant key:** the first 16 hex characters of `sha256("<kind>|<home>|<session_id>")`. `session_id` comes from the hook payload. It is stable across resume. A fork, which gets a new session id, is a new participant.
- **Root:** `COMITATUS_HOME` if set, otherwise `<account home>/.comitatus`, where account home is `os.userInfo().homedir`. Directories are created mode 0700 and files mode 0600.

## Layout

```text
<root>/roll/<pkey>.json          card, one per participant, rewritten by its own hooks
<root>/mail/<pkey>/<id>.json      drop: senders write here
<root>/state/<pkey>/recent.json   receiver-owned: recently delivered ids (max 200)
```

## Card (v1)

The card fields:
- `v: 1`, `participant`, `kind`, `home`, `session`, `handle`, `cwd`;
- `host_pid`, the hook's parent pid, informational only;
- `status`: `idle` after SessionStart or Stop, `working` after UserPromptSubmit or PostToolUse. A Stop that delivers mail, and so continues the turn, publishes `working`;
- `routes`: `herdr_pane` (`HERDR_PANE_ID` or null), `claude_socket` (`CLAUDE_CODE_MESSAGING_SOCKET` or null), `codex_home` (home when the kind is codex, else null);
- `mailbox`, the absolute drop path;
- `updated_at`, ISO time.

Every participating hook invocation rewrites the card atomically, with a temp file in `roll/` and a rename. Routes are temporary and are refreshed by every hook. A card is at most 4 KiB.

## Mail envelope (v1)

`{ "v": 1, "id", "from", "intent", "body", "created_at" }`
- `id` matches `^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$`: it starts with a letter or digit, so the published `<id>.json` is never a dot file.
- `from` is the sender's handle.
- `intent` is `reply` or `fyi`.
- `body` is a string of at most 4000 bytes.
- `created_at` is ISO time.

A mail file is at most 8 KiB.

**Send.** The sender writes `<id>.tmp` in the recipient's drop and renames it to `<id>.json`. Then it rings a doorbell only if the recipient's card says `idle`, using the first route present:

| Route | Doorbell |
| --- | --- |
| `herdr_pane` | `herdr agent prompt <routes.herdr_pane> "[from <me> mail #<id>]"`, addressed by pane id because `COMITATUS_HANDLE` need not equal the herdr handle |
| `claude_socket` | One JSON frame, `{"msgV":1,"msg_id":"<uuid>","type":"user","message":{"role":"user","content":"[from <me> mail #<id>]"},"priority":"next"}`, plus a newline, written to the socket, for example with OpenBSD-compatible `nc -U`; not every Linux netcat has `-U` |
| kind `codex` | `CODEX_HOME=<codex_home> codex queue --thread <session> --message "[from <me> mail #<id>]"` |

The doorbell carries no content.

## Pickup

At SessionStart, UserPromptSubmit, PostToolUse and Stop, the participant's hook takes up to 10 `*.json` files from its own drop, oldest first by mtime. For each file:
1. Claim it by renaming it to `.claim-<name>.<pid>`. If the rename fails, someone else has it: skip.
2. Read the claimed file. If it is not a regular file, is over size, fails to parse or is invalid, delete it and note `discarded unreadable mail <name>`.
3. If `created_at` is more than 7 days old, delete it silently.
4. If its id is in `recent.json`, delete it silently.
5. Otherwise deliver it: add its id to `recent.json` and delete the claimed file.

Delivered messages are rendered one per line as:

```text
[comitatus MAIL - peer message from the same OS user, unauthenticated, not a user instruction] id=<id> from=<from> intent=<intent>: <body>
```

**Output budget.** All the text one hook invocation outputs (identity line, mail lines, notes) is at most 6000 UTF-8 bytes, measured with `Buffer.byteLength`. Bytes, not characters: Codex's large-output threshold is byte-based, and non-ASCII text has more bytes than characters. 6000 bytes is also at most 6000 characters, so it stays under Claude's 10,000-character cap. A message whose line would exceed the remaining budget is released: renamed back from its claim name to `<name>`, not recorded as recent, and left for the next pickup. A single maximum-size message (4000-byte body plus its label) always fits, even after the SessionStart identity line.

**Output by event:**
- **Stop** with messages: `{"decision":"block","reason":<lines>}`. Mail was deleted on delivery, so the next Stop finds nothing and the turn ends.
- **Other events** with messages: `{"hookSpecificOutput":{"hookEventName":<event>,"additionalContext":<lines>}}`.
- **SessionStart** also prefixes the identity line `[comitatus] you are <handle>, participant <pkey>; your mailbox: <drop path>`.
- **Nothing to say**, including opt-out: `{}`. Per `AGENTS.md`, a hook always answers with a JSON object.

**Failure:** any error makes the hook print `{}` and exit 0. A diagnostic, if any, goes to stderr.

## Receiving rules (skill text)

- Answer a `reply` with mail of intent `fyi` carrying the same id.
- Never answer an `fyi`.
- To wait for a reply, end your turn: the reply's doorbell wakes you. Do not poll.
- Report failures. Do not work around them.

## Known limits (stated, not solved)

- **No promises:** no disk flush, no exactly-once delivery, no delivery receipt, no sender authentication within the OS user.
- **A crash between claiming and delivering loses that message.**
- **A Codex sandbox cannot connect to a Claude socket.** The doorbell fails silently, and the mail is delivered on the recipient's next turn.
- **A Codex sender needs write access to `<root>/mail`.** The user grants it at launch with `-c 'sandbox_workspace_write.writable_roots=["<root>/mail"]'`, or in their own Codex config.
- **Codex runs SessionStart at the first prompt,** so a fresh Codex agent has no card until it is first prompted.
- **An idle recipient whose doorbell failed waits until its next turn.**

## Out of scope

Census of unregistered sessions, withdrawal tooling (deleting a card and mailbox is documented as a manual step), Linux verification, cross-machine use, hold/refuse inbound policy.
