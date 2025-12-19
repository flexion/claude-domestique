# Work Item Integration Guide

This guide provides detailed patterns and examples for working with issue trackers (GitHub Issues, JIRA, Azure DevOps).

## Commit Message Patterns

### Good Examples

```
#42 - implement user authentication flow

- Add login form component with email/password fields
- Create auth API client with token management
- Add session persistence using localStorage
```

```
#123 - fix null pointer in checkout service

Root cause: CartService.getItems() could return null for empty carts
Solution: Initialize empty array in constructor, add null guard
```

```
PROJ-456 - refactor payment module for new gateway

- Extract PaymentGateway interface for multi-provider support
- Migrate Stripe implementation to new interface
- Add PayPal gateway stub for phase 2
```

### Bad Examples (Avoid)

```
fix bug                    # Too vague
update code               # Says nothing
changes                   # Meaningless
WIP                       # Not a commit message
fixed stuff              # Unprofessional
```

## Branch Naming

### Pattern
```
issue/{type}-{number}/{slug}
```

### Examples
| Issue | Branch Name |
|-------|-------------|
| #42 Add login | `issue/feature-42/user-login` |
| #123 Fix crash | `issue/bug-123/fix-checkout-crash` |
| PROJ-456 Refactor | `issue/feature-456/refactor-payment` |
| Dependency update | `issue/chore-99/update-dependencies` |

## PR Description Template

```markdown
## Summary
- Implements user login with email/password authentication
- Adds session persistence and auto-logout on token expiry
- Includes form validation with error messages

## Related Issue
Closes #42

## Acceptance Criteria
- [x] User can log in with email and password
- [x] Invalid credentials show error message
- [x] Session persists across page refresh
- [ ] Password reset flow (will be separate PR)

## Test Plan
1. Navigate to /login
2. Enter valid credentials → redirects to dashboard
3. Enter invalid credentials → shows error message
4. Refresh page → session maintained
5. Wait for token expiry → auto-logout with message

## Screenshots
[If applicable]
```

## Work Item Status Transitions

### GitHub Issues
```
Open → In Progress (branch created)
In Progress → In Review (PR opened)
In Review → Closed (PR merged)
```

### JIRA
```
To Do → In Progress (branch created)
In Progress → In Review (PR opened)
In Review → Done (PR merged)
```

### Azure DevOps
```
New → Active (branch created)
Active → Resolved (PR opened)
Resolved → Closed (PR merged)
```

## Acceptance Criteria Validation

Before creating a PR, verify each acceptance criterion:

```yaml
Issue #42: User Authentication
Acceptance Criteria:
  - [x] Login form with email/password fields
  - [x] Form validation with error messages
  - [x] Secure token storage
  - [ ] "Remember me" checkbox  # Note: Not addressed, add to PR description
```

If criteria are not fully addressed:
1. Note in PR description what's missing
2. Either add to current PR or create follow-up issue
3. Never silently skip criteria

## Session Integration

When working on an issue, the session file is populated with:

```yaml
# .claude/sessions/42-user-login.md (managed by memento)

## Issue Details (populated by onus)
- Number: 42
- Title: User Authentication
- Status: In Progress
- Acceptance Criteria: [list]

## Session Progress (managed by memento)
- Started: 2024-01-15
- Current focus: Login form implementation
- Blockers: None

## What's Next
1. Add form validation
2. Connect to auth API
3. Add error handling
```

## Multi-Platform Field Mapping

### GitHub Issues → Common Model
```javascript
{
  key: issue.number,
  title: issue.title,
  description: issue.body,
  status: issue.state, // open, closed
  type: labels.find(l => ['bug', 'feature'].includes(l)),
  labels: issue.labels.map(l => l.name),
  assignee: issue.assignee?.login
}
```

### JIRA → Common Model
```javascript
{
  key: issue.key, // PROJ-123
  title: issue.fields.summary,
  description: issue.fields.description,
  status: issue.fields.status.name,
  type: issue.fields.issuetype.name,
  labels: issue.fields.labels,
  assignee: issue.fields.assignee?.displayName
}
```

### Azure DevOps → Common Model
```javascript
{
  key: workItem.id,
  title: workItem.fields['System.Title'],
  description: workItem.fields['System.Description'],
  status: workItem.fields['System.State'],
  type: workItem.fields['System.WorkItemType'],
  labels: workItem.fields['System.Tags']?.split(';'),
  assignee: workItem.fields['System.AssignedTo']?.displayName
}
```
