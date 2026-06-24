#!/usr/bin/env node
'use strict';

function getField(obj, dotPath) {
  return String(dotPath).split('.').reduce(
    (o, k) => (o == null ? undefined : o[k]), obj);
}

function agentList(data) {
  return (data && data.result && data.result.agents) || [];
}

function findAgent(data, handleOrPane) {
  return agentList(data).find(
    (x) => x && (x.name === handleOrPane || x.pane_id === handleOrPane));
}

function pane(data, handle) {
  const a = agentList(data).find((x) => x && x.name === handle);
  return a ? a.pane_id : undefined;
}

function status(data, handleOrPane) {
  const a = findAgent(data, handleOrPane);
  return a ? a.agent_status : undefined;
}

function members(data, workspaceId) {
  return agentList(data)
    .filter((x) => x && x.name && (workspaceId ? x.workspace_id === workspaceId : true))
    .map((x) => x.name);
}

function field(data, dotPath) {
  return getField(data, dotPath);
}

function submitKeys(data, handleOrPane) {
  const a = findAgent(data, handleOrPane);
  if (!a) return [];
  return a.agent === 'codex' ? ['Enter', 'Enter'] : ['Enter'];
}

function hasAgents(data) {
  return !!(data && data.result && Array.isArray(data.result.agents));
}

function loadAgentList(data, deps) {
  if (hasAgents(data)) return data;
  if (deps && deps.run) return JSON.parse(deps.run('herdr', ['agent', 'list']));
  return data; // no stdin, no runner: leave as-is (pure callers)
}

function dispatch(argv, data, deps) {
  const [cmd, ...rest] = argv;
  switch (cmd) {
    case 'pane':
      return pane(loadAgentList(data, deps), rest[0]);
    case 'status':
      return status(loadAgentList(data, deps), rest[0]);
    case 'members': {
      const i = rest.indexOf('--workspace');
      return members(loadAgentList(data, deps), i >= 0 ? rest[i + 1] : undefined);
    }
    case 'field':
      return field(data, rest[0]);
    case 'submit-keys':
      return submitKeys(data, rest[0]);
    default:
      throw new Error(`unknown command: ${cmd}`);
  }
}

function format(value) {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join('\n');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

async function readStdin() {
  let s = '';
  for await (const chunk of process.stdin) s += chunk;
  return s;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === 'up') {
    try {
      const { up, defaultRun } = require('./up.js');
      const result = up(argv.slice(1), { run: defaultRun });
      process.stdout.write(JSON.stringify(result) + '\n');
    } catch (e) {
      process.stderr.write(`herd up: ${e.message}\n`);
      process.exit(1);
    }
    return;
  }
  const raw = await readStdin();
  let data;
  try {
    data = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    process.stderr.write('herd: invalid JSON on stdin\n');
    process.exit(1);
  }
  let out;
  try {
    out = dispatch(argv, data);
  } catch (e) {
    process.stderr.write(`herd: ${e.message}\n`);
    process.exit(1);
  }
  const text = format(out);
  if (text) process.stdout.write(text + '\n');
}

if (require.main === module) main();

module.exports = {
  pane,
  status,
  members,
  field,
  submitKeys,
  loadAgentList,
  getField,
  dispatch,
  format,
};
