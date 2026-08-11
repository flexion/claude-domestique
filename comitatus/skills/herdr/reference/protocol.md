# herd messaging protocol

This protocol is a convention layered over herdr's terminal agent API. It is not a
mailbox: `agent prompt` writes to the recipient's terminal, and herdr 0.8.0 exposes no
durable inbox or processing acknowledgement.

## Message envelope

Messages are one line and carry a sender plus an intent:

```text
[from <self> reply #<id>] <body>
[from <self> fyi #<id>] <body>
```

`reply` requires an answer; `fyi` does not. A reply is the only end-to-end evidence that
the recipient processed a message. Delivery has three outcomes: `accepted` means herdr
typed and submitted the prompt, `observed` adds a turn-start or nonce observation, and
`undeliverable` means herdr refused before typing. Receivers ignore `#<id>` except to
detect duplicates. Never blindly resend an accepted but unobserved prompt: it may already
have reached the pane.

## Sending

Use the helper's `send` verb so sender stamping, model-specific submission, per-recipient
serialization, and delivery evidence are consistent. It may send to idle, working, done,
or unknown agents; blocked is a hard gate because a modal can consume keystrokes. Only one
sender may submit to a recipient at a time. A unique nonce and the pre-submit state sequence are diagnostic
evidence, not a durable acknowledgement. A successful echo proves text reached the pane,
not that the recipient saw or acted on it.

Blocked is a hard gate: a permission modal can consume keystrokes, so return
`undeliverable` with `recipient_blocked` and do not type. Idle, working, done, and unknown
may be submitted, but unknown remains observationally uncertain. Pre-authorize herdr
commands for every harness before autonomous coordination.

`--force` is an explicit unsafe override for a blocked state. Use it only when the modal
has been independently cleared and the status detector is stale; it is not a reliability
mechanism and can misroute keystrokes if used on a live dialog.

## Cold-agent seeding

Before relying on a new or relaunched agent, use the helper's `seed` flow to provide its
handle, the current roster, the one-line envelope rules, the workspace identity, and the
lead/handoff status. Seeding is repeatable and idempotent; the `seed` verb always requests
a reply. Its optional `--wait` only reports that the recipient finished a turn; the reply
landing in the sender's pane is the proof the seed was processed.

## Lead withdrawal

A lead may seed the herd and then withdraw. The handoff is explicit: identify the active
coordinator, send the handoff first, send `[herd -self]` to each member, and only then close
the lead's pane. Remaining
members own the work and must not wait for the departed lead. If no coordinator remains,
the roster itself is authoritative and any member may continue or nominate one.

## Roster synchronization

While active, each member compares the workspace-scoped helper roster with its local
roster. On a delta, it applies `[herd +<handle>]` or `[herd -<handle>]` idempotently and
notifies the other members except the subject itself. A received directive is never replied to or rebroadcast; this
avoids an O(N²) storm. A restart is keyed by handle, not pane id, so it is not a false
membership change.
