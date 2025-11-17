# Command: /init

## Description
Initialize a project for claude-domestique plugin usage. This command auto-detects the tech stack, generates configuration, and sets up the necessary directory structure.

## Usage
```
/init [options]
```

**Options:**
- `--preset <name>` - Use specific preset (skip auto-detection)
- `--yes` - Accept all defaults, no prompts (non-interactive)
- `--force` - Overwrite existing config.json if present

**Examples:**
```
/init                                    # Interactive mode with auto-detection
/init --preset typescript-node           # Use specific preset
/init --preset react-typescript --yes    # Non-interactive with preset
/init --force                            # Overwrite existing config
```

## Implementation

### ⚠️ BLOCKING EXECUTION CHECKLIST (MANDATORY)

**Before executing /init, you MUST:**

1. **CREATE TODO LIST** using TodoWrite tool with these items:
   - Check for existing .claude/ directory
   - Detect tech stack
   - **Detect work item system - DO NOT SKIP**
   - Select preset
   - Generate configuration
   - Create directory structure
   - Validate configuration
   - **Backup and migrate CLAUDE.md (if exists) - DO NOT SKIP**
   - Display summary

2. **COMMIT** to executing steps 1-8 sequentially WITHOUT interpretation
   - Use thinking block to note: "I will execute steps 1-8 literally, no substitutions"
   - Each step must be executed EXACTLY as written
   - NO skipping based on content analysis or assumptions

3. **MARK COMPLETE** only after verification command confirms success
   - Run verification command after each step
   - Check result in thinking block
   - If verification fails: STOP and correct before proceeding

**CRITICAL:** Step 7 (CLAUDE.md backup) is MANDATORY if CLAUDE.md exists. You MUST:
- Create backup FIRST (before reading content)
- Verify backup created
- Run interactive prompts
- NEVER skip based on file content interpretation

---

When the user invokes `/init`, follow these steps:

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

### Step 2.5: Detect Work Item System

**⚠️ MANDATORY:** Detect and confirm work item tracking system configuration.

Analyze project to determine work item system (GitHub, Azure DevOps, Jira, etc.):

**GitHub Detection:**
```bash
WORK_ITEM_SYSTEM=""

# Check for .github directory
if [ -d ".github" ]; then
  WORK_ITEM_SYSTEM="github"
  echo "✓ Detected GitHub (.github/ directory found)"
fi

# Check if gh CLI is configured for this repo
if [ -z "$WORK_ITEM_SYSTEM" ] && gh repo view &>/dev/null; then
  WORK_ITEM_SYSTEM="github"
  echo "✓ Detected GitHub (gh CLI configured)"
fi
```

**Azure DevOps Detection:**
```bash
# Check for .azuredevops or azure-pipelines.yml
if [ -d ".azuredevops" ] || [ -f "azure-pipelines.yml" ]; then
  WORK_ITEM_SYSTEM="azure-devops"
  echo "✓ Detected Azure DevOps (project files found)"
fi

# Check if az CLI is configured
if [ -z "$WORK_ITEM_SYSTEM" ] && az devops project show &>/dev/null 2>&1; then
  WORK_ITEM_SYSTEM="azure-devops"
  echo "✓ Detected Azure DevOps (az CLI configured)"
fi
```

**Jira Detection:**
```bash
# Check for .jira file or git config
if [ -f ".jira" ]; then
  WORK_ITEM_SYSTEM="jira"
  echo "✓ Detected Jira (.jira file found)"
fi

if [ -z "$WORK_ITEM_SYSTEM" ] && git config --get jira.url &>/dev/null; then
  WORK_ITEM_SYSTEM="jira"
  echo "✓ Detected Jira (git config found)"
fi
```

**Interactive Confirmation:**

If system detected:
```bash
if [ -n "$WORK_ITEM_SYSTEM" ]; then
  echo ""
  echo "Detected work item system: $WORK_ITEM_SYSTEM"
  read -p "Is this correct? (Y/n): " CONFIRM_SYSTEM

  if [ "$CONFIRM_SYSTEM" = "n" ] || [ "$CONFIRM_SYSTEM" = "N" ]; then
    WORK_ITEM_SYSTEM=""  # User rejected, ask manually
  fi
fi
```

If not detected or user rejected:
```bash
if [ -z "$WORK_ITEM_SYSTEM" ]; then
  echo ""
  echo "Which work item tracking system do you use?"
  echo "  1. GitHub Issues"
  echo "  2. Azure DevOps"
  echo "  3. Jira"
  echo "  4. None (chores only)"
  echo ""
  read -p "Select (1-4): " SYSTEM_CHOICE

  case $SYSTEM_CHOICE in
    1) WORK_ITEM_SYSTEM="github" ;;
    2) WORK_ITEM_SYSTEM="azure-devops" ;;
    3) WORK_ITEM_SYSTEM="jira" ;;
    4) WORK_ITEM_SYSTEM="none" ;;
    *)
      echo "Invalid choice. Defaulting to 'none'"
      WORK_ITEM_SYSTEM="none"
      ;;
  esac
fi
```

**Branch Pattern Configuration:**

```bash
if [ "$WORK_ITEM_SYSTEM" != "none" ]; then
  echo ""
  echo "What branch pattern do you use for features?"

  case $WORK_ITEM_SYSTEM in
    github)
      echo "  1. issue/feature-<N>/<desc>  (recommended for GitHub)"
      echo "  2. feature/<N>-<desc>"
      echo "  3. <N>-<desc>"
      echo "  4. Custom"
      DEFAULT_FEATURE_PATTERN="issue/feature-<N>/<desc>"
      DEFAULT_COMMIT_FORMAT="#<N> - <desc>"
      ;;
    azure-devops)
      echo "  1. <N>-<desc>  (recommended for Azure DevOps)"
      echo "  2. feature/<N>-<desc>"
      echo "  3. user/<username>/<N>-<desc>"
      echo "  4. Custom"
      DEFAULT_FEATURE_PATTERN="<N>-<desc>"
      DEFAULT_COMMIT_FORMAT="<N> - <desc>"
      ;;
    jira)
      echo "  1. <KEY>-<N>-<desc>  (e.g., PROJ-123-description)"
      echo "  2. feature/<KEY>-<N>-<desc>"
      echo "  3. Custom"
      DEFAULT_FEATURE_PATTERN="<KEY>-<N>-<desc>"
      DEFAULT_COMMIT_FORMAT="<KEY>-<N> - <desc>"
      ;;
  esac

  echo ""
  read -p "Select (1-4): " PATTERN_CHOICE

  case $PATTERN_CHOICE in
    1) FEATURE_PATTERN="$DEFAULT_FEATURE_PATTERN" ;;
    2)
      case $WORK_ITEM_SYSTEM in
        github) FEATURE_PATTERN="feature/<N>-<desc>" ;;
        azure-devops) FEATURE_PATTERN="feature/<N>-<desc>" ;;
        jira) FEATURE_PATTERN="feature/<KEY>-<N>-<desc>" ;;
      esac
      ;;
    3)
      case $WORK_ITEM_SYSTEM in
        github) FEATURE_PATTERN="<N>-<desc>" ;;
        azure-devops) FEATURE_PATTERN="user/<username>/<N>-<desc>" ;;
        jira) FEATURE_PATTERN="<KEY>-<N>-<desc>" ;;
      esac
      ;;
    4)
      read -p "Enter custom pattern: " FEATURE_PATTERN
      ;;
    *)
      echo "Invalid choice. Using recommended pattern."
      FEATURE_PATTERN="$DEFAULT_FEATURE_PATTERN"
      ;;
  esac

  # Set commit format based on pattern
  if echo "$FEATURE_PATTERN" | grep -q "issue/feature"; then
    COMMIT_FORMAT="#<N> - <desc>"
  elif echo "$FEATURE_PATTERN" | grep -q "<KEY>"; then
    COMMIT_FORMAT="<KEY>-<N> - <desc>"
  else
    COMMIT_FORMAT="<N> - <desc>"
  fi

  echo ""
  echo "Branch pattern: $FEATURE_PATTERN"
  echo "Commit format: $COMMIT_FORMAT"
else
  # No work item system - chores only
  FEATURE_PATTERN="chore/<desc>"
  COMMIT_FORMAT="chore - <desc>"
  echo ""
  echo "No work item system configured (chores only)"
fi

# Store for config generation
CHORE_PATTERN="chore/<desc>"
CHORE_COMMIT_FORMAT="chore - <desc>"
```

**Autonomous Verification (REQUIRED):**
```bash
# YOU MUST verify:
echo ""
echo "Work Item Configuration:"
echo "  System: $WORK_ITEM_SYSTEM"
echo "  Feature branch: $FEATURE_PATTERN"
echo "  Feature commit: $COMMIT_FORMAT"
echo "  Chore branch: $CHORE_PATTERN"
echo "  Chore commit: $CHORE_COMMIT_FORMAT"
echo ""
read -p "Is this configuration correct? (Y/n): " CONFIRM_CONFIG

if [ "$CONFIRM_CONFIG" = "n" ] || [ "$CONFIRM_CONFIG" = "N" ]; then
  echo "ERROR: Configuration rejected. Please restart /init"
  exit 1
fi
```

**Self-Check (in thinking block):**
- Did I detect work item system? (yes/no)
- Did I confirm with user? (yes/no)
- Did I configure branch patterns? (yes/no)
- Did I run verification? (yes/no)
- If any NO: STOP and correct now

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
5. **Work item system configuration (from Step 2.5)**

**Example Generation:**
```json
{
  "$schema": "../schemas/config.schema.json",
  "extends": "presets/react-typescript.json",
  "name": "my-project",
  "runtime": {
    "type": "node",
    "version": "20.x",           // Detected (Step 2)
    "versionFile": ".nvmrc",
    "versionManager": "nvm"
  },
  "workItems": {
    "system": "github",          // Detected (Step 2.5)
    "branchPatterns": {
      "feature": "issue/feature-<N>/<desc>",  // Configured (Step 2.5)
      "chore": "chore/<desc>"
    },
    "commitFormat": {
      "feature": "#<N> - <desc>",             // Configured (Step 2.5)
      "chore": "chore - <desc>"
    }
  }
}
```

**For projects without presets:**
Create minimal config:
```json
{
  "$schema": "../schemas/config.schema.json",
  "name": "my-project",
  "runtime": {
    "type": "python",              // Detected (Step 2)
    "version": "3.11"              // Detected (Step 2)
  },
  "workItems": {
    "system": "azure-devops",      // Detected (Step 2.5)
    "branchPatterns": {
      "feature": "<N>-<desc>",     // Configured (Step 2.5)
      "chore": "chore/<desc>"
    },
    "commitFormat": {
      "feature": "<N> - <desc>",   // Configured (Step 2.5)
      "chore": "chore - <desc>"
    }
  }
}
```

**Note:** The deprecated `vcs` section has been replaced by the `workItems` section which handles work item tracking, branch patterns, and commit formats.

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

### Step 7: Backup and Migrate CLAUDE.md (MANDATORY - DO NOT SKIP)

**⚠️ BLOCKING REQUIREMENT:** If CLAUDE.md exists, backup MUST occur before proceeding.

**DO NOT SKIP THIS STEP based on:**
- Content analysis ("it's just plugin instructions")
- Assumptions ("backup not needed")
- Interpretation ("content can be recreated")

**Verification-First Approach:**

#### Step 7.1: Check Existence (REQUIRED - DO NOT SKIP)

```bash
# MANDATORY: Run this check FIRST (before reading file content)
if [ -f "CLAUDE.md" ]; then
  echo "✓ CLAUDE.md EXISTS - BACKUP REQUIRED"
  CLAUDE_MD_EXISTS=true
else
  echo "✓ CLAUDE.md NOT FOUND - SKIP TO STEP 8"
  CLAUDE_MD_EXISTS=false
fi
```

**Autonomous Verification (REQUIRED):**
```bash
# YOU MUST run this verification command:
ls -la CLAUDE.md 2>/dev/null && echo "VERIFICATION: CLAUDE.md exists" || echo "VERIFICATION: CLAUDE.md not found"
```

**Self-Check (in thinking block):**
- Did I run the existence check? (yes/no)
- Did I run the verification command? (yes/no)
- If either NO: STOP and correct now

---

#### Step 7.2: Create Backup (BLOCKING - MUST COMPLETE IF CLAUDE.md EXISTS)

**IF CLAUDE_MD_EXISTS=true, execute ALL substeps below (NO EXCEPTIONS):**

```bash
# BLOCKING: Create timestamped backup
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
cp CLAUDE.md "CLAUDE.md.backup-${TIMESTAMP}"
echo "✓ Backed up CLAUDE.md to CLAUDE.md.backup-${TIMESTAMP}"
```

**Autonomous Verification (REQUIRED):**
```bash
# YOU MUST run this verification command:
if [ -f "CLAUDE.md.backup-${TIMESTAMP}" ]; then
  echo "✓ VERIFIED: Backup created at CLAUDE.md.backup-${TIMESTAMP}"
else
  echo "✗ FAILED: Backup not created - ABORT INIT"
  exit 1
fi
```

**Self-Check (in thinking block):**
- Did I create a backup? (yes/no)
- Did I verify it exists? (yes/no)
- Did the verification command pass? (yes/no)
- If any NO: STOP and correct now

---

#### Step 7.3: Interactive Migration (REQUIRED IF CLAUDE.md EXISTS)

**Interactive migration of existing documentation into .claude/context/ files.**

The plugin's context-loader skill automatically loads files from `.claude/context/` at session start and periodic refresh. This step helps migrate valuable content from CLAUDE.md and README.md into this structure.

```bash
MIGRATE_NEEDED=false
HAS_CLAUDE_MD=$CLAUDE_MD_EXISTS  # From Step 7.1

# Check for README.md
if [ -f "README.md" ]; then
  echo "✓ Found README.md"
  HAS_README_MD=true
  MIGRATE_NEEDED=true
else
  HAS_README_MD=false
fi

if [ "$MIGRATE_NEEDED" = true ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Interactive Migration: CLAUDE.md / README.md → .claude/context/"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "The plugin auto-loads context from .claude/context/ files."
  echo "Let's migrate valuable content from your existing docs."
  echo ""

  # Interactive prompts for content extraction
  if [ "$HAS_CLAUDE_MD" = true ]; then
    echo "━━━ CLAUDE.md Migration ━━━"
    echo ""
    read -p "Does CLAUDE.md contain project-specific context to preserve? (y/N): " MIGRATE_CLAUDE

    if [ "$MIGRATE_CLAUDE" = "y" ] || [ "$MIGRATE_CLAUDE" = "Y" ]; then
      echo ""
      echo "What type of content does CLAUDE.md contain?"
      echo "  1. Project domain/architecture"
      echo "  2. Testing strategy"
      echo "  3. Deployment process"
      echo "  4. Team conventions"
      echo "  5. API documentation"
      echo "  6. Multiple (I'll extract manually)"
      echo ""
      read -p "Select type (1-6): " CLAUDE_TYPE

      case $CLAUDE_TYPE in
        1)
          echo ""
          echo "Creating .claude/context/project.yml for project domain..."
          echo "Please extract project-specific content from CLAUDE.md.backup-${TIMESTAMP}"
          echo "and add it to .claude/context/project.yml in compact YAML format."
          echo ""
          echo "Example format:"
          echo "---"
          cat <<'EXAMPLE'
# Project Overview
name: your-project-name
domain: project-domain
purpose: main-objectives

# Architecture
patterns: key-patterns-used
constraints: important-constraints
EXAMPLE
          echo "---"
          SUGGESTED_FILE=".claude/context/project.yml"
          ;;
        2)
          echo ""
          echo "Creating .claude/context/test.yml for testing strategy..."
          SUGGESTED_FILE=".claude/context/test.yml"
          cat <<'EXAMPLE'
# Testing Strategy
strategy: integration-over-unit
test: what-to-test
skip: what-to-skip
framework: testing-frameworks
run: when-to-run-tests
EXAMPLE
          ;;
        3)
          echo ""
          echo "Creating .claude/context/deploy.yml for deployment..."
          SUGGESTED_FILE=".claude/context/deploy.yml"
          cat <<'EXAMPLE'
# Deployment Process
process: build → test → stage → prod
platform: deployment-platform
stages:
  staging: staging-command
  production: production-command
rollback: rollback-strategy
EXAMPLE
          ;;
        4)
          echo ""
          echo "Creating .claude/context/team.yml for conventions..."
          SUGGESTED_FILE=".claude/context/team.yml"
          ;;
        5)
          echo ""
          echo "Creating .claude/context/apis.yml for API docs..."
          SUGGESTED_FILE=".claude/context/apis.yml"
          ;;
        6)
          echo ""
          echo "You'll extract manually. Common target files:"
          echo "  - .claude/context/project.yml (domain, architecture)"
          echo "  - .claude/context/test.yml (testing strategy)"
          echo "  - .claude/context/deploy.yml (deployment)"
          SUGGESTED_FILE=""
          ;;
      esac

      if [ -n "$SUGGESTED_FILE" ]; then
        read -p "Open editor to create ${SUGGESTED_FILE} now? (y/N): " OPEN_EDITOR
        if [ "$OPEN_EDITOR" = "y" ] || [ "$OPEN_EDITOR" = "Y" ]; then
          ${EDITOR:-vi} "$SUGGESTED_FILE"
          echo "✓ Created ${SUGGESTED_FILE}"
        else
          echo "⚠ Skipped. Create ${SUGGESTED_FILE} manually later."
        fi
      fi

      echo ""
      read -p "Delete CLAUDE.md now? (y/N): " DELETE_CLAUDE
      if [ "$DELETE_CLAUDE" = "y" ] || [ "$DELETE_CLAUDE" = "Y" ]; then
        rm CLAUDE.md
        echo "✓ Deleted CLAUDE.md (backup preserved)"
        CLAUDE_MD_ACTION="migrated-deleted"
      else
        echo "⚠ Kept CLAUDE.md (may cause duplicate loading)"
        CLAUDE_MD_ACTION="backed-up-kept"
      fi
    else
      echo "⚠ Skipping CLAUDE.md migration. Backup preserved."
      CLAUDE_MD_ACTION="backed-up-skipped"
    fi
  fi

  # README.md migration
  if [ "$HAS_README_MD" = true ]; then
    echo ""
    echo "━━━ README.md Migration ━━━"
    echo ""
    echo "README.md typically contains project overview, setup, architecture."
    echo ""
    read -p "Extract project overview from README.md to .claude/context/project.yml? (y/N): " MIGRATE_README

    if [ "$MIGRATE_README" = "y" ] || [ "$MIGRATE_README" = "Y" ]; then
      echo ""
      echo "Common content to extract from README.md:"
      echo "  - Project name and purpose"
      echo "  - High-level architecture"
      echo "  - Key technologies/frameworks"
      echo "  - Domain concepts"
      echo ""
      echo "Target file: .claude/context/project.yml"
      echo ""

      if [ -f ".claude/context/project.yml" ]; then
        read -p ".claude/context/project.yml exists. Append to it? (y/N): " APPEND_PROJECT
        if [ "$APPEND_PROJECT" = "y" ] || [ "$APPEND_PROJECT" = "Y" ]; then
          ${EDITOR:-vi} .claude/context/project.yml
          echo "✓ Updated .claude/context/project.yml"
        fi
      else
        read -p "Create .claude/context/project.yml now? (y/N): " CREATE_PROJECT
        if [ "$CREATE_PROJECT" = "y" ] || [ "$CREATE_PROJECT" = "Y" ]; then
          cat > .claude/context/project.yml <<'TEMPLATE'
# Project Overview
# Extract key details from README.md and convert to compact YAML

name: project-name
domain: project-domain
purpose: what-this-project-does

# Architecture
tech-stack: main-technologies
patterns: architectural-patterns
key-concepts: domain-concepts

# Setup (if relevant)
prerequisites: required-tools
setup: setup-steps
TEMPLATE
          ${EDITOR:-vi} .claude/context/project.yml
          echo "✓ Created .claude/context/project.yml"
        fi
      fi

      README_MD_ACTION="extracted"
    else
      echo "⚠ Skipping README.md extraction."
      README_MD_ACTION="skipped"
    fi
  fi

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Creating Markdown Elaboration Files"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Creating detailed markdown guides in .claude/context/ for reference..."
  echo ""

  # Create project-guide.md if project.yml exists
  if [ -f ".claude/context/project.yml" ]; then
    cat > .claude/context/project-guide.md <<'GUIDE'
# Project Context Guide

This file provides detailed explanations and examples for the compact YAML in `project.yml`.

## Purpose

The `project.yml` file gives Claude quick context about:
- What this project does (domain, purpose)
- Technical architecture and patterns
- Key concepts and constraints
- Tech stack and frameworks

## When Claude Reads This

This file is loaded:
- At session start (automatic)
- Every 50 interactions (periodic refresh)
- When you say "reload context"

## How to Use

### Keep YAML Compact
The `.yml` file should be machine-optimized (compact, token-efficient).
Use this `.md` file for human-readable details, examples, and elaboration.

### Example: Domain Concepts

**In project.yml:**
```yaml
domain: e-commerce-platform
key-concepts: inventory-sync, order-fulfillment, payment-processing
```

**In this file (project-guide.md):**

**Inventory Sync:**
- Real-time sync with warehouse management system
- Batch updates every 5 minutes
- Conflict resolution: warehouse wins

**Order Fulfillment:**
- Multi-warehouse routing (closest to customer)
- Fallback to secondary warehouse if primary out of stock
- SLA: 24-hour processing for standard, 2-hour for express

**Payment Processing:**
- Stripe integration (primary)
- PayPal fallback
- Fraud detection via Sift Science
- PCI compliance: tokenization only, no card storage

### Example: Architecture Patterns

**In project.yml:**
```yaml
patterns: event-sourcing, cqrs, saga-pattern
```

**In this file:**

**Event Sourcing:**
- All state changes captured as events
- Event store: PostgreSQL with jsonb column
- Replay events to rebuild state
- See: `src/events/` directory

**CQRS:**
- Write model: domain entities in `src/domain/`
- Read model: denormalized views in `src/queries/`
- Sync via event handlers

**Saga Pattern:**
- Distributed transactions coordinated via events
- Example: Order placement saga (reserve inventory → charge payment → create shipment)
- See: `src/sagas/order-placement-saga.ts`

## Tips

- Keep domain jargon explained here
- Link to code examples (`src/path/to/file.ts:123`)
- Document "why" decisions, not just "what"
- Update when architecture changes
GUIDE
    echo "✓ Created .claude/context/project-guide.md"
  fi

  # Create test-guide.md if test.yml exists
  if [ -f ".claude/context/test.yml" ]; then
    cat > .claude/context/test-guide.md <<'GUIDE'
# Testing Strategy Guide

Detailed explanations for the testing strategy in `test.yml`.

## Testing Philosophy

**In test.yml:**
```yaml
strategy: integration-over-unit
```

**What this means:**
- Prioritize integration tests (test components working together)
- Unit tests for complex business logic only
- Avoid testing implementation details
- Focus on user-facing behavior

## What to Test

**In test.yml:**
```yaml
test: api-endpoints, business-logic, auth-flows
skip: react-components, styling
```

**API Endpoints:**
```typescript
// Good: Test the full request/response cycle
describe('POST /api/orders', () => {
  it('creates order and reserves inventory', async () => {
    const response = await request(app)
      .post('/api/orders')
      .send({ items: [{ sku: 'ABC', qty: 2 }] });

    expect(response.status).toBe(201);
    expect(response.body.order.status).toBe('pending');

    // Verify side effects
    const inventory = await getInventory('ABC');
    expect(inventory.reserved).toBe(2);
  });
});
```

**Business Logic:**
```typescript
// Good: Test domain logic in isolation
describe('OrderPricing', () => {
  it('applies bulk discount for 10+ items', () => {
    const order = new Order([
      { sku: 'ABC', qty: 12, price: 10 }
    ]);

    expect(order.total()).toBe(108); // 12 * 10 * 0.9 (10% discount)
  });
});
```

**What NOT to Test:**
```typescript
// Bad: Testing React rendering details
it('renders with className "button-primary"', () => {
  // Too brittle, tests implementation not behavior
});

// Bad: Testing CSS
it('has blue background', () => {
  // Use visual regression tests instead
});
```

## Test Patterns

### Integration Test Pattern

```typescript
describe('Order Fulfillment Flow', () => {
  beforeEach(async () => {
    await db.reset();
    await seedTestData();
  });

  it('completes full order flow', async () => {
    // 1. Create order
    const order = await createOrder({ items: [...] });

    // 2. Process payment
    await processPayment(order.id);

    // 3. Verify fulfillment started
    const fulfillment = await getFulfillment(order.id);
    expect(fulfillment.status).toBe('in-progress');
  });
});
```

### Running Tests

```bash
# Before every commit
npm test

# Watch mode during development
npm test -- --watch

# Coverage report
npm test -- --coverage
```

## Tips

- Test behavior, not implementation
- One assertion per test (when possible)
- Descriptive test names (`it('refunds payment when order cancelled')`)
- Use factories for test data (avoid hardcoded fixtures)
GUIDE
    echo "✓ Created .claude/context/test-guide.md"
  fi

  # Create deploy-guide.md if deploy.yml exists
  if [ -f ".claude/context/deploy.yml" ]; then
    cat > .claude/context/deploy-guide.md <<'GUIDE'
# Deployment Guide

Detailed deployment procedures and troubleshooting for `deploy.yml`.

## Deployment Process

**In deploy.yml:**
```yaml
process: build → test → stage → smoke → prod
```

**Detailed Steps:**

### 1. Build
```bash
npm run build
```

**What happens:**
- TypeScript compilation (`tsc`)
- Webpack bundling
- Asset optimization
- Environment variables injected

**Common issues:**
- Type errors: Fix before proceeding
- Memory errors: Increase Node heap (`NODE_OPTIONS=--max-old-space-size=4096`)

### 2. Test
```bash
npm test -- --watchAll=false
```

**Must pass:**
- All unit tests
- All integration tests
- Coverage > 80%

**If tests fail:**
- DO NOT proceed to staging
- Fix failing tests
- Re-run build

### 3. Deploy to Staging
```bash
terraform apply -var-file=staging.tfvars
```

**What happens:**
- Provisions Azure App Service (if new)
- Deploys Docker container
- Runs database migrations
- Updates environment variables

**Verify deployment:**
```bash
curl https://staging.example.com/health
# Expected: {"status": "ok", "version": "1.2.3"}
```

### 4. Smoke Tests
```bash
npm run smoke-test:staging
```

**Tests run:**
- Health endpoint returns 200
- Auth flow works (login/logout)
- Critical API endpoints respond
- Database connectivity

**If smoke tests fail:**
- Check logs: `az webapp log tail --name app-staging`
- Verify environment variables
- Check database migrations
- ROLLBACK if critical failure

### 5. Deploy to Production
```bash
terraform apply -var-file=prod.tfvars
```

**Additional checks:**
- Backup database first
- Verify staging smoke tests passed
- Alert team in Slack
- Monitor error rates for 30 minutes

## Rollback Procedure

**If production deployment fails:**

```bash
# 1. Identify last good version
git log --oneline -10

# 2. Rollback to previous version
git checkout <previous-commit>
terraform apply -var-file=prod.tfvars

# 3. Verify rollback
curl https://prod.example.com/health
npm run smoke-test:prod

# 4. Alert team
# Post in #engineering: "Rolled back prod to version X.Y.Z due to [issue]"
```

## Environment Variables

**Staging:**
- `DATABASE_URL`: PostgreSQL on Azure
- `REDIS_URL`: Redis cache
- `STRIPE_KEY`: Test mode key
- `LOG_LEVEL`: debug

**Production:**
- `DATABASE_URL`: Production PostgreSQL (read replica available)
- `REDIS_URL`: Production Redis cluster
- `STRIPE_KEY`: Live mode key
- `LOG_LEVEL`: info

## Monitoring

**After deployment, monitor:**
- Error rate (should be < 1%)
- Response time (p95 < 500ms)
- Database connections (should not spike)
- Memory usage (should stabilize within 5 min)

**Tools:**
- Azure Application Insights
- Sentry for error tracking
- Grafana dashboards

## Tips

- Always deploy staging first
- Never skip smoke tests
- Keep rollback procedure tested
- Document deployment times in #engineering
GUIDE
    echo "✓ Created .claude/context/deploy-guide.md"
  fi

  # Create README.md reference file
  cat > .claude/context/README.md <<'README'
# Context Directory Guide

This directory contains project-specific context files that Claude loads automatically.

## Structure

```
.claude/context/
├── README.md           (this file - overview)
├── project.yml         (compact: domain, architecture)
├── project-guide.md    (detailed: explanations, examples)
├── test.yml            (compact: testing strategy)
├── test-guide.md       (detailed: test patterns, examples)
├── deploy.yml          (compact: deployment process)
└── deploy-guide.md     (detailed: procedures, troubleshooting)
```

## Two-File Pattern

Each topic has TWO files:

### 1. YAML File (Compact, Machine-Optimized)
**Purpose:** Quick context for Claude (token-efficient)
**Format:** Key-value pairs, minimal prose
**Example:**
```yaml
domain: e-commerce
patterns: event-sourcing, cqrs
tech-stack: typescript, postgresql, redis
```

### 2. Markdown Guide (Detailed, Human-Readable)
**Purpose:** Elaboration, examples, edge cases
**Format:** Full prose, code examples, troubleshooting
**Example:**
```markdown
## Event Sourcing

All state changes are captured as events...

### Example
\`\`\`typescript
const event = new OrderCreatedEvent({ orderId, items });
eventStore.append(event);
\`\`\`
```

## When Claude Loads These

**Automatic loading:**
- Session start (reads all .yml files)
- Periodic refresh (every 50 interactions)
- Manual: "reload context"

**On-demand loading:**
- When Claude needs deeper context, it reads corresponding .md file
- Example: Claude reads `project.yml`, then if needed reads `project-guide.md`

## How to Maintain

### Adding New Context

1. Create compact YAML:
   ```yaml
   # apis.yml
   base-url: https://api.example.com
   auth: oauth2-client-credentials
   rate-limit: 100-requests-per-minute
   ```

2. Create detailed guide:
   ```markdown
   # apis-guide.md

   ## Authentication
   OAuth 2.0 flow...

   ## Rate Limiting
   100 requests per minute...
   ```

### Updating Context

1. Update YAML first (Claude reads this most often)
2. Update guide with new details/examples
3. Test: Start new session, say "reload context"

## Tips

- Keep YAML files under 100 lines (token efficiency)
- Use guides for examples, edge cases, troubleshooting
- Link to actual code: `src/path/file.ts:123`
- Update when architecture changes
- Delete obsolete context (keeps context fresh)

## Plugin Core vs Project Context

**Plugin provides (you DON'T need to create):**
- `behavior.yml` - AI behavior, skepticism, quality
- `git.yml` - Git workflow, commit formats
- `sessions.yml` - Session management

**Project provides (you DO create here):**
- `project.yml` / `project-guide.md` - Domain, architecture
- `test.yml` / `test-guide.md` - Testing strategy
- `deploy.yml` / `deploy-guide.md` - Deployment process
- Any custom context (apis, team, security, etc.)
README
  echo "✓ Created .claude/context/README.md"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Migration Complete"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Context files created:"
  echo "  YAML files: Compact, machine-optimized (Claude reads frequently)"
  echo "  Guide files: Detailed, human-readable (Claude reads on-demand)"
  echo "  README.md: Overview of context structure"
  echo ""
  echo "Context files will auto-load on:"
  echo "  - Session start (automatic)"
  echo "  - Periodic refresh (every 50 interactions)"
  echo "  - Manual: 'reload context'"
  echo ""

else
  echo "✓ No CLAUDE.md or README.md found"
  CLAUDE_MD_ACTION="none"
  README_MD_ACTION="none"
fi
```

**Rationale:**

The plugin's `context-loader` skill automatically loads core workflow instructions from the plugin's `context/` directory. Creating or modifying CLAUDE.md would cause:
1. **Duplicate loading** - Files loaded by both CLAUDE.md and plugin skill
2. **Conflicting instructions** - Manual instructions vs auto-loaded context
3. **Maintenance burden** - User updates CLAUDE.md instead of using plugin

**Best practice:**
- **No CLAUDE.md needed** - Plugin provides core values automatically
- **If project needs custom instructions** - Add to `.claude/context/project.yml` instead
- **Plugin core + project custom** - Two-tier loading without duplication

**Migrating CLAUDE.md content to new structure:**

If your CLAUDE.md contains project-specific instructions you want to preserve:

1. **Identify what type of content:**
   - **Core workflow rules** (git, sessions, behavior) → Already in plugin, remove
   - **Project-specific context** (domain, architecture, patterns) → Migrate to `.claude/context/project.yml`
   - **Tech stack details** (testing, deployment) → Migrate to `.claude/context/test.yml`, `.claude/context/deploy.yml`
   - **Custom checklists** → Migrate to `.claude/context/` as separate files

2. **Migration guide:**
   ```bash
   # Step 1: Extract project-specific sections from CLAUDE.md backup
   # Look for content like:
   # - Project domain knowledge
   # - Architecture decisions
   # - Team conventions
   # - API documentation
   # - Business logic patterns

   # Step 2: Create project context file
   mkdir -p .claude/context

   # Step 3: Convert to compact YAML format
   # Example: CLAUDE.md section about project domain
   ```

   **Before (CLAUDE.md):**
   ```markdown
   ## Project Domain

   This is a D365 integration API that handles:
   - Customer data synchronization
   - Invoice processing
   - Real-time inventory updates

   Key patterns:
   - All API calls use exponential backoff
   - Rate limit: 100 requests/minute
   - Authentication: OAuth 2.0 client credentials
   ```

   **After (.claude/context/project.yml):**
   ```yaml
   # Project Overview
   name: d365-integration-api
   domain: dynamics-365-integration
   purpose: customer-data-sync, invoice-processing, inventory-updates

   # Integration Patterns
   api-calls: exponential-backoff
   rate-limit: 100-requests-per-minute
   auth: oauth2-client-credentials

   # Key Concepts
   sync-strategy: real-time
   error-handling: retry-with-backoff
   idempotency: required-all-endpoints
   ```

3. **What to migrate where:**

   | CLAUDE.md Content | Migrate To | Example |
   |-------------------|------------|---------|
   | Git workflow rules | **DON'T MIGRATE** | Plugin provides via `context/git.yml` |
   | Session management | **DON'T MIGRATE** | Plugin provides via `context/sessions.yml` |
   | AI behavior rules | **DON'T MIGRATE** | Plugin provides via `context/behavior.yml` |
   | Project domain | `.claude/context/project.yml` | Domain concepts, architecture |
   | Testing strategy | `.claude/context/test.yml` | What to test, patterns |
   | Deployment process | `.claude/context/deploy.yml` | Steps, environments |
   | Team conventions | `.claude/context/team.yml` | Code style, review process |
   | API documentation | `.claude/context/apis.yml` | Endpoints, patterns |

4. **Conversion helper:**

   After `/init` completes, if you kept CLAUDE.md, use this process:

   ```bash
   # Review your backup
   cat CLAUDE.md.backup-<timestamp>

   # For each project-specific section:
   # 1. Identify the topic (domain, testing, deployment, etc.)
   # 2. Create corresponding .yml file in .claude/context/
   # 3. Convert to compact YAML format (see examples)
   # 4. Test: Start new session, verify context loads

   # Validate context loads correctly
   # (Context-loader skill will report what loaded)
   ```

**Example migration:**

**CLAUDE.md (before):**
```markdown
# Project Instructions

## Testing Strategy
- Test all business logic functions
- Test API error handling
- Skip testing React components
- Use Jest with React Testing Library
- Run tests before every commit

## Deployment
1. Build: npm run build
2. Run tests: npm test
3. Deploy to staging: terraform apply -var-file=staging.tfvars
4. Smoke test staging
5. Deploy to prod: terraform apply -var-file=prod.tfvars
```

**After migration:**

**.claude/context/test.yml:**
```yaml
strategy: integration-over-unit
test: business-logic, api-error-handling, auth-flows
skip: react-components, styling
framework: jest, react-testing-library
run: before-commit
```

**.claude/context/deploy.yml:**
```yaml
process: build → test → stage → smoke → prod
platform: azure (terraform)
stages:
  staging: terraform apply -var-file=staging.tfvars
  production: terraform apply -var-file=prod.tfvars
smoke-tests: required-before-prod
rollback: terraform destroy → redeploy-previous
```

**Result:** Plugin core values + your project-specific context, no duplication.

---

#### Post-Step 7 Verification (REQUIRED)

**YOU MUST verify in thinking block:**

- [ ] Ran existence check (Step 7.1)
- [ ] Ran verification command for existence check
- [ ] IF CLAUDE.md existed:
  - [ ] Created backup (Step 7.2)
  - [ ] Verified backup file exists
  - [ ] Completed interactive prompts (Step 7.3)
- [ ] IF CLAUDE.md did not exist:
  - [ ] Skipped to Step 8 (correct behavior)

**Self-Check Question:**
Did I skip Step 7.2 or 7.3 based on content analysis? If YES: FAILED - go back and execute literally.

---

### Step 8: Display Summary

Show comprehensive summary with CLAUDE.md status:

```bash
# Determine migration status messages
case $CLAUDE_MD_ACTION in
  migrated-deleted)
    CLAUDE_MD_STATUS="✓ CLAUDE.md migrated to .claude/context/ and deleted (backup: CLAUDE.md.backup-${TIMESTAMP})"
    ;;
  backed-up-kept)
    CLAUDE_MD_STATUS="⚠ CLAUDE.md backed up and kept (may cause duplicate loading)"
    ;;
  backed-up-skipped)
    CLAUDE_MD_STATUS="⚠ CLAUDE.md backed up, migration skipped"
    ;;
  none)
    CLAUDE_MD_STATUS="✓ No CLAUDE.md found"
    ;;
esac

case $README_MD_ACTION in
  extracted)
    README_MD_STATUS="✓ README.md content extracted to .claude/context/project.yml"
    ;;
  skipped)
    README_MD_STATUS="⚠ README.md extraction skipped"
    ;;
  none)
    README_MD_STATUS="✓ No README.md found"
    ;;
esac
```

Display summary:

```
Plugin initialized successfully!

Detected:
  Runtime: Node.js 20.9.0
  Framework: React 18.2.0
  TypeScript: Yes
  Preset: react-typescript

Created/Updated:
  ✓ .claude/config.json
  ✓ .claude/branches/
  ✓ .claude/sessions/
  ✓ .claude/context/

Migration:
  ${CLAUDE_MD_STATUS}
  ${README_MD_STATUS}

Configuration:
  - Test command: npm test -- --watchAll=false
  - Lint command: npm run lint
  - Type check: npm run type-check
  - Format: npm run format

Context auto-loads:
  - Session start (automatic)
  - Periodic refresh (every 50 interactions)
  - Manual: "reload context"

Next steps:
1. Review .claude/config.json
2. Review .claude/context/*.yml files (customize project context)
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

4. **CLAUDE.md handling:**
   ```
   Found existing CLAUDE.md with custom instructions.

   Plugin instructions will be added to the top.
   Your existing content will be preserved.

   Continue? (Y/n):
   ```

### Non-Interactive Mode (`--yes` flag)

Skip all prompts:
- Accept all defaults
- Use recommended preset
- No customization
- Automatically update CLAUDE.md (preserve existing content)
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
  /init --preset <preset-name>

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

Usage: /init --preset <preset-name>
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
/init
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
/init
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

Found existing CLAUDE.md with custom instructions.

Plugin instructions will be added to the top.
Your existing content will be preserved.

Continue? (Y/n): Y

Updating CLAUDE.md...
✓ Plugin instructions added
✓ Existing content preserved

Plugin initialized successfully!

Migration complete:
  ✓ Config generated
  ✓ Existing data preserved
  ✓ CLAUDE.md updated with plugin instructions
  ✓ Ready to use

Next steps:
1. Review .claude/config.json
2. Review CLAUDE.md (plugin section added at top)
3. Continue with existing workflow
```

### Example 3: Non-Interactive Mode

**Input:**
```
/init --preset typescript-node --yes
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
/init
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
