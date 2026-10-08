'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { summarize } = require('../src/summary');

test('summarizes an exact multiple', () => {
  assert.equal(summarize(20, 10), '20 results across 2 pages');
});

test('counts a trailing partial page', () => {
  assert.equal(summarize(21, 10), '21 results across 3 pages');
});

test('uses the singular noun for a lone partial page', () => {
  assert.equal(summarize(4, 10), '4 results across 1 page');
});
