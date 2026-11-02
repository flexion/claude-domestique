#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

// #209: always on, inside herdr or not. Agents matched a plain "send a Teams
// message" request to the Microsoft 365 connector, missed the skill, and hit a
// 403 when the connector lacked ChatMessage.Send.
const TEAMS_POINTER = 'To send, read or reply in a Microsoft Teams chat or meeting chat, invoke `comitatus:teams`.';

function buildOrientation({ codexPlugin } = {}) {
  return [
    '# herdr (comitatus)',
    '',
    'You are running inside herdr, a terminal-native agent multiplexer.',
    'Invoke the `comitatus:herdr` skill for worktree / herd / pane / agent workflows.',
    '',
    'Use native `herdr` verbs addressed by handle; there is no helper script:',
    '  herdr agent list | get | read | wait <handle>',
    '  herdr agent prompt <handle> "[from <you> reply|fyi #<id>] <one line>"',
    'The message protocol and briefing template are in the skill.',
    '',
    codexPlugin === true
      ? 'comitatus is installed as a Codex plugin, so codex agents in this herd load the same `herdr` skill from their own plugin install.'
      : codexPlugin === false
        ? 'comitatus is NOT installed as a Codex plugin, so codex agents in this herd cannot see the `herdr` skill. Install it there with `codex plugin add comitatus@claude-domestique`.'
        : 'Codex plugin status for comitatus is unknown.',
  ].join('\n');
}

// Whether comitatus is installed as a Codex plugin. Reported to the agent so it
// knows if codex peers in the herd can see the herdr skill. Nothing is copied
// into the Codex home: a Codex agent gets the skill by installing the plugin.
function codexPluginInstalled({ codexHome }) {
  const cacheRoot = path.join(codexHome, 'plugins', 'cache');
  let marketplaces;
  try {
    marketplaces = fs.readdirSync(cacheRoot, { withFileTypes: true });
  } catch {
    return false;
  }
  return marketplaces.some(entry =>
    entry.isDirectory() && fs.existsSync(path.join(cacheRoot, entry.name, 'comitatus'))
  );
}

// Outside herdr only the Teams pointer is injected, with no status line.
// Report-only and write-free: the hook neither copies the skill anywhere nor
// touches the Codex home. 2.0.0 removed the stable `~/.claude/comitatus` copy,
// which existed only to give the retired herd.js helper an allowlistable path.
function processSessionStart({ env, codexHome }) {
  if (env.HERDR_ENV !== '1') {
    return { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: TEAMS_POINTER } };
  }

  let codexPlugin;
  try {
    codexPlugin = codexPluginInstalled({ codexHome });
  } catch {
    codexPlugin = undefined;
  }

  return {
    systemMessage: `📍 Comitatus: herdr${codexPlugin === undefined ? '' : codexPlugin ? ' (codex: installed)' : ' (codex: not installed)'}`,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: `${buildOrientation({ codexPlugin })}\n\n${TEAMS_POINTER}`,
    },
  };
}

async function readStdin() {
  let s = '';
  try {
    for await (const chunk of process.stdin) s += chunk;
  } catch {
    /* ignore */
  }
  return s;
}

function resolveCodexHome(env, homedir) {
  return env.CODEX_HOME ? path.resolve(env.CODEX_HOME) : path.join(homedir, '.codex');
}

async function main() {
  await readStdin(); // drain stdin; input is unused
  const result = processSessionStart({
    env: process.env,
    codexHome: resolveCodexHome(process.env, os.homedir()),
  });
  if (result) console.log(JSON.stringify(result));
}

if (require.main === module) main();

module.exports = {
  TEAMS_POINTER,
  buildOrientation,
  codexPluginInstalled,
  resolveCodexHome,
  processSessionStart,
};
