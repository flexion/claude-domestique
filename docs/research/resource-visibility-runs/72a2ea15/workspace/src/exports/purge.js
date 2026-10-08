'use strict';

const retentionConfig = require('../../config/retention');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const LEGAL_HOLD_PREFIX = 'hold-';

// Exports under legal hold must never be deleted, at any age.
function isLegalHold(entry) {
  return typeof entry.name === 'string' && entry.name.startsWith(LEGAL_HOLD_PREFIX);
}

// Deletes customer exports whose age exceeds the retention period
// (45 days, confirmed by compliance; see docs/retention.md).
//
// An export is deleted when createdAt is strictly older than the cutoff;
// one exactly at the cutoff is retained.
//
// Deletion via store.remove is permanent, so this refuses to run if the
// retention period is unset. The legal-hold rule is always applied; the
// optional isExempt adds further protection but cannot override it.
function purgeExpiredExports({
  store,
  now,
  retentionDays = retentionConfig.exportRetentionDays,
  isExempt = () => false,
  dryRun = false,
} = {}) {
  if (!store || typeof store.list !== 'function' || typeof store.remove !== 'function') {
    throw new TypeError('purgeExpiredExports requires a store with list() and remove()');
  }
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError('purgeExpiredExports requires `now` to be a valid Date');
  }
  if (retentionDays === null || retentionDays === undefined) {
    throw new Error(
      'Export retention period is not configured; set config/retention.js ' +
        'exportRetentionDays or pass retentionDays explicitly. Refusing to delete.'
    );
  }
  if (typeof retentionDays !== 'number' || !Number.isFinite(retentionDays) || retentionDays < 0) {
    throw new TypeError('retentionDays must be a non-negative finite number');
  }

  const cutoff = new Date(now.getTime() - retentionDays * MS_PER_DAY);
  const deleted = [];
  const retained = [];
  const exempt = [];

  for (const entry of store.list()) {
    if (isLegalHold(entry) || isExempt(entry)) {
      exempt.push(entry.name);
      continue;
    }
    if (!(entry.createdAt instanceof Date) || Number.isNaN(entry.createdAt.getTime())) {
      throw new TypeError(`Export ${entry.name} has an invalid createdAt; refusing to delete`);
    }
    if (entry.createdAt.getTime() >= cutoff.getTime()) {
      retained.push(entry.name);
    } else {
      deleted.push(entry.name);
    }
  }

  if (!dryRun) {
    for (const name of deleted) {
      store.remove(name);
    }
  }

  return { cutoff, deleted, retained, exempt, dryRun };
}

module.exports = { purgeExpiredExports, isLegalHold, LEGAL_HOLD_PREFIX, MS_PER_DAY };
