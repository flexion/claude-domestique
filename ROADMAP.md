# Roadmap - Claude Domestique

**Living Document**: Updated at beginning and end of each feature to reflect direction and learnings.

---

## Mission

Deliver on 4 core purposes:
1. **Inject Core Values** - Skepticism, quality, non-sycophantic behavior into every project
2. **Automate Shit-Work** - Maintain work-items across GitHub/Azure DevOps automatically
3. **Prevent Context Drift** - Keep AI aligned with project context over time
4. **Share Knowledge** - Track work in Git for sharing across contexts and developers

---

## Core Purpose Status

| Purpose | Status | How Delivered | Next |
|---------|--------|---------------|------|
| **1. Inject Core Values** | ✅ **DELIVERED** | Plugin `context/` with core YAML + markdown. Two-tier loading (plugin core → project custom). Phase 3A, PR #21. | Test in production projects |
| **2. Automate Shit-Work** | ❌ **NOT STARTED** | - | Phase 3C: GitHub/Azure DevOps API integration, auto-create sessions from issues, bidirectional sync |
| **3. Prevent Context Drift** | 🔄 **IN PROGRESS** | - | Phase 3B: Pre-commit hooks, session update prompts, drift detection |
| **4. Share Knowledge** | ✅ **DELIVERED** | Sessions in Git (`.claude/sessions/`), branch metadata (`.claude/branches/`). Phase 1. | Works, needs enforcement (Phase 3B) |

---

## Phases

### Foundation ✅ COMPLETE

**Phase 1: Core Plugin Structure** (PR #2, #9)
- Plugin manifest, universal scripts, basic commands
- Session/branch mapping system
- Tested across 3 projects (TypeScript, React, Java)

**Phase 2: Config System** (PR #7, #11, #13, #15, #17, #18)
- Tech stack presets (typescript-node, react-typescript, java-spring)
- `/plugin-init` command with auto-detection
- Config reader, verification runner
- Config-aware commands

### Core Value Delivery 🔄 IN PROGRESS

**Phase 3A: Core Values Injection** ✅ COMPLETE (PR #21)
- Created plugin `context/` directory with core YAML (behavior, git, sessions, README)
- Created markdown elaborations (assistant-preferences, git-workflow, session-workflow)
- Updated context-loader skill for two-tier loading (plugin core → project custom)
- **Impact**: Every project now gets core values automatically. Projects only add project-specific context.

**Phase 3B: Session Enforcement** 🎯 NEXT
- **Goal**: Actively enforce session updates, prevent drift
- **Approach**: Pre-commit hooks (block without session update), session update prompts, drift detection, periodic context refresh
- **Impact**: Cannot commit without updating session. Prompted after milestones. Alerted when drifting.

**Phase 3C: Work-Item Automation** 📋 FUTURE
- **Goal**: Automate GitHub/Azure DevOps work-item maintenance
- **Approach**: API integration, auto-detect issue from branch, fetch details, auto-populate session, bidirectional sync
- **Impact**: Zero manual work-item management. Sessions auto-created from issues.

### Polish & Migration 📦 FUTURE

**Phase 4: Additional Hooks**
- Pre-PR verification, prompt-submit pattern matching

**Phase 5: Migration Tools**
- Auto-detect existing setups, `/migrate` command, preserve sessions

**Phase 6: Documentation**
- Guides, examples, v1.0.0 release

---

## Current Focus

**Working On**: Phase 3B - Session Enforcement
**Next Task**: Create pre-commit hook to block commits without session updates
**Last Completed**: Phase 3A - Core Values Injection (PR #21)

---

## Key Learnings & Pivots

**After Phase 2**: Realized we were building infrastructure without delivering core value. Conducted core purpose review (CORE-PURPOSE-REVIEW.md). Pivoted from feature-driven to purpose-driven development.

**Phase 3A Insight**: Plugin wasn't INJECTING core values - projects had to create their own behavior.yml. Fixed by moving core context into plugin. Now every project gets core values automatically.

**Roadmap Flexibility**: Each feature may change direction. Evaluate this roadmap at beginning and end of every feature. Update based on learnings.

---

## Decision Log

**2024-11-16**: Pivoted from infrastructure focus to core purpose delivery. Reorganized phases around 4 core purposes. Prioritized value injection (3A) → enforcement (3B) → automation (3C).

**2024-11-16**: Renamed IMPLEMENTATION-PLAN.md → ROADMAP.md. Made succinct, living document evaluated each feature.
