# Chore: Installation Validation

## Goal
Validate how consumers will install and configure the mantra plugin in their projects.

## Status
Complete - PR #7 created

## Summary
Migrated from npm/npx approach to official Claude Code plugin format.

## Done
- [x] Research Claude Code hook distribution standards
- [x] Identify gap between current and official approach
- [x] Create plugin structure (.claude-plugin/, hooks/, scripts/, commands/)
- [x] Add /init slash command for scaffolding context files
- [x] Update README with plugin installation instructions
- [x] Test local plugin installation - SUCCESS
- [x] Commit and push changes
- [x] Create PR #7

## Files Changed
- `.claude-plugin/plugin.json` - plugin metadata (author: David Puglielli)
- `.claude-plugin/marketplace.json` - marketplace definition (flexion-mantra)
- `hooks/hooks.json` - hook definitions for SessionStart and UserPromptSubmit
- `scripts/context-refresh.js` - hook implementation (default interval: 20)
- `commands/init.md` - /init command scaffolds behavior.yml + stubs for memento/onus
- `.claude/hooks/context-refresh.js` - updated default interval to 20
- `README.md` - updated with plugin installation instructions

## Installation (for consumers)
```bash
/plugin marketplace add flexion/mantra
/plugin install mantra@flexion-mantra
/init
```

## PR
https://github.com/flexion/claude-domestique/tree/main/mantra/pull/7
