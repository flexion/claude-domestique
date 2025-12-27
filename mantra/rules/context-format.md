---
# MANTRA-MANAGED: This file is overwritten by /mantra:init --force
# To customize: create your own rule file in .claude/rules/
#
# Context Module Format - Compact Reference

companion: .claude/context/context-format.md
type: reference

## Purpose
what: modular context injection system for Claude Code
goal: keep Claude aligned with project conventions across long sessions
problem: context drift (Claude forgets guidance as conversations grow)

## File Types
yml: compact assertions, rules (machine-optimized, token-efficient)
md: detailed examples, templates, edge cases (human-readable, on-demand)

## Two-Tier Pattern
tier-1-yml: always loaded on refresh (small, frequent)
tier-2-md: loaded on-demand when Claude needs depth (large, occasional)
pairing: topic.yml + topic.md (yml for rules, md for elaboration)
companion-key: 'companion: <filename>.md' (structured reference to md file)

## Loading Order
base: plugin provides default behavior (context/)
project: extends via .claude/context/*.yml (additive)
fallback: CLAUDE.md if no .claude/context exists

## File Categories
behavior: AI behavior rules (skeptical-first, evidence-based)
workflow: git conventions, session management
project: domain-specific context (architecture, requirements)
custom: project-defined extensions

## Directory Structure
plugin-root:
  context/: base behavior (shipped with plugin)
project:
  .claude/context/: project extensions
  CLAUDE.md: legacy/simple context (warn about confusion)

## Token Efficiency
target: <1000 tokens per yml file
format: key-value, operators (→ > |), minimal prose
avoid: redundancy, prose, complete sentences

## Refresh Behavior
trigger: session-start, periodic (configurable interval)
inject: all *.yml files from base + project
skip: *.md files (loaded on-demand only)
---
