# Evaluating a plugin

Every other check in this repository is static. `validate:plugins` reads manifests
and frontmatter, the Claude and Codex validators read manifests, and the Jest
suites read code. None of them can answer the question that decides whether a
plugin does anything: **does the skill fire when it should, and does the answer
change when it does.**

That is only answerable by running an agent and watching what it invokes.

## Why static checks are not enough

modus shipped `skills/agent-work-item` with a description that passed `validate:plugins`
and every manifest validator. On the first realistic prompt — a ticket, and "what
should I do first" — it did not fire. `mantra:assess` won instead.

The description was rewritten and it fired. The rewrite then failed
`validate:plugins`, because the wording that triggered reliably used
output-summary language the repository bans. **The description that fires and the
description the rules permit were briefly in conflict**, and nothing but a real
run surfaced that.

## Two hosts, two mechanisms

### Claude

```bash
claude --plugin-dir <plugin-dir> -p "<prompt>"
```

Reads the plugin from the source directory. No install, no version bump, no
symlink, and the edit under test is the one that runs.

There is also `claude plugin eval`, a first-party scored evaluator with a
no-plugin baseline arm, repeated runs, and a CI threshold. **Deferred, not
adopted** — it is gated behind organisation-scoped early access and refuses to run
here. `--help` exits 0 and prints full documentation; every actual invocation
prints `` `plugin eval` is currently in early access `` and exits 1.

Enablement is worth knowing when this is picked up again: it is per-organisation,
and clients that cannot fetch server-side flags need an enablement variable
supplied during onboarding. This machine sets
`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` in `~/.claude/settings.json`, which
is one of the settings that blocks that fetch.

Two things it does that the probe below does not, worth remembering rather than
reinventing badly: it runs a **baseline arm without the plugin** and reports the
delta, and it repeats each case (default 3). Firing is an indicator; the delta is
the result. A run that invokes the skill and then gives the answer the baseline
gave has demonstrated nothing, and a single run is weak evidence either way.

### Codex

Codex has **no `--plugin-dir`**. It installs from a configured marketplace
snapshot only. This repository is a marketplace, so a throwaway `CODEX_HOME` gives
the same fresh-load property:

```bash
export CODEX_HOME="$(mktemp -d)"
cp ~/.codex/auth.json "$CODEX_HOME/"
codex plugin marketplace add <repo-root>
codex plugin add <plugin>@claude-domestique
codex exec --json --sandbox read-only --skip-git-repo-check "<prompt>" < /dev/null
```

Four things that are not obvious, each of which cost a run to find:

| | |
| --- | --- |
| a fresh `CODEX_HOME` is unauthenticated | credentials live there, so the run 401s before reaching the model. Copy `auth.json` and deliberately **not** `config.toml`, so the probe is not shaped by local configuration |
| `codex exec` waits on stdin | it reads the positional prompt *and* stdin, so an open stdin hangs the run until it is killed |
| Codex refuses an untrusted non-repo | `--skip-git-repo-check` is required when the working directory is a bare temp dir |
| **Codex has no `Skill` tool** | it invokes a skill by reading `SKILL.md` with a shell command. Detecting invocation by tool name finds nothing and reports a skill that fired as one that did not |

That last row is the dangerous one. The first version of `scripts/probe-skill.js`
looked for a named tool call and reported `DID NOT FIRE` for a run whose own
transcript said *"I'm using the refine skill"* and then followed it. A harness
that returns a false negative is worse than no harness.

## Run somewhere neutral

Both hosts run in a working directory. Run the probe in a temp directory, not in
this repository.

Inside this repository the agent reads `CLAUDE.md`, `AGENTS.md`, the session
files, and every other installed plugin. If the skill then fires, you have not
learned that the skill's description works — you may have learned that this
repository's instructions can make anything fire. The question is whether the
skill triggers on its own.

Leaving the developer's other plugins installed is fine and realistic: competing
against siblings is the actual condition, and it is how `mantra:assess` was found
to win.

## What exists here now

```bash
node scripts/probe-skill.js --plugin modus --expect modus:agent-work-item --prompt "..."
node scripts/probe-skill.js --host codex --plugin modus --expect agent-work-item --prompt "..."
```

Launches a fresh instance, loads the plugin from source, prints which skills were
invoked and the response, and exits 0 fired / 1 did not / 2 could not run.
`--cwd <dir>` runs somewhere real instead of the neutral temp directory, and
`--full` prints the whole response.

What it does not do: one run rather than three, no baseline arm, no scoring. It
answers "did it fire, and what did it say". Judging the answer is still yours.

`modus/evals/` holds one case in the `prompt.md` + `graders/*.md` shape, written
against the deferred evaluator. **It has never been executed.** No `case.yaml`
schema and no grader frontmatter is invented there — a suite that looks correct
and does not parse is worse than an empty directory, and nothing here can tell the
difference. Its `graders/criteria.md` is useful on its own as a written statement
of what a good answer looks like, whatever ends up running it.
