const { normalize, summarize } = require('../../lib/resources');

const options = { host: 'claude', runId: 'test', observedAt: 1000 };
const hook = (name, at, extra = {}) => normalize({ session_id: 'test', hook_event_name: name, ...extra }, 'claude', at);
const assistant = (id, usage, extra = {}) => normalize({ type: 'assistant', session_id: 'test', message: { id, usage }, ...extra }, 'claude');

test('usage snapshots deduplicate by message id and preserve final category values', () => {
  const records = [
    assistant('a', { input_tokens: 0, output_tokens: 0 }),
    assistant('a', { input_tokens: 10, output_tokens: 4, cache_read_input_tokens: 20, cache_creation_input_tokens: 3 }),
    assistant('a', { input_tokens: 10, output_tokens: 4, cache_read_input_tokens: 20, cache_creation_input_tokens: 3 }),
    assistant('b', { input_tokens: 2, output_tokens: 6, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 })
  ];
  const report = summarize(records, options);
  expect(report.tokens.input_tokens.value).toBe(12);
  expect(report.tokens.output_tokens.value).toBe(10);
  expect(report.tokens.cache_read_input_tokens.value).toBe(20);
  expect(report.tokens.cache_creation_input_tokens.value).toBe(3);
  expect(report.tokens.total_tokens).toBeUndefined();
});

test('missing categories, missing identities and foreign sessions are never invented or merged', () => {
  const report = summarize([assistant('a', { input_tokens: 8 }), assistant(undefined, { input_tokens: 99 }), assistant('b', { input_tokens: 100 }, { session_id: 'other' })], options);
  expect(report.tokens.input_tokens.value).toBe(8);
  expect(report.tokens.output_tokens.value).toBeNull();
  expect(report.tokens.input_tokens.coverage).toBe('partial');
});

test('Codex cumulative snapshots are replaced rather than summed', () => {
  const records = [10, 20, 20].map(n => normalize({ type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: n, output_tokens: 3, cached_input_tokens: 5 } } } }, 'codex'));
  const report = summarize(records, { ...options, host: 'codex' });
  expect(report.tokens.input_tokens.value).toBe(20);
  expect(report.tokens.cached_input_tokens.value).toBe(5);
  expect(report.tokens.cache_write_input_tokens.value).toBeNull();
});

test('Codex null info and malformed usage remain unknown', () => {
  const records = [normalize({ type: 'event_msg', payload: { type: 'token_count', info: null } }, 'codex'), normalize({ type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: -1, output_tokens: '4' } } } }, 'codex')];
  const report = summarize(records, { ...options, host: 'codex' });
  expect(report.tokens.input_tokens.value).toBeNull();
  expect(report.tokens.output_tokens.value).toBeNull();
});

test('overlapping tool brackets form a union, actual durations stay separate', () => {
  const events = [hook('SessionStart', 0), hook('PreToolUse', 10, { tool_use_id: 'a' }), hook('PreToolUse', 20, { tool_use_id: 'b' }), hook('PostToolUse', 50, { tool_use_id: 'a', duration_ms: 25 }), hook('PostToolUse', 70, { tool_use_id: 'b', duration_ms: 30 }), hook('PostToolUse', 70, { tool_use_id: 'b', duration_ms: 30 })];
  const report = summarize(events, options);
  expect(report.metrics.tool_bracket_union_ms.value).toBe(60);
  expect(report.metrics.tool_execution_ms.value).toBe(55);
  expect(report.metrics.active_interval_union_ms.value).toBeNull();
  expect(report.metrics.elapsed_wall_ms.value).toBe(1000);
});

test('replayed hook pairs with the same invocation id do not create extra intervals', () => {
  const events = [hook('PreToolUse', 10, { tool_use_id: 'a' }), hook('PostToolUse', 40, { tool_use_id: 'a', duration_ms: 20 }), hook('PreToolUse', 80, { tool_use_id: 'a' }), hook('PostToolUse', 110, { tool_use_id: 'a', duration_ms: 20 })];
  const report = summarize(events, options);
  expect(report.metrics.tool_bracket_union_ms.value).toBe(30);
  expect(report.metrics.tool_execution_ms.value).toBe(20);
});

test('missing starts do not invent intervals; handoff gaps do not become human waiting', () => {
  const report = summarize([hook('PostToolUse', 10, { tool_use_id: 'a' }), hook('Stop', 20), hook('Stop', 21), hook('UserPromptSubmit', 100)], options);
  expect(report.metrics.tool_execution_ms.value).toBeNull();
  expect(report.metrics.tool_bracket_union_ms.value).toBeNull();
  expect(report.metrics.handoff_wait_ms.value).toBe(80);
  expect(report.metrics.user_wait_ms.value).toBeNull();
});

test('permission candidates and question text are not human episodes', () => {
  const report = summarize([hook('PermissionRequest', 10), hook('Notification', 20, { notification_type: 'permission_prompt' }), hook('PreToolUse', 30, { tool_use_id: 'q', tool_name: 'AskUserQuestion', tool_input: { questions: ['why?', 'how?'] } })], options);
  expect(report.metrics.human_permission_stops.value).toBeNull();
  expect(report.metrics.human_clarification_stops.value).toBeNull();
  expect(report.metrics.permission_notifications.value).toBe(1);
});

test('SDK API duration is deduplicated query evidence, not per-request thinking time', () => {
  const record = normalize({ type: 'result', session_id: 'test', uuid: 'r', duration_api_ms: 45, usage: { input_tokens: 500 } }, 'claude');
  const report = summarize([record, record], options);
  expect(report.metrics.api_query_duration_ms.value).toBe(45);
  expect(report.metrics.model_request_latency_ms.value).toBeNull();
  expect(report.tokens.input_tokens.value).toBeNull();
});

test('normalization retains no content, arguments, results, reasoning or file paths', () => {
  const record = normalize({ session_id: 'test', hook_event_name: 'PostToolUse', tool_use_id: 'a', tool_input: { secret: 'secret' }, tool_response: 'secret', transcript_path: '/secret', prompt: 'secret' }, 'claude', 0);
  expect(JSON.stringify(record)).not.toContain('secret');
});

test('reports identify their host/run, observation time and units; absent samples are unknown', () => {
  const report = summarize([], options);
  expect(report.run_id).toBe('test');
  expect(report.host).toBe('claude');
  expect(report.observed_at).toBe('1970-01-01T00:00:01.000Z');
  expect(report.metrics.elapsed_wall_ms).toMatchObject({ value: null, unit: 'ms', coverage: 'unknown' });
});
