# Example Context Files

These are starter templates for your `.claude/context/` directory.

## Two-Tier Pattern

Each topic has TWO files:

| YAML File | Markdown File | Purpose |
|-----------|---------------|---------|
| `project.yml` | `project.md` | Project identity, tech stack, architecture |
| `behavior.yml` | `behavior.md` | AI behavior rules and assessment stance |
| `git.yml` | `git.md` | Git conventions, commit format, PR rules |
| `testing.yml` | `testing.md` | Testing patterns, what to test/skip |

**How it works:**
- `*.yml` files contain compact assertions (injected by claude-mantra)
- `*.md` files contain detailed examples and templates (read on-demand)
- Each `.yml` file references its companion `.md` file in the header

## Usage

Copy the files you need to your project:

```bash
# Copy all examples (both .yml and .md files)
cp -r examples/context/* .claude/context/

# Or copy a specific topic (always copy both files)
cp examples/context/behavior.yml examples/context/behavior.md .claude/context/
```

**Important:** Always copy both the `.yml` and `.md` file for each topic. The `.yml` alone is incomplete.

## Customization Tips

1. **Delete unused sections** - Remove anything not relevant
2. **Add domain terms** - Define project-specific vocabulary
3. **Be specific** - Replace generic examples with your actual patterns
4. **Keep it small** - Aim for 10-30 lines per file
5. **Update regularly** - Prune obsolete rules

## See Also

- [FORMAT.md](../../FORMAT.md) - Full specification
- [README.md](../../README.md) - Plugin documentation
