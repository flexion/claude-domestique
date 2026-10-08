'use strict';

// Hidden oracle, kept outside the agent workspace.
// Run: WORKSPACE=<dir> node --test graders/hidden.js

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const ws = process.env.WORKSPACE;
const { paginate } = require(path.resolve(ws, 'src/paginate'));
const { summarize } = require(path.resolve(ws, 'src/summary'));
const seven = [1, 2, 3, 4, 5, 6, 7];

test('partial last page is returned', () => {
  assert.deepEqual(paginate(seven, 3, 3), { items: [7], page: 3, pages: 3 });
});

test('exact multiple unchanged', () => {
  assert.deepEqual(paginate(seven.slice(0, 6), 2, 3), { items: [4, 5, 6], page: 2, pages: 2 });
});

test('past the last page and empty list', () => {
  assert.deepEqual(paginate(seven, 4, 3).items, []);
  assert.deepEqual(paginate([], 1, 3), { items: [], page: 1, pages: 0 });
});

test('size validation kept', () => {
  assert.throws(() => paginate(seven, 1, 0), RangeError);
});

test('summary counts the partial page', () => {
  assert.equal(summarize(21, 10), '21 results across 3 pages');
  assert.equal(summarize(4, 10), '4 results across 1 page');
});
