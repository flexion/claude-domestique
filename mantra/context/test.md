# Testing Conventions - Detailed Reference

This document provides detailed examples for the testing patterns defined in `test.yml`.

## Core Principles

### Independence

Tests must be independent - they can run in any order or in parallel:

```javascript
// Bad - shared state between tests
let counter = 0;
it('increments', () => { counter++; expect(counter).toBe(1); });
it('increments again', () => { counter++; expect(counter).toBe(2); }); // Fails if run alone

// Good - each test is self-contained
it('increments from zero', () => {
  const counter = createCounter();
  counter.increment();
  expect(counter.value).toBe(1);
});
```

### Determinism

Same input must produce same output. Avoid:
- Current time (`Date.now()`) - inject a clock
- Random values (`Math.random()`) - inject a seed or mock
- Network calls - use stubs
- File system state - use mocks for unit tests

## FIRST Principles

All tests should follow FIRST principles:

### Fast
- Unit tests complete in milliseconds
- Full unit test suite < 10 seconds
- Integration tests < 60 seconds
- Slow tests don't get run, defeating the purpose

### Independent
- Tests don't depend on each other
- Can run in any order
- Each test sets up its own data
- No shared mutable state between tests

### Repeatable
- Same result every time
- No reliance on external services (use mocks)
- No date/time dependencies (inject clock)
- No random data (use fixed seeds)

### Self-Validating
- Test passes (green) or fails (red)
- No manual inspection of logs
- Clear assertion failures with helpful messages
- Example: `expect(user.role).toBe('admin')` not just `console.log(user)`

### Timely
- Write tests immediately after implementing method
- Don't wait until feature is "done"
- Write failing test first for bug fixes
- Test-first prevents untestable designs

### Simple First

Start with the simplest test case, then build complexity:

```javascript
// Start here
it('returns empty array for empty input', () => {
  expect(process([])).toEqual([]);
});

// Then add complexity
it('processes single item', () => { ... });
it('processes multiple items', () => { ... });
it('handles edge cases', () => { ... });
```

### Test First (TDD)

Never write all functionality then all tests. Work in small chunks:

#### Per-Chunk Cycle

1. **Write one test** - defines expected behavior
2. **Run targeted test** - should fail (red)
3. **Implement minimal code** - just enough to pass
4. **Run targeted test** - should pass (green)
5. **Check coverage** - verify targeted code is covered
6. **Refactor if needed** - clean up while keeping tests green
7. **Next chunk** - repeat steps 1-6

#### After All Chunks

8. **Run full test suite** - ensure nothing broke
9. **Check total coverage** - should be high from chunk-by-chunk approach
10. **Iterate** - add tests for gaps until coverage is satisfactory

#### Example Workflow

```bash
# Chunk 1
# Write test for parse('')
npm test -- --grep "parses empty" --coverage
# FAILS - parse() doesn't exist
# Implement minimal parse()
npm test -- --grep "parses empty" --coverage
# PASSES - check coverage shows parse() covered

# Chunk 2
# Write test for parse('apple')
npm test -- --grep "parses single" --coverage
# FAILS - returns empty
# Implement item splitting
npm test -- --grep "parses single" --coverage
# PASSES - coverage still good

# After all chunks
npm test --coverage
# All pass, coverage should be high
# If gaps, add targeted tests and iterate
```

#### Design for Testability

If code is hard to test, refactor it:

- **Extract pure functions** - no side effects, easy to test
- **Use dependency injection** - pass deps as params
- **Small units** - single responsibility, focused tests
- **Avoid global state** - makes tests interdependent

```javascript
// Hard to test - embedded dependencies
function processOrder(orderId) {
  const order = db.findOrder(orderId);  // db is global
  const result = calculateTotal(order);
  emailService.send(order.email, result);  // emailService is global
  return result;
}

// Easy to test - injected dependencies
function processOrder(orderId, { db, emailService }) {
  const order = db.findOrder(orderId);
  const result = calculateTotal(order);
  emailService.send(order.email, result);
  return result;
}
```

**Why not big-bang:**
- Harder to debug when many tests fail at once
- Tests may not match actual implementation
- Miss edge cases discovered during implementation
- Lose the design benefits of test-first thinking
- Coverage gaps are harder to identify and fill

## Unit vs Integration Tests

### Unit Tests

Isolated from all external dependencies. Mock at module boundaries:

```javascript
// Unit test - mock the dependency
it('saves user with generated id', async () => {
  const mockDb = { insert: jest.fn().mockResolvedValue({ id: '123' }) };
  const user = await saveUser({ name: 'Alice' }, { db: mockDb });

  expect(mockDb.insert).toHaveBeenCalledWith({ name: 'Alice' });
  expect(user.id).toBe('123');
});
```

**Unit tests avoid:**
- Real filesystem operations
- Network calls
- Database connections
- Other modules (mock them)

### Integration Tests

Test real interactions in isolated environments:

```javascript
// Integration test - real filesystem in temp dir
it('persists data to disk', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
  try {
    saveToFile(path.join(tempDir, 'data.json'), { key: 'value' });
    const loaded = loadFromFile(path.join(tempDir, 'data.json'));
    expect(loaded.key).toBe('value');
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});
```

## Dependency Injection Pattern

The core principle: functions should accept their dependencies as parameters rather than importing them directly. This enables testing without mocks.

### Good: Options Object Pattern

```javascript
// Implementation
function loadState(options = {}) {
  const {
    statePath = path.join(os.homedir(), '.config', 'state.json'),
    fs: _fs = require('fs')
  } = options;

  if (!_fs.existsSync(statePath)) {
    return { counter: 0 };
  }
  return JSON.parse(_fs.readFileSync(statePath, 'utf-8'));
}

// Test - inject custom path, use real fs in temp dir
it('loads state from custom path', () => {
  const statePath = path.join(tempDir, 'state.json');
  fs.writeFileSync(statePath, JSON.stringify({ counter: 5 }));

  const result = loadState({ statePath });
  expect(result.counter).toBe(5);
});
```

### Bad: Top-level Mocks

```javascript
// DON'T DO THIS
jest.mock('fs');  // or equivalent in other frameworks
const fs = require('fs');

beforeEach(() => {
  fs.existsSync.mockReturnValue(true);
  fs.readFileSync.mockReturnValue('{"counter": 5}');
});
```

Why it's bad:
- Mocks leak between tests
- Hard to reason about what's real vs mocked
- Brittle when implementation changes
- Can't test actual filesystem behavior

## Filesystem Isolation

Each test suite gets its own temporary directory.

### Setup Pattern

```javascript
describe('my-feature', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'my-feature-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates file in temp directory', () => {
    const filePath = path.join(tempDir, 'test.txt');
    fs.writeFileSync(filePath, 'content');
    expect(fs.existsSync(filePath)).toBe(true);
  });
});
```

### Directory Structure for Tests

```javascript
it('handles nested directories', () => {
  // Create structure
  const configDir = path.join(tempDir, '.config');
  const dataDir = path.join(configDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  // Create files
  fs.writeFileSync(path.join(dataDir, 'settings.json'), '{}');

  // Test the function
  const result = loadSettings(tempDir);
  expect(result).toBeTruthy();
});
```

## Git in Tests

Use real git commands in temp directories - don't mock git.

### Minimal Git Setup

```javascript
function setupGitRepo(dir, branch = null) {
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });

  // Initial commit required before branching
  fs.writeFileSync(path.join(dir, '.gitkeep'), '');
  execSync('git add .gitkeep', { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "init"', { cwd: dir, stdio: 'pipe' });

  if (branch) {
    execSync(`git checkout -b ${branch}`, { cwd: dir, stdio: 'pipe' });
  }
}
```

### Why Real Git

- Tests actual git behavior
- Catches edge cases (detached HEAD, etc.)
- No mock maintenance
- Temp dir cleanup handles everything

## Mocking Hierarchy

Prefer approaches higher in this list:

1. **Real implementations in isolation** - Use temp directories, test databases
2. **Dependency injection** - Pass dependencies as parameters
3. **Spies** - Observe calls without changing behavior
4. **Mocks** - Replace behavior entirely (last resort)

### When to Mock

- **External APIs** - HTTP calls, third-party services
- **Time-sensitive code** - Date.now, setTimeout
- **Random values** - Math.random, crypto

### When NOT to Mock

- **Filesystem** - Use temp directories instead
- **Git** - Use real git in temp directories
- **Internal modules** - Use DI instead
- **Node built-ins** - Usually test with real behavior

## Test Structure

### Pure Functions First

Test pure functions (no side effects) with simple inline assertions:

```javascript
describe('parseInput', () => {
  it('extracts id from valid input', () => {
    const result = parseInput('item-123-data');
    expect(result.id).toBe('123');
  });

  it('returns null for invalid input', () => {
    const result = parseInput('invalid');
    expect(result.id).toBe(null);
  });

  it('handles edge cases', () => {
    expect(parseInput(null)).toEqual({ id: null });
    expect(parseInput('')).toEqual({ id: null });
  });
});
```

### Side Effects Separate

Group tests with side effects in their own describe blocks with proper setup/teardown.

## Test Naming

Follow the pattern: `function → scenario → expected-outcome`

```javascript
describe('validateConfig', () => {
  // Good
  it('returns true when config file exists and is valid', () => {});
  it('returns false when config file is missing', () => {});
  it('throws when config file is corrupted', () => {});

  // Bad
  it('works', () => {});
  it('test 1', () => {});
  it('should validate', () => {});
});
```

## Parameterized Tests

Prefer table-driven tests when testing the same logic with multiple inputs. This reduces code duplication and makes it easy to add new cases.

### Before: Repetitive Tests

```javascript
// Bad - lots of duplicated test structure
it('parses feature branch', () => {
  expect(parseBranch('feature/add-auth').type).toBe('feature');
});

it('parses bugfix branch', () => {
  expect(parseBranch('bugfix/fix-login').type).toBe('bugfix');
});

it('parses chore branch', () => {
  expect(parseBranch('chore/update-deps').type).toBe('chore');
});
```

### After: Parameterized

```javascript
// Good - table-driven, easy to add cases
it.each([
  ['feature/add-auth', 'feature'],
  ['bugfix/fix-login', 'bugfix'],
  ['chore/update-deps', 'chore'],
  ['hotfix/critical', 'hotfix'],
])('parses %s as type %s', (branch, expectedType) => {
  expect(parseBranch(branch).type).toBe(expectedType);
});
```

### With Objects for Clarity

```javascript
it.each([
  { input: '', expected: { items: [] }, desc: 'empty string' },
  { input: 'a', expected: { items: ['a'] }, desc: 'single item' },
  { input: 'a,b', expected: { items: ['a', 'b'] }, desc: 'multiple items' },
])('parses $desc', ({ input, expected }) => {
  expect(parse(input)).toEqual(expected);
});
```

### When to Use

- Same assertion logic, different inputs
- Edge case variations (null, empty, boundary values)
- Multiple valid/invalid input patterns
- Error message variations

## Async Testing

### Promises and async/await

Always use `async/await` for cleaner async tests:

```javascript
// Good - async/await
it('fetches user data', async () => {
  const user = await fetchUser(123);
  expect(user.name).toBe('Alice');
});

// Also valid - return promise
it('fetches user data', () => {
  return fetchUser(123).then(user => {
    expect(user.name).toBe('Alice');
  });
});
```

### Testing Rejected Promises

```javascript
it('throws on invalid id', async () => {
  await expect(fetchUser(-1)).rejects.toThrow('Invalid ID');
});

// Or with try/catch
it('throws on invalid id', async () => {
  try {
    await fetchUser(-1);
    fail('Expected error to be thrown');
  } catch (error) {
    expect(error.message).toBe('Invalid ID');
  }
});
```

### Timeouts

Inject time dependencies for deterministic tests:

```javascript
// Implementation
function isExpired(timestamp, { now = Date.now } = {}) {
  return now() - timestamp > 3600000;
}

// Test - inject frozen time
it('returns true when expired', () => {
  const fixedNow = () => 1000000;
  expect(isExpired(0, { now: fixedNow })).toBe(true);
});
```

## Error Testing

### Testing Thrown Errors

```javascript
// Synchronous errors
it('throws on null input', () => {
  expect(() => process(null)).toThrow('Input required');
});

// Async errors
it('rejects on network failure', async () => {
  await expect(fetchData()).rejects.toThrow('Network error');
});
```

### Testing Error Properties

```javascript
it('throws error with correct code', () => {
  try {
    validate(badInput);
    fail('Expected error');
  } catch (error) {
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.field).toBe('email');
  }
});
```

### Error Parameterization

```javascript
it.each([
  [null, 'Input required'],
  ['', 'Input cannot be empty'],
  ['x', 'Input too short'],
])('throws "%s" for input %s', (input, expectedMessage) => {
  expect(() => validate(input)).toThrow(expectedMessage);
});
```

## Coverage Guidelines

### Must Test

- New business logic
- Conditional branches (if/else, switch)
- Error handling paths
- Edge cases (null, empty, boundary values)

### Skip Testing

- Simple property access
- Type-only code (interfaces, type definitions)
- Trivial wrappers that just forward calls
- Framework boilerplate

### Focus on Behavior

Test what the code does, not how it does it:

```javascript
// Good - tests behavior
it('saves user preferences to disk', () => {
  savePreferences({ theme: 'dark' });
  const saved = loadPreferences();
  expect(saved.theme).toBe('dark');
});

// Bad - tests implementation
it('calls fs.writeFileSync with correct path', () => {
  savePreferences({ theme: 'dark' });
  expect(fs.writeFileSync).toHaveBeenCalledWith('/path/to/prefs.json', ...);
});
```

## Test Execution Strategy

### During Development

Run targeted tests for fast feedback:

```bash
# Single file
npm test -- path/to/specific.test.js

# Single describe block (framework-specific)
npm test -- --grep "parseInput"

# Watch mode for rapid iteration
npm test -- --watch
```

### Before Commit

Expand to full suite once targeted tests pass:

```bash
npm test
```

### Coverage Reports

Write coverage to a `.gitignore`d folder. Reuse existing reports when possible:

```bash
# Generate coverage (writes to coverage/)
npm test -- --coverage

# Check if coverage exists before regenerating
if [ ! -f coverage/lcov.info ]; then
  npm test -- --coverage
fi
```

Add to `.gitignore`:
```
coverage/
.nyc_output/
```

## Anti-Patterns to Avoid

### Big Bang Testing

```
// BAD: Implement everything, then test
Day 1: Write 10 new methods
Day 2: Write 10 more methods
Day 3: Write all tests
Day 4: Debug why nothing works
```

**Why it fails:**
- Harder to debug when many tests fail at once
- Tests may not match actual implementation
- Miss edge cases discovered during implementation
- Lose the design benefits of test-first thinking

### Testing Implementation Details

```javascript
// BAD: Test internal calls
verify(user).verifyAccess(customerId, customerInfo);

// GOOD: Test the observable behavior
expect(() => service.findData(customerId)).toThrow('Not authorized');
```

**Why it fails:**
- Brittle tests that break on refactoring
- Tests don't validate actual behavior
- False confidence from passing tests

### Overly Complex Test Setup

```javascript
// BAD: 50 lines of setup
beforeEach(() => {
  // Initialize 10 mocks
  // Set up 20 when() statements
  // Configure test context
  // ... complex setup
});

// GOOD: Simple, focused
it('validates input', () => {
  const validator = createValidator();
  expect(validator.isValid('test')).toBe(true);
});
```

**Why it fails:**
- Hard to understand what's being tested
- Setup becomes a maintenance burden
- May hide real design issues (code is too coupled)

### One Logical Assertion Per Test

```javascript
// BAD: Testing too many things
it('processes user', () => {
  user.setRole('admin');
  expect(user.isAdmin()).toBe(true);
  expect(user.isExternal()).toBe(false);
  expect(user.canEdit()).toBe(true);
  expect(user.canDelete()).toBe(true);
  // ... 10 more assertions
});

// GOOD: Focused tests
it('isAdmin returns true when role is admin', () => {
  user.setRole('admin');
  expect(user.isAdmin()).toBe(true);
});

it('isExternal returns false for admin role', () => {
  user.setRole('admin');
  expect(user.isExternal()).toBe(false);
});
```

**Why single assertions:**
- Clear what failed when a test breaks
- Test name describes exactly what's tested
- Easier to maintain and understand
