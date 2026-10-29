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
//
// `defaultModel` is what a launch gets when the selector names none. Pinning it
// here, rather than inheriting ambient config, means every herd member starts
// on a known model unless the caller chose otherwise; an explicit `model=`
// always wins. Effort and the permission settings have no default and are
// still inherited.
//
// `refuses` maps each selector a kind cannot express to the reason, so
// makeAgent can refuse it instead of dropping it quietly.
const KINDS = {
  claude: {
    glyph: '◆',
    kind: 'claude',
    defaultModel: 'claude-opus-5-5',
    refuses: {
      sandbox: 'claude has no sandbox selector (use mode= for --permission-mode)',
      approval: 'claude has no approval selector (use mode= for --permission-mode)',
    },
    owns: {
      flags: {
        '--model': ['model'],
        '--effort': ['effort'],
        '--permission-mode': ['mode'],
        '--dangerously-skip-permissions': ['mode'],
      },
    },
    extraArgs: ({ model, effort, mode }) => [
      ...(model ? ['--model', model] : []),
      ...(effort ? ['--effort', effort] : []),
      ...(mode ? ['--permission-mode', mode] : []),
    ],
  },
  codex: {
    glyph: '◇',
    kind: 'codex',
    defaultModel: 'gpt-6.1-sol',
    // No effort flag exists; `-c <key>=<value>` overrides one
    // ~/.codex/config.toml value. The value is parsed as TOML, and a bare word
    // that fails to parse is used as a literal string - which is what a level
    // like `high` relies on.
    //
    // `--no-daemon` on every launch: run without the shared background
    // app-server even when one is already running, so a herd member's session
    // does not depend on a daemon some other codex started.
    //
    // sandbox and approval are -c overrides too, quoted as TOML strings. The
    // selector charset admits no quote or backslash, so a value cannot close
    // the string early.
    refuses: {
      mode: 'codex has no permission mode (use sandbox= and approval=)',
    },
    owns: {
      flags: {
        '--model': ['model'],
        '-m': ['model'],
        '--sandbox': ['sandbox'],
        '-s': ['sandbox'],
        '--ask-for-approval': ['approval'],
        '-a': ['approval'],
        '--dangerously-bypass-approvals-and-sandbox': ['sandbox', 'approval'],
        // workspace-write sandbox plus automatic review of approvals
        '--approve-for-me': ['sandbox', 'approval'],
      },
      config: {
        model: 'model',
        model_reasoning_effort: 'effort',
        sandbox_mode: 'sandbox',
        approval_policy: 'approval',
      },
    },
    extraArgs: ({ model, effort, sandbox, approval }) => [
      '--no-daemon',
      ...(model ? ['--model', model] : []),
      ...(effort ? ['-c', `model_reasoning_effort=${effort}`] : []),
      ...(sandbox ? ['-c', `sandbox_mode="${sandbox}"`] : []),
      ...(approval ? ['-c', `approval_policy="${approval}"`] : []),
    ],
  },
  opencode: {
    glyph: '⬨',
    kind: 'opencode',
    // `-m <provider/model>`, and no effort equivalent on the interactive TUI
    // that herdr launches: `--variant` is a flag of `opencode run` only.
    // Its permissions live in opencode's own config, with no launch flag.
    refuses: {
      effort: 'the opencode TUI has no effort selector (--variant belongs to `opencode run`)',
      mode: 'opencode has no permission-mode flag',
      sandbox: 'opencode has no sandbox flag',
      approval: 'opencode has no approval flag',
    },
    owns: {
      flags: { '--model': ['model'], '-m': ['model'] },
    },
    extraArgs: ({ model }) => ['-m', model],
  },
};

// The args go through execFile (no shell), but keep a conservative charset
// anyway so a selector token can never smuggle metacharacters into any surface
// that later renders or re-quotes it. Model ids carry dots, slashes and colons
// (`ollama/qwen2.5:7b`); an effort level is a bare word.
// `role` is a LABEL-only selector: it decorates the tab as `<handle>-<role>` so
// a human scanning the sidebar can see which part a tab is playing. It never
// reaches the agent's CLI args, and it is deliberately not part of the handle -
// the handle stays a bare pool call-sign, because it is the addressable
// identity and must survive an agent being relaunched in a different part.
// `mode` (claude --permission-mode), `sandbox` and `approval` (codex -c
// sandbox_mode / approval_policy) are bare words like effort.
const SELECTORS = {
  model: /^[\w./:-]+$/,
  effort: /^[\w-]+$/,
  role: /^[\w-]+$/,
  mode: /^[\w-]+$/,
  sandbox: /^[\w-]+$/,
  approval: /^[\w-]+$/,
};

// `<handle>`, `<handle>:<model>`, or `<handle>:key=value[,key=value]`.
//
// Split on the FIRST colon only. opencode model ids legitimately contain colons
// (`ollama/qwen2.5:7b`), which is also why a second setting is a NAMED key and
// not a positional third field: `bob:ollama/qwen2.5:7b` would be ambiguous as
// handle:model:effort. Named keys are order-independent and extensible, and
// they attach per agent, so two agents of one kind can differ in one launch.
//
// A bare handle gets the kind's `defaultModel` (see KINDS) and inherits effort
// from the CLI's ambient config, reporting it as null - never as the kind name.
function parseSelector(kind, spec) {
  const text = String(spec);
  const colon = text.indexOf(':');
  const out = { handle: colon >= 0 ? text.slice(0, colon) : text };
  for (const key of Object.keys(SELECTORS)) out[key] = null;
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

// `--env KEY=VALUE`, forwarded to `herdr tab create --env`. KEY is
// shell-style. A control character in VALUE is refused: a newline or escape
// in an environment variable is almost always a mistake, and it would break
// any surface that later prints the pair one per line.
function parseEnv(pairs) {
  const out = [];
  const seen = new Set();
  for (const pair of pairs || []) {
    const text = String(pair);
    const eq = text.indexOf('=');
    const key = eq >= 0 ? text.slice(0, eq) : text;
    if (eq < 0) throw new Error(`--env needs KEY=VALUE (got "${key}")`);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) throw new Error(`--env key is not shell-style: "${key}"`);
    if (/\p{Cc}/u.test(text.slice(eq + 1))) { // C0, DEL and C1
      throw new Error(`--env ${key} has a control character in its value`);
    }
    if (seen.has(key)) throw new Error(`--env ${key} is set twice`);
    seen.add(key);
    out.push(text);
  }
  return out;
}

// A failed `tab create` carries its argv in the error message (execFileSync
// reports "Command failed: herdr tab create ... --env KEY=VALUE"), and herdr's
// own diagnostics may echo a value too. No redaction can promise to catch every
// echo - a short value cannot be scrubbed without mangling unrelated text - so
// when any --env is set, the child's output is withheld entirely and only the
// exit status and the key names are reported. With no --env there is nothing
// to hide and the original error passes through.
function withholdEnvOutput(err, env) {
  if (!env.length) return err;
  const keys = env.map((pair) => pair.slice(0, pair.indexOf('='))).join(', ');
  const status = err && err.status != null ? ` (exit ${err.status})` : '';
  return new Error(`herdr tab create failed${status}; its output is withheld because it may echo --env values (${keys})`);
}

// `--arg <ARG>` values, appended in order after the kind's own arguments on
// the `agent start -- <args>` vector. There is no shell (execFile), so the
// only content check is the control-character refusal --env applies.
//
// A pass-through that sets something a selector owns is refused, whether or
// not that selector was given. Otherwise the launch result would report, say,
// `sandbox: null` (inherited) for an agent launched with `--sandbox`, and a
// CLI given the same flag twice is free to honour either one.
function ownedBy(def, token, next) {
  const owns = def.owns || {};
  const flags = owns.flags || {};
  const name = token.startsWith('--') ? token.split('=')[0] : token;
  if (flags[name]) return flags[name];
  // A short flag may carry its value attached: `-mgpt-5`, `-sread-only`.
  if (/^-[A-Za-z]./.test(token) && flags[token.slice(0, 2)]) return flags[token.slice(0, 2)];
  if (!owns.config) return null;
  // codex `-c key=value`, `--config key=value`, `--config=key=value`,
  // `-c=key=value` and `-ckey=value`.
  let kv = null;
  if (token === '-c' || token === '--config') kv = next;
  else if (token.startsWith('--config=')) kv = token.slice('--config='.length);
  else if (token.startsWith('-c=')) kv = token.slice(3);
  else if (/^-c./.test(token)) kv = token.slice(2);
  if (kv == null) return null;
  const key = String(kv).split('=')[0].trim().replace(/^["']|["']$/g, '');
  return owns.config[key] ? [owns.config[key]] : null;
}

function parsePassArgs(kind, def, args) {
  const out = (args || []).map(String);
  out.forEach((arg, i) => {
    if (/\p{Cc}/u.test(arg)) throw new Error(`--arg ${JSON.stringify(arg)} has a control character`);
    const keys = ownedBy(def, arg, out[i + 1]);
    if (keys) {
      const use = keys.map((k) => `${k}=`).join(' and ');
      const owner = keys.length > 1 ? 'selectors own' : 'selector owns';
      throw new Error(`--arg ${arg} sets what the ${use} ${owner}; use <handle>:${keys[0]}=<value> on --${kind} instead`);
    }
  });
  return out;
}

function makeAgent(kind, spec, env = [], args = []) {
  const def = KINDS[kind];
  if (!def) throw new Error(`unknown agent kind: ${kind} (want ${Object.keys(KINDS).join('/')})`);
  const sel = parseSelector(kind, spec);
  if (!sel.model && def.defaultModel) sel.model = def.defaultModel;
  if (!sel.handle) throw new Error(`--${kind} needs a <handle> (got "${spec}")`);
  if (kind === 'opencode') {
    // opencode alone requires a model: it has no ambient default to inherit.
    if (!sel.model) throw new Error(`--opencode needs <handle>:<model> (got "${spec}")`);
  }
  // Refuse a setting this CLI cannot express instead of dropping it quietly.
  // A selector that silently vanishes is precisely the false report that
  // reporting resolved values exists to prevent.
  for (const [key, reason] of Object.entries(def.refuses || {})) {
    if (sel[key]) throw new Error(`--${kind} cannot set ${key}: ${reason}`);
  }
  return {
    handle: sel.handle,
    kind: def.kind,
    glyph: def.glyph,
    model: sel.model,
    effort: sel.effort,
    role: sel.role,
    mode: sel.mode,
    sandbox: sel.sandbox,
    approval: sel.approval,
    env: parseEnv(env),
    extraArgs: [...def.extraArgs(sel), ...parsePassArgs(kind, def, args)],
  };
}

function parseArgs(argv) {
  const out = { branch: undefined, base: 'origin/main', timeout: 45000, sourceWorkspace: undefined, agents: [] };
  // Agents are built after the loop: `--env` applies to every agent, and may
  // appear before or after the agent flags.
  const specs = [];
  const env = [];
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
      case '--env': env.push(need()); break;
      case '--claude': specs.push(['claude', need()]); break;
      case '--codex': specs.push(['codex', need()]); break;
      case '--opencode': specs.push(['opencode', need()]); break;
      default: throw new Error(`unknown flag: ${flag}`);
    }
  }
  out.agents = specs.map(([kind, spec]) => makeAgent(kind, spec, env));
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
// launch (no detect-then-rename). We still wait for a settled status explicitly:
// `--timeout` only guarantees interactive readiness. Either `idle` or `done`
// is ready to seed - a fresh agent can settle in `done` (observed with codex),
// and waiting on `idle` alone reported that ready launch as a timeout.
// `blocked` and `unknown` still time out, so a stalled start is not hidden.
function launchAgent(a, opts, deps) {
  const run = deps.run;
  // `<handle>-<role> <glyph>` when a part was named, `<handle> <glyph>` when it
  // was not. The glyph still carries the agent KIND, so the decorated label
  // answers both "who is this" and "what is it doing here" at a glance.
  const label = opts.label
    || `${a.role ? `${a.handle}-${a.role}` : a.handle} ${a.glyph}`;
  const timeout = String(Number(opts.timeout || 45000));
  const env = (a.env || []).flatMap((pair) => ['--env', pair]);
  let tc;
  try {
    tc = JSON.parse(run('herdr', ['tab', 'create', '--workspace', opts.workspace,
      '--cwd', opts.cwd, '--label', label, '--no-focus', ...env]));
  } catch (e) {
    throw withholdEnvOutput(e, a.env || []);
  }
  const tab = tc.result.tab.tab_id;
  const rootPane = tc.result.root_pane.pane_id;
  const st = startAgent(a, rootPane, timeout, deps);
  run('herdr', ['agent', 'wait', a.handle, '--until', 'idle', '--until', 'done', '--timeout', timeout]);
  // `kind` is the integration name; `model`/`effort` are what was actually
  // selected, and null means inherited from the CLI's ambient config. Reporting
  // the kind AS the model (the old `"model":"claude"`) read like an answer while
  // saying nothing about Opus vs Sonnet, so a launch on an unintended model was
  // indistinguishable from a chosen one. `env` lists the KEYS set, never the
  // values: a value can be a secret, and this result is printed and relayed.
  return {
    handle: a.handle,
    kind: a.kind,
    model: a.model,
    effort: a.effort,
    mode: a.mode,
    sandbox: a.sandbox,
    approval: a.approval,
    env: (a.env || []).map((pair) => pair.slice(0, pair.indexOf('='))),
    // Everything after `--` on `agent start`: the kind's own arguments, then
    // any --arg pass-through, exactly as the CLI received them.
    args: a.extraArgs,
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

  // Refresh a remote-tracking base before worktree create resolves it. A slash
  // alone does not make a base remote-tracking: task branches commonly contain
  // one and exist only locally, so match the first segment against configured
  // remotes. Bases without a slash are local refs even when their name happens
  // to equal a remote.
  const slash = cfg.base.indexOf('/');
  const remote = slash > 0 ? cfg.base.slice(0, slash) : null;
  const remotes = String(run('git', ['remote'])).split(/\r?\n/).filter(Boolean);
  if (remote && remotes.includes(remote)) {
    run('git', ['fetch', remote, cfg.base.slice(slash + 1)]);
  }

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

// `stdio: 'pipe'` captures stderr instead of letting execFileSync echo it to
// the terminal. A child's stderr then reaches the caller only inside the
// thrown error, where it can be parsed as a herdr envelope or redacted - an
// echoed `tab create` argv would otherwise print every --env value.
function defaultRun(file, args) {
  return execFileSync(file, args, { encoding: 'utf8', stdio: 'pipe' });
}

module.exports = { makeAgent, parseEnv, withholdEnvOutput, parseArgs, startAgent, launchAgent, up, defaultRun };
