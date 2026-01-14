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
rules/*.md: compact assertions in YAML frontmatter (machine-optimized, auto-injected)
context/*.md: detailed examples, templates, edge cases (human-readable, on-demand)

## Two-Tier Pattern
tier-1-rules: always loaded on refresh (frontmatter extracted from rules/*.md)
tier-2-context: loaded on-demand when Claude needs depth (context/*.md)
pairing: rules/topic.md + context/topic.md (rules for frontmatter, context for elaboration)
companion-key: 'companion: <filename>.md' (structured reference to context file)

## Loading Order
base: plugin provides default behavior (rules/)
project: extends via .claude/rules/*.md (additive)
fallback: CLAUDE.md if no .claude/rules exists

## File Categories
behavior: AI behavior rules (skeptical-first, evidence-based)
workflow: git conventions, session management
project: domain-specific context (architecture, requirements)
custom: project-defined extensions

## Directory Structure
plugin-root:
  rules/: rule files with YAML frontmatter (shipped with plugin)
  context/: companion docs (shipped with plugin)
project:
  .claude/rules/: project rule overrides
  .claude/context/: project companion docs
  CLAUDE.md: legacy/simple context (warn about confusion)

## Token Efficiency
target: <1000 tokens per rule file frontmatter
format: key-value, operators (→ > |), minimal prose
avoid: redundancy, prose, complete sentences

## Refresh Behavior
trigger: session-start, periodic (configurable interval)
inject: frontmatter from all rules/*.md files
skip: context/*.md files (loaded on-demand only)
---
