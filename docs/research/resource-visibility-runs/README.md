# Resource visibility evidence

This directory contains the eight synthetic Claude runs for #185. The evaluator
uses the outcome review before comparing the collector reports; consumption is
not a quality score. `manifest.json` pins the source, fixtures, prompts, settings,
model, effort, order and execution context. `condition-map.json` connects random
grading labels to run labels only after the outcome findings were frozen.

Each run directory contains the final workspace, native text/tool/hook event
stream, sanitized launch records, and collector snapshots/journal. Private
reasoning and native initialization metadata are omitted. Hook responses retain
the actual display text. A resumed clarification has separate start and resume
records. The authentication failure under `failed-attempts/` is an infrastructure
attempt, not a completed model outcome.

For reproduction, copy the named task's `fixture/` to a fresh workspace outside
this repository and send its `prompt.md` using the arguments in `start-launch.json`.
The historical absolute paths in the launch records identify the original run;
replace workspace/report/settings paths with fresh local paths. In `settings.json`,
replace the frozen temporary hook path with the current repository's absolute
`mantra/hooks/resources.js` path, after verifying the implementation hashes in
the manifest. Use the recorded `MANTRA_RESOURCES` condition and an absolute
`MANTRA_RESOURCE_DIR`. Keep both arms in the same execution context and retain
residual host context. For missing-info, send the frozen `user-response.md` answer
only after the consequential question, via the recorded `--resume` mechanism.
Do not replace a completed unfavorable run.

The host version and provider cache state may be unavailable on a future replay;
record changes rather than treating such runs as identical. Unknown human-stop
and human-wait metrics remain unknown. Reported elapsed wall includes scripted
waiting and teardown. The original clarification delays were not identical;
their launch records and delay records disclose the actual gaps.
