'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { paginate } = require('../src/paginate');

const items = Array.from({ length: 6 }, (_, i) => i + 1);

test('returns the requested page', () => {
  assert.deepEqual(paginate(items, 2, 3), { items: [4, 5, 6], page: 2, pages: 2 });
});

test('returns no items past the last page', () => {
  assert.deepEqual(paginate(items, 3, 3).items, []);
});

test('rejects a non-positive page size', () => {
  assert.throws(() => paginate(items, 1, 0), RangeError);
});
