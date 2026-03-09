# ContractTest — Martin Fowler

> **Source:** Fowler, M. (2011, revised 2018). "ContractTest." Bliki.
>
> **URL:** https://martinfowler.com/bliki/ContractTest.html
>
> **Retrieved:** 2026-03-08

## Definition

Contract tests verify that test doubles accurately represent the actual behavior of external services by periodically running checks against the real service.

## Key Distinction from Integration Tests

Contract tests operate on a different cadence — "based on the rhythm of changes to the external service" rather than code changes. They're typically run once daily, not on every commit.

## What They Verify

> "The format of the data matters rather than the actual data."

Contract tests check structural consistency (schema shape, field presence, types) while allowing actual values to change. They verify the contract of external service calls, not the business logic behind them.

## Consumer-Supplier Relationship

A contract test failure should "trigger a conversation with the keepers of the external service to talk about the change and alert them to how their changes are affecting other applications."

## Consumer-Driven Contracts

Fowler recommends sharing contract tests with supplier teams, enabling them to run tests in their own build pipelines to prevent breaking changes proactively.

## Testing Strategy

For safety, contract tests should target test instances of external services when possible, with production testing only when necessary and with explicit supplier coordination.
