'use strict';

const retentionConfig = require('../../config/retention');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Deletes customer exports whose age exceeds the retention period.
//
// Deletion via store.remove is permanent, so the retention period must be
// stated explicitly: config.exportRetentionDays is still null pending a
// decision from compliance (docs/retention.md), and this throws rather than
// guessing between the proposed 30 and 90 days.
//
// Exports flagged with `legalHold` are never deleted. Compliance has not yet
// confirmed how held exports are identified, so this flag is provisional and
// the check is deliberately conservative: anything truthy is skipped.
function purgeExpiredExports({
  store,
  now = new Date(),
  retentionDays = retentionConfig.exportRetentionDays,
} = {}) {
  if (!store || typeof store.list !== 'function' || typeof store.remove !== 'function') {
    throw new TypeError('purgeExpiredExports requires a store with list() and remove()');
  }

  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    throw new Error(
      'purgeExpiredExports requires a positive retentionDays. ' +
        'config.exportRetentionDays is not set (see docs/retention.md); ' +
        'pass retentionDays explicitly once compliance confirms the period.'
    );
  }

  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (!Number.isFinite(nowMs)) {
    throw new TypeError('purgeExpiredExports requires a valid `now`');
  }

  const cutoffMs = nowMs - retentionDays * MS_PER_DAY;

  const deleted = [];
  const retained = [];
  const skipped = [];

  for (const entry of store.list()) {
    const createdMs =
      entry.createdAt instanceof Date
        ? entry.createdAt.getTime()
        : new Date(entry.createdAt).getTime();

    if (!Number.isFinite(createdMs)) {
      // Unknown age: never delete something we cannot prove is expired.
      skipped.push(entry.name);
      continue;
    }

    if (entry.legalHold) {
      skipped.push(entry.name);
      continue;
    }

    if (createdMs < cutoffMs) {
      store.remove(entry.name);
      deleted.push(entry.name);
    } else {
      retained.push(entry.name);
    }
  }

  return { deleted, retained, skipped, cutoff: new Date(cutoffMs) };
}

module.exports = { purgeExpiredExports };
