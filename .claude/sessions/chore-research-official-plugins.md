# Session: Research Official Claude Code Plugins

**Issue**: N/A (chore)
**Branch**: chore/research-official-plugins
**Type**: chore
**Created**: 2025-12-20
**Status**: complete

## Goal
Research the official Claude Code plugins from Anthropic's marketplace and analyze overlap, opportunities for leverage, and synergies with claude-domestique's goals.

## Approach
1. Fetch and analyze each official plugin from https://github.com/anthropics/claude-code/tree/main/plugins
2. Document structure, capabilities, and patterns used
3. Identify overlap with claude-domestique plugins (memento, mantra, onus)
4. Recommend opportunities for integration or leverage

---

## Research Findings

### Official Plugins (14 total)

| Plugin | Purpose | Relevance to claude-domestique |
|--------|---------|-------------------------------|
| **commit-commands** | Git workflow (/commit, /commit-push-pr, /clean_gone) | High - overlaps with onus |
| **code-review** | PR review with 4 agents | Medium - could complement onus |
| **feature-dev** | 7-phase feature workflow | Low - different scope |
| **plugin-dev** | Plugin development toolkit | High - meta-relevant for us |
| **hookify** | Custom hook creation via markdown | Medium - pattern overlap with mantra |
| **security-guidance** | Security monitoring hooks | Low - different focus |
| **pr-review-toolkit** | 6 specialized review agents | Medium - could complement onus |
| **ralph-wiggum** | Autonomous iterative loops | Low - different scope |
| **agent-sdk-dev** | Agent SDK development | Low - SDK focus |
| **claude-opus-4-5-migration** | Model migration helper | Low - temporary utility |
| **explanatory-output-style** | Educational insights | Low - output style |
| **frontend-design** | Frontend design guidance | Low - domain-specific |
| **learning-output-style** | Interactive learning mode | Low - output style |

---

## Detailed Overlap Analysis

### 1. onus vs commit-commands (HIGH OVERLAP)

**commit-commands provides:**
- `/commit` - auto-generate commit message from changes
- `/commit-push-pr` - complete workflow: commit → push → create PR
- `/clean_gone` - cleanup stale branches

**onus provides:**
- Issue fetching from GitHub/JIRA/Azure DevOps
- Work item context injection
- Commit/PR format enforcement based on issue
- Issue lifecycle tracking (branch checkout → In Progress, etc.)

**Analysis:**
- commit-commands is simpler but lacks issue integration
- onus has deeper work-item awareness but heavier implementation
- Key difference: onus ties commits/PRs to tracked issues; commit-commands is standalone

**Opportunities:**
1. **Leverage**: onus could use commit-commands patterns for the git mechanics
2. **Differentiate**: onus's value-add is the issue tracking integration
3. **Complement**: could work together (commit-commands for mechanics, onus for context)

---

### 2. mantra vs hookify (PATTERN OVERLAP)

**hookify provides:**
- Markdown-based rule configuration
- Pattern matching (regex) on tool use
- Block/warn actions for specific patterns
- Easy enable/disable without restart

**mantra provides:**
- Periodic context refresh to prevent drift
- Two-tier context system (yml compact + md detailed)
- Behavioral guidance injection
- Counter-based refresh intervals

**Analysis:**
- hookify is reactive: catches specific bad patterns as they happen
- mantra is proactive: prevents drift by re-injecting guidance
- hookify uses PreToolUse hook; mantra uses UserPromptSubmit

**Opportunities:**
1. **Complement**: Use together - mantra for continuous alignment, hookify for hard blocks
2. **Adopt pattern**: mantra could adopt hookify's markdown config pattern for rules
3. **Share config**: Both could share a `.claude/` config pattern

---

### 3. memento (UNIQUE - NO EQUIVALENT)

**memento provides:**
- Session persistence across conversation resets
- Branch ↔ session mapping
- Work context tracking (goal, approach, log, decisions)
- Session file templates

**Official plugins don't have:**
- Session tracking
- Context persistence between conversations
- Work history logging

**Analysis:**
- memento fills a genuine gap in the official plugin ecosystem
- Session persistence is valuable for long-running work
- Could become a candidate for official adoption

---

### 4. Architecture Patterns Observed

**Official plugins use:**
- `commands/*.md` - Markdown files with YAML frontmatter for slash commands
- `agents/*.md` - Markdown agent definitions with system prompts
- `skills/*.md` - Reusable skill documentation
- `hooks/` - Shell scripts or Python for hook implementations
- `${CLAUDE_PLUGIN_ROOT}` - Portable path variable

**claude-domestique uses:**
- `hooks/*.js` - JavaScript hook implementations
- `context/*.yml` - Compact context files
- `commands/*.md` - Markdown skills (similar pattern)
- `templates/` - Scaffolding templates

**Pattern differences:**
1. Official plugins favor Python/shell hooks; we use Node.js
2. Official plugins use more markdown-based configuration
3. We have a two-tier yml/md context system they don't

---

## Key Recommendations

### Immediate Opportunities

1. **Adopt plugin-dev patterns** for our own development
   - Use their validation scripts
   - Consider their agent architecture

2. **Review hookify's markdown config pattern**
   - Could simplify mantra's rule configuration
   - YAML frontmatter + markdown body is elegant

3. **Consider pr-review-toolkit integration**
   - onus could suggest running code-review agents
   - Complement work-item tracking with quality checks

### Strategic Positioning

1. **memento is unique** - emphasize session persistence as differentiator
2. **onus has deeper integration** - issue tracking is our value-add over commit-commands
3. **mantra's drift prevention** - complements hookify's pattern blocking

### Potential Contributions

1. Could propose session persistence to official plugins
2. Could propose work-item integration patterns
3. Could share context refresh approach

### Future Strategic Considerations (not actioned)

1. **memento as contribution candidate** - Session persistence is unique in the ecosystem. Could propose to Anthropic for official adoption.
2. **Marketplace listing** - Should claude-domestique be listed in the official Claude Code marketplace?
3. **Plugin family pattern** - Our three-plugin-family pattern (memento + mantra + onus) could be a model for others.

---

## Session Log
- 2025-12-20: Session created
- 2025-12-20: Fetched and analyzed 10+ official plugins
- 2025-12-20: Documented overlap analysis and recommendations
- 2025-12-20: Created #54 to track conformance decisions
- 2025-12-20: Evaluated hookify - recommend bundling enforcement into onus
- 2025-12-20: Created #55 for pr-review-toolkit integration consideration

## Key Decisions
- Focus on integration opportunities rather than replacement
- memento's session persistence is our unique value
- onus should maintain issue-tracking depth over simple git automation
- **Keep Node.js for hooks** - Claude Code requires Node.js anyway, so no added dependency; consistent toolchain

## Files Changed
- .claude/sessions/chore-research-official-plugins.md (this file)
- .claude/branches/chore-research-official-plugins (metadata)

## Next Steps
- [x] Review findings with user
- [x] Prioritize specific integration opportunities
- [x] Consider creating issues for actionable improvements → #54, #55
- [ ] Decide on architectural pattern adoption (in #54)
- [x] Commit and close this research session → PR #56
