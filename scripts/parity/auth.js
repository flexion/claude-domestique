'use strict';

// Release trials run in a fresh CLAUDE_CONFIG_DIR / CODEX_HOME so that plugin
// caches, session state, and the candidate set cannot leak between the control
// and guided arms. Subscription logins are stored in the operator's real host
// home and are directory-scoped, so a fresh home is unauthenticated:
//
//   CODEX_HOME=$(mktemp -d) codex login status        -> Not logged in
//   CLAUDE_CONFIG_DIR=$(mktemp -d) claude auth status -> {"loggedIn": false}
//
// This module seeds only the auth artifact into each fresh home. Nothing else is
// carried across, because settings, plugin state, and history all influence the
// behavior under test. The seeding is deliberately paired with a status probe:
// the artifact names below are an allowlist, and if a host stores its login
// somewhere this list does not cover, the probe fails loudly at preflight
// instead of turning every trial into an authentication failure.

const fs = require('fs');
const path = require('path');

const AUTH_ARTIFACT_PATTERN = /^\.?(?:credentials|auth|token|tokens)\.json$/i;

const AUTH_STATUS_COMMANDS = Object.freeze({
  claude: ['auth', 'status'],
  codex: ['login', 'status'],
});

const HOME_ENVIRONMENT = Object.freeze({
  claude: 'CLAUDE_CONFIG_DIR',
  codex: 'CODEX_HOME',
});

function authArtifactNames(home, overrides) {
  if (Array.isArray(overrides) && overrides.length > 0) return overrides;
  if (typeof overrides === 'string' && overrides.trim() !== '') {
    return overrides.split(',').map(value => value.trim()).filter(Boolean);
  }
  let entries;
  try {
    entries = fs.readdirSync(home, { withFileTypes: true });
  } catch (error) {
    return [];
  }
  return entries
    .filter(entry => entry.isFile() && AUTH_ARTIFACT_PATTERN.test(entry.name))
    .map(entry => entry.name)
    .sort();
}

// Copies the auth artifacts and nothing else. Returns the names actually copied
// so the caller can report what it seeded, and so an empty result is visible
// rather than silent.
function seedHostAuth({ sourceHome, targetHome, artifacts }) {
  if (typeof sourceHome !== 'string' || sourceHome.trim() === '') return [];
  if (typeof targetHome !== 'string' || targetHome.trim() === '') {
    throw new Error('seedHostAuth requires a target home');
  }
  const names = authArtifactNames(sourceHome, artifacts);
  const copied = [];
  fs.mkdirSync(targetHome, { recursive: true });
  for (const name of names) {
    const from = path.join(sourceHome, name);
    try {
      if (!fs.statSync(from).isFile()) continue;
    } catch (error) {
      continue;
    }
    fs.copyFileSync(from, path.join(targetHome, name));
    fs.chmodSync(path.join(targetHome, name), 0o600);
    copied.push(name);
  }
  return copied;
}

// Claude reports JSON with a loggedIn boolean; Codex reports a line of prose.
// Anything unrecognized is treated as unauthenticated, because a preflight that
// guesses "probably fine" would hand back 1,700 infrastructure failures.
function parseAuthStatus(host, output) {
  const text = typeof output === 'string' ? output : '';
  if (host === 'claude') {
    try {
      const start = text.indexOf('{');
      const parsed = start === -1 ? null : JSON.parse(text.slice(start));
      return { authenticated: parsed ? parsed.loggedIn === true : false, detail: parsed && parsed.authMethod };
    } catch (error) {
      return { authenticated: false, detail: 'unparsable status' };
    }
  }
  if (host === 'codex') {
    if (/not logged in/i.test(text)) return { authenticated: false, detail: 'not logged in' };
    const match = /logged in(?: using ([^\n]+))?/i.exec(text);
    if (match) return { authenticated: true, detail: (match[1] || 'logged in').trim() };
    return { authenticated: false, detail: 'unparsable status' };
  }
  return { authenticated: false, detail: `unknown host ${host}` };
}

function authStatusArgs(host) {
  return AUTH_STATUS_COMMANDS[host] || null;
}

function homeVariable(host) {
  return HOME_ENVIRONMENT[host] || null;
}

// The seeded login is needed only while the host process runs; nothing
// downstream reads it, because post-state analysis inspects the workspace rather
// than the home. Removing it as soon as the invocation returns keeps residency to
// a handful of files at a time instead of one per trial across the whole matrix.
// Overwriting before unlinking is best effort on a copy-on-write filesystem; the
// short residency is the real mitigation.
function shredSeededAuth(home, names) {
  const removed = [];
  for (const name of names || []) {
    const target = path.join(home, name);
    try {
      const { size } = fs.statSync(target);
      if (size > 0) fs.writeFileSync(target, Buffer.alloc(size, 0));
      fs.rmSync(target, { force: true });
      removed.push(name);
    } catch (error) {
      continue;
    }
  }
  return removed;
}

module.exports = {
  AUTH_ARTIFACT_PATTERN,
  authArtifactNames,
  authStatusArgs,
  homeVariable,
  parseAuthStatus,
  seedHostAuth,
  shredSeededAuth,
};
