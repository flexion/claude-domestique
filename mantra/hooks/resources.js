#!/usr/bin/env node
/** Automatic, coverage-labelled resource observations and periodic reflection. */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { performance } = require('perf_hooks');
const { normalize, summarize } = require('../lib/resources');
const { renderObservation, INJECT_GUIDANCE } = require('../lib/resource-inject');

const { REFLECTION } = require('./behavior');

const REFLECTION_INTERVAL_MS = 5 * 60 * 1000;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_INPUT_BYTES = 1024 * 1024;

function paths(host, runId, options = {}) {
  const directory = options.directory || path.join(os.homedir(), '.cache', 'claude-domestique', 'mantra', 'resources');
  if (!path.isAbsolute(directory)) throw new Error('Resource directory must be absolute');
  const key = crypto.createHash('sha256').update(JSON.stringify([host, runId])).digest('hex');
  return { directory, journal: path.join(directory, `${key}.jsonl`), snapshot: path.join(directory, `${key}.json`), checkpoint: path.join(directory, `${key}.checkpoint`) };
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

function collect(input, options = {}) {
  if (input?.agent_id) return null;
  const host = options.host;
  const observation = normalize(input, host, Date.now());
  if (!observation?.session_id || observation.kind !== 'hook') return null;
  const start = performance.now();
  const files = paths(host, observation.session_id, options);
  fs.mkdirSync(files.directory, { recursive: true, mode: 0o700 });
  if (input.hook_event_name === 'SessionStart') prune(files.directory);
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

function readSnapshot(host, runId, options = {}) {
  try {
    const report = JSON.parse(readBounded(paths(host, runId, options).snapshot).text);
    return report.host === host && report.run_id === runId ? report : null;
  } catch { return null; }
}

function prune(directory) {
  const cutoff = Date.now() - RETENTION_MS;
  for (const name of fs.readdirSync(directory)) {
    if (!/^[a-f0-9]{64}\.(?:jsonl|json|checkpoint|checkpoint\.lock|checkpoint\.\d+\.claim|(?:checkpoint|json)\.\d+(?:\.[a-f0-9-]+)?\.tmp)$/.test(name)) continue;
    const file = path.join(directory, name);
    try { if (fs.statSync(file).mtimeMs < cutoff) fs.unlinkSync(file); }
    catch { /* Another hook may have removed or replaced it. */ }
  }
}

function saveCheckpoint(file, now) {
  const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, String(now), { mode: 0o600 });
    fs.renameSync(temporary, file);
  } finally {
    try { fs.unlinkSync(temporary); } catch { /* Already renamed or unavailable. */ }
  }
}

function checkpoint(input, options, reset) {
  const file = paths(options.host, input.session_id, options).checkpoint;
  const now = Date.now();
  try {
    let previous;
    try { previous = Number(fs.readFileSync(file, 'utf8')); } catch { /* First receipt. */ }
    if (reset || !Number.isFinite(previous) || now < previous) {
      saveCheckpoint(file, now);
      return false;
    }
    // Immutable claims form a chain from the last observed checkpoint. A
    // concurrent pointer write may lag, but following published claims recovers
    // the latest time without deleting or releasing another process's lock.
    while (now - previous >= REFLECTION_INTERVAL_MS) {
      const claim = `${file}.${previous}.claim`;
      let next;
      try { next = Number(fs.readFileSync(claim, 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') return false; }
      if (Number.isFinite(next)) {
        if (next <= previous) return false;
        previous = next;
        continue;
      }
      // Publish a fully written receipt with an exclusive hard link. A crash
      // after publication leaves a usable claim, not an abandoned shared lock.
      const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
      try {
        fs.writeFileSync(temporary, String(now), { mode: 0o600 });
        fs.linkSync(temporary, claim);
      } catch { return false; }
      finally { try { fs.unlinkSync(temporary); } catch { /* Best-effort cleanup. */ } }
      // Pointer updates are only an optimization: the published claim is final.
      try { saveCheckpoint(file, now); } catch { /* A later reader follows the claim. */ }
      return true;
    }
  } catch { /* Resource context remains available if cadence storage fails. */ }
  return false;
}

function processInput(input, options = {}) {
  const report = collect(input, options);
  if (!report) return {};
  const event = input.hook_event_name;
  let context = '';
  if (event === 'SessionStart' || event === 'UserPromptSubmit') checkpoint(input, options, true);
  if (event === 'SessionStart' && input.source !== 'resume') context = INJECT_GUIDANCE;
  const observationEvents = report.host === 'codex'
    ? ['UserPromptSubmit', 'PostToolUse']
    : ['UserPromptSubmit', 'PostToolUse', 'PostToolUseFailure'];
  if (observationEvents.includes(event)) {
    context = renderObservation(report);
    if (event !== 'UserPromptSubmit' && checkpoint(input, options, false)) context += `\n\n${REFLECTION}`;
  }
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
    const host = hostIndex >= 0 ? process.argv[hostIndex + 1] : undefined;
    const data = host === 'codex' ? process.env.PLUGIN_DATA : process.env.CLAUDE_PLUGIN_DATA;
    const options = { host, ...(data ? { directory: path.join(data, 'resources') } : {}) };
    let output = {};
    try { if (!exceeded) output = processInput(JSON.parse(input), options); }
    catch (error) { process.stderr.write(`mantra: resource collection unavailable: ${error.message}\n`); }
    process.stdout.write(`${JSON.stringify(output)}\n`);
  });
}

module.exports = { collect, readSnapshot, processInput, MAX_BYTES, REFLECTION_INTERVAL_MS };
