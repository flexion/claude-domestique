function parseArgs(argv) {
  const cfg = {
    branch: null,
    base: 'origin/main',
    timeout: 45000,
    agents: [],
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    switch (arg) {
      case '--branch':
        if (i + 1 >= argv.length) throw new Error(`missing value for --branch`);
        cfg.branch = argv[++i];
        break;
      case '--base':
        if (i + 1 >= argv.length) throw new Error(`missing value for --base`);
        cfg.base = argv[++i];
        break;
      case '--timeout':
        if (i + 1 >= argv.length) throw new Error(`missing value for --timeout`);
        cfg.timeout = Number(argv[++i]);
        break;
      case '--source-workspace':
        if (i + 1 >= argv.length) throw new Error(`missing value for --source-workspace`);
        cfg.sourceWorkspace = argv[++i];
        break;
      default:
        const kind = Object.keys(KINDS).find((k) => arg === `--${k}`);
        if (!kind) throw new Error(`unknown flag: ${arg}`);
        if (i + 1 >= argv.length) throw new Error(`missing value for ${arg}`);
        cfg.agents.push(makeAgent(kind, argv[++i]));
        break;
    }
    i++;
  }

  if (!cfg.branch) throw new Error(`--branch is required`);
  if (cfg.agents.length === 0) throw new Error(`at least one agent is required`);

  const handles = cfg.agents.map((a) => a.handle);
  const uniqueHandles = new Set(handles);
  if (handles.length !== uniqueHandles.size) {
    const seen = new Set();
    for (const handle of handles) {
      if (seen.has(handle)) throw new Error(`duplicate handle: ${handle}`);
      seen.add(handle);
    }
  }

  return cfg;
}
