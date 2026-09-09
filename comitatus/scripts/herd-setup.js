#!/usr/bin/env node
'use strict';

const { stableHome, stableHerdJs, provisionStable } = require('../hooks/herdr-orient.js');

const SAFE_ALLOW = Object.freeze([
  // herdr: read / inspect
  'Bash(herdr agent list)',
  'Bash(herdr agent get:*)',
  'Bash(herdr agent read:*)',
  'Bash(herdr pane list)',
  'Bash(herdr pane read:*)',
  'Bash(herdr pane wait-output:*)',
  'Bash(herdr workspace list)',
  'Bash(herdr worktree list:*)',
  'Bash(herdr integration status)',
  // herdr: messaging + lifecycle (NOT pane run / send-keys / agent start -
  // those are arbitrary exec/injection and are reachable only through the
  // gated composite verbs)
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
  // git: read-only + the safe fetch `up` uses
  'Bash(git fetch:*)',
  'Bash(git status:*)',
  'Bash(git branch)',
  'Bash(git branch --show-current:*)',
]);

// One rule per known-safe verb - never a blanket `herd.js:*`, so a verb added
// later is not auto-allowed.
// The herd-lifecycle verbs belong here for the same reason as `send`: an agent
// that hits a permission prompt mid-protocol stalls the herd, and a lead that
// stalls while seeding or withdrawing strands everyone downstream of it.
// `fanout` is no more privileged than `up`, which it calls; `state` only reads
// refs; `role` is a `send` with a composed body.
const HELPER_VERBS = Object.freeze([
  'status', 'members', 'wait', 'send', 'send-wait-read',
  'seed', 'broadcast', 'sync', 'withdraw', 'agent', 'up',
  'role', 'fanout', 'wait-all', 'state', 'settled',
]);

// Dispatchable, deliberately NOT baked.
//
// A baked rule reads `Bash(node <helper> <verb>:*)`, which allows whatever that
// verb shells out to - the matcher sees the helper invocation, never its child
// processes. `fan-in` runs `git merge` and `teardown` runs `git branch -D` plus
// `herdr worktree remove --force`, and SAFE_ALLOW withholds `git branch:*`,
// `git checkout:*`, `git reset:*`, and `git push:*` on purpose. Baking these two
// would route an agent straight around that list through the helper.
//
// So they prompt, once per invocation. Nothing downstream stalls on it: these
// are the two steps that destroy work, and neither sits on a path where a
// waiting peer is stranded by the pause - which is the whole reason `send` and
// the seeding verbs are baked and these are not.
const GATED_VERBS = Object.freeze(['fan-in', 'teardown']);

// The full dispatch surface. `herd-setup.test.js` holds this equal to the verbs
// parsed out of `herd.js`'s own usage(), so a verb that dispatches but appears
// in neither list fails the suite rather than becoming an invisible trap.
const DISPATCHABLE_VERBS = Object.freeze([...HELPER_VERBS, ...GATED_VERBS]);

function bakedHerdRules(homedir) {
  const base = stableHerdJs(stableHome(homedir));
  return HELPER_VERBS.map((v) => `Bash(node ${base} ${v}:*)`);
}

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

function applySettings({ raw, homedir, scope = 'user' }) {
  const json = raw && raw.trim() ? JSON.parse(raw) : {};
  if (!json.permissions || typeof json.permissions !== 'object') json.permissions = {};
  if (!Array.isArray(json.permissions.allow)) json.permissions.allow = [];

  const additions = scope === 'project'
    ? SAFE_ALLOW.slice() // committed file: no machine-specific home path
    : mergeAllow(SAFE_ALLOW.slice(), bakedHerdRules(homedir));

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
  const homedir = os.homedir();
  const target = scope === 'project'
    ? path.join(process.cwd(), '.claude', 'settings.json')
    : path.join(homedir, '.claude', scope === 'local' ? 'settings.local.json' : 'settings.json');

  // ensure the baked rules have a real target before we point at it
  try {
    provisionStable({
      skillDir: path.join(__dirname, '..', 'skills', 'herdr'),
      home: stableHome(homedir),
    });
  } catch (e) { process.stderr.write(`herd-setup: stable provision skipped (${e.message})\n`); }

  let raw = '';
  try { raw = fs.readFileSync(target, 'utf8'); } catch { /* new file */ }
  const { json, added, conflicts } = applySettings({ raw, homedir, scope });
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
  HELPER_VERBS,
  GATED_VERBS,
  DISPATCHABLE_VERBS,
  bakedHerdRules,
  mergeAllow,
  findConflicts,
  applySettings,
};
