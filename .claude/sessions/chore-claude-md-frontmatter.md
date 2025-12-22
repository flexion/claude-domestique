# Session: claude-md-frontmatter

## Details
- **Branch**: chore/claude-md-frontmatter
- **Type**: chore
- **Created**: 2025-12-22
- **Status**: in-progress

## Goal
Explore how frontmatter in project CLAUDE.md could control context loading.
Expanded to: comprehensive analysis of mantra vs native Claude Code features.

## Session Log
- 2025-12-22: Initial research on frontmatter
- 2025-12-22: Deep analysis of native features (statusline, memory, hooks)

## Key Findings

### Native Features Cover Most Goals
1. **Memory system** - CLAUDE.md + .claude/rules/ auto-loaded
2. **Path-scoped rules** - Frontmatter with `paths:` field in .claude/rules/
3. **Status line** - Rich JSON input with context_window usage
4. **SessionStart(compact)** - Fires AFTER compaction with `source: "compact"`

### Critical Insight: SessionStart(compact)
When compaction happens, SessionStart fires with `source: "compact"`. This means:
- Context can be re-injected automatically after compaction
- Periodic refresh (every N prompts) may be UNNECESSARY
- mantra's core value proposition needs validation

### What mantra Uniquely Provides
1. **Sibling plugin discovery** - No native equivalent
2. **YAML compactness** - vs markdown rules (token efficiency)
3. **Behavioral rules packaging** - Could move to ~/.claude/rules/

### What Native Does Better
1. **Path-scoped rules** - Frontmatter in .claude/rules/*.md
2. **Token usage display** - context_window in status line JSON
3. **Hierarchical memory** - Enterprise → Project → User → Local

## Files Changed
- `docs/research/claude-md-frontmatter.md` - Initial frontmatter research
- `docs/research/mantra-native-features-analysis.md` - mantra gap analysis
- `docs/research/memento-native-features-analysis.md` - memento gap analysis
- `docs/research/onus-native-features-analysis.md` - onus gap analysis

## Key Conclusions

### mantra
- Native covers ~70% of goals
- SessionStart(compact) may make periodic refresh unnecessary
- Unique value: sibling plugin discovery, YAML compactness

### memento
- Native sessions are **transcripts**, memento provides **documentation**
- Fundamentally different: raw JSONL vs human-readable markdown
- Unique value: git-committed, branch-organized, team-shareable, structured
- Validated by similar project: [claude-sessions](https://github.com/iannuttall/claude-sessions)

### onus
- Native `gh` CLI and MCPs provide raw capability
- onus provides **workflow automation** (convenience layer)
- Unique value: branch→issue auto-detect, session integration, multi-platform abstraction, acceptance criteria tracking
- Consider: delegate API calls to gh/MCPs, focus on workflow

## Next Steps
1. **mantra**: Validate SessionStart(compact) behavior
2. **mantra**: Consider migrating status display to native statusline
3. **memento**: Keep as-is (documentation layer is unique value)
4. **memento**: Consider transcript mining for auto-population
5. **onus**: Keep workflow automation, consider using gh/MCPs for fetching
6. **All**: Document native features users should know about
