#!/bin/bash
# Validate claude-domestique config against JSON schema

# Note: Not using set -e because we handle return codes explicitly

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default paths
SCHEMA_PATH="${SCHEMA_PATH:-schemas/config.schema.json}"
CONFIG_PATH="${1:-.claude/config.json}"

# Print usage
usage() {
    echo "Usage: $0 [config-file]"
    echo ""
    echo "Validates a claude-domestique config file against the JSON schema."
    echo ""
    echo "Arguments:"
    echo "  config-file    Path to config file (default: .claude/config.json)"
    echo ""
    echo "Environment variables:"
    echo "  SCHEMA_PATH    Path to schema file (default: schemas/config.schema.json)"
    echo ""
    echo "Examples:"
    echo "  $0                              # Validate .claude/config.json"
    echo "  $0 my-config.json               # Validate my-config.json"
    echo "  SCHEMA_PATH=./schema.json $0    # Use custom schema"
    exit 1
}

# Check for help flag
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
fi

# Check if config file exists
if [[ ! -f "$CONFIG_PATH" ]]; then
    echo -e "${RED}Error: Config file not found: $CONFIG_PATH${NC}"
    exit 1
fi

# Check if schema file exists
if [[ ! -f "$SCHEMA_PATH" ]]; then
    echo -e "${RED}Error: Schema file not found: $SCHEMA_PATH${NC}"
    exit 1
fi

echo "Validating: $CONFIG_PATH"
echo "Schema: $SCHEMA_PATH"
echo ""

# Function to validate with ajv-cli
validate_with_ajv() {
    if command -v ajv &> /dev/null; then
        echo "Using ajv-cli for validation..."
        if ajv validate -s "$SCHEMA_PATH" -d "$CONFIG_PATH" 2>&1; then
            return 0
        else
            return 1
        fi
    fi
    return 2
}

# Function to validate with check-jsonschema
validate_with_check_jsonschema() {
    if command -v check-jsonschema &> /dev/null; then
        echo "Using check-jsonschema for validation..."
        if check-jsonschema --schemafile "$SCHEMA_PATH" "$CONFIG_PATH" 2>&1; then
            return 0
        else
            return 1
        fi
    fi
    return 2
}

# Function to validate with python jsonschema
validate_with_python() {
    if command -v python3 &> /dev/null; then
        echo "Using Python jsonschema for validation..."
        python3 -c "
import json
import sys
try:
    from jsonschema import validate, ValidationError, Draft202012Validator

    with open('$SCHEMA_PATH') as f:
        schema = json.load(f)

    with open('$CONFIG_PATH') as f:
        config = json.load(f)

    validator = Draft202012Validator(schema)
    errors = list(validator.iter_errors(config))

    if errors:
        print('Validation failed:')
        for error in errors:
            path = '.'.join(str(p) for p in error.path) if error.path else 'root'
            print(f'  [{path}] {error.message}')
        sys.exit(1)
    else:
        print('Valid!')
        sys.exit(0)
except ImportError:
    print('Python jsonschema module not installed')
    print('Install with: pip install jsonschema')
    sys.exit(2)
except Exception as e:
    print(f'Error: {e}')
    sys.exit(1)
" 2>&1
        return $?
    fi
    return 2
}

# Function to do basic JSON validation with jq
validate_json_syntax() {
    echo "Checking JSON syntax with jq..."
    if ! jq empty "$CONFIG_PATH" 2>&1; then
        echo -e "${RED}Invalid JSON syntax${NC}"
        return 1
    fi

    # Basic structure validation
    echo "Checking required fields..."

    if ! jq -e '.name' "$CONFIG_PATH" > /dev/null 2>&1; then
        echo -e "${RED}Missing required field: name${NC}"
        return 1
    fi

    if ! jq -e '.vcs' "$CONFIG_PATH" > /dev/null 2>&1; then
        echo -e "${RED}Missing required field: vcs${NC}"
        return 1
    fi

    if ! jq -e '.runtime' "$CONFIG_PATH" > /dev/null 2>&1; then
        echo -e "${RED}Missing required field: runtime${NC}"
        return 1
    fi

    echo -e "${YELLOW}Basic validation passed (full schema validation unavailable)${NC}"
    echo -e "${YELLOW}For complete validation, install one of:${NC}"
    echo -e "${YELLOW}  - ajv-cli: npm install -g ajv-cli${NC}"
    echo -e "${YELLOW}  - check-jsonschema: pip install check-jsonschema${NC}"
    echo -e "${YELLOW}  - jsonschema: pip install jsonschema${NC}"

    return 0
}

# Try validators in order of preference
VALIDATION_RESULT=2

# Try ajv-cli first (most complete, fast)
validate_with_ajv
VALIDATION_RESULT=$?

# Try check-jsonschema if ajv not available
if [[ $VALIDATION_RESULT -eq 2 ]]; then
    validate_with_check_jsonschema
    VALIDATION_RESULT=$?
fi

# Try Python jsonschema if check-jsonschema not available
if [[ $VALIDATION_RESULT -eq 2 ]]; then
    validate_with_python
    VALIDATION_RESULT=$?
fi

# Fall back to basic jq validation
if [[ $VALIDATION_RESULT -eq 2 ]]; then
    validate_json_syntax
    VALIDATION_RESULT=$?
fi

# Report final result
echo ""
if [[ $VALIDATION_RESULT -eq 0 ]]; then
    echo -e "${GREEN}✓ Configuration is valid${NC}"
    exit 0
else
    echo -e "${RED}✗ Configuration is invalid${NC}"
    exit 1
fi
