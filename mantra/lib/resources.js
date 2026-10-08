/** Measurement-only projection and aggregation. No message content is retained. */
const CATEGORIES = {
  claude: ['input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens'],
  codex: ['input_tokens', 'output_tokens', 'cached_input_tokens', 'cache_write_input_tokens', 'reasoning_output_tokens']
};

const valid = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const identity = value => typeof value === 'string' && value.length > 0 && value.length <= 256 ? value : null;
const metric = (value, unit, semantics) => ({ value, unit, coverage: value === null ? 'unknown' : 'partial', semantics });

function normalize(input, host, observedAt = null) {
  if (!CATEGORIES[host] || !input || typeof input !== 'object') return null;
  const record = { host, session_id: identity(input.session_id), at: valid(observedAt) ? observedAt : null };
  if (input.hook_event_name) {
    record.kind = 'hook';
    record.event = input.hook_event_name;
    record.id = identity(input.tool_use_id);
    record.tool = input.tool_name === 'AskUserQuestion' ? 'AskUserQuestion' : null;
    record.notification = input.notification_type === 'permission_prompt' ? 'permission_prompt' : null;
    record.duration_ms = host === 'claude' && valid(input.duration_ms) ? input.duration_ms : null;
    return record;
  }
  if (host === 'claude' && input.type === 'assistant' && input.message?.usage) {
    record.kind = 'usage';
    record.id = identity(input.message.id);
    record.usage = {};
    for (const key of CATEGORIES[host]) {
      if (valid(input.message.usage[key])) record.usage[key] = input.message.usage[key];
    }
    return record;
  }
  if (host === 'codex' && input.type === 'event_msg' && input.payload?.type === 'token_count' && input.payload.info?.total_token_usage) {
    record.kind = 'cumulative_usage';
    record.usage = {};
    for (const key of CATEGORIES[host]) {
      const value = input.payload.info.total_token_usage[key];
      if (valid(value)) record.usage[key] = value;
    }
    return record;
  }
  if (host === 'claude' && input.type === 'result' && valid(input.duration_api_ms)) {
    record.kind = 'api_duration';
    record.id = identity(input.uuid);
    record.duration_ms = input.duration_api_ms;
    return record;
  }
  return null;
}

function union(intervals) {
  if (!intervals.length) return null;
  const sorted = intervals.slice().sort((a, b) => a[0] - b[0]);
  let [start, end] = sorted[0];
  let total = 0;
  for (const [nextStart, nextEnd] of sorted.slice(1)) {
    if (nextStart <= end) end = Math.max(end, nextEnd);
    else {
      total += end - start;
      [start, end] = [nextStart, nextEnd];
    }
  }
  return total + end - start;
}

function summarize(events, { host, runId, observedAt = Date.now(), truncated = false }) {
  if (!CATEGORIES[host] || !identity(runId) || !valid(observedAt)) throw new Error('Invalid report identity or observation time');
  const records = events.filter(record => record && record.host === host && (!record.session_id || record.session_id === runId));
  const messages = new Map();
  const api = new Map();
  let cumulative = null;
  for (const record of records) {
    if (record.kind === 'usage' && record.id) {
      // Each row is a snapshot; later categories replace earlier values, not add.
      messages.set(record.id, { ...messages.get(record.id), ...record.usage });
    }
    if (record.kind === 'cumulative_usage') cumulative = record.usage;
    if (record.kind === 'api_duration' && record.id) api.set(record.id, record.duration_ms);
  }
  const tokens = {};
  for (const category of CATEGORIES[host]) {
    const usages = host === 'codex' ? (cumulative ? [cumulative] : []) : [...messages.values()];
    const values = usages.map(usage => usage[category]);
    const value = values.length && values.every(valid) ? values.reduce((a, b) => a + b, 0) : null;
    tokens[category] = metric(value, 'tokens', host === 'codex' ? 'Last observed cumulative session snapshot; cache/reasoning are subsets; no billing equivalence' : 'Observed message snapshots by message.id; categories kept separate; no billing equivalence');
  }
  const tools = new Map();
  const completedTools = new Set();
  const brackets = [];
  const durations = new Map();
  const gaps = [];
  let stoppedAt = null;
  let startedAt = null;
  let notifications = null;
  const hooks = records.filter(record => record.kind === 'hook' && valid(record.at)).sort((a, b) => a.at - b.at);
  for (const record of hooks) {
    if (record.event === 'SessionStart' && startedAt === null) startedAt = record.at;
    if (record.event === 'Stop' && stoppedAt === null) stoppedAt = record.at;
    if (record.event === 'UserPromptSubmit' && stoppedAt !== null) {
      gaps.push([stoppedAt, record.at]);
      stoppedAt = null;
    }
    if (record.event === 'Notification' && record.notification === 'permission_prompt') notifications = (notifications ?? 0) + 1;
    if (!record.id) continue;
    if (record.event === 'PreToolUse' && !tools.has(record.id)) tools.set(record.id, record.at);
    if (['PostToolUse', 'PostToolUseFailure'].includes(record.event)) {
      if (valid(record.duration_ms)) durations.set(record.id, record.duration_ms);
      const start = tools.get(record.id);
      if (start !== undefined && record.at >= start && !completedTools.has(record.id)) {
        brackets.push([start, record.at]);
        completedTools.add(record.id);
      }
    }
  }
  // A still-open handoff is observable to this snapshot, but not human attention.
  if (stoppedAt !== null && observedAt >= stoppedAt) gaps.push([stoppedAt, observedAt]);
  const sum = values => values.length ? values.reduce((a, b) => a + b, 0) : null;
  const metrics = {
    elapsed_wall_ms: metric(startedAt !== null && observedAt >= startedAt ? observedAt - startedAt : null, 'ms', 'First observed SessionStart to observation; includes resume gaps'),
    model_request_latency_ms: metric(null, 'ms', 'Hooks do not expose request start/end'),
    api_query_duration_ms: metric(sum([...api.values()]), 'ms', 'Claude SDK query API duration; not per-request latency or thinking time'),
    tool_execution_ms: metric(sum([...durations.values()]), 'ms', 'Sum of identified host execution durations; may overlap, not a wall-time total'),
    tool_bracket_union_ms: metric(union(brackets), 'ms', 'Union of paired hook receipt brackets; includes approval, hook and dispatch overhead'),
    active_interval_union_ms: metric(null, 'ms', 'Supported hook/transcript observations do not establish execution interval boundaries'),
    handoff_wait_ms: metric(union(gaps), 'ms', 'Stop-to-next-prompt wall gaps; may include automation and background activity'),
    user_wait_ms: metric(null, 'ms', 'No reliable human wait boundaries'),
    human_permission_stops: metric(null, 'episodes', 'Approval candidates may be auto-approved; no confirmed UI episode identity'),
    human_clarification_stops: metric(null, 'episodes', 'Question/tool requests do not prove human yields'),
    permission_notifications: metric(notifications, 'notifications', 'Observed permission_prompt notifications, not episodes; delayed, repeatable, may target automated SDK callbacks'),
    collector_work_ms: metric(sum(records.filter(r => r.kind === 'overhead').map(r => r.duration_ms).filter(valid)), 'ms', 'Collector work sample excludes final sample write and process startup')
  };
  return {
    schema_version: 1, host, run_id: runId, observed_at: new Date(observedAt).toISOString(),
    coverage: 'partial', truncated, tokens, metrics
  };
}

module.exports = { normalize, summarize, union };
