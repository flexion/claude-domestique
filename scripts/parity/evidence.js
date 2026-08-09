'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const EVIDENCE_FIELDS = Object.freeze([
  'scenario_id', 'prompt', 'plugin_versions', 'host', 'host_version',
  'arm', 'trial', 'observations', 'state_changes', 'invariants',
  'infrastructure_failure', 'reviewed_hook_hash', 'result',
]);

// The allowlist is nested, not just top-level: `observations` is an allowlisted
// field, so an unrelated transcript stored under an unexpected observation key
// would otherwise ride along inside it. These are the keys result.schema.json
// documents for an observation.
const OBSERVATION_FIELDS = Object.freeze([
  'selected_skill', 'output', 'exit_status', 'state_files', 'extra',
]);

const MAX_STRING_LENGTH = 4000;
const TRUNCATION_MARKER = '…[TRUNCATED]';
const SAFE_COMPONENT = /[^0-9A-Za-z._-]/g;

const SENSITIVE_NAME = /(API_KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)/i;
const SENSITIVE_NAME_SOURCE = '[A-Za-z0-9_]*(?:API_KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)[A-Za-z0-9_]*';
const KEY_MATERIAL_TAIL = '(?:[ \\t:=]+[A-Za-z0-9+/=_-]{20,})?';

const AUTHORIZATION_PATTERN = /authorization\s*:\s*(?:bearer|basic)\s+[^\s"',;}\]]+/gi;
const ASSIGNMENT_PATTERN = new RegExp(`\\b(${SENSITIVE_NAME_SOURCE})\\s*=\\s*[^\\s"',;}\\]]+`, 'gi');
const JSON_FIELD_PATTERN = new RegExp(`"(${SENSITIVE_NAME_SOURCE})"\\s*:\\s*"[^"]*"`, 'gi');
const HOME_PATTERN = /\/(?:Users|home)\/[^/\s"':;,)\]}]+/g;
const WINDOWS_HOME_PATTERN = /[A-Za-z]:\\+Users\\+[^\\\s"':;,)\]}]+/g;

const KEY_MATERIAL_PATTERNS = [
  [new RegExp(`\\bsk-ant-[A-Za-z0-9_-]+${KEY_MATERIAL_TAIL}`, 'g'), '[REDACTED_API_KEY]'],
  [new RegExp(`\\bgithub_pat_[A-Za-z0-9_]+${KEY_MATERIAL_TAIL}`, 'g'), '[REDACTED_TOKEN]'],
  [new RegExp(`\\bghp_[A-Za-z0-9]+${KEY_MATERIAL_TAIL}`, 'g'), '[REDACTED_TOKEN]'],
  [new RegExp(`\\bsk-[A-Za-z0-9_-]{4,}${KEY_MATERIAL_TAIL}`, 'g'), '[REDACTED_API_KEY]'],
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function markerForName(name) {
  if (/API_KEY/i.test(name)) return '[REDACTED_API_KEY]';
  if (/TOKEN/i.test(name)) return '[REDACTED_TOKEN]';
  return '[REDACTED_SECRET]';
}

function normalizeReplacements(replacements) {
  const pairs = [];
  if (Array.isArray(replacements)) {
    for (const entry of replacements) {
      if (!entry || typeof entry.find !== 'string' || entry.find === '') continue;
      pairs.push([entry.find, typeof entry.replace === 'string' ? entry.replace : '']);
    }
  } else if (replacements && typeof replacements === 'object') {
    for (const [find, replace] of Object.entries(replacements)) {
      if (find === '') continue;
      pairs.push([find, typeof replace === 'string' ? replace : '']);
    }
  }
  // Replace longer literals first so a nested prefix cannot claim the match.
  pairs.sort((left, right) => right[0].length - left[0].length);
  return pairs.map(([find, replace]) => [new RegExp(escapeRegExp(find), 'g'), replace]);
}

function truncate(value) {
  if (value.length <= MAX_STRING_LENGTH) return value;
  return value.slice(0, MAX_STRING_LENGTH) + TRUNCATION_MARKER;
}

function redactString(value, replacements) {
  let redacted = value;

  for (const [pattern, replacement] of replacements) {
    redacted = redacted.replace(pattern, replacement);
  }

  redacted = redacted.replace(AUTHORIZATION_PATTERN, 'Authorization: [REDACTED_AUTHORIZATION]');
  redacted = redacted.replace(ASSIGNMENT_PATTERN, (match, name) => `${name}=${markerForName(name)}`);
  redacted = redacted.replace(JSON_FIELD_PATTERN, (match, name) => `"${name}": "${markerForName(name)}"`);

  for (const [pattern, replacement] of KEY_MATERIAL_PATTERNS) {
    redacted = redacted.replace(pattern, replacement);
  }

  redacted = redacted.replace(HOME_PATTERN, '[REDACTED_HOME]');
  redacted = redacted.replace(WINDOWS_HOME_PATTERN, '[REDACTED_HOME]');

  return truncate(redacted);
}

function assign(target, key, value) {
  let name = key;
  if (Object.prototype.hasOwnProperty.call(target, name)) {
    let suffix = 2;
    while (Object.prototype.hasOwnProperty.call(target, `${name}~${suffix}`)) suffix += 1;
    name = `${name}~${suffix}`;
  }
  Object.defineProperty(target, name, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function redactValue(value, replacements) {
  if (typeof value === 'string') return redactString(value, replacements);
  if (Array.isArray(value)) return value.map(entry => redactValue(entry, replacements));
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, entry] of Object.entries(value)) {
      const redactedKey = redactString(key, replacements);
      if (SENSITIVE_NAME.test(key) && !/[=:]/.test(key)) {
        assign(result, redactedKey, markerForName(key));
        continue;
      }
      assign(result, redactedKey, redactValue(entry, replacements));
    }
    return result;
  }
  return value;
}

function sanitizeEvidence(record, replacements) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return {};
  const rules = normalizeReplacements(replacements);
  const sanitized = {};
  for (const field of EVIDENCE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(record, field)) continue;
    if (field === 'observations') {
      assign(sanitized, field, sanitizeObservations(record[field], rules));
      continue;
    }
    assign(sanitized, field, redactValue(record[field], rules));
  }
  return sanitized;
}

function sanitizeObservations(observations, rules) {
  if (!observations || typeof observations !== 'object' || Array.isArray(observations)) {
    return redactValue(observations, rules);
  }
  const sanitized = {};
  for (const field of OBSERVATION_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(observations, field)) continue;
    assign(sanitized, field, redactValue(observations[field], rules));
  }
  return sanitized;
}

function safeComponent(value, fallback) {
  const raw = value === undefined || value === null ? '' : String(value);
  const cleaned = raw.replace(SAFE_COMPONENT, '-').replace(/\.{2,}/g, '.');
  return cleaned === '' ? fallback : cleaned;
}

function resolveDate(record, now) {
  const candidates = [record && record.date, now, new Date()];
  for (const candidate of candidates) {
    if (candidate instanceof Date && !Number.isNaN(candidate.getTime())) {
      return candidate.toISOString().slice(0, 10);
    }
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      return safeComponent(candidate.trim().slice(0, 10), 'undated');
    }
  }
  return 'undated';
}

function writeEvidence(options) {
  const { root, release, record, replacements, now } = options || {};
  if (typeof root !== 'string' || root === '') {
    throw new Error('writeEvidence requires a root directory');
  }
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error('writeEvidence requires an evidence record object');
  }

  const scenarioId = safeComponent(record.scenario_id, '');
  if (scenarioId === '') {
    throw new Error('writeEvidence requires a scenario_id');
  }

  const sanitized = sanitizeEvidence(record, replacements);
  const directory = path.join(
    root,
    'docs',
    'release-evidence',
    `${resolveDate(record, now)}-${safeComponent(release, 'unreleased')}`,
  );
  const fileName = [
    scenarioId,
    safeComponent(record.host, 'unknown-host'),
    safeComponent(record.host_version, 'unknown-version'),
    safeComponent(record.arm, 'unknown-arm'),
    `trial${safeComponent(record.trial, '0')}`,
  ].join('-') + '.json';

  const target = path.join(directory, fileName);
  const temporary = `${target}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;

  fs.mkdirSync(directory, { recursive: true });
  try {
    fs.writeFileSync(temporary, JSON.stringify(sanitized, null, 2) + '\n');
    fs.renameSync(temporary, target);
  } catch (error) {
    fs.rmSync(temporary, { force: true });
    throw error;
  }

  return target;
}

module.exports = {
  EVIDENCE_FIELDS,
  sanitizeEvidence,
  writeEvidence,
};
