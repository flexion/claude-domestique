'use strict';

const fs = require('fs');
const path = require('path');
const defaults = require('./defaults');
const limits = require('./limits');

function readEnvironmentFile(envName) {
  const file = path.join(__dirname, '..', '..', 'config', `${envName}.json`);
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function fromVariables(env) {
  const out = { export: {} };
  if (env.LEDGER_EXPORT_RETRIES) out.export.retryLimit = Number(env.LEDGER_EXPORT_RETRIES);
  if (env.LEDGER_EXPORT_TIMEOUT_MS) out.export.timeoutMs = Number(env.LEDGER_EXPORT_TIMEOUT_MS);
  return out;
}

function merge(...layers) {
  const result = { export: {}, import: {} };
  for (const layer of layers) {
    Object.assign(result.export, layer.export);
    Object.assign(result.import, layer.import);
  }
  return result;
}

function load(env = process.env) {
  const envName = env.NODE_ENV || 'development';
  const config = merge(defaults, readEnvironmentFile(envName), fromVariables(env));
  const caps = limits[envName];
  if (caps) {
    config.export.retryLimit = Math.min(config.export.retryLimit, caps.maxExportRetries);
  }
  return config;
}

module.exports = { load };
