'use strict';

const { spawn } = require('child_process');

function execute(binary, args, options = {}) {
  return new Promise(resolve => {
    const child = spawn(binary, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timeoutMs = options.timeoutMs || 120000;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGTERM');
      resolve({ exitCode: null, stdout, stderr, timedOut: true });
    }, timeoutMs);

    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ exitCode: null, stdout, stderr: error.message, timedOut: false, spawnError: true });
    });
    child.on('close', exitCode => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ exitCode, stdout, stderr, timedOut: false });
    });
  });
}

function infrastructure(kind, detail = kind) {
  return { kind, detail };
}

function classifyExecution(result) {
  if (!result || result.spawnError) return infrastructure('spawn_error', 'host process could not start');
  if (result.timedOut) return infrastructure('timeout', 'host process timed out');
  if (result.exitCode !== 0) {
    return infrastructure('nonzero_exit', `host process exited with status ${String(result.exitCode)}`);
  }
  return null;
}

module.exports = { classifyExecution, execute, infrastructure };
