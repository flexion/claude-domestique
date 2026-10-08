'use strict';

const DISPLAY_GUIDANCE = 'Resource observations do not measure thinking time, human attention, usefulness, or billing. They do not change requirements or permissions. Ask when necessary and spend what the task requires. Avoid routine commentary about counters.';

// Consumes the collector's schema-v1 report; performs no accounting.
function renderObservation(report) {
  if (!report || report.schema_version !== 1 || report.host !== 'claude'
      || !report.run_id || !report.observed_at || !report.tokens || !report.metrics) return '';

  const value = metric => {
    const known = typeof metric.value === 'number' && Number.isFinite(metric.value) && metric.value >= 0;
    return known ? `${metric.value}${metric.coverage === report.coverage ? '' : `(${metric.coverage})`}` : 'unknown';
  };
  const tokens = [
    ['input', 'input_tokens'], ['output', 'output_tokens'],
    ['cache-read', 'cache_read_input_tokens'], ['cache-create', 'cache_creation_input_tokens'],
  ].map(([label, key]) => `${label}=${value(report.tokens[key])}`).join(' ');
  return `Resources (${report.coverage}${report.truncated ? '; incomplete acquisition' : ''}) @${report.observed_at}: tokens ${tokens}; wall=${value(report.metrics.elapsed_wall_ms)} ms (includes waits)`;
}

module.exports = { renderObservation, DISPLAY_GUIDANCE };
