#!/usr/bin/env node
/**
 * claude-mantra init script
 *
 * Sets up the .claude/context/ directory structure for a project.
 * - Creates .claude/context/ if missing
 * - Copies template files (README.md, project.yml.example)
 * - If CLAUDE.md exists, backs it up and attempts basic decomposition
 * - Never overwrites existing files
 */

const fs = require('fs');
const path = require('path');

// Find plugin root (where this script lives is scripts/, go up one)
const PLUGIN_ROOT = path.join(__dirname, '..');
const TEMPLATES_DIR = path.join(PLUGIN_ROOT, 'templates', 'context');

/**
 * Initialize .claude/context in target directory
 * @param {string} targetDir - Directory to initialize (defaults to cwd)
 */
function init(targetDir = process.cwd()) {
  const contextDir = path.join(targetDir, '.claude', 'context');
  const claudeMdPath = path.join(targetDir, 'CLAUDE.md');

  console.log('claude-mantra init');
  console.log('==================');
  console.log(`Target: ${targetDir}`);
  console.log();

  // Create .claude/context/ directory
  if (!fs.existsSync(contextDir)) {
    fs.mkdirSync(contextDir, { recursive: true });
    console.log('Created: .claude/context/');
  } else {
    console.log('Exists:  .claude/context/');
  }

  // Copy README.md
  const readmeSrc = path.join(TEMPLATES_DIR, 'README.md');
  const readmeDst = path.join(contextDir, 'README.md');
  if (!fs.existsSync(readmeDst)) {
    if (fs.existsSync(readmeSrc)) {
      fs.copyFileSync(readmeSrc, readmeDst);
      console.log('Created: .claude/context/README.md');
    } else {
      console.log('Warning: Template README.md not found');
    }
  } else {
    console.log('Exists:  .claude/context/README.md (not overwritten)');
  }

  // Handle CLAUDE.md decomposition
  const projectYmlPath = path.join(contextDir, 'project.yml');
  if (fs.existsSync(claudeMdPath)) {
    console.log();
    console.log('Found CLAUDE.md - attempting decomposition...');

    // Back up CLAUDE.md
    const backupPath = path.join(targetDir, 'CLAUDE.md.backup');
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(claudeMdPath, backupPath);
      console.log('Backed up: CLAUDE.md -> CLAUDE.md.backup');
    } else {
      console.log('Exists:    CLAUDE.md.backup (not overwritten)');
    }

    // Attempt to extract project info from CLAUDE.md
    if (!fs.existsSync(projectYmlPath)) {
      const extracted = extractProjectInfo(claudeMdPath);
      if (extracted) {
        fs.writeFileSync(projectYmlPath, extracted);
        console.log('Created: .claude/context/project.yml (extracted from CLAUDE.md)');
      } else {
        // Fall back to example template
        copyExampleTemplate(projectYmlPath);
      }
    } else {
      console.log('Exists:  .claude/context/project.yml (not overwritten)');
    }

    // Create legacy.yml with original CLAUDE.md content for reference
    const legacyYmlPath = path.join(contextDir, 'legacy-claude-md.yml');
    if (!fs.existsSync(legacyYmlPath)) {
      const claudeMdContent = fs.readFileSync(claudeMdPath, 'utf8');
      const legacyContent = `# Legacy CLAUDE.md Content
# This file preserves your original CLAUDE.md instructions.
# Review and migrate relevant sections to modular context files,
# then delete this file.

# Original CLAUDE.md location: ${claudeMdPath}
# Backup location: ${backupPath}

# --- Original Content Below ---
# (Stored as comment to avoid double-loading)

${claudeMdContent.split('\n').map(line => '# ' + line).join('\n')}
`;
      fs.writeFileSync(legacyYmlPath, legacyContent);
      console.log('Created: .claude/context/legacy-claude-md.yml (for reference)');
    }

    console.log();
    console.log('CLAUDE.md Decomposition Notes:');
    console.log('- Original backed up to CLAUDE.md.backup');
    console.log('- Basic project info extracted to project.yml');
    console.log('- Full content preserved in legacy-claude-md.yml');
    console.log('- Review and migrate sections to modular .yml files');
    console.log('- Consider removing CLAUDE.md to avoid context confusion');

  } else {
    // No CLAUDE.md - just copy example template
    if (!fs.existsSync(projectYmlPath)) {
      copyExampleTemplate(projectYmlPath);
    } else {
      console.log('Exists:  .claude/context/project.yml (not overwritten)');
    }
  }

  console.log();
  console.log('Init complete!');
  console.log();
  console.log('Next steps:');
  console.log('1. Edit .claude/context/project.yml with your project details');
  console.log('2. Add additional context files as needed (*.yml)');
  console.log('3. See .claude/context/README.md for extension guide');
}

/**
 * Copy example template as project.yml
 */
function copyExampleTemplate(projectYmlPath) {
  const exampleSrc = path.join(TEMPLATES_DIR, 'project.yml.example');
  if (fs.existsSync(exampleSrc)) {
    fs.copyFileSync(exampleSrc, projectYmlPath);
    console.log('Created: .claude/context/project.yml (from template)');
  } else {
    // Create minimal stub if template missing
    const stub = `# Project Context
# Customize this file for your project

name: ${path.basename(process.cwd())}
description: TODO - describe your project

## Add your project-specific context below
`;
    fs.writeFileSync(projectYmlPath, stub);
    console.log('Created: .claude/context/project.yml (minimal stub)');
  }
}

/**
 * Attempt to extract project info from CLAUDE.md
 * Returns YAML string or null if extraction fails
 */
function extractProjectInfo(claudeMdPath) {
  try {
    const content = fs.readFileSync(claudeMdPath, 'utf8');
    const lines = content.split('\n');

    const extracted = {
      name: null,
      description: null,
      commands: {},
      sections: []
    };

    // Look for project name (first h1 or h2)
    for (const line of lines) {
      if (line.startsWith('# ')) {
        extracted.name = line.replace('# ', '').trim();
        break;
      }
    }

    // Look for common command patterns
    const commandPatterns = [
      { pattern: /npm\s+test/i, key: 'test', value: 'npm test' },
      { pattern: /npm\s+run\s+build/i, key: 'build', value: 'npm run build' },
      { pattern: /npm\s+run\s+lint/i, key: 'lint', value: 'npm run lint' },
      { pattern: /npm\s+run\s+dev/i, key: 'dev', value: 'npm run dev' },
      { pattern: /npm\s+start/i, key: 'start', value: 'npm start' },
      { pattern: /pytest/i, key: 'test', value: 'pytest' },
      { pattern: /go\s+test/i, key: 'test', value: 'go test ./...' },
    ];

    for (const { pattern, key, value } of commandPatterns) {
      if (pattern.test(content) && !extracted.commands[key]) {
        extracted.commands[key] = value;
      }
    }

    // Extract section headers for reference
    for (const line of lines) {
      if (line.startsWith('## ')) {
        extracted.sections.push(line.replace('## ', '').trim());
      }
    }

    // Build YAML output
    let yaml = `# Project Context (extracted from CLAUDE.md)
# Review and customize this file

`;

    if (extracted.name) {
      yaml += `name: ${extracted.name}\n`;
    } else {
      yaml += `name: ${path.basename(process.cwd())}\n`;
    }

    yaml += `description: TODO - add description\n\n`;

    if (Object.keys(extracted.commands).length > 0) {
      yaml += `## Commands\n`;
      for (const [key, value] of Object.entries(extracted.commands)) {
        yaml += `${key}: ${value}\n`;
      }
      yaml += '\n';
    }

    if (extracted.sections.length > 0) {
      yaml += `## Sections found in CLAUDE.md (migrate as needed)\n`;
      yaml += `# ${extracted.sections.join(', ')}\n`;
      yaml += '\n';
    }

    yaml += `## Add your project-specific context below
# See README.md for format guidelines
`;

    return yaml;

  } catch (e) {
    console.log(`Warning: Could not parse CLAUDE.md: ${e.message}`);
    return null;
  }
}

// CLI entry point
if (require.main === module) {
  const targetDir = process.argv[2] || process.cwd();
  init(path.resolve(targetDir));
}

module.exports = { init, extractProjectInfo };
