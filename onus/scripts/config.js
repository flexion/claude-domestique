/**
 * onus config - Project configuration resolution
 *
 * Onus project settings live in `.onus/config.json` as top-level keys. Older
 * projects keep them in the `onus` (or older `workItem`) section of
 * `.claude/config.json`; that legacy section is read only when the new file
 * is absent. A new file that cannot be used is reported as an error rather
 * than silently replaced by legacy settings.
 *
 * Both files are looked up at the git root of the given directory, so a hook
 * or skill started in a subdirectory sees the same settings as one started at
 * the root. Outside a git repository the directory itself is used.
 *
 * CLI: `node config.js [dir]` prints the resolution as JSON and exits 1 when
 * the new file is unusable.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CONFIG_FILE = '.onus/config.json';
const LEGACY_CONFIG_FILE = '.claude/config.json';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Find the project root: the git top-level containing `cwd`, else `cwd`
 * @param {string} cwd - Starting directory
 * @param {object} deps - Dependencies for testing
 * @returns {string} Project root directory
 */
function findProjectRoot(cwd, deps = {}) {
  const exec = deps.execFileSync || execFileSync;
  try {
    const root = exec('git', ['rev-parse', '--show-toplevel'], {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    if (root) return root;
  } catch { /* not a git repository */ }
  return cwd;
}

/**
 * Extract the Onus section from a parsed legacy `.claude/config.json`
 * @param {object} legacy - Parsed legacy file
 * @returns {{ key: string, section: object }|null}
 */
function legacySection(legacy) {
  if (!isPlainObject(legacy)) return null;
  for (const key of ['onus', 'workItem']) {
    if (isPlainObject(legacy[key])) return { key, section: legacy[key] };
  }
  return null;
}

/**
 * Resolve the effective Onus project configuration
 * @param {string} cwd - Any directory inside the project
 * @param {object} deps - Dependencies for testing
 * @returns {object} { source: 'onus'|'legacy'|'none', path, config, error }
 */
function resolveProjectConfig(cwd, deps = {}) {
  const fileSystem = deps.fs || fs;
  const root = findProjectRoot(cwd, deps);
  const configPath = path.join(root, CONFIG_FILE);
  const legacyPath = path.join(root, LEGACY_CONFIG_FILE);

  if (fileSystem.existsSync(configPath)) {
    let parsed;
    try {
      parsed = JSON.parse(fileSystem.readFileSync(configPath, 'utf8'));
    } catch (err) {
      return { source: 'onus', path: configPath, config: {}, error: `${CONFIG_FILE} could not be parsed: ${err.message}` };
    }
    if (!isPlainObject(parsed)) {
      return { source: 'onus', path: configPath, config: {}, error: `${CONFIG_FILE} must contain a JSON object` };
    }
    return { source: 'onus', path: configPath, config: parsed, error: null };
  }

  try {
    if (fileSystem.existsSync(legacyPath)) {
      const found = legacySection(JSON.parse(fileSystem.readFileSync(legacyPath, 'utf8')));
      if (found) {
        return { source: 'legacy', path: legacyPath, config: found.section, error: null };
      }
    }
  } catch { /* unreadable legacy config is ignored, as before */ }

  return { source: 'none', path: null, config: {}, error: null };
}

module.exports = {
  resolveProjectConfig,
  findProjectRoot,
  legacySection,
  isPlainObject,
  CONFIG_FILE,
  LEGACY_CONFIG_FILE
};

// CLI entry point
if (require.main === module) {
  const result = resolveProjectConfig(path.resolve(process.argv[2] || process.cwd()));
  console.log(JSON.stringify(result, null, 2));
  if (result.error) process.exit(1);
}
