# Config Schema Design - Tooling Modularization

## Overview

This document defines the modular structure for claude-domestique configuration, enabling the plugin to adapt to different tech stacks and tooling environments.

## Design Principles

1. **Modular**: Break configuration into logical modules (vcs, build, test, etc.)
2. **Swappable**: Structure allows replacing implementations (e.g., git → svn)
3. **Preset-based**: Common configurations shipped as presets
4. **Override-friendly**: Project configs can override preset values
5. **Validated**: JSON Schema ensures correctness

## Configuration Modules

### 1. Version Control (vcs)

**Purpose**: Configure version control system and workflows

```json
{
  "vcs": {
    "type": "git",
    "git": {
      "defaultBranch": "main",
      "branchPatterns": {
        "feature": "issue/feature-<N>/<desc>",
        "chore": "chore/<desc>"
      },
      "commitFormat": {
        "feature": "#<N> - <desc>",
        "chore": "chore - <desc>"
      },
      "hooks": {
        "preCommit": ["format", "lint", "test"],
        "prePush": ["build"]
      },
      "mergeStrategy": "merge"
    }
  }
}
```

**Future VCS Types**: svn, mercurial, perforce

---

### 2. Package Management

**Purpose**: Configure dependency installation and management

```json
{
  "package": {
    "type": "npm",
    "installCommand": "npm install",
    "updateCommand": "npm update",
    "lockFile": "package-lock.json"
  }
}
```

**Types**: npm, yarn, pnpm, gradle, maven, pip, bundler, cargo

---

### 3. Build System

**Purpose**: Configure build process and artifacts

```json
{
  "build": {
    "buildCommand": "npm run build",
    "buildOutput": "dist/",
    "cleanCommand": "npm run clean",
    "watchCommand": "npm run build:watch"
  }
}
```

**Variations**: webpack, vite, gradle, maven, make, cargo

---

### 4. Testing

**Purpose**: Configure test execution and patterns

```json
{
  "test": {
    "framework": "jest",
    "testCommand": "npm test",
    "coverageCommand": "npm run coverage",
    "watchCommand": "npm run test:watch",
    "testPatterns": {
      "test": "pure-functions, business-logic, auth-logic",
      "skip": "react-components, redux-integration, styling"
    },
    "testNaming": "*.test.ts",
    "testPlacement": {
      "unit": "src/utils/*.test.ts",
      "integration": "tests/integration/**/*.test.ts"
    }
  }
}
```

**Frameworks**: jest, mocha, junit, pytest, rspec, go test

---

### 5. Code Quality

**Purpose**: Configure linting, formatting, type checking

```json
{
  "quality": {
    "linter": {
      "type": "eslint",
      "command": "npm run lint",
      "autoFix": "npm run lint:fix"
    },
    "formatter": {
      "type": "prettier",
      "command": "npm run format",
      "checkCommand": "npm run format:check"
    },
    "typeChecker": {
      "type": "typescript",
      "command": "npm run type-check"
    }
  }
}
```

**Linters**: eslint, checkstyle, pylint, rubocop, golangci-lint
**Formatters**: prettier, black, google-java-format, rustfmt
**Type Checkers**: typescript, mypy, flow

---

### 6. Pre-Commit Verification

**Purpose**: Define commands to run before commits

```json
{
  "verify": {
    "commands": ["format", "lint", "test", "build"],
    "required": true,
    "parallel": false,
    "skipPatterns": ["*.md", "*.txt"]
  }
}
```

**Command References**: Use keys from other sections (test.testCommand, quality.linter.command, etc.)

---

### 7. Development Server

**Purpose**: Configure local development environment

```json
{
  "dev": {
    "startCommand": "npm start",
    "port": 3000,
    "watchMode": true,
    "hotReload": true
  }
}
```

**Variations**: webpack-dev-server, vite, gradle bootRun, rails server

---

### 8. Deployment

**Purpose**: Configure deployment processes

```json
{
  "deploy": {
    "command": "npm run deploy",
    "environments": {
      "dev": "npm run deploy:dev",
      "staging": "npm run deploy:staging",
      "prod": "npm run deploy:prod"
    }
  }
}
```

**Variations**: Project-specific, CI/CD integration

---

### 9. Work Item Tracking

**Purpose**: Configure issue tracking integration

```json
{
  "workItem": {
    "system": "github",
    "issuePattern": "#<N>",
    "branchPattern": "issue/feature-<N>/<desc>",
    "commitPattern": "#<N> - <desc>"
  }
}
```

**Systems**: github, azure-devops, jira, linear

---

### 10. Language/Runtime

**Purpose**: Configure language and runtime requirements

```json
{
  "runtime": {
    "type": "node",
    "version": "18.x",
    "versionFile": ".nvmrc",
    "versionManager": "nvm"
  }
}
```

**Types**: node, java, python, ruby, go, rust

---

## Schema Structure

### Top Level

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["name", "vcs", "runtime"],
  "properties": {
    "name": { "type": "string" },
    "vcs": { "$ref": "#/definitions/vcs" },
    "package": { "$ref": "#/definitions/package" },
    "build": { "$ref": "#/definitions/build" },
    "test": { "$ref": "#/definitions/test" },
    "quality": { "$ref": "#/definitions/quality" },
    "verify": { "$ref": "#/definitions/verify" },
    "dev": { "$ref": "#/definitions/dev" },
    "deploy": { "$ref": "#/definitions/deploy" },
    "workItem": { "$ref": "#/definitions/workItem" },
    "runtime": { "$ref": "#/definitions/runtime" }
  },
  "definitions": {
    "vcs": { ... },
    "package": { ... },
    ...
  }
}
```

---

## Preset Pattern

Presets provide complete configurations for common tech stacks:

**typescript-node.json**:
```json
{
  "name": "typescript-node",
  "vcs": { ... },
  "package": { "type": "npm", ... },
  "runtime": { "type": "node", "version": "18.x" },
  "test": { "framework": "jest", ... },
  "quality": { "linter": { "type": "eslint" }, ... }
}
```

**Project Override**:
```json
{
  "extends": "typescript-node",
  "test": {
    "testCommand": "npm run test:ci"
  }
}
```

Merge strategy: Deep merge project config over preset

---

## Plugin Initialization

### Overview

Projects must initialize the plugin to set up necessary context for skills, agents, and commands to function properly.

### Initialization Process

**Command**: `/init` or similar

**What it does**:
1. Detect project tech stack (package.json, build.gradle, requirements.txt, etc.)
2. Select appropriate preset (or prompt user)
3. Generate `.claude/config.json` with preset + detected values
4. Create `.claude/` directory structure if needed:
   - `.claude/context/` - Context files (if migrating from bootstrap)
   - `.claude/sessions/` - Session files
   - `.claude/branches/` - Branch metadata
5. Optionally install git hooks (if configured)
6. Validate generated config
7. Display summary and next steps

### Auto-Detection Strategy

**Node.js Projects**:
- Detect: `package.json` exists
- Read: `package.json` → detect test framework, build tool
- Preset: typescript-node or react-typescript (based on dependencies)

**Java Projects**:
- Detect: `build.gradle` or `pom.xml`
- Read: build file → detect Spring Boot, test framework
- Preset: java-spring

**Python Projects**:
- Detect: `requirements.txt`, `setup.py`, `pyproject.toml`
- Read: dependencies → detect pytest, Django
- Preset: python-django or python-generic

### Interactive vs Non-Interactive

**Interactive Mode** (default):
```
$ /init

Detected: Node.js project with TypeScript and Jest
Preset: typescript-node

Configuration:
  Runtime: Node.js 18.x
  Test: jest
  Lint: eslint
  Format: prettier

Customize? (y/N): n

✓ Created .claude/config.json
✓ Validated configuration
✓ Plugin ready to use

Next steps:
  1. Review .claude/config.json
  2. Try /next to see current session
  3. Try /check commit to see pre-commit checklist
```

**Non-Interactive Mode**:
```
$ /init --preset typescript-node --yes
```

### Migration from Bootstrap

For projects already using `.claude/` directory (like simple-D365):

1. Detect existing `.claude/` structure
2. Preserve existing files:
   - `.claude/context/*.yml` → keep
   - `.claude/sessions/*.md` → keep
   - `.claude/branches/*` → keep
3. Generate `.claude/config.json` based on detected stack
4. Validate compatibility
5. Suggest cleanup of bootstrap files (if desired)

### Validation

After initialization:
- Run schema validation on generated config
- Check all referenced commands exist (testCommand, lintCommand, etc.)
- Verify directory structure
- Test basic plugin functionality

### User Experience

**First-time user**:
```
User installs plugin → runs /init → answers prompts → plugin configured → ready to use
```

**Existing `.claude/` user**:
```
User has bootstrap → runs /init → detects existing → generates config → preserves context → upgraded
```

---

## Future Extensibility

### Adding New VCS
1. Add type to vcs.type enum
2. Add type-specific definition to schema
3. Implement type-specific behavior in skills/agents

### Adding New Module
1. Add module to top-level schema
2. Define module schema in definitions
3. Create preset values
4. Implement module-aware behavior

### Plugin Architecture
Each module maps to plugin capabilities:
- **vcs** → git-workflow agent, branch-creation skill
- **test** → test-runner skill, test-placement agent
- **quality** → code-quality skill, lint-enforcement hook
- **verify** → pre-commit hook, verification agent

---

## Implementation Priority

### Phase 1 (Core)
1. vcs (git only)
2. runtime
3. test
4. quality

### Phase 2 (Build & Deploy)
5. package
6. build
7. verify

### Phase 3 (Advanced)
8. dev
9. deploy
10. workItem

---

## Related Documents

- `IMPLEMENTATION-PLAN.md` - Phase 1.3 Config Schema
- `schemas/config.schema.json` - JSON Schema implementation
- `docs/configuration.md` - User-facing config guide
- `.claude/context/behavior.yml` - Plugin behavior configuration

---

## Status

**Created**: 2025-11-16
**Issue**: #6
**Phase**: Design (pre-implementation)
**Next**: Implement JSON schema for Phase 1 modules
