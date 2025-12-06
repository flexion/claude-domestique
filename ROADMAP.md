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
| **3. Prevent Context Drift** | ✅ **DELIVERED** | Pre-commit hook (blocks without session update), session update prompter (soft nudges), drift detector (scope + behavioral monitoring), periodic refresh (context maintenance). Phase 3B, PRs #25-28. | Production testing, refinement based on usage |
| **4. Share Knowledge** | ✅ **DELIVERED** | Sessions in Git (`.claude/sessions/`), branch metadata (`.claude/branches/`). Phase 1. Enforced by Phase 3B hooks. | Production usage |

---

## Phases

### Foundation ✅ COMPLETE

**Phase 1: Core Plugin Structure** (PR #2, #9)
- Plugin manifest, universal scripts, basic commands
- Session/branch mapping system
- Tested across 3 projects (TypeScript, React, Java)

**Phase 2: Config System** (PR #7, #11, #13, #15, #17, #18)
- Tech stack presets (typescript-node, react-typescript, java-spring)
- `/init` command with auto-detection
- Config reader, verification runner
- Config-aware commands

### Core Value Delivery 🔄 IN PROGRESS

**Phase 3A: Core Values Injection** ✅ COMPLETE (PR #21)
- Created plugin `context/` directory with core YAML (behavior, git, sessions, README)
- Created markdown elaborations (assistant-preferences, git-workflow, session-workflow)
- Updated context-loader skill for two-tier loading (plugin core → project custom)
- **Impact**: Every project now gets core values automatically. Projects only add project-specific context.

**Phase 3B: Session Enforcement** ✅ COMPLETE (PRs #25, #26, #27, #28, #39)
- **Goal**: Actively enforce session updates, prevent drift
- **Deliverables**:
  - Pre-commit hook using pre-commit framework (blocks commits without session updates)
  - Session update prompter skill (soft nudges after milestones)
  - Drift detector skill (monitors scope AND behavioral drift - sycophantic, research avoidance, quality shortcuts, workflow violations)
  - Context-refresh agent with prompt-submit hook (auto-reloads context every N interactions, default 20). Extracted from context-loader in #38/#39 for separation of concerns.
- **Impact**: Complete session enforcement system. Hard enforcement at commit time, soft prompts during work, dual drift monitoring (what + how), automatic context refresh in long sessions.

**Phase 3C: Work-Item Automation** 📋 FUTURE
- **Goal**: Automate GitHub/Azure DevOps work-item maintenance
- **Approach**: API integration, auto-detect issue from branch, fetch details, auto-populate session, bidirectional sync
- **Impact**: Zero manual work-item management. Sessions auto-created from issues.

### Polish & Migration 📦 FUTURE

**Phase 3D: /init Enforcement** ✅ COMPLETE (Feature #35, v0.1.2)
- **Goal**: Prevent drift in /init execution, especially CLAUDE.md backup step
- **Deliverables**:
  - BLOCKING execution checklist with TodoWrite requirement
  - Step 7 rewritten with verification-first approach (check → backup → verify → migrate)
  - DO NOT SKIP warnings and BLOCKING keywords
  - Autonomous verification commands (REQUIRED for each step)
  - Self-check requirements in thinking blocks
  - CLAUDE.md execution checklist for /init pattern
- **Impact**: LLM cannot skip Step 7 backup based on content interpretation. Verification-first prevents assumptions.

**Phase 4: Additional Hooks**
- Pre-PR verification, prompt-submit pattern matching

**Phase 5: Migration Tools**
- Auto-detect existing setups, `/migrate` command, preserve sessions

**Phase 6: Documentation**
- Guides, examples, v1.0.0 release

---

## Current Focus

**Last Completed**: Feature #38 - Context Refresh Agent (v0.1.3, PR #39)
**Achievement**: 3 of 4 core purposes DELIVERED. Context refresh now has dedicated agent with testable Node.js implementation (19 unit tests), prompt-submit hook for tracking, and canary visibility.
**Next Decision**: Phase 3C (Automate Shit-Work) OR Phase 4 (Additional Hooks)

---

## Key Learnings & Pivots

**After Phase 2**: Realized we were building infrastructure without delivering core value. Conducted core purpose review (CORE-PURPOSE-REVIEW.md). Pivoted from feature-driven to purpose-driven development.

**Phase 3A Insight**: Plugin wasn't INJECTING core values - projects had to create their own behavior.yml. Fixed by moving core context into plugin. Now every project gets core values automatically.

**Roadmap Flexibility**: Each feature may change direction. Evaluate this roadmap at beginning and end of every feature. Update based on learnings.

---

## Decision Log

**2024-11-16**: Pivoted from infrastructure focus to core purpose delivery. Reorganized phases around 4 core purposes. Prioritized value injection (3A) → enforcement (3B) → automation (3C).

**2024-11-16**: Renamed IMPLEMENTATION-PLAN.md → ROADMAP.md. Made succinct, living document evaluated each feature.

**2024-11-17**: Added /init enforcement (v0.1.2, #35). Verification-first approach prevents CLAUDE.md backup skipping. BLOCKING keywords + autonomous verification + self-checks ensure literal execution.

**2024-12-02**: Extracted context refresh from context-loader skill into dedicated agent (#38, v0.1.3). Separation of concerns: agent handles scheduling/state, skill handles loading. Added testable Node.js implementation with 19 unit tests, prompt-submit hook for interaction tracking, and canary indicator showing countdown to next refresh. Default interval reduced from 50 to 20 for earlier drift detection.
