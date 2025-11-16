# Command: /plugin-init

## Description
Initialize a project for claude-domestique plugin usage. This command auto-detects the tech stack, generates configuration, and sets up the necessary directory structure.

## Usage
```
/plugin-init [options]
```

**Options:**
- `--preset <name>` - Use specific preset (skip auto-detection)
- `--yes` - Accept all defaults, no prompts (non-interactive)
- `--force` - Overwrite existing config.json if present

**Examples:**
```
/plugin-init                                    # Interactive mode with auto-detection
/plugin-init --preset typescript-node           # Use specific preset
/plugin-init --preset react-typescript --yes    # Non-interactive with preset
/plugin-init --force                            # Overwrite existing config
```

## Implementation

When the user invokes `/plugin-init`, follow these steps:

### Step 1: Check for Existing .claude/ Directory

Check if `.claude/` directory exists:

```bash
ls .claude/
```

**If exists:**
- List existing files (sessions, branches, context, config.json)
- Ask user: "Found existing .claude/ directory. Continue initialization? (Y/n)"
- If `--force` flag: proceed without asking
- Preserve all existing files except config.json (if `--force`)

**If not exists:**
- Proceed to tech stack detection

### Step 2: Detect Tech Stack

Analyze project files to determine tech stack:

**Node.js Detection:**
```bash
if [ -f "package.json" ]; then
  RUNTIME="node"

  # Detect TypeScript
  if [ -f "tsconfig.json" ] || grep -q "typescript" package.json; then
    HAS_TYPESCRIPT=true
  fi

  # Detect React
  if grep -q '"react"' package.json; then
    HAS_REACT=true
  fi

  # Detect runtime version
  NODE_VERSION=$(node --version 2>/dev/null | sed 's/v\([0-9]*\).*/\1/')
  if [ -z "$NODE_VERSION" ] && [ -f ".nvmrc" ]; then
    NODE_VERSION=$(cat .nvmrc | sed 's/v\?\([0-9]*\).*/\1/')
  fi
fi
```

**Java Detection:**
```bash
if [ -f "build.gradle" ] || [ -f "pom.xml" ]; then
  RUNTIME="java"

  # Detect Spring Boot
  if grep -q "spring-boot" build.gradle pom.xml 2>/dev/null; then
    HAS_SPRING=true
  fi

  # Detect Java version
  if [ -f "build.gradle" ]; then
    JAVA_VERSION=$(grep "sourceCompatibility" build.gradle | sed "s/.*['\"]\\([0-9]*\\)['\"].*/\1/")
  fi
fi
```

**Python Detection:**
```bash
if [ -f "requirements.txt" ] || [ -f "setup.py" ] || [ -f "pyproject.toml" ]; then
  RUNTIME="python"

  # Detect Python version
  PYTHON_VERSION=$(python3 --version 2>/dev/null | sed 's/Python \([0-9]\+\.[0-9]\+\).*/\1/')
fi
```

**Ruby Detection:**
```bash
if [ -f "Gemfile" ]; then
  RUNTIME="ruby"
fi
```

**Go Detection:**
```bash
if [ -f "go.mod" ]; then
  RUNTIME="go"
fi
```

**Rust Detection:**
```bash
if [ -f "Cargo.toml" ]; then
  RUNTIME="rust"
fi
```

### Step 3: Select Preset

Based on detected tech stack, map to preset:

**Mapping Logic:**
- Node.js + TypeScript + React → `react-typescript`
- Node.js + TypeScript → `typescript-node`
- Node.js (JavaScript only) → `typescript-node` (suggest adding TypeScript)
- Java + Spring Boot → `java-spring`
- Python → Create basic config (no preset yet)
- Ruby, Go, Rust → Create basic config (no preset yet)

**If `--preset` flag provided:**
- Use specified preset
- Skip auto-detection
- Validate preset exists: `presets/<preset>.json`

**If detection unclear:**
- Show detected information
- Prompt user to select from available presets:
  - typescript-node
  - react-typescript
  - java-spring

### Step 4: Generate Configuration

**Read Preset:**
```bash
PRESET_FILE="presets/${PRESET}.json"
cat "$PRESET_FILE"
```

**Override with Detected Values:**
Create `.claude/config.json` by merging:
1. Base preset values
2. Detected runtime version
3. Detected framework versions
4. Project name (from directory name or package.json)

**Example Generation:**
```json
{
  "$schema": "../schemas/config.schema.json",
  "extends": "presets/react-typescript.json",
  "name": "my-project",
  "runtime": {
    "type": "node",
    "version": "20.x",           // Detected
    "versionFile": ".nvmrc",
    "versionManager": "nvm"
  }
}
```

**For projects without presets:**
Create minimal config:
```json
{
  "$schema": "../schemas/config.schema.json",
  "name": "my-project",
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
        "preCommit": [],
        "prePush": []
      },
      "mergeStrategy": "merge"
    }
  },
  "runtime": {
    "type": "python",              // Detected
    "version": "3.11"              // Detected
  }
}
```

### Step 5: Create Directory Structure

Create `.claude/` directory structure:

```bash
mkdir -p .claude/branches
mkdir -p .claude/sessions
mkdir -p .claude/context    # Optional
mkdir -p .claude/templates  # Optional
```

**If migration (existing .claude/):**
- Preserve all existing directories
- Only create missing directories

### Step 6: Validate Configuration

Run validation on generated config:

```bash
./scripts/validate-config.sh .claude/config.json
```

If validation fails:
- Show error
- Ask user to review config manually
- Do not proceed

### Step 7: Display Summary

Show comprehensive summary:

```
Plugin initialized successfully!

Detected:
  Runtime: Node.js 20.9.0
  Framework: React 18.2.0
  TypeScript: Yes
  Preset: react-typescript

Created:
  ✓ .claude/config.json
  ✓ .claude/branches/
  ✓ .claude/sessions/

Configuration:
  - Test command: npm test -- --watchAll=false
  - Lint command: npm run lint
  - Type check: npm run type-check
  - Format: npm run format

Next steps:
1. Review .claude/config.json
2. Customize if needed (test patterns, commands, etc.)
3. Start your first session:
   - Feature: git checkout -b issue/feature-<N>/<desc>
   - Chore: git checkout -b chore/<desc>
   - Then: /create-session
4. Check workflow: /check start

For more info:
  - Config docs: docs/configuration.md
  - Presets: presets/
  - Commands: /next, /create-session, /check
```

## Interactive vs Non-Interactive Mode

### Interactive Mode (Default)

Prompt at key points:

1. **Existing .claude/ directory:**
   ```
   Found existing .claude/ directory with:
     - 12 sessions
     - 8 branches
     - config.json (missing)

   Continue initialization? (Y/n):
   ```

2. **Preset confirmation:**
   ```
   Detected: Node.js 20.x with TypeScript and React
   Recommended preset: react-typescript

   Use this preset? (Y/n):
   ```

3. **Customization:**
   ```
   Generated configuration uses:
     - Node 20.x
     - Jest for testing
     - ESLint + Prettier

   Customize configuration now? (y/N):
   ```

4. **Migration cleanup (if applicable):**
   ```
   Found bootstrap files from manual setup:
     - CLAUDE.md
     - .claude/tools/ (scripts)

   These are no longer needed with the plugin.

   Remove bootstrap files? (y/N):
   ```

### Non-Interactive Mode (`--yes` flag)

Skip all prompts:
- Accept all defaults
- Use recommended preset
- No customization
- No cleanup prompts
- Direct to completion

## Error Handling

### Unsupported Project Type
```
Error: Could not detect project type.

No recognizable files found:
  - package.json (Node.js)
  - build.gradle or pom.xml (Java)
  - requirements.txt or setup.py (Python)
  - Gemfile (Ruby)
  - go.mod (Go)
  - Cargo.toml (Rust)

To initialize manually:
  /plugin-init --preset <preset-name>

Available presets:
  - typescript-node
  - react-typescript
  - java-spring
```

### Preset Not Found
```
Error: Preset 'invalid-preset' not found.

Available presets:
  - typescript-node
  - react-typescript
  - java-spring

Usage: /plugin-init --preset <preset-name>
```

### Validation Failed
```
Error: Generated configuration is invalid.

Validation errors:
  - Missing required field: vcs.type

Please review .claude/config.json manually.
```

### Not in Git Repository
```
Error: Not in a git repository.

This plugin requires git for session and branch management.

Initialize git first:
  git init
```

## Examples

### Example 1: New Node.js + TypeScript + React Project

**Input:**
```
/plugin-init
```

**Interaction:**
```
Analyzing project...

Detected:
  Runtime: Node.js 20.9.0
  Framework: React 18.2.0
  TypeScript: Yes
  Test: Jest
  Package manager: npm

Recommended preset: react-typescript

Use this preset? (Y/n): Y

Generating configuration...
✓ Preset: react-typescript
✓ Runtime version: 20.x (detected from .nvmrc)
✓ Project name: my-react-app (from package.json)

Creating directory structure...
✓ Created .claude/
✓ Created .claude/config.json
✓ Created .claude/branches/
✓ Created .claude/sessions/

Validating configuration...
✓ Configuration is valid

Plugin initialized successfully!

Configuration summary:
  - Test: npm test -- --watchAll=false
  - Lint: npm run lint
  - Format: npm run format
  - Type check: npm run type-check
  - Pre-commit hooks: format → lint → type-check → test

Next steps:
1. Review .claude/config.json
2. Create your first session: /create-session
3. Check workflow: /check start
```

### Example 2: Existing .claude/ Directory (Migration)

**Input:**
```
/plugin-init
```

**Interaction:**
```
Found existing .claude/ directory.

Contents:
  ✓ sessions/ (12 files)
  ✓ branches/ (8 files)
  ✓ context/ (6 files)
  ✗ config.json (missing)

Continue initialization? (Y/n): Y

Analyzing project...
Detected: Java 17 with Spring Boot 3.5.7
Preset: java-spring

Generating configuration...
✓ Created .claude/config.json
✓ Preserved existing sessions (12 files)
✓ Preserved existing branches (8 files)
✓ Preserved existing context (6 files)

Validating configuration...
✓ Configuration is valid

Plugin initialized successfully!

Migration complete:
  ✓ Config generated
  ✓ Existing data preserved
  ✓ Ready to use

Found bootstrap files:
  - CLAUDE.md (manual setup)
  - .claude/tools/ (old scripts)

These are no longer needed with the plugin.
Remove? (y/N): N

Skipping cleanup. You can remove these files later if desired.

Next steps:
1. Review .claude/config.json
2. Continue with existing workflow
```

### Example 3: Non-Interactive Mode

**Input:**
```
/plugin-init --preset typescript-node --yes
```

**Output:**
```
Analyzing project...
Detected: Node.js 20.0.0 with TypeScript

Using preset: typescript-node
✓ Created .claude/config.json
✓ Created .claude/branches/
✓ Created .claude/sessions/
✓ Configuration is valid

Plugin initialized successfully!

Next: /create-session
```

### Example 4: Java Spring Boot Project

**Input:**
```
/plugin-init
```

**Interaction:**
```
Analyzing project...

Detected:
  Runtime: Java 17
  Framework: Spring Boot 3.5.7
  Build tool: Gradle
  Test: JUnit

Recommended preset: java-spring

Use this preset? (Y/n): Y

Generating configuration...
✓ Preset: java-spring
✓ Runtime version: 17 (from build.gradle)
✓ Project name: portal-d365 (from settings.gradle)

Creating directory structure...
✓ Created .claude/
✓ Created .claude/config.json
✓ Created .claude/branches/
✓ Created .claude/sessions/

Validating configuration...
✓ Configuration is valid

Plugin initialized successfully!

Configuration summary:
  - Test: gradle test
  - Lint: gradle checkstyleMain
  - Format: gradle spotlessApply
  - Pre-commit hooks: format → lint → test

Next steps:
1. Review .claude/config.json
2. Create your first session: /create-session
```

## Notes

- This command is safe to run multiple times
- With `--force`, it will regenerate config.json
- Without `--force`, it will prompt before overwriting
- All user data (sessions, branches) is always preserved
- The command validates the generated config before completing
- If validation fails, user must fix config manually
