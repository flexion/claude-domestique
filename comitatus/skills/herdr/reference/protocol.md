# Herd messaging protocol

This is a convention layered over native `herdr agent prompt`. herdr types the line into the recipient's terminal and presses Enter. herdr has no inbox, stores no message, and gives no acknowledgement that the recipient processed anything. A reply from the recipient is the only end-to-end evidence.

## Message envelope

Every message is one physical line, because a newline submits the recipient's turn early:

```text
[from <self> reply #<id>] <body>
[from <self> fyi #<id>] <body>
```

- `<self>` is the handle you were assigned in your briefing. Never infer it from the focused pane or from `agent list`.
- `reply` means the recipient owes a one-line answer back to `<self>`. `fyi` means no answer and no acknowledgement.
- `#<id>` is a short correlation id the sender picks, such as `#a3f9` or `#seed-jay`.
  - A reply carries the id it answers.
  - The same id arriving twice is a duplicate to ignore.
  - An id is a convention, not a guarantee: herdr gives no exactly-once delivery.
- `[herd +<handle>]` and `[herd -<handle>]` are roster directives. They are not from/to messages, so they are never replied to or rebroadcast.

When a message carries more than a sentence of content, write the content to a file in the shared worktree, for example `.pipeline/<topic>.md`. Send a line naming the path. Files survive, and terminal text does not.

## Sending

```text
herdr agent prompt jay "[from sly reply #a3f9] rerun the failing test in src/api/; findings to .pipeline/api-test.md"
```

`--wait --until working --timeout 15000` adds an observation that the recipient was in a working state after submission. It does not show that your message caused that turn: a recipient that was already working satisfies it too. herdr serializes submissions per terminal, so concurrent senders never interleave their text. No lock is needed, and none exists.

## Reading a send result

| Result | Was anything typed? | What to do |
| --- | --- | --- |
| exit 0, `agent_prompted` | Yes: the text and Enter were submitted | Wait for the reply. Submission is not processing. |
| `agent_blocked` | No: herdr refused before typing | The recipient is at a detected modal or permission prompt. Tell the human, or wait until it is unblocked. Nothing bypasses this check. |
| `agent_not_found` | No | The handle is wrong or the agent is gone. Check `herdr agent list`. |
| `agent_pane_busy`, `agent_not_ready` | No | Transient. One retry after a short pause is safe. |
| `agent_prompt_stalled` (with `--wait`) | Submitted, but no working or blocked state was seen within 5 s | Unknown whether the recipient took it. Inspect (see below). |
| `timeout` | Unknown: the wait can expire before or after submission | Unknown. Inspect (see below). |
| `PermissionDenied` / `Operation not permitted` | No: your own sandbox blocked the herdr socket | Most likely your harness has no rule for this command. Tell the human which command failed. Do not retry it, and do not route it through another script. |

**After a stall or timeout, inspect; never infer loss from absence.**
1. Run `herdr agent read <handle> --source recent-unwrapped --lines 80` and `herdr agent get <handle>`. If `recent` is empty, also try `--source visible`.
2. Act only on what you can positively see:
   - **The line is in the conversation, or the agent is working on it:** it arrived. Do not resend; wait for the reply.
   - **The line is visibly stuck:** typed into a menu, or still sitting unsubmitted in the composer. The recipient did not take it. Do not clear an unfamiliar menu yourself; ask the human. Once the pane is clear, resend the same line with the same id.
   - **The line is simply not visible:** the outcome is unknown. It may have scrolled away, been consumed, or be queued behind a running turn. Do not resend. Check again after the recipient's current turn ends, and ask the human before sending it a second time.

Keep the exact text and id of every `reply` message until it is answered, so any resend the human authorizes is identical and the recipient can drop the duplicate.

Seeing the text in the pane proves it reached the terminal, not that the recipient acted on it. `idle` or `done` after a send does not prove the request was handled either: the agent may have finished an earlier turn.

## Receiving

- `[from X reply #id] ...` means: do the work, then answer X with one line, `[from <self> fyi #id] <answer>`. Send it with `herdr agent prompt X "..."` as a real shell command. Do not print it as text.
- `[from X fyi #id] ...` means: act on it if relevant, and do not answer.
- `[herd +H]` / `[herd -H]` means: add or drop H from your roster idempotently. Do not reply and do not rebroadcast.
- Reading a peer's pane is a diagnostic step, not the channel.

## Briefing a cold agent

A newly launched or relaunched agent knows neither its handle nor this protocol. An agent that was already running and is promoted into a herd counts as cold too. Send one line, filled in from the template below, and require the reply:

The template has two kinds of placeholder:
- **`{braces}` are yours to fill in before sending:** `{sender}`, `{member}`, `{path}`, `{ws}`, `{roster}`, `{lead}`, `{launcher}`.
- **`<angle brackets>` stay exactly as written.** The member fills them in for each message it sends later: `<peer>`, `<id>`, `<body>`.

```text
[from {sender} reply #seed-{member}] you are {member}, a member of a herd working in {path} (herdr workspace {ws}); roster: {roster}; working lead: {lead}; {launcher} launched this herd and is outside it: not a member and not its coordinator, so do not wait on it unless your task names it as an approver; PROTOCOL: message a teammate with exactly one line by RUNNING herdr agent prompt <peer> "[from {member} reply #<id>] <body>" when you need an answer, or "[from {member} fyi #<id>] <body>" when you do not; answer a "[from X reply #id]" line with one line to X marked fyi carrying the same id; never answer an fyi line; "[herd +H]"/"[herd -H]" are roster updates to apply without replying or rebroadcasting; content longer than a sentence goes in a file, with a message naming its path; confirm now by RUNNING herdr agent prompt {sender} "[from {member} fyi #seed-{member}] <your handle, roster, working lead, and that you can run herdr agent prompt>"
```

Answers are always marked `fyi`. An answer marked `reply` obliges the original sender to answer the answer, and two agents can loop.

Fill in the template as follows:
- **Roster:** list the lead first. The working lead must be a member of the roster.
- **Launcher:** if the sender is not in the roster, it is named as the outside launcher. Drop that clause when the launcher is a member.
- **Task:** add task context after the protocol clause, or put it in a file and name the path.

The filled-in briefing is one shell argument to `herdr agent prompt`. Quote it, and escape its inner double quotes for your shell.

The briefing is confirmed only when the recipient's reply arrives. A finished wait or an idle state does not confirm it.

## Membership

- **Add a member:**
  1. Launch the agent.
  2. Brief it with the current roster.
  3. After its reply, send `[herd +<new>]` to each existing member.
- **Remove a member:**
  1. Send `[herd -<gone>]` to each remaining member.
  2. Close the agent's tab.
- **Check that the roster is current**, which catches departures nobody announced:
  1. Run `herdr agent list` and keep the `name`s whose `workspace_id` is the herd's workspace.
  2. Drop your own handle.
  3. Compare by handle with your roster. Never compare by pane id: a restart changes the pane, not the handle.
  4. Apply any difference, and announce it to the other members, except the subject.
- **Scope by workspace.** An unfiltered `agent list` covers every workspace and is not the roster. Keep a launcher that is outside the herd in its own workspace, so it is never counted as a member.
- **Broadcast** is one `agent prompt` per intended recipient. Leave out yourself, and the subject of a membership directive. Report each recipient's result separately, because one failure does not stop the others.

## Withdrawal

A member that is leaving, including a lead, hands off before it goes:

1. Confirm the successor is a live member: run `herdr agent list`, and check that its handle is in the herd workspace and in the roster.
2. Send the handoff as a `reply` message: what is in flight, where the files are, and the decisions still open.
3. Wait for the successor's reply. Until it arrives, you still own the work.
4. Tell every other remaining member, one `fyi` each, who now owns the work: `[from <self> fyi #<id>] <successor> is now working lead; do not wait on <self>`. Report each recipient's result separately.
5. Send `[herd -<self>]` to each remaining member, the successor included.
6. Close your own tab with `herdr tab close <your-tab>`, taking the tab id fresh from `herdr agent get <self>`. Do not close the workspace, which would close the remaining members.

The remaining members continue without waiting on the departed agent. If no coordinator remains, the roster is authoritative, and any member may continue or nominate one.

## Channels outside the pane

Panes are the one channel that reaches every agent kind in both directions. Two others exist. Treat both as optional.

- **`codex queue --thread <session-id> --message "<line>"`** reaches a Codex session through Codex's own queue. Run it with the recipient's `CODEX_HOME`. It works even when the recipient was launched with `--no-daemon`, and delivery took up to about 35 s in testing. Only Codex sessions can receive this way.
- **Claude Code's per-session inbox socket** accepts posts from local scripts. A message posted this way arrives labelled as another Claude session, with no authenticated sender. It also depends on Claude Code internals that can change between releases. Do not build herd coordination on it.
