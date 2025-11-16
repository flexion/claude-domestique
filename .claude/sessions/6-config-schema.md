# Session: Issue #6 - Implement config schema and tech stack presets

## Issue Details
- **Issue Number**: #6
- **Title**: Implement config schema and tech stack presets
- **Created**: 2025-11-16
- **Status**: Open
- **GitHub URL**: https://github.com/flexion/claude-domestique/issues/6

## Objective
Create a configuration system for the plugin to support different tech stacks and project settings, enabling the plugin to adapt to various development environments.

## Requirements

### Core Components
1. JSON Schema for `.claude/config.json`
2. Tech stack presets (typescript-node, react-typescript, java-spring)
3. Validation script
4. Configuration documentation

### Key Features
- Schema-based validation
- Preset system for common tech stacks
- Project-specific overrides
- Clear error reporting

## Technical Approach

### 1. JSON Schema Design
- Define structure for tech stack configuration
- Include validation rules for required fields
- Support extensibility for custom tech stacks
- Enable preset merging with project overrides

### 2. Tech Stack Presets
Create JSON files for each preset:
- typescript-node: Node.js development with TypeScript
- react-typescript: React frontend with TypeScript
- java-spring: Spring Boot backend

Each preset includes:
- Test, lint, build commands
- Verify commands (pre-commit checks)
- Test patterns (what to test/skip)
- Test placement conventions
- Naming conventions

### 3. Validation Script
- Read config file
- Validate against JSON schema
- Report validation errors clearly
- Exit with proper codes for CI/CD

### 4. Documentation
- Comprehensive configuration guide
- Examples for each preset
- Customization instructions
- Troubleshooting section

## Implementation Plan

### Phase 1: Schema Definition
- [ ] Create `schemas/` directory
- [ ] Define JSON schema for config structure
- [ ] Document schema fields
- [ ] Test schema validation

### Phase 2: Preset Creation
- [ ] Create `presets/` directory
- [ ] Create typescript-node.json preset
- [ ] Create react-typescript.json preset
- [ ] Create java-spring.json preset
- [ ] Test preset loading

### Phase 3: Validation Tooling
- [ ] Create validation script
- [ ] Implement schema validation
- [ ] Add error reporting
- [ ] Test with valid/invalid configs

### Phase 4: Documentation
- [ ] Create docs/configuration.md
- [ ] Document all config options
- [ ] Provide examples
- [ ] Add troubleshooting guide

## Dependencies
- JSON schema validator (jq or similar)
- Existing plugin structure from Phase 1.1

## Success Criteria
- JSON schema validates config files correctly
- Three presets created and tested
- Validation script reports errors clearly
- Documentation complete with examples
- Config works with test projects (simple-D365, Portal-D365-WebApp, portal-D365)

## Notes
- This is a foundational component for Phase 2 (Config System)
- Enables tech-stack-specific behavior in later phases
- Must be portable across different project types

## Session Log

### 2025-11-16 - Session Created
- Created GitHub issue #6
- Created feature branch: issue/feature-6/config-schema
- Initialized session file with requirements from issue
- Ready to begin implementation

### 2025-11-16 - Tooling Modularization Design
**Actions:**
- Analyzed tooling that varies between projects
- Identified 10 configuration modules (vcs, package, build, test, quality, verify, dev, deploy, workitem, runtime)
- Decided to assume git but structure for swappability (future: svn, mercurial)
- Created comprehensive design document: docs/config-schema-design.md

**Key Insights:**
- Version control tooling was initially missed but critical for workflow
- Modular structure enables plugin to adapt to different tech stacks
- Each module will map to specific skills/agents in the plugin
- Preset pattern allows reusable configurations with project overrides

**Design Decisions:**
1. VCS has type field with type-specific subsections (git, future: svn)
2. 10 modules cover all major tooling variations
3. Implementation priority: Phase 1 (vcs, runtime, test, quality) → Phase 2 (package, build, verify) → Phase 3 (dev, deploy, workitem)

**Next:** Implement JSON schema starting with Phase 1 modules

### 2025-11-16 - Plugin Initialization Requirement
**User Insight:** Projects need initialization to use the plugin effectively

**Requirement:**
- Plugin must provide initialization command (e.g., `/init`)
- Initialization sets up necessary context for skills, agents, commands
- Auto-detects project tech stack
- Generates `.claude/config.json` with appropriate preset
- Creates `.claude/` directory structure if needed
- Validates configuration

**Implementation Scope:**
- Interactive mode (prompts user) vs non-interactive (--preset, --yes)
- Auto-detection for Node.js, Java, Python projects
- Migration support for existing `.claude/` directories (like simple-D365)
- Validation after generation
- Clear UX with summary and next steps

**Impact on Design:**
- Initialization is prerequisite for plugin usage
- Config schema must support auto-detection
- Presets must be complete enough for default usage
- Migration path preserves existing work

**Next:** Design complete. Ready to implement JSON schema.

### 2025-11-16 - JSON Schema Implementation (Phase 1)
**Actions:**
- Created `schemas/` directory
- Implemented `schemas/config.schema.json` with Phase 1 modules
- Defined vcs module with git support (swappable structure)
- Defined runtime module (node, java, python, ruby, go, rust)
- Defined test module (framework, commands, patterns, placement)
- Defined quality module (linter, formatter, typeChecker)
- Created `schemas/example-config.json` for validation and reference

**Schema Features:**
- JSON Schema Draft 2020-12 compliant
- Modular structure with $defs for reusability
- Required fields: name, vcs, runtime
- Optional fields: test, quality
- Extensible via "extends" field for preset support
- Comprehensive descriptions and examples
- Enum constraints for type safety

**Phase 1 Modules Implemented:**
1. **vcs**: Version control (git), branch patterns, commit formats, hooks, merge strategy
2. **runtime**: Language/runtime type, version, version file, version manager
3. **test**: Framework, commands, patterns, naming, placement
4. **quality**: Linter, formatter, type checker configs

**Files Created:**
- `schemas/config.schema.json` (270+ lines)
- `schemas/example-config.json` (reference implementation)

**Next:** Create tech stack presets (typescript-node, react-typescript, java-spring)

### 2025-11-16 - Tech Stack Presets Implementation
**Actions:**
- Created `presets/` directory
- Implemented `presets/typescript-node.json` for Node.js TypeScript projects
- Implemented `presets/react-typescript.json` for React TypeScript projects
- Implemented `presets/java-spring.json` for Java Spring Boot projects

**Preset Features:**
- Complete configurations ready for production use
- All presets use git with standard branch/commit patterns
- Tech-stack-specific test patterns and naming conventions
- Appropriate quality tools for each stack
- Pre-commit hooks configured for each workflow

**typescript-node**:
- Runtime: Node.js 18.x with nvm
- Test: Jest with TypeScript
- Quality: ESLint, Prettier, TypeScript type checking
- Test patterns: Focus on pure functions, business logic, utilities
- Hooks: format → lint → type-check → test → build

**react-typescript**:
- Runtime: Node.js 18.x with nvm
- Test: Jest with React Testing Library
- Quality: ESLint, Prettier, TypeScript type checking
- Test patterns: Focus on hooks, utilities, business logic (skip UI components)
- Test command: `--watchAll=false` for CI compatibility

**java-spring**:
- Runtime: Java 17
- Test: JUnit with Gradle
- Quality: Checkstyle, Google Java Format (Spotless)
- Test patterns: Focus on services, repositories, domain logic
- Build tool: Gradle

**Files Created:**
- `presets/typescript-node.json`
- `presets/react-typescript.json`
- `presets/java-spring.json`

**Next:** Create validation script or continue with Phase 2 config reader

### 2025-11-16 - Validation Script and Documentation
**Actions:**
- Created `scripts/validate-config.sh` for config validation
- Implemented multi-validator support (ajv-cli, check-jsonschema, Python jsonschema, jq)
- Fixed `set -e` issue that prevented fallback validation
- Tested validation with valid and invalid configs
- Created comprehensive documentation: `docs/configuration.md` (600+ lines)
- Added shellcheck pre-commit hook
- Created hook installation script: `scripts/install-hooks.sh`

**Validation Script Features:**
- Tries validators in order of preference (ajv-cli → check-jsonschema → Python jsonschema → jq)
- Falls back to basic jq validation if no schema validator available
- Clear error reporting with color-coded output
- Proper exit codes for CI/CD integration
- Validates JSON syntax and required fields
- Provides installation instructions for validators

**Documentation Coverage:**
- Quick start with presets
- Configuration structure and modules
- Detailed module documentation (vcs, runtime, test, quality)
- Preset system with examples
- Custom configuration examples
- Validation guide
- Troubleshooting section
- Future module roadmap

**Pre-Commit Hook:**
- Runs shellcheck on all shell scripts (.sh, .bash)
- Skips gracefully if shellcheck not installed
- Clear error reporting
- Only checks staged files

**Files Created:**
- `scripts/validate-config.sh` - Config validation script (200+ lines)
- `docs/configuration.md` - Configuration guide (600+ lines)
- `hooks/pre-commit` - Shellcheck pre-commit hook
- `scripts/install-hooks.sh` - Hook installation script

**Testing:**
- Validated example-config.json successfully
- Tested missing required field error (name)
- Tested invalid JSON syntax error
- Confirmed proper exit codes (0 = valid, 1 = invalid)

**Phase 1 Complete:**
- ✓ JSON Schema with Phase 1 modules (vcs, runtime, test, quality)
- ✓ Three tech stack presets (typescript-node, react-typescript, java-spring)
- ✓ Validation script with multi-validator support
- ✓ Comprehensive documentation
- ✓ Pre-commit hook for shell script quality

**Next:** Update GitHub issue, test in target projects, or continue with Phase 2 modules

### 2025-11-16 - GitHub Issue Updated with Phase 1 Completion
**Actions:**
- Updated GitHub issue #6 with Phase 1 completion status
- Marked all acceptance criteria as complete
- Updated files created section with all deliverables
- Documented next steps: integration testing in target projects

**Phase 1 Summary:**
- 885 lines of code across 5 files
- JSON Schema with 4 modules (vcs, runtime, test, quality)
- 3 production-ready presets
- Multi-validator validation script
- 600+ lines of documentation
- Pre-commit hooks for shell script quality

**Next:** Test in target projects (simple-D365, Portal-D365-WebApp, portal-D365)

### 2025-11-16 - Integration Testing Complete
**Actions:**
- Researched tech stacks for all three target projects
- Created test configurations for each project
- Validated all test configs with validation script
- Manually installed and tested config in simple-D365
- Documented findings and recommendations

**Projects Analyzed:**
1. **simple-D365** (TypeScript Node.js) - typescript-node preset
   - Node >= 20.0.0, TypeScript 5.3
   - Monorepo with applications/d365-api-client
   - No test framework currently configured

2. **Portal-D365-WebApp** (React TypeScript) - react-typescript preset
   - React 18.2.0, TypeScript 4.7.4, Node >= 20.9.0
   - Jest + React Testing Library
   - Redux Toolkit, Tailwind CSS

3. **portal-D365** (Java Spring Boot) - java-spring preset
   - Spring Boot 3.5.7, Java 17, Gradle
   - JUnit testing, Jacoco coverage

**Test Results:**
- ✓ All three configs validated successfully
- ✓ Perfect preset mapping for all projects
- ✓ Override mechanism works as expected
- ✓ Manual installation in simple-D365 successful
- ⚠️ Configs define desired state (scripts may not exist yet)

**Key Findings:**
1. All target projects map cleanly to existing presets
2. Node projects use 20.x, not 18.x (preset default)
3. Config can represent desired state for project initialization
4. Basic jq validation requires explicit fields (doesn't merge extends)

**Files Created:**
- `test-configs/simple-d365-config.json`
- `test-configs/portal-d365-webapp-config.json`
- `test-configs/portal-d365-config.json`
- `test-configs/README.md` - Project analysis and findings
- `test-configs/TESTING-RESULTS.md` - Complete test results

**Recommendations:**
1. Update Node presets to default to 20.x
2. Make test module optional in schema
3. Document extends+validation interaction
4. Use findings for Phase 2 initialization design

**Next:** Commit testing work, update GitHub issue, or begin Phase 2

### 2025-11-16 - GitHub Issue Updated with Integration Testing Results
**Actions:**
- Updated GitHub issue #6 with complete Phase 1 status
- Added integration testing results section
- Documented all three project tests
- Listed key findings and recommendations
- Updated acceptance criteria (all complete)
- Added testing files to deliverables

**Phase 1 Fully Complete:**
- 7 commits on feature branch
- 1,351+ lines of code added
- 11 files created (schemas, presets, scripts, hooks, docs, tests)
- 3 target projects tested successfully
- All acceptance criteria met

**Next:** Ready for Phase 2 or can refine presets based on testing feedback

## Key Decisions

### Decision 1: Use JSON Schema for Validation
**Reason**: Industry standard, good tooling support, clear validation errors
**Impact**: Enables robust config validation, prevents user errors
**Alternative**: Custom validation logic (more complex, less standard)

### Decision 2: Assume Git But Structure for Swappability
**Reason**: All target projects use git, but good architecture allows future expansion
**Impact**: VCS config has type field ("git") with git-specific subsection, allowing svn/mercurial later
**Alternative**: Hard-code git assumptions (simpler now, harder to change later)

### Decision 3: Modularize Tooling Configuration
**Reason**: Different projects use different tools; config must adapt to tech stacks
**Impact**: Config schema broken into 10 modules (vcs, package, build, test, quality, verify, dev, deploy, workitem, runtime)
**Alternative**: Monolithic config (harder to understand, maintain, extend)

### Decision 4: Require Plugin Initialization
**Reason**: Plugin needs project-specific context to support skills, agents, and commands effectively
**Impact**: Projects must run initialization step to set up config, context files, and structure
**Alternative**: Manual setup (error-prone, inconsistent, poor user experience)
**Implementation**: `/init` command or similar to bootstrap project

## Learnings

### About Configuration Systems
- JSON schema provides strong validation
- Preset pattern enables reusability
- Merge strategy allows customization

### About Development Workflow Optimization
- Many safe commands (read-only, non-mutating, non-secret) can be configured in Claude settings for approval-free execution
- Examples: `git status`, `git branch --show-current`, `git log`, `git diff`, `ls`, `cat`, `jq`, `grep`, validation commands
- This significantly speeds up development by reducing approval prompts
- Commands should be reviewed for safety (no mutations, no secret access) before adding to auto-approve list

## Files Created

### Schemas
- `schemas/config.schema.json` - JSON Schema definition (270+ lines)
- `schemas/example-config.json` - Example configuration

### Presets
- `presets/typescript-node.json` - TypeScript Node preset
- `presets/react-typescript.json` - React TypeScript preset
- `presets/java-spring.json` - Java Spring preset

### Scripts
- `scripts/validate-config.sh` - Config validation script (200+ lines)
- `scripts/install-hooks.sh` - Git hooks installation script

### Hooks
- `hooks/pre-commit` - Shellcheck pre-commit hook

### Documentation
- `docs/config-schema-design.md` - Design document (450+ lines)
- `docs/configuration.md` - Configuration guide (600+ lines)

## Next Steps

### Immediate (Phase 1)
1. Create schemas/ directory
2. Define JSON schema structure
3. Create initial schema file

### Preset Development (Phase 2)
4. Create presets/ directory
5. Implement typescript-node preset
6. Implement react-typescript preset
7. Implement java-spring preset

### Validation (Phase 3)
8. Create validation script
9. Test with valid configs
10. Test with invalid configs
11. Refine error messages

### Documentation (Phase 4)
12. Write configuration guide
13. Add examples for each preset
14. Document customization options
15. Test documentation accuracy
