# Test Configurations

This directory contains test configurations for validating the config schema and presets against real target projects.

## Projects

### 1. simple-D365
**Location:** `/Users/dpuglielli/github/flexion/simple-D365`
**Tech Stack:** TypeScript Node.js
**Preset:** `typescript-node`

**Details:**
- Node.js >= 20.0.0
- TypeScript 5.3
- No test framework currently configured
- Build tool: TypeScript compiler (tsc)
- Monorepo structure with multiple applications
- Primary app: `applications/d365-api-client` (Express API)

**Config:** `simple-d365-config.json`
- Extends typescript-node preset
- Customized for Node 20.x
- Added test patterns for API clients and Azure integration
- Test placement adapted for monorepo structure

### 2. Portal-D365-WebApp
**Location:** `/Users/dpuglielli/github/nucor/Portal-D365-WebApp`
**Tech Stack:** React TypeScript
**Preset:** `react-typescript`

**Details:**
- React 18.2.0
- TypeScript 4.7.4
- Node.js >= 20.9.0
- Create React App (react-scripts)
- Testing: Jest with React Testing Library
- State management: Redux Toolkit
- Styling: Tailwind CSS, Emotion

**Config:** `portal-d365-webapp-config.json`
- Extends react-typescript preset
- Customized for Node 20.x
- Added test patterns for Redux (reducers, selectors)
- Test command: `npm test -- --watchAll=false` for CI

### 3. portal-D365
**Location:** `/Users/dpuglielli/github/nucor/portal-D365`
**Tech Stack:** Java Spring Boot
**Preset:** `java-spring`

**Details:**
- Spring Boot 3.5.7
- Java 17
- Build tool: Gradle
- Testing: JUnit
- Coverage: Jacoco
- VCS: Git

**Config:** `portal-d365-config.json`
- Extends java-spring preset
- Java 17 runtime
- Gradle test commands
- Test patterns include controllers (different from preset default)
- Excludes external API tests

## Validation Results

All three configurations validated successfully:

```bash
./scripts/validate-config.sh test-configs/simple-d365-config.json
# ✓ Configuration is valid

./scripts/validate-config.sh test-configs/portal-d365-webapp-config.json
# ✓ Configuration is valid

./scripts/validate-config.sh test-configs/portal-d365-config.json
# ✓ Configuration is valid
```

## Preset Coverage

| Project | Preset Used | Match Quality | Customizations |
|---------|------------|---------------|----------------|
| simple-D365 | typescript-node | Excellent | Node 20.x, monorepo test paths |
| Portal-D365-WebApp | react-typescript | Excellent | Node 20.x, Redux patterns |
| portal-D365 | java-spring | Excellent | Include controllers in tests |

## Findings

### What Worked Well
1. **Preset Pattern**: All three projects mapped cleanly to existing presets
2. **Override Mechanism**: Each project needed minor customizations that worked via override
3. **Validation**: Schema validation caught missing required fields
4. **Tech Stack Coverage**: Our three presets cover all three target projects

### Areas for Improvement
1. **Extends Support**: Basic jq validation doesn't understand `extends` - requires full schema validator
2. **Node Version**: All Node projects use 20.x, not 18.x (preset default)
3. **Test Framework Detection**: simple-D365 doesn't have tests configured yet

### Recommendations
1. Update typescript-node and react-typescript presets to default to Node 20.x
2. Document that `extends` requires proper schema validator for full validation
3. Consider adding "no-tests" preset or making test module optional
4. Add migration guide for projects without existing test frameworks

## Next Steps

1. Manually install simple-d365-config.json in simple-D365 project
2. Verify config works with actual project structure
3. Test that preset values are appropriate for real development workflow
4. Document any issues or adjustments needed

## Related

- Issue #6: Implement config schema and tech stack presets
- Session: `.claude/sessions/6-config-schema.md`
- Presets: `presets/typescript-node.json`, `presets/react-typescript.json`, `presets/java-spring.json`
