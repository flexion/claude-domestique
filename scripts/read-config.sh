#!/bin/bash
# read-config.sh - Universal configuration reader with preset merging
#
# Usage:
#   ./scripts/read-config.sh                    # Output merged config
#   ./scripts/read-config.sh runtime.type       # Get specific value
#   ./scripts/read-config.sh --validate         # Validate config only
#   ./scripts/read-config.sh --config <path>    # Use custom config path
#
# Environment Variables:
#   CONFIG_PATH - Path to config file (default: .claude/config.json)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default config path
CONFIG_FILE="${CONFIG_PATH:-.claude/config.json}"
VALIDATE_ONLY=false
JSON_PATH=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --validate)
      VALIDATE_ONLY=true
      shift
      ;;
    --config)
      CONFIG_FILE="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [options] [json.path]"
      echo ""
      echo "Options:"
      echo "  --validate           Validate config only, don't output"
      echo "  --config <path>      Use custom config file path"
      echo "  --help               Show this help"
      echo ""
      echo "Examples:"
      echo "  $0                           # Output merged config"
      echo "  $0 runtime.type              # Get specific value"
      echo "  $0 vcs.git.defaultBranch     # Get nested value"
      echo "  $0 --validate                # Validate config"
      exit 0
      ;;
    *)
      JSON_PATH="$1"
      shift
      ;;
  esac
done

# Error handling function
error() {
  echo -e "${RED}Error: $1${NC}" >&2
  exit 1
}

# Warning function
warn() {
  echo -e "${YELLOW}Warning: $1${NC}" >&2
}

# Success function
success() {
  echo -e "${GREEN}$1${NC}" >&2
}

# Check if jq is available
if ! command -v jq &> /dev/null; then
  error "jq is required but not installed. Install with: brew install jq"
fi

# Load config file
load_config() {
  local config_path="$1"

  if [ ! -f "$config_path" ]; then
    error "Config file not found: $config_path"
  fi

  # Validate JSON syntax
  if ! jq empty "$config_path" 2>/dev/null; then
    error "Invalid JSON in config file: $config_path"
  fi

  cat "$config_path"
}

# Load preset file if referenced
load_preset() {
  local config="$1"
  local config_dir
  config_dir="$(dirname "$CONFIG_FILE")"

  # Check if config has extends field
  local extends_path
  extends_path=$(echo "$config" | jq -r '.extends // empty')

  if [ -z "$extends_path" ]; then
    echo ""
    return 0
  fi

  # Resolve preset path relative to config file
  local preset_file
  if [[ "$extends_path" = /* ]]; then
    # Absolute path
    preset_file="$extends_path"
  else
    # Relative path - resolve from config directory
    preset_file="$config_dir/$extends_path"
  fi

  if [ ! -f "$preset_file" ]; then
    error "Preset file not found: $preset_file (referenced as '$extends_path')"
  fi

  # Validate preset JSON
  if ! jq empty "$preset_file" 2>/dev/null; then
    error "Invalid JSON in preset file: $preset_file"
  fi

  cat "$preset_file"
}

# Merge configs (preset as base, project config overrides)
merge_configs() {
  local preset="$1"
  local config="$2"

  if [ -z "$preset" ]; then
    # No preset, just return config
    echo "$config"
  else
    # Deep merge: preset * config (config wins)
    # Remove $schema and extends from final output
    jq -s '.[0] * .[1] | del(.["$schema"]) | del(.extends)' \
      <(echo "$preset") \
      <(echo "$config")
  fi
}

# Get value by JSON path
get_value() {
  local merged="$1"
  local path="$2"

  # Convert dot notation to jq path
  # Example: runtime.type -> .runtime.type
  local jq_path=".${path}"

  # Extract value
  local value
  value=$(echo "$merged" | jq -r "$jq_path // empty" 2>/dev/null)

  if [ -z "$value" ] || [ "$value" = "null" ]; then
    error "Path not found in config: $path"
  fi

  echo "$value"
}

# Validate config using existing validator
validate_config() {
  local merged="$1"

  # Check if validate-config.sh exists
  local validator_script
  validator_script="$(dirname "$0")/validate-config.sh"

  if [ ! -f "$validator_script" ]; then
    warn "Validator script not found: $validator_script"
    warn "Skipping validation"
    return 0
  fi

  # Write merged config to temp file for validation
  local temp_config
  temp_config=$(mktemp)
  echo "$merged" > "$temp_config"

  # Run validator
  if "$validator_script" "$temp_config" >&2; then
    rm "$temp_config"
    return 0
  else
    rm "$temp_config"
    return 1
  fi
}

# Main execution
main() {
  # Load project config
  local config
  config=$(load_config "$CONFIG_FILE")

  # Load preset if referenced
  local preset
  preset=$(load_preset "$config")

  # Merge configs
  local merged
  merged=$(merge_configs "$preset" "$config")

  # Validate if requested
  if [ "$VALIDATE_ONLY" = true ]; then
    if validate_config "$merged"; then
      success "✓ Configuration is valid"
      exit 0
    else
      error "Configuration validation failed"
    fi
  fi

  # Extract specific value if path provided
  if [ -n "$JSON_PATH" ]; then
    get_value "$merged" "$JSON_PATH"
  else
    # Output merged config
    echo "$merged" | jq '.'
  fi
}

main
