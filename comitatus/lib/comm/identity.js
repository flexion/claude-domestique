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

// Handle: the wire identity, derived from the participant key so it needs no
// registry and survives --resume. 0/o and 1/l are left out because weak local
// models mis-type look-alikes. It starts with a letter so it is also a valid
// call-sign. 6 symbols carry about 29.6 bits.
const HANDLE_LETTERS = 'abcdefghijkmnpqrstuvwxyz';
const HANDLE_SYMBOLS = `${HANDLE_LETTERS}23456789`;
const HANDLE_LENGTH = 6;

function deriveHandle(pkey) {
  let n = BigInt(`0x${pkey}`);
  const take = (alphabet) => {
    const c = alphabet[Number(n % BigInt(alphabet.length))];
    n /= BigInt(alphabet.length);
    return c;
  };
  let h = take(HANDLE_LETTERS);
  while (h.length < HANDLE_LENGTH) h += take(HANDLE_SYMBOLS);
  return h;
}

// Alias: the human label, rendered into other agents' context, so it keeps the
// old call-sign charset. Every pre-2.3 COMITATUS_HANDLE value is a valid alias.
const validAlias = validHandle;

const OFF = 'off';

// COMITATUS_ALIAS pre-names a session; COMITATUS_HANDLE is its deprecated
// synonym. `off` silences the hooks: the legacy variable's `off` counts only
// when COMITATUS_ALIAS is unset. The seed is the first valid value of the two.
function aliasEnv(env) {
  const primary = env.COMITATUS_ALIAS || env.COMITATUS_HANDLE;
  if (primary === OFF) return { off: true, seed: null };
  return { off: false, seed: [env.COMITATUS_ALIAS, env.COMITATUS_HANDLE].find(validAlias) || null };
}

module.exports = {
  detectKind, validHandle, validAlias, resolveHome, commRoot, participantKey, deriveHandle, aliasEnv,
};
