#!/usr/bin/env node
/**
 * memento: Session persistence hook
 *
 * Delegates to shared hook handler with custom session file management.
 * Context injection via hooks - zero configuration required.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Use bundled shared module (for installed plugins) or workspace module (for development)
let shared;
try {
  shared = require('../lib/shared');
} catch {
  shared = require('../../shared');
}

const PLUGIN_ROOT = path.join(__dirname, '..');

// ============================================================================
// Git Helpers
// ============================================================================

function getBranch(cwd) {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], cwd
    }).trim();
  } catch { return null; }
}

function getGitRoot(cwd) {
  try {
    return execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], cwd
    }).trim();
  } catch { return null; }
}

// ============================================================================
// Session Management
// ============================================================================

function getSessionPath(gitRoot, branch) {
  return path.join(gitRoot, '.claude', 'sessions', `${branch.replace(/\//g, '-')}.md`);
}

function getSessionsDir(gitRoot) {
  return path.join(gitRoot, '.claude', 'sessions');
}

/**
 * Find possible session files that might match the current branch.
 * Scores by matching issue number and description words.
 */
function findPossibleSessions(gitRoot, branch) {
  const sessionsDir = getSessionsDir(gitRoot);
  if (!fs.existsSync(sessionsDir)) return [];

  // Extract issue number and description words from branch
  const issueMatch = branch.match(/(\d+)/);
  const issueNumber = issueMatch?.[1];
  const descWords = branch.split(/[-\/]/).filter(w => w.length > 3 && !/^\d+$/.test(w));

  const sessions = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.md'));

  return sessions
    .map(file => {
      let score = 0;
      const lowerFile = file.toLowerCase();

      // Strong match: issue number in filename
      if (issueNumber && lowerFile.includes(issueNumber)) score += 10;

      // Weak match: description words in filename
      for (const word of descWords) {
        if (lowerFile.includes(word.toLowerCase())) score += 2;
      }

      return { file, score };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

/**
 * Detect session files that reference the current branch but have wrong filename.
 * This helps when sessions were manually renamed or created with different naming.
 */
function detectMismatch(gitRoot, branch, sessionPath) {
  // If exact match exists, no mismatch
  if (fs.existsSync(sessionPath)) return null;

  const sessionsDir = getSessionsDir(gitRoot);
  if (!fs.existsSync(sessionsDir)) return null;

  const expectedName = path.basename(sessionPath);
  const sessions = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.md'));

  for (const session of sessions) {
    if (session === expectedName) continue; // Skip exact match

    const sessionFullPath = path.join(sessionsDir, session);
    try {
      const content = fs.readFileSync(sessionFullPath, 'utf8');
      // Check if session file references this branch
      if (content.includes(`**Branch**: ${branch}`) || content.includes(`Branch: ${branch}`)) {
        return {
          currentName: session,
          expectedName: expectedName,
          path: sessionFullPath
        };
      }
    } catch {
      // Skip unreadable files
    }
  }

  return null;
}

/**
 * Build context message for branch switch scenario.
 */
function buildSwitchContext(sessionPath, sessionExists, possibleSessions, branch, mismatch = null) {
  let context = `\n### Branch Switch Detected\n`;
  context += `New branch: \`${branch}\`\n`;

  if (sessionExists) {
    context += `\nSession found: ${sessionPath}\n`;
    context += 'Read the session file to restore context.\n';
  } else if (mismatch) {
    // Found a session that references this branch but has wrong filename
    context += '\n**Session File Mismatch Detected**\n';
    context += `Current filename: \`${mismatch.currentName}\`\n`;
    context += `Expected filename: \`${mismatch.expectedName}\`\n`;
    context += `Path: ${mismatch.path}\n`;
    context += '\nOptions:\n';
    context += '1. **Rename** the file to match branch naming convention (recommended)\n';
    context += '2. **Keep** current name and use as-is\n';
    context += '3. **Create new** session (archive the old one)\n';
  } else if (possibleSessions.length > 0) {
    context += '\nNo exact session match. Possible matches:\n';
    for (const s of possibleSessions) {
      context += `  - ${s.file} (score: ${s.score})\n`;
    }
    context += '\nAsk user: use an existing file, rename it to match, or create new?\n';
  } else {
    context += '\nNo session found for this branch.\n';
    context += 'Offer to create a new session.\n';
  }

  return context;
}

/**
 * Detect events that warrant session updates.
 * Returns array of trigger objects with type and details.
 */
function detectSessionTriggers(input) {
  const triggers = [];

  // Check for todo changes (via input metadata if available)
  if (input.toolsUsed?.includes('TodoWrite')) {
    triggers.push({ type: 'todos_changed' });
  }

  // Check for plan mode exit (session should capture the approved plan)
  if (input.toolsUsed?.includes('ExitPlanMode')) {
    triggers.push({ type: 'plan_approved' });
  }

  // Check for context approaching compaction threshold
  // contextUsage is a 0-1 ratio of context window used
  if (input.contextUsage && input.contextUsage > 0.8) {
    triggers.push({
      type: 'context_checkpoint',
      usage: Math.round(input.contextUsage * 100)
    });
  }

  return triggers;
}

/**
 * Build context reminder based on detected triggers.
 */
function buildTriggerContext(triggers, sessionPath) {
  if (triggers.length === 0) return '';

  let context = '\n### Session Update Suggested\n';

  for (const trigger of triggers) {
    switch (trigger.type) {
      case 'todos_changed':
        context += '- Todos changed - update **Session Log** and **Next Steps**\n';
        break;
      case 'plan_approved':
        context += '- Plan approved - **IMMEDIATELY update session Approach section with the plan**\n';
        context += '  1. Read the plan file\n';
        context += '  2. Copy plan summary to session **Approach** section\n';
        context += '  3. Update **Next Steps** with implementation phases\n';
        break;
      case 'context_checkpoint':
        context += `- Context at ${trigger.usage}% - **save state to session before compaction**\n`;
        context += '  Document current progress, decisions, and next steps\n';
        break;
    }
  }

  context += `\nSession: ${sessionPath}\n`;
  return context;
}

function loadState() {
  return shared.loadState(shared.getStateFile('Memento'), {});
}

function saveState(state) {
  shared.saveState(shared.getStateFile('Memento'), state);
}

function createSession(sessionPath, branch) {
  const dir = path.dirname(sessionPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const type = branch.match(/^(?:issue\/)?(feature|fix|chore)/)?.[1] || 'unknown';
  const desc = branch.replace(/^(?:issue\/)?(feature|fix|chore)[-\/]/, '').replace(/^\d+[-\/]/, '');
  const today = new Date().toISOString().split('T')[0];

  fs.writeFileSync(sessionPath, `# Session: ${desc}

## Details
- **Branch**: ${branch}
- **Type**: ${type}
- **Created**: ${today}
- **Status**: in-progress

## Goal
[Describe the objective]

## Session Log
- ${today}: Session created

## Next Steps
1. [First task]
`);
}

// ============================================================================
// Hook Callbacks
// ============================================================================

function onSessionStart(input, base) {
  const cwd = input.cwd || process.cwd();
  const gitRoot = getGitRoot(cwd);
  const branch = getBranch(cwd);

  if (!gitRoot || !branch) {
    return {
      statusLine: '📍 Memento: No session (not a git repo)',
      additionalContext: base.additionalContext
    };
  }

  if (branch === 'main' || branch === 'master') {
    return {
      statusLine: `📍 Memento: No session (${branch})`,
      additionalContext: base.additionalContext
    };
  }

  const sessionPath = getSessionPath(gitRoot, branch);
  const sessionName = path.basename(sessionPath);
  const isNew = !fs.existsSync(sessionPath);

  // Create session if missing
  if (isNew) createSession(sessionPath, branch);

  // Save current branch
  saveState({ branch });

  // Build status line
  let statusLine;
  if (isNew) {
    statusLine = `📍 Memento: NEW → ${sessionName}`;
  } else {
    statusLine = `📍 Memento: ${sessionName}`;
  }

  // Build context
  let context = base.additionalContext || '';
  context += `\n📂 Session: ${sessionPath}`;
  if (isNew) {
    context += '\nNew session created. Update Goal and Next Steps.';
  } else {
    context += '\nFor resumption: Read session file FIRST.';
  }
  context += '\nAfter responding: assess if work warrants session update (milestones, decisions, blockers).';

  return {
    statusLine,
    additionalContext: context,
    extra: { sessionPath, isNew }
  };
}

function onUserPromptSubmit(input, base) {
  const cwd = input.cwd || process.cwd();
  const gitRoot = getGitRoot(cwd);
  const branch = getBranch(cwd);

  if (!gitRoot || !branch || branch === 'main' || branch === 'master') {
    return null; // Use base behavior
  }

  // Load state to detect branch switch
  const state = loadState();
  const previousBranch = state.branch;
  const branchChanged = previousBranch && previousBranch !== branch;

  const sessionPath = getSessionPath(gitRoot, branch);
  const sessionExists = fs.existsSync(sessionPath);

  // Build context
  let context = base.additionalContext || '';

  if (branchChanged) {
    // Branch switch detected - update state
    saveState({ branch });

    // Check for misnamed session (references branch but wrong filename)
    const mismatch = sessionExists ? null : detectMismatch(gitRoot, branch, sessionPath);

    // Find possible sessions if no exact match and no mismatch
    const possibleSessions = (sessionExists || mismatch) ? [] : findPossibleSessions(gitRoot, branch);

    // Inject switch guidance
    context += buildSwitchContext(sessionPath, sessionExists, possibleSessions, branch, mismatch);

    return {
      additionalContext: context,
      extra: {
        sessionPath,
        branchChanged: true,
        previousBranch,
        sessionExists,
        mismatch,
        possibleSessions
      }
    };
  }

  // Detect session update triggers
  const triggers = detectSessionTriggers(input);

  // Normal prompt - standard session reminder
  context += `\n📂 Session: ${sessionPath}`;
  if (!sessionExists) {
    context += '\nNo session file found. Consider creating one with `/memento:session create`.';
  } else {
    context += '\nFor resumption: Read session file FIRST.';
  }

  // Add trigger-based reminders if any detected
  if (triggers.length > 0) {
    context += buildTriggerContext(triggers, sessionPath);
  } else {
    // Periodic reminder every 5 prompts to assess session state
    const promptCount = base.promptCount || 0;
    const SESSION_REMINDER_INTERVAL = 5;
    if (promptCount > 0 && promptCount % SESSION_REMINDER_INTERVAL === 0) {
      context += '\n\n📝 **Session Check**: Has anything happened worth recording? Key decisions, requirements, design changes, or blockers should be captured in the session file.';
    } else {
      context += '\nAfter responding: assess if work warrants session update (milestones, decisions, blockers).';
    }
  }

  return {
    additionalContext: context,
    extra: { sessionPath, sessionExists, triggers }
  };
}

// ============================================================================
// Direct Processing (for testing)
// ============================================================================

function processHook(input) {
  const config = {
    pluginName: 'Memento',
    pluginRoot: PLUGIN_ROOT,
    onSessionStart,
    onUserPromptSubmit
  };
  return shared.processHook(config, input);
}

// ============================================================================
// Main Entry Point
// ============================================================================

if (require.main === module) {
  shared.runHook({
    pluginName: 'Memento',
    pluginRoot: PLUGIN_ROOT,
    onSessionStart,
    onUserPromptSubmit
  });
}

// ============================================================================
// Exports (for testing)
// ============================================================================

module.exports = {
  processHook,
  getBranch,
  getGitRoot,
  getSessionPath,
  getSessionsDir,
  createSession,
  loadState,
  saveState,
  findPossibleSessions,
  detectMismatch,
  buildSwitchContext,
  detectSessionTriggers,
  buildTriggerContext
};
