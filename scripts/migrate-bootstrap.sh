#!/bin/bash
# Migration Script: Bootstrap → Plugin
# Migrates existing bootstrap .claude/ setup to claude-domestique plugin

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Bootstrap → Plugin Migration${NC}"
echo -e "${BLUE}  claude-domestique v0.1.0${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Detect bootstrap setup
echo -e "${YELLOW}Step 1: Detecting bootstrap setup...${NC}"

if [ ! -d ".claude" ]; then
  echo -e "${RED}✗ No .claude/ directory found${NC}"
  echo ""
  echo "This script migrates existing bootstrap .claude/ to plugin."
  echo "No bootstrap detected. Run /plugin-init instead."
  echo ""
  exit 1
fi

echo -e "${GREEN}✓ Bootstrap .claude/ directory found${NC}"

# Check for key bootstrap components
BOOTSTRAP_COMPONENTS=()
[ -d ".claude/context" ] && BOOTSTRAP_COMPONENTS+=("context")
[ -d ".claude/sessions" ] && BOOTSTRAP_COMPONENTS+=("sessions")
[ -d ".claude/branches" ] && BOOTSTRAP_COMPONENTS+=("branches")
[ -d ".claude/tools" ] && BOOTSTRAP_COMPONENTS+=("tools/scripts")

if [ ${#BOOTSTRAP_COMPONENTS[@]} -eq 0 ]; then
  echo -e "${RED}✗ .claude/ exists but no bootstrap components found${NC}"
  echo "Expected: context/, sessions/, branches/, tools/"
  exit 1
fi

echo -e "${GREEN}✓ Found bootstrap components: ${BOOTSTRAP_COMPONENTS[*]}${NC}"

# Step 2: Backup bootstrap
echo ""
echo -e "${YELLOW}Step 2: Backing up bootstrap setup...${NC}"

BACKUP_DIR=".claude-bootstrap-backup"
if [ -d "$BACKUP_DIR" ]; then
  echo -e "${YELLOW}⚠ Backup directory exists: $BACKUP_DIR${NC}"
  read -p "Overwrite existing backup? (y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled"
    exit 1
  fi
  rm -rf "$BACKUP_DIR"
fi

cp -r .claude "$BACKUP_DIR"
echo -e "${GREEN}✓ Backup created: $BACKUP_DIR${NC}"

# Step 3: Generate config from bootstrap context
echo ""
echo -e "${YELLOW}Step 3: Generating .claude/config.json from bootstrap...${NC}"

# Detect tech stack from bootstrap context or files
TECH_STACK="custom"
TEST_CMD="echo 'No tests configured'"
LINT_CMD="echo 'No lint configured'"
BUILD_CMD="echo 'No build configured'"

# Try to detect from package.json
if [ -f "package.json" ]; then
  if grep -q "react" package.json; then
    TECH_STACK="react-typescript"
    TEST_CMD="npm test"
    LINT_CMD="npm run lint"
    BUILD_CMD="npm run build"
  elif grep -q "typescript" package.json; then
    TECH_STACK="typescript-node"
    TEST_CMD="npm test"
    LINT_CMD="npm run lint"
    BUILD_CMD="npm run build"
  fi
fi

# Try to detect from build.gradle
if [ -f "build.gradle" ] || [ -f "build.gradle.kts" ]; then
  TECH_STACK="java-spring"
  TEST_CMD="./gradlew test"
  LINT_CMD="./gradlew checkstyleMain"
  BUILD_CMD="./gradlew build"
fi

# Try to detect from requirements.txt or setup.py
if [ -f "requirements.txt" ] || [ -f "setup.py" ]; then
  TECH_STACK="python-django"
  TEST_CMD="pytest"
  LINT_CMD="pylint src/"
  BUILD_CMD="echo 'No build needed'"
fi

# Detect work-item platform from git remote
WORK_ITEM_PLATFORM="github"
GIT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
if [[ "$GIT_REMOTE" == *"dev.azure.com"* ]]; then
  WORK_ITEM_PLATFORM="azure-devops"
fi

# Detect branch pattern from existing branches
BRANCH_PATTERN="issue/feature-{id}/{desc}"
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" =~ ^issue/feature-[0-9]+/ ]]; then
  BRANCH_PATTERN="issue/feature-{id}/{desc}"
elif [[ "$CURRENT_BRANCH" =~ ^feature/[A-Z]+-[0-9]+/ ]]; then
  BRANCH_PATTERN="feature/{PROJECT}-{id}/{desc}"
elif [[ "$CURRENT_BRANCH" =~ ^[0-9]+-  ]]; then
  BRANCH_PATTERN="{id}-{desc}"
fi

# Generate config.json
cat > .claude/config.json <<EOF
{
  "techStack": {
    "type": "$TECH_STACK",
    "testCommand": "$TEST_CMD",
    "lintCommand": "$LINT_CMD",
    "buildCommand": "$BUILD_CMD",
    "verifyCommands": ["test"]
  },
  "workItems": {
    "platform": "$WORK_ITEM_PLATFORM",
    "branchPattern": "$BRANCH_PATTERN",
    "sync": {
      "enabled": true,
      "autoSyncOnCommit": true,
      "direction": "session-to-work-item"
    }
  },
  "git": {
    "commitFormat": "chore - {desc}",
    "useHeredoc": true,
    "noAttribution": true
  },
  "hooks": {
    "preCommit": {
      "enabled": true,
      "runTests": true,
      "checkSessionUpdated": true
    },
    "postCommit": {
      "enabled": true,
      "autoSync": true
    }
  }
}
EOF

echo -e "${GREEN}✓ Generated .claude/config.json${NC}"
echo "   Tech stack: $TECH_STACK"
echo "   Work items: $WORK_ITEM_PLATFORM"
echo "   Branch pattern: $BRANCH_PATTERN"

# Step 4: Preserve sessions and branches
echo ""
echo -e "${YELLOW}Step 4: Preserving session files and branch metadata...${NC}"

SESSION_COUNT=0
BRANCH_COUNT=0

if [ -d ".claude/sessions" ]; then
  SESSION_COUNT=$(find .claude/sessions -type f -name "*.md" | wc -l | tr -d ' ')
  echo -e "${GREEN}✓ Found $SESSION_COUNT session files${NC}"
fi

if [ -d ".claude/branches" ]; then
  BRANCH_COUNT=$(find .claude/branches -type f | wc -l | tr -d ' ')
  echo -e "${GREEN}✓ Found $BRANCH_COUNT branch metadata files${NC}"
fi

# Step 5: Remove bootstrap-specific files
echo ""
echo -e "${YELLOW}Step 5: Cleaning up bootstrap-specific files...${NC}"

# Remove bootstrap tools (replaced by plugin scripts)
if [ -d ".claude/tools" ]; then
  echo "   Removing .claude/tools/ (replaced by plugin scripts/)"
  rm -rf .claude/tools
fi

# Keep context/ directory (merge with plugin context)
echo -e "${GREEN}✓ Keeping .claude/context/ (project-specific)${NC}"

# Step 6: Validation
echo ""
echo -e "${YELLOW}Step 6: Validating migration...${NC}"

VALIDATION_ERRORS=0

# Check config exists and is valid JSON
if ! jq . .claude/config.json >/dev/null 2>&1; then
  echo -e "${RED}✗ Invalid JSON in .claude/config.json${NC}"
  ((VALIDATION_ERRORS++))
else
  echo -e "${GREEN}✓ .claude/config.json is valid${NC}"
fi

# Check sessions preserved
if [ -d ".claude/sessions" ]; then
  CURRENT_SESSION_COUNT=$(find .claude/sessions -type f -name "*.md" | wc -l | tr -d ' ')
  if [ "$CURRENT_SESSION_COUNT" -eq "$SESSION_COUNT" ]; then
    echo -e "${GREEN}✓ All session files preserved ($SESSION_COUNT files)${NC}"
  else
    echo -e "${RED}✗ Session file count mismatch${NC}"
    ((VALIDATION_ERRORS++))
  fi
fi

# Check branches preserved
if [ -d ".claude/branches" ]; then
  CURRENT_BRANCH_COUNT=$(find .claude/branches -type f | wc -l | tr -d ' ')
  if [ "$CURRENT_BRANCH_COUNT" -eq "$BRANCH_COUNT" ]; then
    echo -e "${GREEN}✓ All branch metadata preserved ($BRANCH_COUNT files)${NC}"
  else
    echo -e "${RED}✗ Branch metadata count mismatch${NC}"
    ((VALIDATION_ERRORS++))
  fi
fi

# Step 7: Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Migration Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ $VALIDATION_ERRORS -eq 0 ]; then
  echo -e "${GREEN}✓ Migration completed successfully${NC}"
  echo ""
  echo "Migrated components:"
  echo "  • Config generated: .claude/config.json"
  echo "  • Sessions preserved: $SESSION_COUNT files"
  echo "  • Branches preserved: $BRANCH_COUNT files"
  echo "  • Context preserved: .claude/context/"
  echo ""
  echo "Backup location: $BACKUP_DIR"
  echo ""
  echo -e "${YELLOW}Next steps:${NC}"
  echo "  1. Review .claude/config.json and customize if needed"
  echo "  2. Plugin is already installed (you're running from it)"
  echo "  3. Test commands: claude /next, claude /create-session"
  echo "  4. Verify hooks work: git commit (should check session)"
  echo ""
  echo -e "${GREEN}Migration complete! Plugin ready to use.${NC}"
else
  echo -e "${RED}✗ Migration completed with $VALIDATION_ERRORS errors${NC}"
  echo ""
  echo "To rollback:"
  echo "  1. rm -rf .claude"
  echo "  2. mv $BACKUP_DIR .claude"
  echo ""
  echo "Review errors above and retry migration."
fi

echo ""
