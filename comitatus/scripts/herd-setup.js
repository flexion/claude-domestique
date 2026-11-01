#!/usr/bin/env node
'use strict';

// Native herdr verbs only. 2.0.0 removed the herd.js helper and its per-verb
// rules; every rule here names a `herdr` or read-only `git` command directly,
// so nothing is machine-specific and every scope gets the same list.
const SAFE_ALLOW = Object.freeze([
  // herdr: read / inspect
  'Bash(herdr --version)',
  'Bash(herdr status)',
  'Bash(herdr agent list)',
  'Bash(herdr agent get:*)',
  'Bash(herdr agent read:*)',
  'Bash(herdr agent explain:*)',
  'Bash(herdr pane list:*)',
  'Bash(herdr pane get:*)',
  'Bash(herdr pane current)',
  'Bash(herdr pane read:*)',
  'Bash(herdr pane wait-output:*)',
  'Bash(herdr tab list:*)',
  'Bash(herdr workspace list)',
  'Bash(herdr worktree list:*)',
  'Bash(herdr integration status)',
  // herdr: messaging + lifecycle. NOT agent start, pane run, or send-keys:
  // agent start forwards arbitrary agent-CLI arguments (permission-bypass
  // flags included), and pane run / send-keys are arbitrary exec / keystroke
  // injection, so each stays a human approval.
  'Bash(herdr agent prompt:*)',
  'Bash(herdr agent rename:*)',
  'Bash(herdr agent wait:*)',
  'Bash(herdr tab create:*)',
  'Bash(herdr tab rename:*)',
  'Bash(herdr tab focus:*)',
  'Bash(herdr tab close:*)',
  'Bash(herdr workspace create:*)',
  'Bash(herdr workspace close:*)',
  'Bash(herdr worktree create:*)',
  'Bash(herdr worktree open:*)',
  'Bash(herdr worktree remove:*)',
  // git: read-only + fetch
  'Bash(git fetch:*)',
  'Bash(git remote)',
  'Bash(git status:*)',
  'Bash(git branch)',
  'Bash(git branch --show-current:*)',
]);

function mergeAllow(existing, additions) {
  const out = existing.slice();
  for (const rule of additions) if (!out.includes(rule)) out.push(rule);
  return out;
}

function findConflicts(json, additions) {
  const deny = (json.permissions && json.permissions.deny) || [];
  const ask = (json.permissions && json.permissions.ask) || [];
  const out = [];
  for (const rule of additions) {
    if (deny.includes(rule)) out.push({ rule, in: 'deny' });
    else if (ask.includes(rule)) out.push({ rule, in: 'ask' });
  }
  return out;
}

function applySettings({ raw }) {
  const json = raw && raw.trim() ? JSON.parse(raw) : {};
  if (!json.permissions || typeof json.permissions !== 'object') json.permissions = {};
  if (!Array.isArray(json.permissions.allow)) json.permissions.allow = [];

  const additions = SAFE_ALLOW.slice();
  const conflicts = findConflicts(json, additions);
  const before = json.permissions.allow.slice();
  json.permissions.allow = mergeAllow(before, additions);
  const added = json.permissions.allow.filter((r) => !before.includes(r));
  return { json: JSON.stringify(json, null, 2) + '\n', added, conflicts };
}

function main() {
  const os = require('os');
  const fs = require('fs');
  const path = require('path');
  const scope = process.argv.includes('--project') ? 'project'
    : process.argv.includes('--local') ? 'local' : 'user';
  const target = scope === 'project'
    ? path.join(process.cwd(), '.claude', 'settings.json')
    : path.join(os.homedir(), '.claude', scope === 'local' ? 'settings.local.json' : 'settings.json');

  let raw = '';
  try { raw = fs.readFileSync(target, 'utf8'); } catch { /* new file */ }
  const { json, added, conflicts } = applySettings({ raw });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, json);

  process.stdout.write(`herd-setup: wrote ${target} (${scope} scope)\n`);
  process.stdout.write(added.length
    ? `added ${added.length} rule(s):\n${added.map((r) => '  ' + r).join('\n')}\n`
    : 'no new rules (already current)\n');
  if (conflicts.length) {
    process.stdout.write('WARNING: these rules are shadowed by an existing deny/ask entry:\n');
    for (const c of conflicts) process.stdout.write(`  ${c.rule}  (in ${c.in})\n`);
  }
}

if (require.main === module) main();

module.exports = {
  SAFE_ALLOW,
  mergeAllow,
  findConflicts,
  applySettings,
};
