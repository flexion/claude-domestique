# Pass 8

First run in which a skill could write. Killed at 32 minutes, five review rounds
deep, and that is the finding.

## What ran

Stage 2 only, three times.

| Attempt | Outcome |
| --- | --- |
| 1 | refused by the clean-tree guard, which the pass procedure had itself dirtied by fetching `item.json`. The guard was fixed to exempt `docs/passes/` |
| 2 | ran 32 minutes, wrote a boundary and a coverage file, dispatched five review rounds, killed |
| — | stage 1 not re-run; the item is unchanged from pass 7 |

## agent-work-item executed past step 6 for the first time

Step 7 lints a boundary file, and until today the probe ran with inherited
permissions that denied `Write`. So a skill whose seventh step is "lint it, twice"
had never been able to reach its seventh step. Nobody noticed because stage 2
never ran until pass 6, and pass 6 was driven by hand.

What it produced, both first-evers:

- `coverage.md` — step 5b, the coverage check added in pass 7
- `boundary.yaml`, 23,638 bytes, lints clean: no failures, `W_NO_FLOOR` only

## And then it ran away

Five review rounds at roughly four and a half minutes each:

```
11:21:51  11:26:08  11:31:08  11:35:31  11:39:25
```

Twenty-two of the thirty-two minutes. The captured output is the prompt it was
assembling for round six, reading its fifth revision of the boundary.

Step 9 stated what passing looks like and never what failing to converge looks
like, so the only exit was a clean review and nothing bounded the wait for one.
Step 8 now caps it at two rounds and hands the findings to a person if round two
names anything.

Rounds do not reduce monotonically, which is why more rounds do not help. Each
reviewer is a fresh agent, so a round is a new sample rather than a converging
opinion — pass 6's round two found a statement contradicting its own decision that
had been equally present in round one and went unnoticed.

## The run wrote nothing outside its own directory

With permissions fully open and `--cwd` at the repository root, every `Write` and
`Edit` landed in `docs/passes/pass8/`:

```
17x  docs/passes/pass8/boundary.yaml
 1x  docs/passes/pass8/coverage.md
```

Eleven shell commands could have written somewhere else; the only redirects went
to `/tmp`. Nothing enforced this — the permission system was open and `Bash` can
walk around any file scope — so it is one observation and not a guarantee. It is
the evidence behind skipping worktree isolation for now.

## The session transcript is the diagnostic

None of the above was visible from the harness. The output file sat at zero bytes
for the whole run, because `spawnSync` buffers until exit, and elapsed-versus-CPU
said nothing: 32 minutes against 28 seconds of CPU, which is what a healthy agent
run looks like too.

What made it legible was the session JSONL that Claude writes as it goes, under
`~/.claude/projects/<cwd-with-dots-and-slashes-as-dashes>/`. Its tool calls showed
the `Agent` dispatches, their spacing, and every file touched. The recipe is now
in `docs/plugin-evaluation.md`, and `probe-skill.js` prints the directory at
startup — because the moment it is needed, nobody is reading documentation.

## Unfinished

The run never reached step 9 or step 10, so nothing here has been reviewed to a
conclusion or approved. `boundary.yaml` is a fifth revision that lints clean and
has five rounds of unrecorded review behind it. Whether it is any good is not
established.

Step 9 also still overclaims. It says refinement is done when a fresh agent can
state five things; step 8 asks two questions that establish two of them. Nothing
asks whether a reader can say what must keep working, what is out of scope, or
what is handed off. Recorded, not fixed.
