#!/usr/bin/env node
'use strict';

function getField(obj, dotPath) {
  return String(dotPath).split('.').reduce(
    (o, k) => (o == null ? undefined : o[k]), obj);
}

function agentList(data) {
  return (data && data.result && data.result.agents) || [];
}

function pane(data, handle) {
  const a = agentList(data).find((x) => x && x.name === handle);
  return a ? a.pane_id : undefined;
}

function status(data, handleOrPane) {
  const a = agentList(data).find(
    (x) => x && (x.name === handleOrPane || x.pane_id === handleOrPane));
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

function dispatch(argv, data) {
  const [cmd, ...rest] = argv;
  switch (cmd) {
    case 'pane':
      return pane(data, rest[0]);
    case 'status':
      return status(data, rest[0]);
    case 'members': {
      const i = rest.indexOf('--workspace');
      return members(data, i >= 0 ? rest[i + 1] : undefined);
    }
    case 'field':
      return field(data, rest[0]);
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

module.exports = { pane, status, members, field, getField, dispatch, format };
