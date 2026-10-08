'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createMemoryStore } = require('../src/exports/store');
const { purgeExpiredExports } = require('../src/exports/purge');

const NOW = new Date('2026-10-08T00:00:00Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

test('deletes exports older than the retention period', () => {
  const store = createMemoryStore([
    { name: 'old.csv', createdAt: daysAgo(31) },
    { name: 'fresh.csv', createdAt: daysAgo(2) },
  ]);

  const result = purgeExpiredExports({ store, now: NOW, retentionDays: 30 });

  assert.deepEqual(result.deleted, ['old.csv']);
  assert.deepEqual(result.retained, ['fresh.csv']);
  assert.deepEqual(
    store.list().map((e) => e.name),
    ['fresh.csv']
  );
});

test('keeps an export exactly at the retention boundary', () => {
  const store = createMemoryStore([{ name: 'edge.csv', createdAt: daysAgo(30) }]);

  const result = purgeExpiredExports({ store, now: NOW, retentionDays: 30 });

  assert.deepEqual(result.deleted, []);
  assert.deepEqual(result.retained, ['edge.csv']);
});

test('never deletes an export under legal hold', () => {
  const store = createMemoryStore([
    { name: 'held.csv', createdAt: daysAgo(400), legalHold: true },
    { name: 'old.csv', createdAt: daysAgo(400) },
  ]);

  const result = purgeExpiredExports({ store, now: NOW, retentionDays: 30 });

  assert.deepEqual(result.deleted, ['old.csv']);
  assert.deepEqual(result.skipped, ['held.csv']);
  assert.deepEqual(
    store.list().map((e) => e.name),
    ['held.csv']
  );
});

test('skips entries with an unusable createdAt instead of deleting them', () => {
  const store = createMemoryStore([
    { name: 'bad-date.csv', createdAt: 'not a date' },
    { name: 'missing-date.csv' },
  ]);

  const result = purgeExpiredExports({ store, now: NOW, retentionDays: 30 });

  assert.deepEqual(result.deleted, []);
  assert.deepEqual(result.skipped, ['bad-date.csv', 'missing-date.csv']);
  assert.equal(store.list().length, 2);
});

test('throws instead of deleting when retention is unset in config', () => {
  const store = createMemoryStore([{ name: 'old.csv', createdAt: daysAgo(400) }]);

  assert.throws(() => purgeExpiredExports({ store, now: NOW }), /retentionDays/);
  assert.equal(store.list().length, 1, 'nothing may be deleted without a retention period');
});

test('rejects a non-positive or non-numeric retention period', () => {
  const store = createMemoryStore([{ name: 'old.csv', createdAt: daysAgo(400) }]);

  for (const bad of [0, -1, '30', NaN, Infinity]) {
    assert.throws(() => purgeExpiredExports({ store, now: NOW, retentionDays: bad }), /retentionDays/);
  }
  assert.equal(store.list().length, 1);
});

test('rejects a store missing the expected interface', () => {
  assert.throws(() => purgeExpiredExports({ store: {}, retentionDays: 30 }), TypeError);
  assert.throws(() => purgeExpiredExports(), TypeError);
});

test('rejects an invalid now', () => {
  const store = createMemoryStore([{ name: 'old.csv', createdAt: daysAgo(400) }]);

  assert.throws(() => purgeExpiredExports({ store, now: 'whenever', retentionDays: 30 }), TypeError);
  assert.equal(store.list().length, 1);
});

test('defaults now to the current time', () => {
  const store = createMemoryStore([
    { name: 'ancient.csv', createdAt: new Date('2000-01-01T00:00:00Z') },
  ]);

  const result = purgeExpiredExports({ store, retentionDays: 30 });

  assert.deepEqual(result.deleted, ['ancient.csv']);
});

test('reports the cutoff it used', () => {
  const store = createMemoryStore([]);

  const result = purgeExpiredExports({ store, now: NOW, retentionDays: 30 });

  assert.deepEqual(result.cutoff, daysAgo(30));
});

test('is a no-op on an empty store', () => {
  const result = purgeExpiredExports({ store: createMemoryStore([]), now: NOW, retentionDays: 30 });

  assert.deepEqual(result, { deleted: [], retained: [], skipped: [], cutoff: daysAgo(30) });
});
