---
name: init
description: Use when setting up onus in a project for the first time, when no .onus/config.json issue-tracker configuration exists yet, when moving onus settings out of a legacy .claude/config.json, or when the user asks to configure or reconfigure their issue tracker.
argument-hint: "[--platform github|jira|azure] [--force] [--migrate]"
---

# Initialize Onus Configuration

Set up `.onus/config.json` with onus configuration for work item tracking. The file holds onus settings as top-level keys and is read the same way by Claude Code and Codex.

Older projects keep onus settings in the `onus` (or `workItem`) section of `.claude/config.json`. That legacy section is still read, but only while `.onus/config.json` does not exist.

## Task

### Step 0: Check Current Config

Resolve `../../scripts/config.js` relative to this `SKILL.md` and run it with Node from the project root:

```bash
node <resolved-plugin-root>/scripts/config.js
```

It prints `{ source, path, config, error }`:

- `source: "onus"` — `.onus/config.json` already exists. Re-run init only if the user asked to reconfigure, and pass `--force`.
- `source: "onus"` with `error` set — the file exists but is unusable. Report the error. If the user asked to repair or reconfigure, continue with `--force`; the error does not block an explicit `--force`.
- `source: "legacy"` — settings live in `.claude/config.json`. Offer `--migrate` (Step 2) rather than writing defaults over them. A migration skips Step 1 and Step 3: the copied settings, including any custom `commitFormat`, are kept as they are.
- `source: "none"` — nothing configured yet; continue.

### Step 1: Detect Existing Commit Patterns

Before creating config, analyze recent commits to detect existing conventions:

```bash
git log --oneline -30
```

Look for these common patterns:

| Pattern | Example | Format String |
|---------|---------|---------------|
| Issue number prefix | `#42 - add feature` | `{number} - {description}` |
| Conventional commits | `feat(auth): add login` | `{type}({scope}): {description}` |
| JIRA style | `[PROJ-123] fix bug` | `[{project}-{number}] {description}` |
| Semantic | `fix: resolve issue` | `{type}: {description}` |
| Chore prefix | `chore - update deps` | `chore - {description}` |

If a clear pattern emerges (>50% of commits), note it for Step 3.

### Step 2: Run Init Script

Resolve `../../scripts/init.js` relative to this `SKILL.md`, then run it with Node to create base configuration. Pass through any requested `--platform` or `--force` arguments:

```bash
node <resolved-plugin-root>/scripts/init.js [--platform github|jira|azure] [--force]
```

The script auto-detects GitHub owner/repo from the git remote.

To move existing settings out of a legacy `.claude/config.json` instead, run:

```bash
node <resolved-plugin-root>/scripts/init.js --migrate [--force]
```

Migration copies the `onus` (or `workItem`) section verbatim to `.onus/config.json` and does not modify `.claude/config.json`. Once `.onus/config.json` exists the legacy section is ignored; tell the user they can delete it by hand. Migration refuses to replace an existing `.onus/config.json` unless `--force` is given.

**Stop after Step 2** if you ran `--migrate`, or if the script reports that it skipped. Do not apply Step 3 edits in either case; the existing config stays unchanged.

## Platforms

Specify the work item platform (defaults to `github`):

- **github** - GitHub Issues (auto-detected from git remote)
- **jira** - JIRA (requires manual host/project configuration)
- **azure** - Azure DevOps (requires manual org/project configuration)

## What It Does

1. Detects GitHub owner/repo from git remote URL
2. Creates `.onus/config.json` with onus settings as top-level keys
3. Sets default commit/branch formats
4. Never writes to `.claude/config.json`
5. Skips when `.onus/config.json` exists, or when legacy onus settings exist and could be migrated, unless `--force` is given
6. With `--force`, merges over a valid `.onus/config.json` and replaces an unusable one

## Generated Config

`.onus/config.json`:

```json
{
  "platform": "github",
  "github": {
    "owner": "<detected>",
    "repo": "<detected>"
  },
  "commitFormat": {
    "issue": "{number} - {verb} {description}",
    "chore": "chore - {description}"
  },
  "branchFormat": {
    "issue": "issue/{type}-{number}/{slug}",
    "chore": "chore/{slug}"
  }
}
```

### Step 3: Update Config with Detected Patterns

Only after the script reports `Created .onus/config.json` without `--migrate`: if Step 1 detected a different commit pattern, update `.onus/config.json`:

**Conventional Commits detected:**
```json
"commitFormat": {
  "issue": "{type}({scope}): {description} (#{number})",
  "chore": "chore: {description}"
}
```

**JIRA style detected:**
```json
"commitFormat": {
  "issue": "[{project}-{number}] {description}",
  "chore": "chore: {description}"
}
```

**No clear pattern:** Keep the defaults - they follow common GitHub conventions.

## Options

- `--force` - Overwrite existing `.onus/config.json`, or write defaults despite legacy settings
- `--platform <name>` - Set work item platform (github, jira, azure)
- `--migrate` - Copy legacy `.claude/config.json` onus settings to `.onus/config.json`

## After Initialization

For JIRA or Azure DevOps, manually edit `.onus/config.json` to add:

**JIRA:**
```json
"jira": {
  "host": "your-company.atlassian.net",
  "project": "PROJ"
}
```

**Azure DevOps:**
```json
"azure": {
  "org": "your-org",
  "project": "your-project"
}
```

## Troubleshooting

**".onus/config.json already exists"**
- Use `--force` to overwrite
- Or manually edit `.onus/config.json`

**"Onus settings found in .claude/config.json"**
- Use `--migrate` to copy them to `.onus/config.json`
- Or `--force` to write defaults instead

**"Onus config error" in session context**
- `.onus/config.json` is not valid JSON or not an object; onus is using defaults and ignoring legacy settings
- Fix the file by hand, or run init with `--force`

**Owner/repo not detected**
- Ensure you're in a git repository
- Check that `git remote get-url origin` returns a valid URL
- For non-GitHub VCS, manually set the github section after init
