# Configuration Guide

## Overview

Claude Domestique uses a modular configuration system that adapts to different tech stacks and project requirements. Configuration is stored in `.claude/config.json` and validated against a JSON schema.

## Quick Start

### Using Presets

The easiest way to get started is to use one of the built-in presets:

**TypeScript Node.js projects:**
```json
{
  "extends": "presets/typescript-node.json",
  "name": "my-project"
}
```

**React TypeScript projects:**
```json
{
  "extends": "presets/react-typescript.json",
  "name": "my-react-app"
}
```

**Java Spring Boot projects:**
```json
{
  "extends": "presets/java-spring.json",
  "name": "my-spring-service"
}
```

### Validating Your Configuration

Use the validation script to check your configuration:

```bash
./scripts/validate-config.sh .claude/config.json
```

## Configuration Structure

### Required Fields

Every configuration must have:
- `name` - Project name
- `vcs` - Version control configuration
- `runtime` - Runtime/language configuration

### Optional Fields

- `test` - Testing framework and patterns
- `quality` - Code quality tools (linter, formatter, type checker)
- `extends` - Path to a preset to extend

## Configuration Modules

### VCS Module

Controls version control behavior (currently supports git):

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
        "preCommit": ["format", "lint", "type-check", "test"],
        "prePush": ["build"]
      },
      "mergeStrategy": "merge"
    }
  }
}
```

**Fields:**
- `defaultBranch` - Main branch name (e.g., "main", "master")
- `branchPatterns` - Branch naming conventions
- `commitFormat` - Commit message formats
- `hooks.preCommit` - Commands to run before commit
- `hooks.prePush` - Commands to run before push
- `mergeStrategy` - "merge", "rebase", or "squash"

### Runtime Module

Specifies the language/runtime environment:

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

**Supported types:** `node`, `java`, `python`, `ruby`, `go`, `rust`

**Fields:**
- `type` - Runtime type (required)
- `version` - Version specification (required)
- `versionFile` - File containing version (optional)
- `versionManager` - Version manager to use (optional)

### Test Module

Configures testing framework and patterns:

```json
{
  "test": {
    "framework": "jest",
    "testCommand": "npm test",
    "coverageCommand": "npm run coverage",
    "watchCommand": "npm run test:watch",
    "testPatterns": {
      "test": "pure-functions, business-logic, utilities",
      "skip": "ui-components, api-integration"
    },
    "testNaming": "*.test.ts",
    "testPlacement": {
      "unit": "src/**/*.test.ts",
      "integration": "tests/integration/**/*.test.ts"
    }
  }
}
```

**Supported frameworks:** `jest`, `mocha`, `vitest`, `junit`, `pytest`, `rspec`, `go-test`, `cargo-test`

**Fields:**
- `framework` - Testing framework (required)
- `testCommand` - Command to run tests (required)
- `coverageCommand` - Command to generate coverage (optional)
- `watchCommand` - Command to run tests in watch mode (optional)
- `testPatterns` - What to test and skip (optional)
- `testNaming` - Test file naming pattern (optional)
- `testPlacement` - Where to place test files (optional)

### Quality Module

Configures code quality tools:

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

**Supported linters:** `eslint`, `tslint`, `checkstyle`, `pylint`, `rubocop`, `golint`, `clippy`

**Supported formatters:** `prettier`, `black`, `google-java-format`, `rubocop`, `gofmt`, `rustfmt`

**Supported type checkers:** `typescript`, `flow`, `mypy`

## Preset System

### Available Presets

#### typescript-node

For Node.js projects with TypeScript:

```json
{
  "extends": "presets/typescript-node.json",
  "name": "my-project"
}
```

**Includes:**
- Node.js 18.x runtime with nvm
- Jest testing framework
- ESLint, Prettier, TypeScript type checking
- Pre-commit hooks: format → lint → type-check → test → build

**Test patterns:**
- Test: pure functions, business logic, utilities, helpers, services
- Skip: UI components, API integration, external dependencies

#### react-typescript

For React projects with TypeScript:

```json
{
  "extends": "presets/react-typescript.json",
  "name": "my-react-app"
}
```

**Includes:**
- Node.js 18.x runtime with nvm
- Jest with React Testing Library
- ESLint, Prettier, TypeScript type checking
- Pre-commit hooks: format → lint → type-check → test → build

**Test patterns:**
- Test: pure functions, business logic, utilities, hooks, auth logic
- Skip: React components, Redux integration, styling, UI tests

**Note:** Uses `--watchAll=false` for CI compatibility

#### java-spring

For Java Spring Boot projects:

```json
{
  "extends": "presets/java-spring.json",
  "name": "my-spring-service"
}
```

**Includes:**
- Java 17 runtime
- JUnit testing with Gradle
- Checkstyle linting
- Google Java Format (via Spotless)
- Pre-commit hooks: format → lint → test → build

**Test patterns:**
- Test: services, repositories, utilities, domain logic, business rules
- Skip: controllers, integration tests, database tests

### Overriding Preset Values

You can override any preset value in your project configuration:

```json
{
  "extends": "presets/typescript-node.json",
  "name": "my-project",
  "runtime": {
    "version": "20.x"
  },
  "test": {
    "testCommand": "npm test -- --coverage"
  }
}
```

The override uses a deep merge strategy - only specified fields are overridden.

## Custom Configurations

You can create a complete custom configuration without using presets:

```json
{
  "name": "my-custom-project",
  "vcs": {
    "type": "git",
    "git": {
      "defaultBranch": "develop",
      "branchPatterns": {
        "feature": "feature/<desc>",
        "bugfix": "bugfix/<desc>"
      },
      "commitFormat": {
        "feature": "feat: <desc>",
        "bugfix": "fix: <desc>"
      },
      "hooks": {
        "preCommit": ["lint", "test"]
      },
      "mergeStrategy": "squash"
    }
  },
  "runtime": {
    "type": "python",
    "version": "3.11",
    "versionFile": ".python-version",
    "versionManager": "pyenv"
  },
  "test": {
    "framework": "pytest",
    "testCommand": "pytest",
    "coverageCommand": "pytest --cov",
    "testPatterns": {
      "test": "models, services, utilities",
      "skip": "views, migrations"
    },
    "testNaming": "test_*.py",
    "testPlacement": {
      "unit": "tests/unit/test_*.py",
      "integration": "tests/integration/test_*.py"
    }
  },
  "quality": {
    "linter": {
      "type": "pylint",
      "command": "pylint src/"
    },
    "formatter": {
      "type": "black",
      "command": "black src/",
      "checkCommand": "black --check src/"
    },
    "typeChecker": {
      "type": "mypy",
      "command": "mypy src/"
    }
  }
}
```

## Validation

### Using the Validation Script

The validation script supports multiple validators:

```bash
# Validate default location
./scripts/validate-config.sh

# Validate specific file
./scripts/validate-config.sh .claude/config.json

# Use custom schema
SCHEMA_PATH=my-schema.json ./scripts/validate-config.sh my-config.json
```

### Validation Tools

The script tries validators in this order:

1. **ajv-cli** (fastest, most complete)
   ```bash
   npm install -g ajv-cli
   ```

2. **check-jsonschema** (Python-based)
   ```bash
   pip install check-jsonschema
   ```

3. **jsonschema** (Python library)
   ```bash
   pip install jsonschema
   ```

4. **jq** (basic validation, usually pre-installed)

If no schema validator is available, the script falls back to basic jq validation (JSON syntax + required fields).

### Common Validation Errors

**Missing required field:**
```
Missing required field: name
```

**Invalid JSON syntax:**
```
jq: parse error: Expected separator between values at line 3, column 7
```

**Invalid enum value:**
```
[runtime.type] "nodejs" is not one of ["node", "java", "python", "ruby", "go", "rust"]
```

## Examples

### Minimal Configuration

```json
{
  "name": "minimal-project",
  "vcs": {
    "type": "git"
  },
  "runtime": {
    "type": "node",
    "version": "18.x"
  }
}
```

### Override Test Patterns

```json
{
  "extends": "presets/typescript-node.json",
  "name": "my-project",
  "test": {
    "testPatterns": {
      "test": "all-code",
      "skip": "none"
    }
  }
}
```

### Custom Pre-Commit Hooks

```json
{
  "extends": "presets/react-typescript.json",
  "name": "my-project",
  "vcs": {
    "git": {
      "hooks": {
        "preCommit": ["format", "lint", "type-check"],
        "prePush": ["test", "build"]
      }
    }
  }
}
```

### Multiple Runtimes (Monorepo)

```json
{
  "name": "my-monorepo",
  "vcs": {
    "type": "git"
  },
  "runtime": {
    "type": "node",
    "version": "18.x"
  },
  "test": {
    "framework": "jest",
    "testCommand": "npm run test:all"
  }
}
```

## Troubleshooting

### Validation Fails with "Missing required field"

Ensure your configuration includes all required fields:
- `name`
- `vcs.type`
- `runtime.type`
- `runtime.version`

### Preset Not Found

Check that the `extends` path is correct relative to your config file:

```json
{
  "extends": "../presets/typescript-node.json"
}
```

### Commands Not Working

Verify that commands are appropriate for your project:

```bash
# Test the command directly
npm run lint

# Check package.json for available scripts
cat package.json | jq '.scripts'
```

### Pre-Commit Hooks Failing

Check that all commands in the hook chain succeed:

```bash
npm run format
npm run lint
npm run type-check
npm test
npm run build
```

### Schema Validation Unavailable

Install a schema validator for complete validation:

```bash
# Recommended (fastest)
npm install -g ajv-cli

# Or Python-based
pip install check-jsonschema
```

## Next Steps

- Review the [Design Document](config-schema-design.md) for architecture details
- See [Plugin Initialization](../README.md#initialization) for setup instructions
- Check [IMPLEMENTATION-PLAN.md](../IMPLEMENTATION-PLAN.md) for upcoming features

## Future Modules

The following modules are planned for future releases:

- `package` - Package management (npm, gradle, maven, pip)
- `build` - Build system configuration
- `verify` - Pre-commit verification
- `dev` - Development server
- `deploy` - Deployment processes
- `workItem` - Issue tracking integration

See [config-schema-design.md](config-schema-design.md) for details.
