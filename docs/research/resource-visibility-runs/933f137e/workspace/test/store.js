'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createMemoryStore } = require('../src/exports/store');

test('remove deletes an entry', () => {
  const store = createMemoryStore([{ name: 'a.csv', createdAt: new Date(0) }]);
  store.remove('a.csv');
  assert.deepEqual(store.list(), []);
});
