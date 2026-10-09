'use strict';

const INJECT_GUIDANCE = 'Cache reads measure reused input, not distinct new input or progress. Resource observations do not measure thinking time, human attention, usefulness, or billing. They do not change requirements or permissions. Ask when necessary and spend what the task requires. Avoid routine commentary about counters.';

// Consumes the collector's schema-v1 report; performs no accounting.
function renderObservation(report) {
  if (!report || report.schema_version !== 1 || !['claude', 'codex'].includes(report.host)
      || !report.run_id || !report.observed_at || !report.tokens || !report.metrics) return '';

  const value = metric => {
    const known = typeof metric?.value === 'number' && Number.isFinite(metric.value) && metric.value >= 0;
    return known ? `${metric.value}${metric.coverage === report.coverage ? '' : `(${metric.coverage})`}` : 'unknown';
  };
  const categories = report.host === 'codex' ? [
    ['input', 'input_tokens'], ['output', 'output_tokens'],
    ['cached', 'cached_input_tokens'], ['cache-write', 'cache_write_input_tokens'],
    ['reasoning', 'reasoning_output_tokens'],
  ] : [
    ['input', 'input_tokens'], ['output', 'output_tokens'],
    ['cache-read', 'cache_read_input_tokens'], ['cache-create', 'cache_creation_input_tokens'],
  ];
  const tokens = categories.map(([label, key]) => `${label}=${value(report.tokens[key])}`).join(' ');
  const subsets = report.host === 'codex' ? ' (cache/reasoning are subsets)' : '';
  return `Resources (${report.coverage}${report.truncated ? '; incomplete acquisition' : ''}) observed@${report.observed_at}: tokens ${tokens}${subsets} (session observations; cumulative, may lag completed turns); wall=${value(report.metrics.elapsed_wall_ms)} ms (includes waits)`;
}

module.exports = { renderObservation, INJECT_GUIDANCE };
