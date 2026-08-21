#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');

// `agent start` takes an existing shell pane plus an optional trailing program
// vector: `herdr agent start <NAME> --kind <KIND> --pane <ID> [OPTIONS]
// [-- [AGENT_ARG]...]`. That vector is the only channel for per-agent CLI
// flags, so model and effort selectors ride there.
//
// Each kind translates {model, effort} itself, because the CLIs differ in
// SHAPE and not merely in flag naming: claude has a first-class --effort, codex
// expresses the same idea only as a generic config override, and the opencode
// TUI cannot express it at all. A single shared flag pair could not spell that,
// so each kind is free to ignore what it has no way to say. Every flag below is
// verified against the installed CLI's own --help, not assumed.
// Keyed by agent KIND, deliberately not "model": conflating the two is what
// made the old report claim `"model":"claude"`.
const KINDS = {
  claude: {
    glyph: '◆',
    kind: 'claude',
    extraArgs: ({ model, effort }) => [
      ...(model ? ['--model', model] : []),
      ...(effort ? ['--effort', effort] : []),
    ],
  },
  codex: {
    glyph: '◇',
    kind: 'codex',
    // No effort flag exists; `-c <key>=<value>` overrides one
    // ~/.codex/config.toml value. The value is parsed as TOML, and a bare word
    // that fails to parse is used as a literal string - which is what a level
    // like `high` relies on.
    extraArgs: ({ model, effort }) => [
      ...(model ? ['--model', model] : []),
      ...(effort ? ['-c', `model_reasoning_effort=${effort}`] : []),
    ],
  },
  opencode: {
    glyph: '⬨',
    kind: 'opencode',
    // `-m <provider/model>`, and no effort equivalent on the interactive TUI
    // that herdr launches: `--variant` is a flag of `opencode run` only.
    extraArgs: ({ model }) => ['-m', model],
  },
};

// The args go through execFile (no shell), but keep a conservative charset
// anyway so a selector token can never smuggle metacharacters into any surface
// that later renders or re-quotes it. Model ids carry dots, slashes and colons
// (`ollama/qwen2.5:7b`); an effort level is a bare word.
const SELECTORS = {
  model: /^[\w./:-]+$/,
  effort: /^[\w-]+$/,
};

// `<handle>`, `<handle>:<model>`, or `<handle>:key=value[,key=value]`.
//
// Split on the FIRST colon only. opencode model ids legitimately contain colons
// (`ollama/qwen2.5:7b`), which is also why a second setting is a NAMED key and
// not a positional third field: `bob:ollama/qwen2.5:7b` would be ambiguous as
// handle:model:effort. Named keys are order-independent and extensible, and
// they attach per agent, so two agents of one kind can differ in one launch.
//
// A bare handle means "inherit whatever the CLI's ambient config resolves" and
// reports both settings as null - never as the kind name.
function parseSelector(kind, spec) {
  const text = String(spec);
  const colon = text.indexOf(':');
  const out = { handle: colon >= 0 ? text.slice(0, colon) : text, model: null, effort: null };
  if (colon < 0) return out;

  const rest = text.slice(colon + 1);
  if (!rest) throw new Error(`--${kind} selector needs a value (or drop the trailing ":")`);
  if (!/^\w+=/.test(rest)) {
    out.model = rest; // the common case: a bare model needs no key=
  } else {
    for (const pair of rest.split(',')) {
      const eq = pair.indexOf('=');
      const key = eq >= 0 ? pair.slice(0, eq) : pair;
      if (!Object.prototype.hasOwnProperty.call(SELECTORS, key)) {
        const want = Object.keys(SELECTORS).map((k) => `${k}=`).join(' or ');
        throw new Error(`--${kind} has an unknown selector key "${key}" (want ${want})`);
      }
      const value = pair.slice(eq + 1);
      if (!value) throw new Error(`--${kind} selector "${key}" needs a value`);
      out[key] = value;
    }
  }
  for (const [key, charset] of Object.entries(SELECTORS)) {
    if (out[key] && !charset.test(out[key])) {
      throw new Error(`--${kind} ${key} has unsafe characters: "${out[key]}"`);
    }
  }
  return out;
}

function makeAgent(kind, spec) {
  const def = KINDS[kind];
  if (!def) throw new Error(`unknown agent kind: ${kind} (want ${Object.keys(KINDS).join('/')})`);
  const sel = parseSelector(kind, spec);
  if (!sel.handle) throw new Error(`--${kind} needs a <handle> (got "${spec}")`);
  if (kind === 'opencode') {
    // opencode alone requires a model: it has no ambient default to inherit.
    if (!sel.model) throw new Error(`--opencode needs <handle>:<model> (got "${spec}")`);
    // Refuse a setting this CLI cannot express instead of dropping it quietly.
    // A selector that silently vanishes is precisely the false report that
    // reporting resolved values exists to prevent.
    if (sel.effort) {
      throw new Error('--opencode cannot set effort: the opencode TUI has no effort selector (--variant belongs to `opencode run`)');
    }
  }
  return {
    handle: sel.handle,
    kind: def.kind,
    glyph: def.glyph,
    model: sel.model,
    effort: sel.effort,
    extraArgs: def.extraArgs(sel),
  };
}

function parseArgs(argv) {
  const out = { branch: undefined, base: 'origin/main', timeout: 45000, sourceWorkspace: undefined, agents: [] };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const need = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`missing value for ${flag}`);
      return v;
    };
    switch (flag) {
      case '--branch': out.branch = need(); break;
      case '--base': out.base = need(); break;
      case '--timeout': out.timeout = Number(need()); break;
      case '--source-workspace': out.sourceWorkspace = need(); break;
      case '--claude': out.agents.push(makeAgent('claude', need())); break;
      case '--codex': out.agents.push(makeAgent('codex', need())); break;
      case '--opencode': out.agents.push(makeAgent('opencode', need())); break;
      default: throw new Error(`unknown flag: ${flag}`);
    }
  }
  if (!out.branch) throw new Error('--branch is required');
  if (out.agents.length === 0) {
    throw new Error('at least one agent flag is required (--claude/--codex/--opencode)');
  }
  const handles = out.agents.map((a) => a.handle);
  const dup = handles.find((h, i) => handles.indexOf(h) !== i);
  if (dup) throw new Error(`duplicate handle in request: ${dup}`);
  return out;
}

// Block synchronously without a subprocess: no dependency on a `sleep` binary,
// and no busy-loop. The buffer is never signalled, so it waits the full ms.
function defaultSleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(0, ms));
}

// A fresh tab's root pane runs env->shell for a few hundred ms before it is at a
// prompt; `agent start` refuses a not-yet-ready pane with `agent_pane_busy`,
// exiting non-zero with the error JSON on stderr. It leaves no stray agent
// behind, so retrying is safe. We key on herdr's own readiness verdict instead
// of reimplementing its shell-readiness heuristic here. `--timeout` for agent
// start must be strictly greater than 3000ms.
//
// `agent start` reports the error two ways depending on the runner: a raw JSON
// string (success, or a mock), or a thrown non-zero-exit error carrying the JSON
// on `.stdout`/`.stderr` (the real execFileSync path). Normalize both to the
// parsed object so the retry keys on `error.code` either way.
function readStart(deps, args) {
  try {
    return JSON.parse(deps.run('herdr', args));
  } catch (e) {
    // The envelope may land on either stream; a nonempty-but-non-JSON stdout
    // must NOT mask a valid JSON error on stderr, so try each independently and
    // return the first that parses to a herdr envelope.
    for (const stream of [e && e.stderr, e && e.stdout]) {
      if (!stream) continue;
      try { return JSON.parse(String(stream)); } catch { /* try the next stream */ }
    }
    throw e; // a spawn failure or non-JSON output, not a herdr error envelope
  }
}

function startAgent(a, rootPane, timeout, deps) {
  const sleep = deps.sleep || defaultSleep;
  const startArgs = ['agent', 'start', a.handle, '--kind', a.kind,
    '--pane', rootPane, '--timeout', timeout];
  if (a.extraArgs.length) startArgs.push('--', ...a.extraArgs);
  const deadline = Date.now() + Math.min(10000, Number(timeout));
  for (;;) {
    const res = readStart(deps, startArgs);
    if (res.error && res.error.code === 'agent_pane_busy' && Date.now() < deadline) {
      sleep(400);
      continue;
    }
    if (res.error) throw new Error(`agent start ${a.handle}: ${res.error.message || res.error.code}`);
    return res;
  }
}

// One agent in one fresh tab. herdr 0.7.5 `agent start` takes over an EXISTING
// shell pane (by pane id) rather than spawning its own, so the tab's root shell
// pane - already at the right cwd - becomes the agent pane. There is no leftover
// shell to close. `--kind` names the integration; the handle is assigned at
// launch (no detect-then-rename). We still wait for `idle` explicitly:
// `--timeout` only guarantees interactive readiness, not the idle status the
// caller depends on.
function launchAgent(a, opts, deps) {
  const run = deps.run;
  const label = opts.label || `${a.handle} ${a.glyph}`;
  const timeout = String(Number(opts.timeout || 45000));
  const tc = JSON.parse(run('herdr', ['tab', 'create', '--workspace', opts.workspace,
    '--cwd', opts.cwd, '--label', label, '--no-focus']));
  const tab = tc.result.tab.tab_id;
  const rootPane = tc.result.root_pane.pane_id;
  const st = startAgent(a, rootPane, timeout, deps);
  run('herdr', ['agent', 'wait', a.handle, '--until', 'idle', '--timeout', timeout]);
  // `kind` is the integration name; `model`/`effort` are what was actually
  // selected, and null means inherited from the CLI's ambient config. Reporting
  // the kind AS the model (the old `"model":"claude"`) read like an answer while
  // saying nothing about Opus vs Sonnet, so a launch on an unintended model was
  // indistinguishable from a chosen one.
  return {
    handle: a.handle,
    kind: a.kind,
    model: a.model,
    effort: a.effort,
    pane_id: st.result.agent.pane_id,
    tab,
  };
}

function up(argv, deps) {
  const run = deps.run;
  const cfg = parseArgs(argv);

  // pre-flight: reject a handle that already exists anywhere (herdr enforces
  // global uniqueness, but only at agent start — fail before the worktree).
  const list = JSON.parse(run('herdr', ['agent', 'list']));
  const taken = ((list.result && list.result.agents) || [])
    .map((a) => a && a.name).filter(Boolean);
  for (const a of cfg.agents) {
    if (taken.includes(a.handle)) throw new Error(`handle already taken: ${a.handle}`);
  }

  // refresh the local base ref before worktree create resolves it
  const baseBranch = cfg.base.replace(/^origin\//, '');
  run('git', ['fetch', 'origin', baseBranch]);

  // `worktree create` must originate from the repo's PARENT (main-checkout)
  // workspace; run from inside a linked worktree it errors `linked_worktree_source`.
  // herdr resolves the source workspace from the invocation cwd, so we look it up
  // (`worktree list --cwd <cwd>` -> result.source.source_workspace_id) and forward
  // it as `--workspace`. This works from the main checkout OR a linked worktree
  // (a herd lead spinning up a sibling herd) without the caller knowing any id.
  // `--source-workspace` overrides the lookup.
  const cwd = (deps.cwd || process.cwd());
  let sourceWs = cfg.sourceWorkspace;
  if (!sourceWs) {
    const wl = JSON.parse(run('herdr', ['worktree', 'list', '--cwd', cwd, '--json']));
    sourceWs = wl.result && wl.result.source && wl.result.source.source_workspace_id;
  }
  // Fail loudly rather than omit --workspace: without it `worktree create` falls
  // back to the focus-dependent source and errors `linked_worktree_source` from a
  // linked worktree. An unresolved source means the cwd isn't inside a known repo
  // checkout - surface that instead of silently reverting.
  if (!sourceWs) {
    throw new Error(`could not resolve a source workspace from cwd ${cwd}; pass --source-workspace <main-checkout-ws>`);
  }
  const createArgs = ['worktree', 'create', '--branch', cfg.branch, '--base', cfg.base, '--no-focus', '--json',
    '--workspace', sourceWs];
  const wt = JSON.parse(run('herdr', createArgs));
  const path = wt.result.worktree.path;
  const workspace = wt.result.worktree.open_workspace_id;
  const rootTab = wt.result.tab.tab_id;

  const agents = cfg.agents.map((a) =>
    launchAgent(a, { workspace, cwd: path, timeout: cfg.timeout }, deps));

  // Every agent lives in its own labeled tab; the worktree's original root
  // tab is a bare shell, closed only after the agent tabs exist so the
  // workspace is never empty.
  run('herdr', ['tab', 'close', rootTab]);

  return { worktree: { path, workspace_id: workspace }, agents };
}

function defaultRun(file, args) {
  return execFileSync(file, args, { encoding: 'utf8' });
}

module.exports = { makeAgent, parseArgs, startAgent, launchAgent, up, defaultRun };
