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

## Learnings

### About Configuration Systems
- JSON schema provides strong validation
- Preset pattern enables reusability
- Merge strategy allows customization

## Files Created

### Schemas
- `schemas/config.schema.json` - JSON Schema definition

### Presets
- `presets/typescript-node.json` - TypeScript Node preset
- `presets/react-typescript.json` - React TypeScript preset
- `presets/java-spring.json` - Java Spring preset

### Scripts
- `scripts/validate-config.sh` - Config validation script

### Documentation
- `docs/configuration.md` - Configuration guide

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
