'use strict';

const { load } = require('../config/load');

async function withRetries(fn, { retryLimit, timeoutMs }) {
  let lastError;
  for (let attempt = 0; attempt <= retryLimit; attempt += 1) {
    try {
      return await fn({ timeoutMs });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function runExport(sendBatch) {
  const config = load();
  return withRetries(sendBatch, {
    retryLimit: config.export.retryLimit,
    timeoutMs: config.export.timeoutMs,
  });
}

module.exports = { runExport, withRetries };
