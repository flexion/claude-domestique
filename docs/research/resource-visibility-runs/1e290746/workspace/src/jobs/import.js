'use strict';

const { load } = require('../config/load');
const { withRetries } = require('./export');

async function runImport(fetchAdjustments) {
  const config = load();
  return withRetries(fetchAdjustments, {
    retryLimit: 5,
    timeoutMs: config.import.timeoutMs,
  });
}

module.exports = { runImport };
