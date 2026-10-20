/**
 * memento: session path resolution
 *
 * Single source of truth for where memento keeps session and branch-metadata
 * files. A repository can override both directories in .memento/config.json:
 *
 *   { "sessionsDir": "work/sessions", "branchesDir": "work/.branches" }
 *
 * Values are relative to the git root. Anything that is not a non-empty string,
 * is absolute, or resolves to the root itself or outside it falls back to the
 * default with a warning the hook injects into context.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_SESSIONS_DIR = path.join('.memento', 'sessions');
const DEFAULT_BRANCHES_DIR = path.join('.memento', 'branches');
const LEGACY_SESSIONS_DIR = path.join('.claude', 'sessions');
const CONFIG_FILE = path.join('.memento', 'config.json');

function sanitizeBranch(branch) {
  return branch.replace(/\//g, '-');
}

function readMementoConfig(gitRoot, warnings) {
  const file = path.join(gitRoot, CONFIG_FILE);
  if (!fs.existsSync(file)) return {};
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    warnings.push('could not parse .memento/config.json; using default memento paths');
    return {};
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    warnings.push('.memento/config.json must contain a JSON object; using default memento paths');
    return {};
  }
  return parsed;
}

function resolveDir(gitRoot, key, value, fallback, warnings) {
  const defaultDir = path.join(gitRoot, fallback);
  if (value === undefined) return defaultDir;

  const reject = reason => {
    warnings.push(`${key} in .memento/config.json ${reason}; using ${fallback}`);
    return defaultDir;
  };

  if (typeof value !== 'string' || value.trim() === '') return reject('must be a non-empty string');
  if (value.includes('\0')) return reject('must not contain a NUL character');
  if (path.isAbsolute(value)) return reject('must be relative to the git root');

  const resolved = path.resolve(gitRoot, value);
  const rel = path.relative(gitRoot, resolved);
  if (rel === '') return reject('must not be the git root itself');
  if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    return reject('must stay inside the repository');
  }
  return resolved;
}

function resolveDirs(gitRoot) {
  const warnings = [];
  const config = readMementoConfig(gitRoot, warnings);
  return {
    sessionsDir: resolveDir(gitRoot, 'sessionsDir', config.sessionsDir, DEFAULT_SESSIONS_DIR, warnings),
    branchesDir: resolveDir(gitRoot, 'branchesDir', config.branchesDir, DEFAULT_BRANCHES_DIR, warnings),
    warnings
  };
}

function resolveSession(gitRoot, branch) {
  const { sessionsDir, branchesDir, warnings } = resolveDirs(gitRoot);
  const name = sanitizeBranch(branch);
  const configuredPath = path.join(sessionsDir, `${name}.md`);
  const legacyPath = path.join(gitRoot, LEGACY_SESSIONS_DIR, `${name}.md`);
  const legacy = configuredPath !== legacyPath
    && !fs.existsSync(configuredPath)
    && fs.existsSync(legacyPath);

  return {
    sessionPath: legacy ? legacyPath : configuredPath,
    configuredPath,
    legacyPath,
    legacy,
    sessionsDir,
    branchesDir,
    branchMetadataPath: path.join(branchesDir, name),
    warnings
  };
}

function sessionSearchDirs(gitRoot, sessionsDir) {
  const legacyDir = path.join(gitRoot, LEGACY_SESSIONS_DIR);
  return sessionsDir === legacyDir ? [sessionsDir] : [sessionsDir, legacyDir];
}

/**
 * POSIX single-quote one argument for a command the agent may run. Inside single
 * quotes nothing is special except the closing quote, so `$`, backticks, and
 * double quotes in a configured directory name cannot execute.
 */
function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

/**
 * The command an agent can run to move a legacy session to the configured
 * location, or null when the session is not legacy. Anchored to the git root so
 * it works from any working directory; every argument is shellQuote'd.
 */
function migrationCommand(gitRoot, session) {
  if (!session.legacy) return null;
  const from = path.relative(gitRoot, session.legacyPath);
  const to = path.relative(gitRoot, session.configuredPath);
  return `mkdir -p -- ${shellQuote(path.dirname(session.configuredPath))}`
    + ` && git -C ${shellQuote(gitRoot)} mv -- ${shellQuote(from)} ${shellQuote(to)}`;
}

module.exports = {
  DEFAULT_SESSIONS_DIR,
  DEFAULT_BRANCHES_DIR,
  LEGACY_SESSIONS_DIR,
  CONFIG_FILE,
  sanitizeBranch,
  shellQuote,
  migrationCommand,
  resolveDirs,
  resolveSession,
  sessionSearchDirs
};
