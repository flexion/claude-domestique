'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Claude Code sets CLAUDECODE=1 for every hook it runs; Codex sets no
// equivalent, so its absence means Codex.
function detectKind(env) {
  return env.CLAUDECODE === '1' ? 'claude' : 'codex';
}

function validHandle(h) {
  return typeof h === 'string' && /^[a-z][a-z0-9-]{0,31}$/.test(h);
}

function resolveHome(kind, env, homedir) {
  const p = kind === 'claude'
    ? (env.CLAUDE_CONFIG_DIR || path.join(homedir, '.claude'))
    : (env.CODEX_HOME || path.join(homedir, '.codex'));
  try {
    return fs.realpathSync(p);
  } catch {
    return p;
  }
}

function commRoot(env, accountHome) {
  return env.COMITATUS_HOME || path.join(accountHome, '.comitatus');
}

// Stable across --resume (same session id); a fork gets a new session id and
// therefore a new participant.
function participantKey(kind, home, sessionId) {
  return crypto.createHash('sha256').update(`${kind}|${home}|${sessionId}`).digest('hex').slice(0, 16);
}

module.exports = { detectKind, validHandle, resolveHome, commRoot, participantKey };
