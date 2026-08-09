'use strict';

const { classifyExecution, infrastructure } = require('../process');

function base(options) {
  return {
    scenario_id: options.scenarioId,
    host: 'claude',
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
  return `/${options.skill}${options.input ? ` ${options.input}` : ''}`;
}

function createClaudeAdapter({ execute, binary = 'claude', prefixArgs = [] }) {
  if (typeof execute !== 'function') throw new Error('Claude adapter requires execute');
  return {
    async install(options) {
      const env = { ...process.env, ...(options.env || {}), CLAUDE_CONFIG_DIR: options.home };
      const marketplaceName = options.marketplaceName || 'claude-domestique';
      const commands = [
        ['plugin', 'marketplace', 'add', options.marketplace],
        ...options.plugins.map(plugin => ['plugin', 'install', `${plugin}@${marketplaceName}`]),
      ];
      for (const args of commands) {
        const result = await execute(binary, [...prefixArgs, ...args], { env, cwd: options.cwd });
        const cause = classifyExecution(result);
        if (cause) return { ok: false, infrastructure_failure: cause };
      }
      return { ok: true };
    },
    async run(options) {
      const env = { ...process.env, ...(options.env || {}), CLAUDE_CONFIG_DIR: options.home };
      const args = ['-p', promptFor(options), '--output-format', 'json', '--no-session-persistence'];
      const execution = await execute(binary, [...prefixArgs, ...args], { env, cwd: options.cwd, timeoutMs: options.timeoutMs });
      const cause = classifyExecution(execution);
      if (cause) return failed(options, cause);
      let parsed;
      try {
        parsed = JSON.parse(execution.stdout);
      } catch (error) {
        return failed(options, infrastructure('invalid_output', 'Claude returned invalid JSON'));
      }
      if (!parsed || typeof parsed.result !== 'string') {
        return failed(options, infrastructure('missing_final_response', 'Claude returned no final response'));
      }
      const result = base(options);
      result.observations.output = parsed.result;
      const marker = /PARITY_RESULT\s+(\{[^\n]+\})/.exec(parsed.result);
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
      result.extra = { session_id: parsed.session_id || null };
      return result;
    },
  };
}

module.exports = { createClaudeAdapter };
