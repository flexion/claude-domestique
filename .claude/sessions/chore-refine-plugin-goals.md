# Session: refine-plugin-goals

## Details
- **Branch**: chore/refine-plugin-goals
- **Type**: chore
- **Created**: 2025-12-22
- **Status**: complete

## Goal
Refine plugin goals to be outcome-focused (WHAT they achieve for developers) rather than implementation-focused (HOW they work), using Flexion fundamentals as the lens.

## Session Log
- 2025-12-22: Session created
- 2025-12-22: Discussed Flexion fundamentals alignment for each plugin
- 2025-12-22: Updated root README.md with Flexion fundamentals framing
- 2025-12-22: Updated mantra/README.md, memento/README.md, onus/README.md with Flexion fundamentals
- 2025-12-22: Updated docs/research/*-analysis.md files with Flexion Fundamentals Alignment sections
- 2025-12-22: Rewrote research recommendations with goal-focused, simplest-approach analysis
- 2025-12-22: Added "reliability > simplicity" principle for memento (hooks essential)
- 2025-12-22: Discovered CLAUDE.md instruction pattern from portal-D365 - best of all worlds for mantra

## Key Decisions
- Keep original clever taglines (movie references, Latin)
- Add "Flexion Fundamentals" subsection after intro in each README
- Each plugin maps to specific fundamentals based on what it enables
- Research docs reframed: "what delivers value?" not "what can it do?"
- Simplest approach: delegate to native, keep only unique plugin value
- **memento: reliability > simplicity** — hooks essential because users don't invoke skills reliably
- **mantra: CLAUDE.md instruction pattern** — `/mantra:init` adds read instructions to CLAUDE.md pointing to plugin's YML files; keeps 89% token savings; auto-updates when plugin updates; no hooks needed for loading

## Flexion Fundamentals Mapping
### mantra
- Be skeptical and curious
- Never compromise on quality
- Listen with humility

### memento
- Lead by example
- Empower customers to adapt
- Design as you go

### onus
- Never compromise on quality
- Lead by example
- Empower customers to adapt

## Files Changed
- `README.md` - Added Flexion fundamentals to each plugin description
- `mantra/README.md` - Added Flexion Fundamentals subsection
- `memento/README.md` - Added Flexion Fundamentals subsection
- `onus/README.md` - Added Flexion Fundamentals subsection
- `docs/research/mantra-native-features-analysis.md` - Goal-focused rewrite with CLAUDE.md instruction pattern
- `docs/research/memento-native-features-analysis.md` - Goal-focused rewrite with reliability principle
- `docs/research/onus-native-features-analysis.md` - Goal-focused rewrite with workflow glue focus

## Next Steps
1. Create PR
