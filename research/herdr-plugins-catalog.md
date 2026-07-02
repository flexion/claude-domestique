# herdr plugin ecosystem — assessment against comitatus goals

Source: GitHub topic `herdr-plugin` (the marketplace index), queried 2026-07-02. 52 repos found; the ones relevant to our goals are graded below. None are vetted by herdr — review before installing.

Our goals: (1) reliable agent-to-agent workflow with few permission interruptions, (2) worktree + herd lifecycle automation, (3) operator visibility/control, (4) less comitatus code.

## Directly relevant — candidates to adopt

> Operator constraint (2026-07-02): remote approval channels (phone/Telegram/email) are **out of scope** — the goal is local autonomy via prompt elimination, not rerouted approvals. The notify/approve rows below are kept for the record but downgraded.

| Plugin | ⭐ | What it does | Fit |
|---|---|---|---|
| `dcolinmorgan/herdr-remote` | 13 | Monitor + approve agents from phone/menu bar/Telegram, no SSH | **Out of scope** per operator constraint (remote approvals not wanted). |
| `AltanS/collie` | 1 | Phone web UI for the herd over tailnet: see who's blocked, reply with a thumb | **Out of scope** — same reason. |
| `yankewei/herdr-focus-notify` | 1 | Clickable macOS toast when an agent goes blocked/done; click focuses the pane | **Optional local convenience** (macOS-only, so not a workflow dependency). Useful awareness; the real fix is agents that rarely block. |
| `razajamil/herdr-plugin-workspace-manager` | 7 | Declarative tab/pane layouts auto-applied on `worktree.created` | **Medium-high.** Overlaps with up.js's tab loop; our tabs are dynamic (per-request handles), so partial fit — but proves the event-hook bootstrap pattern we should copy. |
| `tdi/herdr-worktree-setup` | 4 | Per-project setup steps on worktree create (copy .env, direnv, deps) | **Medium.** Complements `up` — env bootstrap is something up.js does not do. |
| `persiyanov/herdr-reviewr` | 21 | Native code-review sidebar; line comments sent back to agent chat | **Medium.** Built for the human reviewing an agent's diff; our jay-reviews-fox flow stays message-based, but dan reviewing either agent's work gets much better ergonomics. |
| `ogulcancelik/herdr-plugin-github-start` | 3 | Start codex/claude from a GitHub issue/PR/discussion | **Medium.** Natural onus integration: work item → herd in one action. |

## Worth watching / situational

| Plugin | ⭐ | Notes |
|---|---|---|
| `madarco/agentbox` (+ agentbox-herdr-plugin) | 200 | Parallel agents in sandboxed VMs. The permission problem inverts inside a sandbox (allow-by-default becomes safe). Heavyweight; revisit if we want risky/autonomous herds. |
| `fkiene/llmtrim-herdr` | 3 | Claims −31% input/−74% output tokens per agent pane with a live badge. Cost lever; verify claims before trusting it in the request path. |
| `andrewchng/herdr-sessionizer` | 6 | Fuzzy-open projects/worktrees, TOML-declared workspace bootstrap. Operator QoL. |
| `JanTvrdik/herdr-command-palette` | 5 | fzf palette to run any plugin action. Becomes useful if we ship our own actions. |
| `persiyanov/herdr-fresh-worktree` | 1 | Reset new worktree to latest origin default — overlaps with up.js's `git fetch` + `--base origin/main`. |
| `wyattjoh/herdr-plugin-renamer` | 1 | Auto-renames worktree branch/workspace from the agent's first prompt. Conflicts with our naming convention (we keep herdr defaults) — note as a *do-not-install*. |
| `zom-2018/herdr-ntfy-notify`, `tiny-send/tinysend-herdr` | 4/1 | ntfy push / email-reply-to-unblock. Alternatives in the same notify/approve space as herdr-remote. |
| `0x5c0f/herdr-insight`, `Davidcreador/herdr-token-dashboard`, `CodyBontecou/herdr-telemetry-bridge` | ≤2 | Agent state timeline / token spend / telemetry export. Observability if the herd count grows. |
| `smarzban/herdr-file-viewer`, `dutifuldev/ghzinga`, `edmundmiller/herdr-plugin-hunk` | ≤27 | Read-only file/diff/issue viewers in panes. Operator QoL, not workflow-critical. |

## Not relevant

Navigation/UX (vim-herdr-navigation, herdr-splits.nvim, last-workspace, picker-plus, tiles, fzf-url, pluck, sync, scrollback-capture, window-title-sync, input-source), dotfiles repos, jj/worktrunk VCS variants (we're plain git), aws-ssm, flist, cmux, traex, git-status, devup, helpr, setup-bootstrap (duplicate of worktree-setup niche), token dashboards beyond one.

## Strategic takeaways

1. **The ecosystem's center of gravity is exactly our pain**: blocked-agent notification/approval (5+ plugins) and worktree bootstrap (4+ plugins). We are not alone in these problems, and herdr's event hooks are how everyone solves them — evidence the hook mechanism is mature enough to build on.
2. **Nobody has built agent-to-agent messaging as a plugin.** The from/to protocol niche is empty: if we build a `comitatus` herdr plugin (store-and-forward mailbox with deliver-on-idle event hooks, verified submits), it would be both our fix and a legitimate marketplace contribution.
3. **Distribution proof**: plugins ship from plain GitHub repos with a TOML manifest and get versioned installs/updates through `herdr plugin install` — strictly better than our hand-rolled stable-copy provisioning for the parts of comitatus that serve herdr itself (the messaging helper), while the Claude-side skill/rules stay a Claude Code plugin.
