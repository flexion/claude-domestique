'use strict';

const { classifyExecution, infrastructure } = require('../process');

function base(options) {
  return {
    scenario_id: options.scenarioId,
    host: 'codex',
    host_version: options.hostVersion,
    arm: options.arm,
    trial: options.trial,
    outcome: 'PASS',
    observations: { selected_skill: null, output: '', exit_status: 0, state_files: {}, extra: {} },
    state_changes: [],
    invariants: [],
  };
}

function failed(options, cause) {
  return { ...base(options), outcome: 'INFRASTRUCTURE_FAILURE', infrastructure_failure: cause };
}

function promptFor(options) {
  if (!options.skill) return options.prompt || '';
  return `$${options.skill}${options.input ? ` ${options.input}` : ''}`;
}

function parseJsonLines(stdout) {
  const lines = stdout.split(/\r?\n/).filter(line => line.trim() !== '');
  return lines.map(line => JSON.parse(line));
}

function finalMessage(events) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event && event.type === 'item.completed' && event.item &&
      event.item.type === 'agent_message' && typeof event.item.text === 'string') {
      return event.item.text;
    }
    if (event && event.type === 'turn.completed' && typeof event.last_agent_message === 'string') {
      return event.last_agent_message;
    }
  }
  return null;
}

function createCodexAdapter({ execute, binary = 'codex', prefixArgs = [] }) {
  if (typeof execute !== 'function') throw new Error('Codex adapter requires execute');
  return {
    async install(options) {
      const env = { ...process.env, ...(options.env || {}), CODEX_HOME: options.home };
      const marketplaceName = options.marketplaceName || 'claude-domestique';
      const commands = [
        ['plugin', 'marketplace', 'add', options.marketplace],
        ...options.plugins.map(plugin => ['plugin', 'add', `${plugin}@${marketplaceName}`]),
      ];
      for (const args of commands) {
        const result = await execute(binary, [...prefixArgs, ...args], { env, cwd: options.cwd });
        const cause = classifyExecution(result);
        if (cause) return { ok: false, infrastructure_failure: cause };
      }
      return { ok: true };
    },
    async run(options) {
      const env = { ...process.env, ...(options.env || {}), CODEX_HOME: options.home };
      const args = ['exec', '--json', '--ephemeral', '--sandbox', 'workspace-write', promptFor(options)];
      const execution = await execute(binary, [...prefixArgs, ...args], { env, cwd: options.cwd, timeoutMs: options.timeoutMs });
      const cause = classifyExecution(execution);
      if (cause) return failed(options, cause);
      let events;
      try {
        events = parseJsonLines(execution.stdout);
      } catch (error) {
        return failed(options, infrastructure('invalid_output', 'Codex returned invalid JSONL'));
      }
      const output = finalMessage(events);
      if (output === null) {
        return failed(options, infrastructure('missing_final_response', 'Codex returned no final response'));
      }
      const result = base(options);
      result.observations.output = output;
      const marker = /PARITY_RESULT\s+(\{[^\n]+\})/.exec(output);
      if (marker) {
        try {
          const reported = JSON.parse(marker[1]);
          result.observations.selected_skill = reported.selected_skill || null;
          result.observations.selection_outcome = reported.outcome || null;
          result.forbidden_actions = Array.isArray(reported.forbidden_actions)
            ? reported.forbidden_actions
            : [];
        } catch { /* malformed self-report remains an observable miss */ }
      }
      result.observations.exit_status = execution.exitCode;
      result.extra = { event_count: events.length };
      return result;
    },
  };
}

module.exports = { createCodexAdapter };
