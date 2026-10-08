'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { summarize } = require('../src/summary');

test('summarizes an exact multiple', () => {
  assert.equal(summarize(20, 10), '20 results across 2 pages');
});
