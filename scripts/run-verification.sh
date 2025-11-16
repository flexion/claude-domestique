#!/bin/bash
# run-verification.sh - Universal verification runner for quality checks
#
# Usage:
#   ./scripts/run-verification.sh                    # Run all preCommit hooks
#   ./scripts/run-verification.sh test               # Run tests only
#   ./scripts/run-verification.sh lint type-check    # Run specific checks
#   ./scripts/run-verification.sh --verbose          # Verbose output
#
# Environment Variables:
#   CONFIG_PATH - Path to config file (default: .claude/config.json)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
READ_CONFIG="$SCRIPT_DIR/read-config.sh"
CONFIG_FILE="${CONFIG_PATH:-.claude/config.json}"
VERBOSE=false
COMMANDS_TO_RUN=()

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [options] [command...]"
      echo ""
      echo "Run verification commands based on project configuration."
      echo ""
      echo "Options:"
      echo "  --verbose, -v        Show verbose output"
      echo "  --help, -h           Show this help"
      echo ""
      echo "Commands:"
      echo "  test                 Run tests"
      echo "  lint                 Run linter"
      echo "  format               Run format check"
      echo "  type-check           Run type checker"
      echo "  build                Run build"
      echo ""
      echo "Examples:"
      echo "  $0                   # Run all preCommit hooks"
      echo "  $0 test              # Run tests only"
      echo "  $0 lint type-check   # Run lint and type-check"
      echo "  $0 --verbose test    # Verbose test run"
      exit 0
      ;;
    test|lint|format|type-check|build)
      COMMANDS_TO_RUN+=("$1")
      shift
      ;;
    *)
      echo -e "${RED}Error: Unknown argument: $1${NC}" >&2
      echo "Run with --help for usage information" >&2
      exit 1
      ;;
  esac
done

# Error handling
error() {
  echo -e "${RED}Error: $1${NC}" >&2
  exit 1
}

warn() {
  echo -e "${YELLOW}Warning: $1${NC}" >&2
}

success() {
  echo -e "${GREEN}$1${NC}"
}

info() {
  echo -e "${BLUE}$1${NC}"
}

# Check if read-config.sh exists
if [ ! -f "$READ_CONFIG" ]; then
  error "Config reader not found: $READ_CONFIG"
fi

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
  error "Config file not found: $CONFIG_FILE"
fi

# Get command string from config based on command type
get_command_for_type() {
  local cmd_type="$1"
  local command_str=""

  case "$cmd_type" in
    test)
      command_str=$("$READ_CONFIG" test.testCommand 2>/dev/null || echo "")
      ;;
    lint)
      command_str=$("$READ_CONFIG" quality.linter.command 2>/dev/null || echo "")
      ;;
    format)
      command_str=$("$READ_CONFIG" quality.formatter.checkCommand 2>/dev/null || echo "")
      ;;
    type-check)
      command_str=$("$READ_CONFIG" quality.typeChecker.command 2>/dev/null || echo "")
      ;;
    build)
      command_str=$("$READ_CONFIG" quality.build.command 2>/dev/null || echo "")
      ;;
    *)
      warn "Unknown command type: $cmd_type"
      return 1
      ;;
  esac

  echo "$command_str"
}

# Execute a single verification command
run_command() {
  local cmd_type="$1"
  local command_str

  # Get command from config
  command_str=$(get_command_for_type "$cmd_type")

  if [ -z "$command_str" ]; then
    warn "No command configured for: $cmd_type (skipping)"
    return 0
  fi

  # Display what we're running
  echo ""
  info "Running $cmd_type..."
  if [ "$VERBOSE" = true ]; then
    echo "  Command: $command_str"
  fi

  # Execute command
  if eval "$command_str"; then
    success "✓ ${cmd_type} passed"
    return 0
  else
    echo ""
    error "Verification failed: $cmd_type"
  fi
}

# Get default commands from preCommit hooks if no args provided
if [ ${#COMMANDS_TO_RUN[@]} -eq 0 ]; then
  # Read preCommit hooks from config
  readarray -t COMMANDS_TO_RUN < <("$READ_CONFIG" vcs.git.hooks.preCommit 2>/dev/null | jq -r '.[]' 2>/dev/null || echo "")

  if [ ${#COMMANDS_TO_RUN[@]} -eq 0 ] || [ -z "${COMMANDS_TO_RUN[0]}" ]; then
    warn "No verification commands configured in vcs.git.hooks.preCommit"
    echo ""
    echo "You can run specific commands:"
    echo "  $0 test lint"
    exit 1
  fi
fi

# Main execution
echo "Running verification checks..."

TOTAL=${#COMMANDS_TO_RUN[@]}
PASSED=0

for cmd in "${COMMANDS_TO_RUN[@]}"; do
  if run_command "$cmd"; then
    ((PASSED++))
  else
    echo ""
    echo -e "${RED}Verification failed. Fix errors and try again.${NC}"
    exit 1
  fi
done

# Success summary
echo ""
success "✓ All verification checks passed ($PASSED/$TOTAL)"
exit 0
