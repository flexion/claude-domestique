#!/usr/bin/env node
/**
 * memento: resolve the current branch's session paths (read-only)
 *
 * Usage: node resolve-session.js [--cwd <dir>]
 *
 * Skills run this when the hook-injected `📂 Session:` path is missing or is for
 * another branch, so the rules in lib/paths.js are applied in one place instead of
 * being restated in prose. It never creates or moves files and never touches the
 * per-user state in HOME.
 *
 * stdout is always exactly one JSON object.
 *   exit 0  { ok: true, gitRoot, branch, sessionPath, ... }
 *   exit 1  { ok: false, reason: 'not-a-git-repo' | 'no-branch', warnings: [] }
 *   exit 2  { ok: false, reason: 'usage', message }
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const paths = require('../lib/paths');

class UsageError extends Error {}

function parseArgs(argv) {
  const options = { cwd: process.cwd() };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--cwd') {
      const value = argv[++i];
      if (!value) throw new UsageError('--cwd needs a directory');
      options.cwd = value;
    } else {
      throw new UsageError(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function git(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch { return null; }
}

/** Current branch name, including a branch with no commits yet; null when detached. */
function currentBranch(cwd) {
  const abbrev = git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
  if (abbrev === 'HEAD') return null;
  if (abbrev) return abbrev;
  return git(['symbolic-ref', '--short', '-q', 'HEAD'], cwd) || null;
}

function resolve(cwd) {
  const gitRoot = git(['rev-parse', '--show-toplevel'], cwd);
  if (!gitRoot) return { code: 1, result: { ok: false, reason: 'not-a-git-repo', warnings: [] } };

  const branch = currentBranch(cwd);
  if (!branch) return { code: 1, result: { ok: false, reason: 'no-branch', warnings: [] } };

  const session = paths.resolveSession(gitRoot, branch);
  return {
    code: 0,
    result: {
      ok: true,
      gitRoot,
      branch,
      sanitizedBranch: paths.sanitizeBranch(branch),
      sessionPath: session.sessionPath,
      sessionExists: fs.existsSync(session.sessionPath),
      legacy: session.legacy,
      configuredPath: session.configuredPath,
      branchMetadataPath: session.branchMetadataPath,
      sessionsDir: session.sessionsDir,
      branchesDir: session.branchesDir,
      configFile: path.join(gitRoot, paths.CONFIG_FILE),
      migrationCommand: paths.migrationCommand(gitRoot, session),
      warnings: session.warnings
    }
  };
}

function main(argv) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (err) {
    if (!(err instanceof UsageError)) throw err;
    console.log(JSON.stringify({ ok: false, reason: 'usage', message: err.message }));
    return 2;
  }
  const { code, result } = resolve(options.cwd);
  console.log(JSON.stringify(result));
  return code;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { parseArgs, currentBranch, resolve, main };
