# Testing Guide

Detailed guidance for testing patterns defined in `testing.yml`.

## What to Test

### Always Test

**Complex Business Logic**
```javascript
// This has multiple conditions and edge cases - TEST IT
function calculateDiscount(user, cart) {
  if (user.isPremium && cart.total > 100) {
    return cart.total * 0.2;
  } else if (user.isPremium) {
    return cart.total * 0.1;
  } else if (cart.total > 200) {
    return cart.total * 0.05;
  }
  return 0;
}
```

**Bug Fixes (Test First)**
```javascript
// Write failing test BEFORE fixing
test('should handle empty cart', () => {
  // This was failing before the fix
  expect(calculateTotal([])).toBe(0);
});
```

**Error Handling Paths**
```javascript
test('throws when user not found', async () => {
  await expect(getUser('nonexistent'))
    .rejects.toThrow('User not found');
});
```

### Skip Tests For

**Simple DTOs/Types**
```typescript
// No test needed - no logic
interface User {
  id: string;
  name: string;
  email: string;
}
```

**Getters/Setters**
```javascript
// No test needed - trivial
get fullName() {
  return `${this.firstName} ${this.lastName}`;
}
```

**Framework Behavior**
```javascript
// Don't test that Express routes work - that's Express's job
// DO test your handler logic
```

## Test Structure

### Arrange-Act-Assert (AAA)

```javascript
test('calculates discount for premium user', () => {
  // Arrange
  const user = { isPremium: true };
  const cart = { total: 150 };

  // Act
  const discount = calculateDiscount(user, cart);

  // Assert
  expect(discount).toBe(30); // 20% of 150
});
```

### Descriptive Test Names

```javascript
// Good - describes behavior
test('returns 20% discount when premium user has cart over $100', () => {});

// Bad - describes implementation
test('calculateDiscount returns correct value', () => {});
```

## Test Doubles

### When to Use What

| Type | Use When | Example |
|------|----------|---------|
| **Mock** | Need to verify calls | External API client |
| **Stub** | Need controlled return | Database query |
| **Spy** | Need to observe without changing | Logger |
| **Fake** | Need working implementation | In-memory database |

### Mock Example

```javascript
// Mock external API
const mockApi = {
  fetchUser: jest.fn().mockResolvedValue({ id: '1', name: 'Test' })
};

test('fetches and transforms user', async () => {
  const result = await getUser('1', mockApi);

  expect(mockApi.fetchUser).toHaveBeenCalledWith('1');
  expect(result.displayName).toBe('Test');
});
```

### Stub Example

```javascript
// Stub database response
const stubDb = {
  query: () => Promise.resolve([{ id: 1 }, { id: 2 }])
};

test('returns all users', async () => {
  const users = await getAllUsers(stubDb);
  expect(users).toHaveLength(2);
});
```

## Running Tests

### Common Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/file.test.js

# Run tests matching pattern
npm test -- --testNamePattern="discount"

# Run in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage

# Run single test (focus)
test.only('this test only', () => {});
```

### Debugging Tests

```javascript
// Add console.log (removed before commit)
test('debug this', () => {
  const result = complexFunction();
  console.log('Result:', result); // Temporary
  expect(result).toBeDefined();
});

// Use debugger
test('debug with breakpoint', () => {
  const result = complexFunction();
  debugger; // Run with: node --inspect-brk
  expect(result).toBeDefined();
});
```

## F.I.R.S.T. Principles

### Fast
Tests should run quickly. Slow tests don't get run.
- Mock slow operations (network, disk)
- Use in-memory databases for unit tests
- Parallelize where possible

### Independent
Tests shouldn't depend on each other.
- Each test sets up its own state
- No shared mutable state
- Order shouldn't matter

### Repeatable
Same result every time.
- No reliance on external state
- Mock dates/random values
- Clean up after each test

### Self-Validating
Pass or fail clearly.
- No manual inspection needed
- Clear assertion messages
- One logical assertion per test

### Timely
Write tests close to the code.
- Test-first for bugs
- Test alongside for features
- Don't defer testing
