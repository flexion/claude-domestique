#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { sanitizeEvidence } = require('./parity/evidence');

const SHA256 = /^[a-f0-9]{64}$/i;
const REQUIRED_ROLES = [
  ['claude', 'minimum'], ['claude', 'current'],
  ['codex', 'minimum'], ['codex', 'current'],
];

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  }
  return value;
}

function validateTrust(trust, errors) {
  if (!trust || typeof trust !== 'object') {
    errors.push('manual_trust is required');
    return;
  }
  if (!SHA256.test(trust.reviewed_hook_hash || '')) errors.push('manual_trust.reviewed_hook_hash must be a SHA-256 hash');
  if (!SHA256.test(trust.approved_hook_hash || '')) errors.push('manual_trust.approved_hook_hash must be a SHA-256 hash');
  if (trust.reviewed_hook_hash !== trust.approved_hook_hash) errors.push('manual trust hashes do not match');
  if (trust.approved_via !== '/hooks') errors.push('manual_trust.approved_via must be /hooks');
  if (!trust.before || trust.before.skipped !== true) errors.push('manual_trust.before.skipped must be true');
  if (!trust.after || trust.after.sentinel !== true) errors.push('manual_trust.after.sentinel must be true');
  if (trust.bypass_used !== false) errors.push('bypass cannot satisfy trust');
}

function validateCells(cells, errors) {
  const observed = new Set();
  for (const cell of Array.isArray(cells) ? cells : []) {
    for (const role of Array.isArray(cell.roles) ? cell.roles : []) {
      observed.add(`${cell.host}:${role}`);
    }
  }
  for (const [host, role] of REQUIRED_ROLES) {
    if (!observed.has(`${host}:${role}`)) errors.push(`missing host/version role ${host}:${role}`);
  }
}

function validateBundle(root) {
  const errors = [];
  const manifestPath = path.join(root, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return ['missing manifest.json'];
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    return [`invalid manifest.json: ${error.message}`];
  }
  validateTrust(manifest.manual_trust, errors);
  validateCells(manifest.host_cells, errors);

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json') || entry.name === 'manifest.json') continue;
    let record;
    try {
      record = JSON.parse(fs.readFileSync(path.join(root, entry.name), 'utf8'));
    } catch (error) {
      errors.push(`${entry.name}: invalid JSON`);
      continue;
    }
    if (JSON.stringify(stable(record)) !== JSON.stringify(stable(sanitizeEvidence(record)))) {
      errors.push(`${entry.name}: unsanitized or non-allowlisted evidence`);
    }
  }
  return errors;
}

function main() {
  const root = process.argv[2];
  if (!root) {
    console.error('usage: node scripts/verify-release-evidence.js <bundle-directory>');
    process.exitCode = 1;
    return;
  }
  const errors = validateBundle(path.resolve(root));
  if (errors.length) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
    return;
  }
  console.log('Release evidence is complete and sanitized.');
}

if (require.main === module) main();

module.exports = { validateBundle };
