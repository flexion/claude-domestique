const { renderObservation, DISPLAY_GUIDANCE } = require('../resource-display');

function report() {
  return {
    schema_version: 1,
    host: 'claude',
    run_id: 'run-a',
    observed_at: '2026-10-08T12:00:00.000Z',
    coverage: 'partial',
    truncated: false,
    tokens: {
      input_tokens: { value: 12, unit: 'tokens', coverage: 'partial' },
      output_tokens: { value: 5, unit: 'tokens', coverage: 'partial' },
      cache_read_input_tokens: { value: 0, unit: 'tokens', coverage: 'partial' },
      cache_creation_input_tokens: { value: null, unit: 'tokens', coverage: 'unknown' },
    },
    metrics: {
      elapsed_wall_ms: { value: 150, unit: 'ms', coverage: 'partial' },
      model_request_latency_ms: { value: null, unit: 'ms', coverage: 'unknown' },
      human_permission_stops: { value: null, unit: 'episodes', coverage: 'unknown' },
    },
  };
}

test('shows observation time, units, coverage and separate token categories', () => {
  const text = renderObservation(report());
  expect(text).toContain('2026-10-08T12:00:00.000Z');
  expect(text).toContain('Resources (partial)');
  expect(text).toContain('tokens input=12 output=5 cache-read=0 cache-create=unknown');
  expect(text).toContain('wall=150 ms (includes waits)');
  expect(text).not.toMatch(/model_request_latency_ms|human_permission_stops|run-a/);
  expect(text).not.toMatch(/total_tokens|success score|countdown|quota|automatically stop/i);
});

test('separates once-per-session guidance from refreshed observations', () => {
  expect(DISPLAY_GUIDANCE).toContain('do not change requirements or permissions');
  expect(DISPLAY_GUIDANCE).toContain('Ask when necessary');
  expect(DISPLAY_GUIDANCE).toContain('spend what the task requires');
  expect(DISPLAY_GUIDANCE).toContain('Avoid routine commentary about counters');
  expect(renderObservation(report())).not.toContain('Ask when necessary');
});

test('marks incomplete acquisition and never turns missing or invalid values into zero', () => {
  const data = report();
  data.truncated = true;
  data.metrics.elapsed_wall_ms.value = -1;
  const text = renderObservation(data);
  expect(text).toContain('incomplete acquisition');
  expect(text).toContain('wall=unknown ms (includes waits)');
});

test('retains a field coverage that differs from shared report coverage', () => {
  const data = report();
  data.tokens.input_tokens.coverage = 'complete';
  expect(renderObservation(data)).toContain('input=12(complete)');
});

test.each([null, {}, { ...report(), schema_version: 2 }, { ...report(), host: 'codex' }])(
  'does not display an unavailable or unsupported report', data => {
    expect(renderObservation(data)).toBe('');
  },
);
