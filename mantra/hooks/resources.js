#!/usr/bin/env node
/** Opt-in collection, with explicit experimental Claude display mode. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { performance } = require('perf_hooks');
const { normalize, summarize } = require('../lib/resources');
const { renderObservation, DISPLAY_GUIDANCE } = require('../lib/resource-display');

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_INPUT_BYTES = 1024 * 1024;

function paths(host, runId, env) {
  const directory = env.MANTRA_RESOURCE_DIR;
  if (!directory || !path.isAbsolute(directory)) throw new Error('Set an absolute MANTRA_RESOURCE_DIR');
  const key = crypto.createHash('sha256').update(JSON.stringify([host, runId])).digest('hex');
  return { directory, journal: path.join(directory, `${key}.jsonl`), snapshot: path.join(directory, `${key}.json`) };
}

function readBounded(file) {
  // Read at most MAX_BYTES + 1 even if the file grows after it is opened.
  const fd = fs.openSync(file, 'r');
  try {
    const buffer = Buffer.alloc(MAX_BYTES + 1);
    const size = fs.readSync(fd, buffer, 0, buffer.length, 0);
    return size > MAX_BYTES ? { text: '', truncated: true } : { text: buffer.subarray(0, size).toString('utf8'), truncated: false };
  } finally {
    fs.closeSync(fd);
  }
}

function parseLines(text, projection) {
  const records = [];
  let malformed = false;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const record = projection(JSON.parse(line));
      if (record) records.push(record);
    } catch { malformed = true; }
  }
  return { records, malformed };
}

function collect(input, env = process.env) {
  if (env.MANTRA_RESOURCES !== 'collect') return null;
  const host = env.MANTRA_RESOURCE_HOST;
  const observation = normalize(input, host, Date.now());
  if (!observation?.session_id || observation.kind !== 'hook') return null;
  const start = performance.now();
  const files = paths(host, observation.session_id, env);
  fs.mkdirSync(files.directory, { recursive: true, mode: 0o700 });
  let journal = fs.existsSync(files.journal) ? readBounded(files.journal) : { text: '', truncated: false };
  const line = `${JSON.stringify(observation)}\n`;
  let truncated = journal.truncated || Buffer.byteLength(journal.text) + Buffer.byteLength(line) > MAX_BYTES;
  if (!truncated) {
    fs.appendFileSync(files.journal, line, { mode: 0o600 });
    journal = readBounded(files.journal);
    truncated ||= journal.truncated;
  }
  const parsed = parseLines(journal.text, value => value);
  let records = parsed.records;
  truncated ||= parsed.malformed;
  if (typeof input.transcript_path === 'string' && input.transcript_path) {
    try {
      const transcript = readBounded(input.transcript_path);
      const projected = parseLines(transcript.text, value => normalize(value, host));
      // Hook timing comes only from this collector's receipt journal.
      records = records.concat(projected.records.filter(value => value.kind !== 'hook'));
      truncated ||= transcript.truncated || projected.malformed;
    } catch { truncated = true; }
  }
  const report = summarize(records, { host, runId: observation.session_id, observedAt: Date.now(), truncated });
  const temporary = `${files.snapshot}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(report)}\n`, { mode: 0o600 });
    fs.renameSync(temporary, files.snapshot);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  // The next snapshot includes this sample. Excludes this final sample write
  // and process startup; external measurements include those costs.
  const overhead = { host, session_id: observation.session_id, kind: 'overhead', duration_ms: performance.now() - start };
  const sample = `${JSON.stringify(overhead)}\n`;
  const journalSize = fs.statSync(files.journal).size;
  if (journalSize + Buffer.byteLength(sample) <= MAX_BYTES) fs.appendFileSync(files.journal, sample);
  return report;
}

function readSnapshot(host, runId, env = process.env) {
  try {
    const report = JSON.parse(readBounded(paths(host, runId, env).snapshot).text);
    return report.host === host && report.run_id === runId ? report : null;
  } catch { return null; }
}

function processInput(input, env = process.env) {
  const display = env.MANTRA_RESOURCES === 'display';
  if (display && env.MANTRA_RESOURCE_HOST !== 'claude') return {};
  const report = collect(input, display ? { ...env, MANTRA_RESOURCES: 'collect' } : env);
  if (!display || !report) return {};
  const event = input.hook_event_name;
  let context = '';
  if (event === 'SessionStart' && input.source !== 'resume') context = DISPLAY_GUIDANCE;
  if (['UserPromptSubmit', 'PostToolUse', 'PostToolUseFailure'].includes(event)) context = renderObservation(report);
  return context ? { hookSpecificOutput: { hookEventName: event, additionalContext: context } } : {};
}

if (require.main === module) {
  let input = '';
  let exceeded = false;
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    if (exceeded) return;
    if (Buffer.byteLength(input) + Buffer.byteLength(chunk) > MAX_INPUT_BYTES) {
      exceeded = true;
      input = '';
    } else input += chunk;
  });
  process.stdin.on('end', () => {
    const hostIndex = process.argv.indexOf('--host');
    const env = hostIndex >= 0 ? { ...process.env, MANTRA_RESOURCE_HOST: process.argv[hostIndex + 1] } : process.env;
    let output = {};
    try { if (!exceeded) output = processInput(JSON.parse(input), env); }
    catch (error) { process.stderr.write(`mantra: resource collection unavailable: ${error.message}\n`); }
    process.stdout.write(`${JSON.stringify(output)}\n`);
  });
}

module.exports = { collect, readSnapshot, processInput, MAX_BYTES };
