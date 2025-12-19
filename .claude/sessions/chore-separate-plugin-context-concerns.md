# Session: Separate Plugin Context Concerns

**Branch**: `chore/separate-plugin-context-concerns`
**Type**: Chore (refactoring)
**Started**: 2025-12-19

## Objective
Better separation of concerns between plugins, especially around context ownership and loading.

## Plan

### Phase 1: Document Context Ownership
Add ownership section to `CLAUDE.md`:

| Plugin | Domain | Files |
|--------|--------|-------|
| mantra | AI behavior, format conventions | behavior.yml, format-guide.yml, context-format.yml |
| memento | Session management | sessions.yml |
| onus | Git operations, work items | git.yml, work-items.yml |

### Phase 2: Consolidate Git Context in Onus
- `onus/context/work-items.yml` - Remove duplicated format rules (lines 9-32), reference git.yml instead
- `onus/context/git.yml` - Add cross-reference to work-items.yml

### Phase 3: Decouple Mantra from Sibling Names
1. Add `contextFamily: "domestique"` to plugin manifests
2. Refactor `mantra/hooks/context-refresh.js`:
   - Remove hardcoded `PLUGIN_FAMILY` constant
   - Add manifest-based `getPluginContextFamily()`
   - Update `isPluginFamilyMember()` to use manifests
3. Update tests

### Phase 4: Verify
Run all test suites

## Files to Modify
- `CLAUDE.md`
- `onus/context/work-items.yml`
- `onus/context/git.yml`
- `mantra/.claude-plugin/plugin.json`
- `memento/.claude-plugin/plugin.json`
- `onus/.claude-plugin/plugin.json`
- `mantra/hooks/context-refresh.js`
- `mantra/hooks/__tests__/context-refresh.test.js`

## Progress
- [x] Created branch and session
- [x] Document context ownership in CLAUDE.md
- [x] Consolidate git context in onus
- [x] Add contextFamily to manifests
- [x] Refactor mantra context-refresh.js
- [x] Update tests
- [x] Run all test suites (mantra: 82, memento: 86, onus: 49 - all pass)

## Notes
- This is a self-referential project: we're modifying the plugins that are also running
- Changes won't take effect until plugins are reinstalled
