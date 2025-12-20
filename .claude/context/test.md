# Claude Domestique - Testing Details

Project-specific testing patterns. Extends `mantra/context/test.md` (base conventions).

For general patterns (temp directories, git setup, DI, parameterized tests), see base test.md.

## Running Tests

All plugins use Jest.

```bash
cd mantra && npm test
cd memento && npm test
cd onus && npm test
```

### Targeted Tests

```bash
# Single file
cd memento && npm test -- hooks/__tests__/verify-session.test.js

# Pattern match
cd memento && npm test -- -t "sessionExists"

# Watch mode
cd memento && npm test -- --watch

# Coverage
cd memento && npm test -- --coverage
```

## Hook Testing Pattern

Hooks receive JSON input and return structured output. Test by calling exported functions directly:

```javascript
const { processHook, processPreToolUse } = require('../verify-session.js');

describe('processHook', () => {
  it('routes PreToolUse events correctly', () => {
    const result = processHook({
      cwd: tempDir,
      hook_event_name: 'PreToolUse',
      tool_name: 'Edit',
      tool_input: { file_path: '/some/path.js' }
    });

    expect(result.decision).toBe('approve');
  });
});
```

## Project-Specific DI Examples

### State Path Injection

```javascript
function loadState(options = {}) {
  const {
    statePath = path.join(os.homedir(), '.claude', 'memento-state.json'),
  } = options;

  if (!fs.existsSync(statePath)) {
    return { counter: 0 };
  }
  return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
}

// Test with temp dir
it('loads state from custom path', () => {
  const statePath = path.join(tempDir, 'state.json');
  fs.writeFileSync(statePath, JSON.stringify({ counter: 5 }));

  const result = loadState({ statePath });
  expect(result.counter).toBe(5);
});
```

### Config Path Injection

```javascript
function loadProjectConfig(options = {}) {
  const { cwd = process.cwd() } = options;
  const configPath = path.join(cwd, '.claude', 'config.json');
  // ...
}

// Test
it('loads config from project directory', () => {
  const configDir = path.join(tempDir, '.claude');
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    path.join(configDir, 'config.json'),
    JSON.stringify({ setting: 'value' })
  );

  const result = loadProjectConfig({ cwd: tempDir });
  expect(result.setting).toBe('value');
});
```

## Test File Locations

```
<plugin>/
├── hooks/
│   ├── session-startup.js
│   └── __tests__/
│       └── session-startup.test.js
├── scripts/
│   ├── session.js
│   └── __tests__/
│       └── session.test.js
```

Tests live in `__tests__/` folders adjacent to the source files they test.
