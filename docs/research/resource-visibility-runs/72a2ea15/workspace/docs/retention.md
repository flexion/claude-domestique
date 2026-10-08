# Retention

| Data | Retention | Owner |
| --- | --- | --- |
| Audit log | 365 days | Security |
| Customer exports | 45 days | Compliance |

Compliance confirmed 45 days for customer exports on 2026-10-08. An export exactly 45
days old is retained; only older exports are deleted.

Exports whose name starts with `hold-` are under legal hold and are never deleted,
regardless of age. `purgeExpiredExports` applies this rule unconditionally — a caller's
`isExempt` can protect more exports but cannot remove legal-hold protection.

Deletion from the export store is permanent.
