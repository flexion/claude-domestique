'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createMemoryStore } = require('../src/exports/store');
const { purgeExpiredExports, MS_PER_DAY } = require('../src/exports/purge');
const retentionConfig = require('../config/retention');

const NOW = new Date('2026-10-08T00:00:00Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * MS_PER_DAY);
const names = (store) => store.list().map((e) => e.name).sort();

test('retention period is the 45 days compliance confirmed', () => {
  assert.equal(retentionConfig.exportRetentionDays, 45);
});

test('deletes exports older than 45 days using the configured default', () => {
  const store = createMemoryStore([
    { name: 'old.csv', createdAt: daysAgo(46) },
    { name: 'fresh.csv', createdAt: daysAgo(44) },
  ]);

  // No retentionDays passed: picks up 45 from config.
  const result = purgeExpiredExports({ store, now: NOW });

  assert.deepEqual(result.deleted, ['old.csv']);
  assert.deepEqual(result.retained, ['fresh.csv']);
  assert.deepEqual(names(store), ['fresh.csv']);
});

test('an export exactly 45 days old is retained', () => {
  const store = createMemoryStore([{ name: 'edge.csv', createdAt: daysAgo(45) }]);

  const result = purgeExpiredExports({ store, now: NOW });

  assert.deepEqual(result.deleted, []);
  assert.deepEqual(result.retained, ['edge.csv']);
  assert.deepEqual(names(store), ['edge.csv']);
});

test('one millisecond past 45 days is deleted', () => {
  const store = createMemoryStore([
    { name: 'just-over.csv', createdAt: new Date(daysAgo(45).getTime() - 1) },
  ]);

  assert.deepEqual(purgeExpiredExports({ store, now: NOW }).deleted, ['just-over.csv']);
  assert.deepEqual(names(store), []);
});

test('hold- exports are never deleted, however old', () => {
  const store = createMemoryStore([
    { name: 'hold-ancient.csv', createdAt: daysAgo(5000) },
    { name: 'hold-recent.csv', createdAt: daysAgo(1) },
    { name: 'plain-ancient.csv', createdAt: daysAgo(5000) },
  ]);

  const result = purgeExpiredExports({ store, now: NOW });

  assert.deepEqual(result.exempt.sort(), ['hold-ancient.csv', 'hold-recent.csv']);
  assert.deepEqual(result.deleted, ['plain-ancient.csv']);
  assert.deepEqual(names(store), ['hold-ancient.csv', 'hold-recent.csv']);
});

test('hold- prefix must be at the start of the name', () => {
  const store = createMemoryStore([
    { name: 'not-hold-me.csv', createdAt: daysAgo(90) },
    { name: 'archive-hold-x.csv', createdAt: daysAgo(90) },
  ]);

  const result = purgeExpiredExports({ store, now: NOW });

  assert.deepEqual(result.exempt, []);
  assert.deepEqual(result.deleted.sort(), ['archive-hold-x.csv', 'not-hold-me.csv']);
  assert.deepEqual(names(store), []);
});

test('a custom isExempt cannot override legal hold', () => {
  const store = createMemoryStore([{ name: 'hold-x.csv', createdAt: daysAgo(90) }]);

  const result = purgeExpiredExports({ store, now: NOW, isExempt: () => false });

  assert.deepEqual(result.exempt, ['hold-x.csv']);
  assert.deepEqual(result.deleted, []);
  assert.deepEqual(names(store), ['hold-x.csv']);
});

test('a custom isExempt protects additional exports', () => {
  const store = createMemoryStore([
    { name: 'pinned.csv', createdAt: daysAgo(90), pinned: true },
    { name: 'plain.csv', createdAt: daysAgo(90) },
  ]);

  const result = purgeExpiredExports({ store, now: NOW, isExempt: (e) => e.pinned === true });

  assert.deepEqual(result.exempt, ['pinned.csv']);
  assert.deepEqual(result.deleted, ['plain.csv']);
  assert.deepEqual(names(store), ['pinned.csv']);
});

test('an explicit retentionDays overrides the configured default', () => {
  const entries = [{ name: 'mid.csv', createdAt: daysAgo(60) }];

  const at90 = createMemoryStore(entries);
  assert.deepEqual(purgeExpiredExports({ store: at90, now: NOW, retentionDays: 90 }).deleted, []);

  const at30 = createMemoryStore(entries);
  assert.deepEqual(purgeExpiredExports({ store: at30, now: NOW, retentionDays: 30 }).deleted, [
    'mid.csv',
  ]);
});

test('dryRun reports what would be deleted without removing anything', () => {
  const store = createMemoryStore([{ name: 'old.csv', createdAt: daysAgo(46) }]);

  const result = purgeExpiredExports({ store, now: NOW, dryRun: true });

  assert.deepEqual(result.deleted, ['old.csv']);
  assert.equal(result.dryRun, true);
  assert.deepEqual(names(store), ['old.csv'], 'dry run must not delete');
});

test('refuses to delete if the retention period is unset', () => {
  const store = createMemoryStore([{ name: 'old.csv', createdAt: daysAgo(999) }]);

  assert.throws(() => purgeExpiredExports({ store, now: NOW, retentionDays: null }), /not configured/);
  assert.deepEqual(names(store), ['old.csv']);
});

test('rejects an invalid retention period', () => {
  const store = createMemoryStore([]);
  assert.throws(() => purgeExpiredExports({ store, now: NOW, retentionDays: -1 }), TypeError);
  assert.throws(() => purgeExpiredExports({ store, now: NOW, retentionDays: '45' }), TypeError);
});

test('rejects a missing store or invalid now', () => {
  assert.throws(() => purgeExpiredExports({ now: NOW }), TypeError);
  assert.throws(
    () => purgeExpiredExports({ store: createMemoryStore([]), now: 'today' }),
    TypeError
  );
});

test('refuses to delete an entry with an unreadable createdAt', () => {
  const store = createMemoryStore([{ name: 'bad.csv', createdAt: new Date('nope') }]);

  assert.throws(() => purgeExpiredExports({ store, now: NOW }), /invalid createdAt/);
  assert.deepEqual(names(store), ['bad.csv']);
});

test('a held export with an unreadable createdAt is exempt, not an error', () => {
  const store = createMemoryStore([{ name: 'hold-bad.csv', createdAt: new Date('nope') }]);

  const result = purgeExpiredExports({ store, now: NOW });

  assert.deepEqual(result.exempt, ['hold-bad.csv']);
  assert.deepEqual(names(store), ['hold-bad.csv']);
});

test('empty store is a no-op', () => {
  const result = purgeExpiredExports({ store: createMemoryStore([]), now: NOW });
  assert.deepEqual(result.deleted, []);
  assert.deepEqual(result.retained, []);
  assert.deepEqual(result.exempt, []);
});
