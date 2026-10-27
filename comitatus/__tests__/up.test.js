const { parseArgs, makeAgent, startAgent, launchAgent, up } = require('../skills/herdr/scripts/up.js');

describe('makeAgent', () => {
  // A bare handle gets the kind's default model and inherits effort. effort
  // reports null so a caller can tell an inherited setting from a passed one -
  // the kind name is NOT an answer to "which model".
  test('claude with no selector: ◆ glyph, default Opus 5.5 model, effort null', () => {
    expect(makeAgent('claude', 'sly')).toEqual({
      handle: 'sly', kind: 'claude', glyph: '◆', model: 'claude-opus-5-5', effort: null, role: null,
      mode: null, sandbox: null, approval: null, env: [],
      extraArgs: ['--model', 'claude-opus-5-5'],
    });
  });
  test('codex with no selector: ◇ glyph, --no-daemon, default gpt-6.1-sol model, effort null', () => {
    expect(makeAgent('codex', 'jay')).toEqual({
      handle: 'jay', kind: 'codex', glyph: '◇', model: 'gpt-6.1-sol', effort: null, role: null,
      mode: null, sandbox: null, approval: null, env: [],
      extraArgs: ['--no-daemon', '--model', 'gpt-6.1-sol'],
    });
  });
  // Every codex session runs off the shared daemon, whatever else was selected.
  test('codex always passes --no-daemon, explicit model and effort included', () => {
    expect(makeAgent('codex', 'jay:model=gpt-5.5,effort=high').extraArgs)
      .toEqual(['--no-daemon', '--model', 'gpt-5.5', '-c', 'model_reasoning_effort=high']);
    expect(makeAgent('claude', 'sly:model=sonnet').extraArgs).not.toContain('--no-daemon');
  });

  // The three CLIs differ in SHAPE, not just flag naming, so each kind gets its
  // own translator. Verified against the installed CLIs' own --help.
  test('claude model= and effort= become --model/--effort (both first-class flags)', () => {
    expect(makeAgent('claude', 'nell:model=opus,effort=high')).toEqual({
      handle: 'nell', kind: 'claude', glyph: '◆', model: 'opus', effort: 'high', role: null,
      mode: null, sandbox: null, approval: null, env: [],
      extraArgs: ['--model', 'opus', '--effort', 'high'],
    });
  });
  test('codex effort= becomes a -c config override, not a flag', () => {
    expect(makeAgent('codex', 'jay:model=gpt-6.1-sol,effort=high')).toEqual({
      handle: 'jay', kind: 'codex', glyph: '◇', model: 'gpt-6.1-sol', effort: 'high', role: null,
      mode: null, sandbox: null, approval: null, env: [],
      extraArgs: ['--no-daemon', '--model', 'gpt-6.1-sol', '-c', 'model_reasoning_effort=high'],
    });
  });
  // An explicit model replaces the default; effort= alone keeps it.
  test('either key alone is enough: effort alone keeps the default model, model alone inherits effort', () => {
    expect(makeAgent('claude', 'sly:effort=xhigh').extraArgs)
      .toEqual(['--model', 'claude-opus-5-5', '--effort', 'xhigh']);
    expect(makeAgent('codex', 'jay:effort=high').extraArgs)
      .toEqual(['--no-daemon', '--model', 'gpt-6.1-sol', '-c', 'model_reasoning_effort=high']);
    expect(makeAgent('claude', 'sly:model=sonnet').extraArgs).toEqual(['--model', 'sonnet']);
    expect(makeAgent('codex', 'jay:model=gpt-5.5').extraArgs).toEqual(['--no-daemon', '--model', 'gpt-5.5']);
    expect(makeAgent('codex', 'jay:model=gpt-5.5').effort).toBeNull();
  });
  // `role=` decorates the TAB so a human can see which part a tab is playing.
  // It is label-only: it must never reach the agent's own CLI args, and it must
  // never become part of the handle, which stays the addressable identity.
  test('role= is a label-only key and does not reach the CLI args', () => {
    const a = makeAgent('codex', 'jay:model=gpt-5.5,role=impl');
    expect(a.role).toBe('impl');
    expect(a.handle).toBe('jay');
    expect(a.extraArgs).toEqual(['--no-daemon', '--model', 'gpt-5.5']);
    // role= alone is not a model choice, so the default model still applies
    expect(makeAgent('claude', 'sly:role=arch').extraArgs).toEqual(['--model', 'claude-opus-5-5']);
  });

  test('an unsafe role is refused like any other selector value', () => {
    expect(() => makeAgent('codex', 'jay:role=impl ui')).toThrow(/unsafe characters/);
  });

  test('named keys are order-independent', () => {
    expect(makeAgent('claude', 'nell:effort=high,model=opus').extraArgs)
      .toEqual(makeAgent('claude', 'nell:model=opus,effort=high').extraArgs);
  });
  test('a bare suffix is still a model (no key= needed for the common case)', () => {
    expect(makeAgent('claude', 'sly:opus').extraArgs).toEqual(['--model', 'opus']);
    expect(makeAgent('claude', 'sly:opus').model).toBe('opus');
  });

  test('opencode splits handle:model into a -m selector (model may contain colons)', () => {
    expect(makeAgent('opencode', 'bob:ollama/qwen2.5:7b')).toEqual({
      handle: 'bob', kind: 'opencode', glyph: '⬨', model: 'ollama/qwen2.5:7b', effort: null, role: null,
      mode: null, sandbox: null, approval: null, env: [],
      extraArgs: ['-m', 'ollama/qwen2.5:7b'],
    });
  });
  // A colon-containing opencode model is exactly why the third setting is a
  // named key and not a positional field: `bob:ollama/qwen2.5:7b` would be
  // ambiguous as handle:model:effort.
  test('opencode accepts its colon-bearing model through the named key too', () => {
    expect(makeAgent('opencode', 'bob:model=ollama/qwen2.5:7b').extraArgs)
      .toEqual(['-m', 'ollama/qwen2.5:7b']);
  });
  test('opencode without a model throws', () => {
    expect(() => makeAgent('opencode', 'bob')).toThrow(/<handle>:<model>/);
    expect(() => makeAgent('opencode', 'bob:effort=high')).toThrow(/<handle>:<model>/);
  });
  // The opencode TUI has no effort selector at all (`--variant` exists only on
  // the non-interactive `opencode run`). Dropping it silently is the exact
  // failure this change exists to remove, so it is refused instead.
  test('opencode rejects effort= rather than silently dropping it', () => {
    expect(() => makeAgent('opencode', 'bob:model=x,effort=high'))
      .toThrow(/opencode cannot set effort/);
  });

  test('model with shell metacharacters is rejected for every kind', () => {
    expect(() => makeAgent('opencode', 'bob:x; curl evil|sh')).toThrow(/unsafe characters/);
    expect(() => makeAgent('opencode', 'bob:$(whoami)')).toThrow(/unsafe characters/);
    expect(() => makeAgent('claude', 'sly:model=$(whoami)')).toThrow(/unsafe characters/);
    expect(() => makeAgent('codex', 'jay:model=x`id`')).toThrow(/unsafe characters/);
    // a legitimate model with dots, slashes and a colon is still accepted
    expect(makeAgent('opencode', 'bob:ollama/qwen2.5:7b').extraArgs).toEqual(['-m', 'ollama/qwen2.5:7b']);
  });
  test('effort with unsafe characters is rejected', () => {
    expect(() => makeAgent('claude', 'sly:effort=high;rm -rf /')).toThrow(/unsafe characters/);
    expect(() => makeAgent('codex', 'jay:effort=$(id)')).toThrow(/unsafe characters/);
  });
  test('an unknown selector key throws instead of being ignored', () => {
    expect(() => makeAgent('claude', 'sly:temperature=0.7')).toThrow(/unknown selector key/);
  });
  test('an empty selector value throws', () => {
    expect(() => makeAgent('claude', 'sly:model=')).toThrow(/needs a value/);
    expect(() => makeAgent('claude', 'sly:')).toThrow(/needs a value/);
  });
  // --arg values follow the kind's own arguments, in order, untouched.
  test('pass-through args are appended after the kind\'s own', () => {
    expect(makeAgent('claude', 'sol:mode=dontAsk', [], ['--add-dir', '/wt/d365']).extraArgs)
      .toEqual(['--model', 'claude-opus-5-5', '--permission-mode', 'dontAsk', '--add-dir', '/wt/d365']);
    const mcp = 'mcp_servers={"chrome-devtools"={enabled=false}}';
    expect(makeAgent('codex', 'ren:sandbox=danger-full-access,approval=never', [], ['-c', mcp]).extraArgs)
      .toEqual(['--no-daemon', '--model', 'gpt-6.1-sol', '-c', 'sandbox_mode="danger-full-access"',
        '-c', 'approval_policy="never"', '-c', mcp]);
    expect(makeAgent('claude', 'sly', [], ['']).extraArgs).toEqual(['--model', 'claude-opus-5-5', '']);
  });
  test('a pass-through arg with a control character is refused', () => {
    for (const ch of ['\n', '\x00', '\x1b', '\x7f', '\u0085']) {
      expect(() => makeAgent('claude', 'sly', [], ['--add-dir', `/a${ch}b`])).toThrow(/control character/);
    }
  });
  // A pass-through that duplicates a selector would make the reported setting
  // false, so it is refused whether or not the selector was given.
  test('a pass-through that sets what a selector owns is refused', () => {
    const refused = {
      claude: [['--model', 'x'], ['--model=x'], ['--effort', 'high'], ['--permission-mode', 'plan'],
        ['--permission-mode=plan'], ['--dangerously-skip-permissions']],
      codex: [['--model', 'x'], ['-m', 'x'], ['-mx'], ['--sandbox', 'read-only'], ['-s', 'read-only'],
        ['--ask-for-approval', 'never'], ['-a', 'never'], ['--dangerously-bypass-approvals-and-sandbox'],
        ['-c', 'sandbox_mode="read-only"'], ['--config', 'approval_policy=never'],
        ['--config=model_reasoning_effort=high'], ['-cmodel=x'],
        ['-c=approval_policy=never'], ['-c=sandbox_mode=danger-full-access'], ['-s=read-only'],
        ['--sandbox=read-only'], ['--approve-for-me'], ['-c', ' "sandbox_mode" = "x"']],
      opencode: [['-m', 'x'], ['--model', 'x']],
    };
    for (const [kind, cases] of Object.entries(refused)) {
      const spec = kind === 'opencode' ? 'bob:x' : 'sly';
      for (const args of cases) {
        expect(() => makeAgent(kind, spec, [], args)).toThrow(/selectors? owns?/);
      }
    }
    expect(() => makeAgent('codex', 'jay', [], ['-s', 'x'])).toThrow(/use <handle>:sandbox=<value> on --codex/);
  });
  test('pass-through args that no selector owns are accepted', () => {
    expect(() => makeAgent('codex', 'jay', [], ['-c', 'sandbox_workspace_write.network_access=true'])).not.toThrow();
    expect(() => makeAgent('codex', 'jay', [], ['--profile', 'work'])).not.toThrow();
    expect(() => makeAgent('claude', 'sly', [], ['--allow-dangerously-skip-permissions'])).not.toThrow();
  });
  test('an unknown kind throws a readable error', () => {
    expect(() => makeAgent('bogus', 'sly')).toThrow(/unknown agent kind: bogus/);
  });

  // Permission settings ride the same selector syntax; unset stays inherited.
  test('claude mode= becomes --permission-mode', () => {
    const a = makeAgent('claude', 'sly:mode=dontAsk');
    expect(a.mode).toBe('dontAsk');
    expect(a.sandbox).toBeNull();
    expect(a.approval).toBeNull();
    expect(a.extraArgs).toEqual(['--model', 'claude-opus-5-5', '--permission-mode', 'dontAsk']);
  });
  test('codex sandbox= and approval= become quoted -c overrides', () => {
    const a = makeAgent('codex', 'jay:sandbox=danger-full-access,approval=never');
    expect(a).toMatchObject({ mode: null, sandbox: 'danger-full-access', approval: 'never' });
    expect(a.extraArgs).toEqual(['--no-daemon', '--model', 'gpt-6.1-sol',
      '-c', 'sandbox_mode="danger-full-access"', '-c', 'approval_policy="never"']);
    expect(makeAgent('codex', 'jay:approval=on-request').extraArgs)
      .toEqual(['--no-daemon', '--model', 'gpt-6.1-sol', '-c', 'approval_policy="on-request"']);
  });
  // A kind refuses a setting it cannot express rather than dropping it.
  test('each kind refuses the permission selectors it cannot express', () => {
    expect(() => makeAgent('claude', 'sly:sandbox=read-only')).toThrow(/claude cannot set sandbox/);
    expect(() => makeAgent('claude', 'sly:approval=never')).toThrow(/claude cannot set approval/);
    expect(() => makeAgent('codex', 'jay:mode=dontAsk')).toThrow(/codex cannot set mode/);
    for (const key of ['mode', 'sandbox', 'approval']) {
      expect(() => makeAgent('opencode', `bob:model=x,${key}=y`)).toThrow(new RegExp(`opencode cannot set ${key}`));
    }
  });
  // Quoted TOML values must not break out of their string.
  test('permission selectors keep the conservative charset', () => {
    expect(() => makeAgent('codex', 'jay:sandbox=x"y')).toThrow(/unsafe characters/);
    expect(() => makeAgent('codex', 'jay:approval=never\\')).toThrow(/unsafe characters/);
    expect(() => makeAgent('claude', 'sly:mode=plan;id')).toThrow(/unsafe characters/);
  });

  test('env pairs are validated and kept in order', () => {
    expect(makeAgent('claude', 'sly', ['BEADS_ACTOR=sly', 'EMPTY=', 'A_1=x=y']).env)
      .toEqual(['BEADS_ACTOR=sly', 'EMPTY=', 'A_1=x=y']);
    expect(() => makeAgent('claude', 'sly', ['NOEQUALS'])).toThrow(/needs KEY=VALUE/);
    expect(() => makeAgent('claude', 'sly', ['1BAD=x'])).toThrow(/not shell-style/);
    expect(() => makeAgent('claude', 'sly', ['BAD-KEY=x'])).toThrow(/not shell-style/);
    expect(() => makeAgent('claude', 'sly', ['=x'])).toThrow(/not shell-style/);
    expect(() => makeAgent('claude', 'sly', ['A=1', 'A=2'])).toThrow(/set twice/);
  });
  test('an env value with a control character is refused', () => {
    for (const ch of ['\n', '\r', '\t', '\x00', '\x1b', '\x7f', '\u0085', '\u009b']) {
      expect(() => makeAgent('claude', 'sly', [`K=a${ch}b`])).toThrow(/control character/);
    }
  });
});

describe('parseArgs', () => {
  test('collects agents in flag order with defaults', () => {
    const cfg = parseArgs(['--branch', 'chore/x', '--claude', 'sly', '--codex', 'jay']);
    expect(cfg.branch).toBe('chore/x');
    expect(cfg.base).toBe('origin/main');
    expect(cfg.timeout).toBe(45000);
    expect(cfg.agents.map((a) => a.handle)).toEqual(['sly', 'jay']);
  });
  test('--base and --timeout override defaults', () => {
    const cfg = parseArgs(['--branch', 'b', '--base', 'origin/dev', '--timeout', '9000', '--claude', 'sly']);
    expect(cfg.base).toBe('origin/dev');
    expect(cfg.timeout).toBe(9000);
  });
  test('--source-workspace is optional and captured when present', () => {
    expect(parseArgs(['--branch', 'b', '--claude', 'sly']).sourceWorkspace).toBeUndefined();
    expect(parseArgs(['--branch', 'b', '--source-workspace', 'w1Z', '--claude', 'sly']).sourceWorkspace).toBe('w1Z');
  });
  test('missing --branch throws', () => {
    expect(() => parseArgs(['--claude', 'sly'])).toThrow(/--branch is required/);
  });
  test('zero agent flags throws', () => {
    expect(() => parseArgs(['--branch', 'b'])).toThrow(/at least one agent/);
  });
  test('duplicate handle throws', () => {
    expect(() => parseArgs(['--branch', 'b', '--claude', 'sly', '--codex', 'sly']))
      .toThrow(/duplicate handle/);
  });
  test('unknown flag throws', () => {
    expect(() => parseArgs(['--branch', 'b', '--bogus', 'x'])).toThrow(/unknown flag/);
  });
  test('flag missing its value throws', () => {
    expect(() => parseArgs(['--branch'])).toThrow(/missing value for --branch/);
  });
});

// Responses may be strings or (file, args) => string functions.
function fakeRunner(matchers) {
  const calls = [];
  const run = (file, args) => {
    calls.push([file, ...args]);
    for (const [pred, resp] of matchers) {
      if (pred(file, args)) {
        if (resp instanceof Error) throw resp;
        return typeof resp === 'function' ? resp(file, args) : resp;
      }
    }
    return '';
  };
  return { run, calls };
}

const AGENT_LIST = (names = []) =>
  JSON.stringify({ result: { agents: names.map((name) => ({ name })) } });
const WT = JSON.stringify({
  result: {
    worktree: { path: '/wt/x', open_workspace_id: 'wR' },
    root_pane: { pane_id: 'wR:p1' },
    tab: { tab_id: 'wR:t1' },
  },
});
// `worktree list --cwd` resolves the repo's parent (main-checkout) workspace id.
const WL = JSON.stringify({ result: { source: { source_workspace_id: 'wMain' }, worktrees: [] } });

// Dynamic tab/pane ids so multi-agent sequences stay distinguishable:
// tab create -> t2/p2, t3/p4, ...; agent start takes over the tab's root pane
// (the --pane it is handed) and reports that same pane back.
function dynMatchers(listResp = AGENT_LIST(), remotes = 'origin\n') {
  let t = 1;
  let p = 1;
  return [
    [(f, a) => f === 'herdr' && a[0] === 'agent' && a[1] === 'list', listResp],
    [(f, a) => f === 'herdr' && a[0] === 'worktree' && a[1] === 'list', WL],
    [(f, a) => f === 'herdr' && a[0] === 'worktree' && a[1] === 'create', WT],
    [(f, a) => f === 'herdr' && a[0] === 'tab' && a[1] === 'create',
      () => JSON.stringify({ result: { tab: { tab_id: `wR:t${++t}` }, root_pane: { pane_id: `wR:p${++p}` } } })],
    [(f, a) => f === 'herdr' && a[0] === 'agent' && a[1] === 'start',
      (f, a) => {
        const paneIdx = a.indexOf('--pane') + 1;
        return JSON.stringify({ result: { agent: { pane_id: a[paneIdx], name: a[2] } } });
      }],
    // Appended last on purpose: tests override matchers BY INDEX, so a new
    // matcher at the front would silently repoint one of theirs.
    [(f, a) => f === 'git' && a[0] === 'remote' && a.length === 1, remotes],
  ];
}

describe('startAgent', () => {
  const AGENT = 'jay';
  const a = () => makeAgent('claude', AGENT);
  const busy = JSON.stringify({ error: { code: 'agent_pane_busy', message: 'not an available shell' } });
  const ok = JSON.stringify({ result: { agent: { pane_id: 'wR:p2', name: AGENT } } });

  // A fresh root pane returns agent_pane_busy for a few hundred ms (exit 0 with a
  // JSON error), then becomes an available shell. startAgent retries only that.
  function runner(responses) {
    const calls = [];
    let i = 0;
    const run = (f, args) => { calls.push([f, ...args]); return responses[Math.min(i++, responses.length - 1)]; };
    const slept = [];
    return { deps: { run, sleep: (ms) => slept.push(ms) }, calls, slept };
  }

  test('retries agent_pane_busy (JSON error envelope), then returns the started agent', () => {
    const { deps, calls, slept } = runner([busy, busy, ok]);
    const st = startAgent(a(), 'wR:p2', '45000', deps);
    expect(st.result.agent.name).toBe(AGENT);
    expect(calls.filter((c) => c[1] === 'agent' && c[2] === 'start')).toHaveLength(3);
    expect(slept).toEqual([400, 400]); // one wait between each busy response, none after success
  });

  // The real execFileSync path throws on the non-zero exit, with the error JSON
  // on e.stderr (empty stdout). readStart must recover the envelope from stderr.
  test('recovers the busy error from a thrown execFileSync-style error (JSON on stderr)', () => {
    const calls = [];
    let i = 0;
    const slept = [];
    const run = (f, args) => {
      calls.push([f, ...args]);
      if (i++ === 0) { const e = new Error('Command failed'); e.status = 1; e.stdout = ''; e.stderr = busy + '\n'; throw e; }
      return ok;
    };
    const st = startAgent(a(), 'wR:p2', '45000', { run, sleep: (ms) => slept.push(ms) });
    expect(st.result.agent.name).toBe(AGENT);
    expect(calls.filter((c) => c[1] === 'agent' && c[2] === 'start')).toHaveLength(2);
    expect(slept).toEqual([400]);
  });

  test('a thrown error with no JSON envelope (real spawn failure) propagates', () => {
    const run = () => { const e = new Error('spawn herdr ENOENT'); throw e; };
    expect(() => startAgent(a(), 'wR:p2', '45000', { run, sleep: () => {} })).toThrow(/ENOENT/);
  });

  // A nonempty but non-JSON stdout must not mask a valid envelope on stderr.
  test('recovers the busy envelope from stderr even when stdout is nonempty non-JSON', () => {
    const calls = [];
    let i = 0;
    const slept = [];
    const run = (f, args) => {
      calls.push([f, ...args]);
      if (i++ === 0) {
        const e = new Error('Command failed'); e.status = 1;
        e.stdout = 'warning: some noise\n'; e.stderr = busy + '\n'; throw e;
      }
      return ok;
    };
    const st = startAgent(a(), 'wR:p2', '45000', { run, sleep: (ms) => slept.push(ms) });
    expect(st.result.agent.name).toBe(AGENT);
    expect(slept).toEqual([400]);
  });

  test('does not retry a non-busy error - it throws immediately', () => {
    const err = JSON.stringify({ error: { code: 'agent_name_taken', message: 'handle taken' } });
    const { deps, calls } = runner([err]);
    expect(() => startAgent(a(), 'wR:p2', '45000', deps)).toThrow(/handle taken/);
    expect(calls.filter((c) => c[1] === 'agent' && c[2] === 'start')).toHaveLength(1);
  });

  test('opencode extra args ride after -- on the start call', () => {
    const { deps, calls } = runner([ok]);
    startAgent(makeAgent('opencode', 'bob:ollama/qwen2.5:7b'), 'wR:p2', '45000', deps);
    expect(calls[0]).toEqual(
      ['herdr', 'agent', 'start', 'bob', '--kind', 'opencode', '--pane', 'wR:p2', '--timeout', '45000',
        '--', '-m', 'ollama/qwen2.5:7b']);
  });

  test('claude model/effort args ride after -- on the start call', () => {
    const { deps, calls } = runner([ok]);
    startAgent(makeAgent('claude', 'nell:model=opus,effort=high'), 'wR:p2', '45000', deps);
    expect(calls[0]).toEqual(
      ['herdr', 'agent', 'start', 'nell', '--kind', 'claude', '--pane', 'wR:p2', '--timeout', '45000',
        '--', '--model', 'opus', '--effort', 'high']);
  });

  test('codex model/effort args ride after -- on the start call', () => {
    const { deps, calls } = runner([ok]);
    startAgent(makeAgent('codex', 'jay:model=gpt-6.1-sol,effort=high'), 'wR:p2', '45000', deps);
    expect(calls[0]).toEqual(
      ['herdr', 'agent', 'start', 'jay', '--kind', 'codex', '--pane', 'wR:p2', '--timeout', '45000',
        '--', '--no-daemon', '--model', 'gpt-6.1-sol', '-c', 'model_reasoning_effort=high']);
  });

  test('a bare handle passes only its default model after --', () => {
    const { deps, calls } = runner([ok]);
    startAgent(makeAgent('claude', 'sly'), 'wR:p2', '45000', deps);
    expect(calls[0]).toEqual(
      ['herdr', 'agent', 'start', 'sly', '--kind', 'claude', '--pane', 'wR:p2', '--timeout', '45000',
        '--', '--model', 'claude-opus-5-5']);
  });
});

describe('launchAgent', () => {
  // The old report set `model` to the FLAG name ("model":"codex"), which reads
  // like an answer while carrying nothing about Opus vs Sonnet. The kind is
  // reported as `kind`; model/effort report what was actually selected.
  test('reports kind, the default model, and null effort when effort is inherited', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    const out = launchAgent(makeAgent('codex', 'jay'), { workspace: 'wR', cwd: '/wt/x' }, { run });
    expect(out).toEqual({
      handle: 'jay', kind: 'codex', model: 'gpt-6.1-sol', effort: null,
      mode: null, sandbox: null, approval: null, env: [],
      args: ['--no-daemon', '--model', 'gpt-6.1-sol'], pane_id: 'wR:p2', tab: 'wR:t2',
    });
    expect(calls).toEqual([
      ['herdr', 'tab', 'create', '--workspace', 'wR', '--cwd', '/wt/x', '--label', 'jay ◇', '--no-focus'],
      ['herdr', 'agent', 'start', 'jay', '--kind', 'codex', '--pane', 'wR:p2', '--timeout', '45000',
        '--', '--no-daemon', '--model', 'gpt-6.1-sol'],
      ['herdr', 'agent', 'wait', 'jay', '--until', 'idle', '--timeout', '45000'],
    ]);
  });
  test('a role decorates the tab as <handle>-<role>, keeping the kind glyph', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    launchAgent(makeAgent('codex', 'jay:role=impl'), { workspace: 'wR', cwd: '/wt/x' }, { run });
    expect(calls).toContainEqual(
      ['herdr', 'tab', 'create', '--workspace', 'wR', '--cwd', '/wt/x', '--label', 'jay-impl ◇', '--no-focus']);
  });

  test('label and timeout are overridable', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    launchAgent(makeAgent('claude', 'sly'), { workspace: 'wR', cwd: '/wt/x', label: 'x', timeout: 9000 }, { run });
    expect(calls).toContainEqual(
      ['herdr', 'tab', 'create', '--workspace', 'wR', '--cwd', '/wt/x', '--label', 'x', '--no-focus']);
    expect(calls).toContainEqual(['herdr', 'agent', 'wait', 'sly', '--until', 'idle', '--timeout', '9000']);
  });
  test('opencode passes its -m selector after -- ', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    launchAgent(makeAgent('opencode', 'bob:ollama/qwen2.5:7b'), { workspace: 'wR', cwd: '/wt/x' }, { run });
    expect(calls).toContainEqual(
      ['herdr', 'agent', 'start', 'bob', '--kind', 'opencode', '--pane', 'wR:p2', '--timeout', '45000',
        '--', '-m', 'ollama/qwen2.5:7b']);
  });
  test('an explicitly selected model and effort are reported back, not the kind', () => {
    const { run } = fakeRunner(dynMatchers());
    const out = launchAgent(makeAgent('claude', 'nell:model=opus,effort=high'),
      { workspace: 'wR', cwd: '/wt/x' }, { run });
    expect(out).toEqual({
      handle: 'nell', kind: 'claude', model: 'opus', effort: 'high',
      mode: null, sandbox: null, approval: null, env: [],
      args: ['--model', 'opus', '--effort', 'high'], pane_id: 'wR:p2', tab: 'wR:t2',
    });
  });

  test('the result reports args as the full vector the CLI received', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    const out = launchAgent(makeAgent('claude', 'sol', [], ['--add-dir', '/wt/d365']),
      { workspace: 'wR', cwd: '/wt/x' }, { run });
    expect(out.args).toEqual(['--model', 'claude-opus-5-5', '--add-dir', '/wt/d365']);
    expect(calls).toContainEqual(['herdr', 'agent', 'start', 'sol', '--kind', 'claude', '--pane', 'wR:p2',
      '--timeout', '45000', '--', '--model', 'claude-opus-5-5', '--add-dir', '/wt/d365']);
  });

  test('env goes to tab create; the result lists keys only, never values', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    const out = launchAgent(
      makeAgent('codex', 'jay:sandbox=workspace-write,approval=never', ['BEADS_ACTOR=jay', 'API_TOKEN=s3cret']),
      { workspace: 'wR', cwd: '/wt/x' }, { run });
    expect(calls).toContainEqual(['herdr', 'tab', 'create', '--workspace', 'wR', '--cwd', '/wt/x',
      '--label', 'jay ◇', '--no-focus', '--env', 'BEADS_ACTOR=jay', '--env', 'API_TOKEN=s3cret']);
    expect(out).toMatchObject({
      mode: null, sandbox: 'workspace-write', approval: 'never', env: ['BEADS_ACTOR', 'API_TOKEN'],
    });
    expect(JSON.stringify(out)).not.toContain('s3cret');
  });
});

describe('launchAgent failure output', () => {
  // execFileSync puts the full argv in the error message; the CLI prints it.
  test('a failed tab create never exposes an env value', () => {
    const run = (f, a) => {
      if (a[0] === 'tab') {
        const e = new Error(`Command failed: herdr ${a.join(' ')}\nherdr: bad env API_TOKEN=s3cret-value`);
        e.stderr = 'API_TOKEN=s3cret-value';
        e.status = 7;
        throw e;
      }
      return '';
    };
    const a = makeAgent('claude', 'sly', ['API_TOKEN=s3cret-value', 'N=1']);
    let err;
    try { launchAgent(a, { workspace: 'wR', cwd: '/wt/x' }, { run }); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe(
      'herdr tab create failed (exit 7); its output is withheld because it may echo --env values (API_TOKEN, N)');
    expect(err.stderr).toBeUndefined();
  });
  // Length-based scrubbing cannot hide a short value, so nothing is echoed.
  test('a short env value echoed alone by herdr is not exposed either', () => {
    const run = (f, a) => {
      if (a[0] === 'tab') throw new Error('herdr: rejected env value: abc');
      return '';
    };
    let err;
    try {
      launchAgent(makeAgent('claude', 'sly', ['API_TOKEN=abc']), { workspace: 'wR', cwd: '/wt/x' }, { run });
    } catch (e) { err = e; }
    expect(err.message).not.toContain('abc');
    expect(err.message).toContain('API_TOKEN');
  });
  test('with no env the original tab create error passes through', () => {
    const boom = new Error('herdr: no such workspace wR');
    const run = (f, a) => { if (a[0] === 'tab') throw boom; return ''; };
    expect(() => launchAgent(makeAgent('claude', 'sly'), { workspace: 'wR', cwd: '/wt/x' }, { run }))
      .toThrow(boom);
  });
});

describe('up', () => {
  test('single claude agent: exact call sequence and result', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    const result = up(['--branch', 'chore/x', '--claude', 'sly'], { run, cwd: '/wt/here' });

    expect(result).toEqual({
      worktree: { path: '/wt/x', workspace_id: 'wR' },
      agents: [{
        handle: 'sly', kind: 'claude', model: 'claude-opus-5-5', effort: null,
        mode: null, sandbox: null, approval: null, env: [],
        args: ['--model', 'claude-opus-5-5'], pane_id: 'wR:p2', tab: 'wR:t2',
      }],
    });
    expect(calls).toEqual([
      ['herdr', 'agent', 'list'],
      ['git', 'remote'], // is the base's first segment a configured remote?
      ['git', 'fetch', 'origin', 'main'],
      ['herdr', 'worktree', 'list', '--cwd', '/wt/here', '--json'], // resolve source workspace
      ['herdr', 'worktree', 'create', '--branch', 'chore/x', '--base', 'origin/main', '--no-focus', '--json',
        '--workspace', 'wMain'],
      ['herdr', 'tab', 'create', '--workspace', 'wR', '--cwd', '/wt/x', '--label', 'sly ◆', '--no-focus'],
      ['herdr', 'agent', 'start', 'sly', '--kind', 'claude', '--pane', 'wR:p2', '--timeout', '45000',
        '--', '--model', 'claude-opus-5-5'],
      ['herdr', 'agent', 'wait', 'sly', '--until', 'idle', '--timeout', '45000'],
      ['herdr', 'tab', 'close', 'wR:t1'], // the worktree's original root tab
    ]);
  });

  test('each agent gets its own tab; the worktree root tab closes last', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    const result = up(['--branch', 'chore/x', '--claude', 'sly', '--codex', 'jay'], { run });

    expect(result.agents).toEqual([
      { handle: 'sly', kind: 'claude', model: 'claude-opus-5-5', effort: null,
        mode: null, sandbox: null, approval: null, env: [],
        args: ['--model', 'claude-opus-5-5'], pane_id: 'wR:p2', tab: 'wR:t2' },
      { handle: 'jay', kind: 'codex', model: 'gpt-6.1-sol', effort: null,
        mode: null, sandbox: null, approval: null, env: [],
        args: ['--no-daemon', '--model', 'gpt-6.1-sol'], pane_id: 'wR:p3', tab: 'wR:t3' },
    ]);
    expect(calls).toContainEqual(
      ['herdr', 'tab', 'create', '--workspace', 'wR', '--cwd', '/wt/x', '--label', 'jay ◇', '--no-focus']);
    expect(calls).toContainEqual(
      ['herdr', 'agent', 'start', 'jay', '--kind', 'codex', '--pane', 'wR:p3', '--timeout', '45000',
        '--', '--no-daemon', '--model', 'gpt-6.1-sol']);
    expect(calls[calls.length - 1]).toEqual(['herdr', 'tab', 'close', 'wR:t1']);
  });

  test('opencode agent starts with its -m selector after --', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    up(['--branch', 'b', '--opencode', 'bob:ollama/qwen2.5:7b'], { run });
    expect(calls).toContainEqual(
      ['herdr', 'agent', 'start', 'bob', '--kind', 'opencode', '--pane', 'wR:p2', '--timeout', '45000',
        '--', '-m', 'ollama/qwen2.5:7b']);
  });

  // Per-agent settings are the point of attaching them to the flag: two agents
  // of the SAME kind can want different ones in one launch.
  test('two claude agents carry different selectors in one launch', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    const result = up(['--branch', 'b',
      '--claude', 'nell:model=opus,effort=high',
      '--claude', 'sly:model=sonnet'], { run });
    expect(result.agents).toEqual([
      { handle: 'nell', kind: 'claude', model: 'opus', effort: 'high',
        mode: null, sandbox: null, approval: null, env: [],
        args: ['--model', 'opus', '--effort', 'high'], pane_id: 'wR:p2', tab: 'wR:t2' },
      { handle: 'sly', kind: 'claude', model: 'sonnet', effort: null,
        mode: null, sandbox: null, approval: null, env: [],
        args: ['--model', 'sonnet'], pane_id: 'wR:p3', tab: 'wR:t3' },
    ]);
    expect(calls).toContainEqual(
      ['herdr', 'agent', 'start', 'nell', '--kind', 'claude', '--pane', 'wR:p2', '--timeout', '45000',
        '--', '--model', 'opus', '--effort', 'high']);
    expect(calls).toContainEqual(
      ['herdr', 'agent', 'start', 'sly', '--kind', 'claude', '--pane', 'wR:p3', '--timeout', '45000',
        '--', '--model', 'sonnet']);
  });

  test('--env applies to every agent, whether given before or after the agent flags', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    const result = up(['--branch', 'b', '--env', 'A=1', '--claude', 'sly:mode=plan',
      '--codex', 'jay', '--env', 'B=2'], { run });
    expect(result.agents.map((a) => a.env)).toEqual([['A', 'B'], ['A', 'B']]);
    expect(result.agents[0].mode).toBe('plan');
    const tabs = calls.filter((c) => c[1] === 'tab' && c[2] === 'create');
    expect(tabs).toHaveLength(2);
    for (const t of tabs) expect(t.slice(-4)).toEqual(['--env', 'A=1', '--env', 'B=2']);
  });
  test('a bad --env is rejected before any herdr call', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    expect(() => up(['--branch', 'b', '--claude', 'sly', '--env', 'X=a\nb'], { run })).toThrow(/control character/);
    expect(() => up(['--branch', 'b', '--claude', 'sly', '--env'], { run })).toThrow(/missing value for --env/);
    expect(calls).toEqual([]);
  });

  test('a bad selector is rejected before any herdr call', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    expect(() => up(['--branch', 'b', '--claude', 'sly:temperature=0'], { run })).toThrow(/unknown selector key/);
    expect(calls).toEqual([]);
  });

  test('git fetch derives the branch from --base', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    up(['--branch', 'b', '--base', 'origin/dev', '--claude', 'sly'], { run });
    expect(calls).toContainEqual(['git', 'fetch', 'origin', 'dev']);
  });

  // A worktree based on a branch that exists only locally (`task/<id>`): an
  // unconditional `git fetch origin task/<id>` dies on `couldn't find remote
  // ref` and the worktree is never created. The base names a remote or
  // it does not, and only the first case has anything to fetch.
  const fetches = (calls) => calls.filter((c) => c[0] === 'git' && c[1] === 'fetch');

  test('a local-only base creates the worktree with no fetch attempted', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    const result = up(['--branch', 'task/r7-auth', '--base', 'task/r7', '--claude', 'sly'], { run });
    expect(fetches(calls)).toEqual([]);
    expect(calls).toContainEqual(
      ['herdr', 'worktree', 'create', '--branch', 'task/r7-auth', '--base', 'task/r7', '--no-focus', '--json',
        '--workspace', 'wMain']);
    expect(result.worktree).toEqual({ path: '/wt/x', workspace_id: 'wR' });
  });

  test('a base with no slash is a local ref, not shorthand for origin/<base>', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    up(['--branch', 'b', '--base', 'main', '--claude', 'sly'], { run });
    expect(fetches(calls)).toEqual([]);
  });

  // "remote-tracking" is decided against `git remote`, not against the literal
  // prefix `origin/`: a repo whose upstream is named something else must still
  // get its fetch, and a base like `task/r7` must not be mistaken for one
  // because it happens to contain a slash.
  test('a non-origin remote base fetches from that remote', () => {
    const { run, calls } = fakeRunner(dynMatchers(AGENT_LIST(), 'origin\nupstream\n'));
    up(['--branch', 'b', '--base', 'upstream/main', '--claude', 'sly'], { run });
    expect(fetches(calls)).toEqual([['git', 'fetch', 'upstream', 'main']]);
  });

  test('a remote base with slashes in the branch fetches the whole branch name', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    up(['--branch', 'b', '--base', 'origin/release/2.0', '--claude', 'sly'], { run });
    expect(fetches(calls)).toEqual([['git', 'fetch', 'origin', 'release/2.0']]);
  });

  test('the fetch happens before worktree create resolves the base', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    up(['--branch', 'b', '--base', 'origin/dev', '--claude', 'sly'], { run });
    const fetchAt = calls.findIndex((c) => c[0] === 'git' && c[1] === 'fetch');
    const createAt = calls.findIndex((c) => c[1] === 'worktree' && c[2] === 'create');
    expect(fetchAt).toBeGreaterThan(-1);
    expect(createAt).toBeGreaterThan(fetchAt);
  });

  test('--timeout flows into the readiness wait', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    up(['--branch', 'b', '--timeout', '9000', '--claude', 'sly'], { run });
    expect(calls).toContainEqual(['herdr', 'agent', 'wait', 'sly', '--until', 'idle', '--timeout', '9000']);
  });

  test('resolves the source workspace from cwd and forwards it to worktree create', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    up(['--branch', 'b', '--claude', 'sly'], { run, cwd: '/some/linked/wt' });
    expect(calls).toContainEqual(['herdr', 'worktree', 'list', '--cwd', '/some/linked/wt', '--json']);
    expect(calls).toContainEqual(
      ['herdr', 'worktree', 'create', '--branch', 'b', '--base', 'origin/main', '--no-focus', '--json',
        '--workspace', 'wMain']);
  });

  test('--source-workspace overrides the cwd lookup (no worktree list call)', () => {
    const { run, calls } = fakeRunner(dynMatchers());
    up(['--branch', 'b', '--source-workspace', 'wOverride', '--claude', 'sly'], { run });
    expect(calls.some((c) => c[1] === 'worktree' && c[2] === 'list')).toBe(false);
    expect(calls).toContainEqual(
      ['herdr', 'worktree', 'create', '--branch', 'b', '--base', 'origin/main', '--no-focus', '--json',
        '--workspace', 'wOverride']);
  });

  test('throws (does not silently omit --workspace) when the source workspace is unresolved', () => {
    const noSource = dynMatchers();
    // override the worktree-list matcher to return an envelope with no source id
    noSource[1] = [(f, a) => f === 'herdr' && a[0] === 'worktree' && a[1] === 'list',
      JSON.stringify({ result: { source: {}, worktrees: [] } })];
    const { run, calls } = fakeRunner(noSource);
    expect(() => up(['--branch', 'b', '--claude', 'sly'], { run, cwd: '/nowhere' }))
      .toThrow(/could not resolve a source workspace/);
    expect(calls.some((c) => c[1] === 'worktree' && c[2] === 'create')).toBe(false);
  });

  test('pre-flight rejects a globally taken handle without creating a worktree', () => {
    const { run, calls } = fakeRunner(dynMatchers(AGENT_LIST(['sly'])));
    expect(() => up(['--branch', 'b', '--claude', 'sly'], { run })).toThrow(/already taken: sly/);
    expect(calls.some((c) => c[1] === 'worktree' && c[2] === 'create')).toBe(false);
  });

  test('propagates a runner failure', () => {
    const failing = [
      [(f, a) => f === 'herdr' && a[0] === 'agent' && a[1] === 'list', AGENT_LIST()],
      [(f, a) => f === 'herdr' && a[0] === 'worktree' && a[1] === 'list', WL],
      [(f, a) => f === 'herdr' && a[0] === 'worktree' && a[1] === 'create', new Error('worktree_create_failed')],
    ];
    const { run } = fakeRunner(failing);
    expect(() => up(['--branch', 'b', '--claude', 'sly'], { run })).toThrow(/worktree_create_failed/);
  });
});

const { execFileSync } = require('child_process');
const path = require('path');

const HERD = path.join(__dirname, '..', 'skills', 'herdr', 'scripts', 'herd.js');
const UP = path.join(__dirname, '..', 'skills', 'herdr', 'scripts', 'up.js');

describe('herd.js up wiring', () => {
  test('helper scripts parse under the active Node runtime', () => {
    execFileSync('node', ['--check', HERD], { encoding: 'utf8', stdio: 'pipe' });
    execFileSync('node', ['--check', UP], { encoding: 'utf8', stdio: 'pipe' });
  });

  test('node herd.js up with no flags errors on stderr and exits non-zero', () => {
    let err;
    try {
      execFileSync('node', [HERD, 'up'], { encoding: 'utf8', stdio: 'pipe' });
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.status).toBe(1);
    expect(String(err.stderr)).toMatch(/herd up: --branch is required/);
  });
});
