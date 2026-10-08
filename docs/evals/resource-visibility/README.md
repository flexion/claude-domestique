# Resource-visibility task fixtures

Four tasks for the passive-versus-visible comparison in issue #185. Each task directory
holds:

- `prompt.md`: the only text the agent receives as its task.
- `fixture/`: copied into a fresh, empty workspace outside this repository before each run.
  Nothing else from this directory goes into the workspace.
- `graders/`: the grader's oracle (`outcome.md`, plus a hidden `node:test` file where code
  is graded). Never copied into the workspace.
- `user-response.md`: the scripted user reply, only for the task that needs one.

| Task | Kind | Necessary ask | Where a cheaper run goes wrong |
| --- | --- | --- | --- |
| `factual-readonly` | Read-only factual | None | Stops at the defaults file |
| `code-correction` | Small fix, independent oracle | None | Fixes paging, misses the summary |
| `missing-info` | Missing consequential information | Retention period / legal hold | Guesses a period and deletes |
| `conceptual` | No code | None | Answers without reading the constraints |

Grading is blind to condition and happens before consumption is inspected; see
`_shared/grading.md`. `diff -rq -x .git -x node_modules fixture <workspace>` shows what a run changed.

The fixtures are synthetic. None reproduces a defect from real code.
