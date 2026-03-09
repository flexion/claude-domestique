# Snapshot Testing — Jest

> **Source:** Jest Documentation. "Snapshot Testing."
>
> **URL:** https://jestjs.io/docs/snapshot-testing
>
> **Retrieved:** 2026-03-08

## Definition

Snapshot testing captures known-good output and compares it on subsequent runs. "Snapshot tests are a very useful tool whenever you want to make sure your UI does not change unexpectedly."

## How It Works

1. Render a component or capture output
2. Jest creates a serialized snapshot file as baseline
3. On subsequent runs, Jest compares output against the stored snapshot
4. Test passes if output matches; fails if there are differences

## Scope Beyond UI

> "Snapshots can capture any serializable value and should be used anytime the goal is testing whether the output is correct."

This includes API responses, logs, error messages, and any serializable data structure.

## Identifying Unexpected Changes

Snapshot tests serve as "a mechanism for identifying unexpected interface changes within your application — whether that interface is an API response, UI, logs, or error messages."

## Handling Non-Deterministic Data

Use property matchers to handle values that change between runs (timestamps, IDs):

```javascript
expect(output).toMatchSnapshot({
  createdAt: expect.any(Date),
  id: expect.any(String),
});
```

## Best Practices

- Treat snapshots as code — commit them, review them in PRs
- Mock non-deterministic values (e.g., `Date.now()`)
- Use descriptive names so failures are obvious
- Update snapshots intentionally when output changes are expected (`jest -u`)
