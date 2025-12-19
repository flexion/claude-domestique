# Project Guide

Detailed guidance for project context defined in `project.yml`.

## How to Use This File

The `project.yml` file provides quick-reference facts about your project. This companion `.md` file explains those facts in depth.

### When Claude Reads project.yml

Claude will see assertions like:
```yaml
language: typescript
framework: express
pattern: monolith
```

If Claude needs more context about any of these, it should read this file.

## Customizing project.yml

### Identity Section

```yaml
## Identity
name: your-project-name
description: brief description of the project
type: api | cli | library | web-app | other
```

**Be specific.** Instead of:
```yaml
description: a web application
```

Write:
```yaml
description: REST API for user management and authentication
```

### Tech Stack Section

```yaml
## Tech Stack
language: typescript
runtime: node
framework: express
database: postgres
```

**Include versions if they matter:**
```yaml
language: typescript 5.x
runtime: node 20.x
framework: express 4.x (not 5.x)
```

### Architecture Section

```yaml
## Architecture
pattern: monolith
structure: src/, tests/, docs/
entry-point: src/index.ts
```

**Describe patterns used:**
```yaml
pattern: monolith
layers: controller → service → repository
dependency-injection: manual (no framework)
```

### Key Concepts Section

Define domain-specific terms that Claude might not know:

```yaml
## Key Concepts
tenant: isolated customer workspace with own data
workspace: collection of projects within a tenant
project: container for tasks and documents
```

### Important Files Section

List files critical to understanding the codebase:

```yaml
## Important Files
- src/core/engine.ts: main processing logic, read first
- src/config/schema.ts: all configuration options
- src/types/index.ts: shared type definitions
- docs/architecture.md: system design decisions
```

## Example: Complete project.yml

```yaml
# Project Context

## Identity
name: task-api
description: REST API for task management with real-time updates
type: api

## Tech Stack
language: typescript 5.x
runtime: node 20.x
framework: express 4.x
database: postgres 15
cache: redis 7
queue: bullmq

## Architecture
pattern: monolith (extractable services)
layers: route → controller → service → repository
structure:
  - src/routes/: API endpoints
  - src/services/: business logic
  - src/repositories/: data access
  - src/types/: TypeScript definitions
entry-point: src/index.ts

## Conventions
naming:
  - kebab-case: files, routes
  - camelCase: variables, functions
  - PascalCase: classes, types
testing: jest, supertest for API tests
linting: eslint + prettier

## Key Concepts
task: unit of work with status, assignee, due date
project: collection of tasks with shared settings
workspace: isolated environment for a team
webhook: external notification on task events

## Important Files
- src/services/task.service.ts: core task operations
- src/repositories/base.repository.ts: shared DB patterns
- src/middleware/auth.ts: authentication logic
- src/config/index.ts: environment configuration
- docs/api.md: API documentation
```

## When to Update

Update `project.yml` when:
- Adding new technology to the stack
- Changing architectural patterns
- Adding important domain concepts
- Identifying critical files

Keep it current - stale context is worse than no context.
