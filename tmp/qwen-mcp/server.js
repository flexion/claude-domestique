#!/usr/bin/env node
'use strict';

// Trial stdio MCP adapter for a locally hosted Ollama model.
//
// Deliberately zero-dependency. A Claude Code plugin only gets its Node
// dependencies installed when the PLUGIN ROOT carries its own lockfile, and
// this repository's lockfile lives at the workspace root, outside any copied
// plugin directory. Nothing to install is the shape that survives that.
//
// Ollama's HTTP API is not MCP, so this process is the translation layer: it
// speaks newline-delimited JSON-RPC to the host on stdio and plain HTTP to the
// daemon on loopback. It can start itself; it cannot start Ollama.
//
// ---------------------------------------------------------------------------
// v2. Seven defects were measured in v1 against this repository's own test
// suite; each fix below is traceable to one of them.
//
//  1. SINGLE-SHOT. v1 had no way to send a follow-up, but a measured run showed
//     cold delegation solving 1 of 3 tasks and the SAME model solving 3 of 3
//     once the caller fed back a diagnosis naming the cause. The interface could
//     not express the only mode that works. -> `session` + ollama_refine.
//  2. NO TOKEN COUNTS. v1 read data.message.content and discarded
//     prompt_eval_count/eval_count, so a caller could neither budget nor detect
//     truncation. -> returned on every call.
//  3. INLINE CONTEXT. `context` was a string, so the caller paid OUTPUT token
//     rates to resend source that is already on disk. -> `files` reads locally.
//  4. SILENT PRUNING. Without truncate:false Ollama keeps
//     C - max(floor((C-K)/2),1) tokens - C=32768,K=4 gives exactly 16386 - drops
//     the middle, and reports nothing. A starved model is indistinguishable from
//     an incapable one. -> truncate:false + shift:false; oversize is an error.
//  5. NO num_ctx. v1 relied on Ollama's VRAM-tier default (<23GiB -> 4096),
//     so on a smaller box a 12k brief silently vanished. -> always explicit.
//  6. NO num_predict. Output was unbounded, so input+output could not be
//     budgeted before sending. -> bounded, and the budget is checked.
//  7. fetch(). A non-streaming 30B generation outlives undici's 300s header
//     timeout and surfaces as a bare `fetch failed`, which looks exactly like
//     the model returning nothing. -> node:http, no timeout.
//
// Ollama source for (4) and (5), verified against v0.34.0:
//   llm/llama_server.go:279-330 (compaction), :317 (WARN truncating input prompt)
//   server/prompt.go:76-77       (DEBUG message pruning)
//   server/routes.go:130-189     (options.num_ctx precedence, OOM reduction)
//   server/routes.go:2062-2072   (VRAM-tier context defaults)
// ---------------------------------------------------------------------------

const readline = require('node:readline');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const OLLAMA = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const LATEST = '2025-11-25';
const SUPPORTED = [LATEST, '2025-06-18', '2025-03-26', '2024-11-05'];

const DEFAULT_NUM_CTX = Number(process.env.QWEN_MCP_NUM_CTX || 32768);
const DEFAULT_NUM_PREDICT = Number(process.env.QWEN_MCP_NUM_PREDICT || 4096);

// Sessions exist so a caller can send a diagnosis after reading a failed draft.
// Bounded: this is a helper, not a datastore.
const SESSIONS = new Map();
const MAX_SESSIONS = 32;
const MAX_TURNS = 12;

// Rough, and labelled as rough wherever it is shown. Used only to refuse an
// over-budget request BEFORE spending a minute of GPU time; the authoritative
// number is prompt_eval_count, which every response now carries.
const estimateTokens = (s) => Math.ceil(s.length / 3.6);

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function reply(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

// A tool that failed is not a protocol error: the model should see the message
// and act on it, which means isError content rather than a JSON-RPC error.
function toolError(id, text) {
  reply(id, { content: [{ type: 'text', text }], isError: true });
}

// node:http, not fetch - see defect 7 above.
function ollama(urlPath, payload) {
  const body = payload === undefined ? null : JSON.stringify(payload);
  const url = new URL(urlPath, OLLAMA);
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: url.hostname,
      port: url.port || 11434,
      path: url.pathname,
      method: body ? 'POST' : 'GET',
      headers: body
        ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) }
        : {},
    }, (res) => {
      let out = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { out += c; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          // Surface Ollama's structured error rather than a status code. The
          // one that matters is exceed_context_size_error, which carries
          // n_prompt_tokens and n_ctx and is the whole point of truncate:false.
          let detail = out.slice(0, 500);
          try {
            const parsed = JSON.parse(out);
            const inner = typeof parsed.error === 'string' ? JSON.parse(parsed.error) : parsed.error;
            if (inner && inner.error) {
              const e = inner.error;
              if (e.type === 'exceed_context_size_error') {
                return reject(new Error(
                  `Prompt is too large: ${e.n_prompt_tokens} tokens against a context of ${e.n_ctx}. `
                  + `Send fewer files, or raise num_ctx (this model's ceiling is its training context). `
                  + `Nothing was generated - the request was refused rather than silently truncated.`,
                ));
              }
              detail = e.message || detail;
            }
          } catch { /* fall through to the raw body */ }
          return reject(new Error(`Ollama HTTP ${res.statusCode}: ${detail}`));
        }
        try {
          resolve(JSON.parse(out));
        } catch (e) {
          reject(new Error(`Unparseable Ollama response: ${e.message}`));
        }
      });
    });
    req.on('error', (e) => {
      if (e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND') {
        return reject(new Error(
          `Ollama is not reachable at ${OLLAMA}. Start it with \`ollama serve\`, or set OLLAMA_HOST.`,
        ));
      }
      reject(e);
    });
    req.setTimeout(0);
    req.end(body);
  });
}

async function inventory() {
  const data = await ollama('/api/tags');
  return (data.models || []).map((m) => ({ name: m.name, size: m.size, digest: m.digest }));
}

// v1 hardcoded PREFERRED and the list went stale the moment a better model was
// pulled: qwen3-coder:30b was installed and absent from the list, so every
// default call silently got the general-instruct tag that measured worst.
// Score against LIVE inventory instead, so a newly pulled coder model wins
// without an edit here.
function pickPreferred(models) {
  const score = (m) => {
    const n = m.name.toLowerCase();
    let s = 0;
    if (/coder|devstral|deepseek-coder/.test(n)) s += 100;   // code-specialised
    if (/qwen3|devstral|deepseek-coder-v2/.test(n)) s += 20; // current generation
    s += Math.min(m.size / 1e9, 40);                          // bigger, capped
    return s;
  };
  return [...models].sort((a, b) => score(b) - score(a))[0];
}

async function resolveModel(requested, models) {
  const names = models.map((m) => m.name);
  if (requested) {
    if (names.includes(requested)) return requested;
    throw new Error(
      `Model "${requested}" is not installed. Installed: ${names.join(', ') || '(none)'}. `
      + `Pull it with \`ollama pull ${requested}\`, or call ollama_models to see what is available.`,
    );
  }
  const best = pickPreferred(models);
  if (!best) throw new Error('No models are installed. Pull one with `ollama pull qwen3-coder:30b`.');
  return best.name;
}

// Read context from disk instead of making the caller resend it as output
// tokens. This is defect 3: source already on disk costs nothing to read here
// and costs output-rate tokens to paste into a tool argument.
function readFiles(files) {
  const parts = [];
  const manifest = [];
  for (const entry of files) {
    const spec = String(entry);
    const m = spec.match(/^(.*?):(\d+)-(\d+)$/);
    const file = m ? m[1] : spec;
    const abs = path.resolve(file);
    let text;
    try {
      text = fs.readFileSync(abs, 'utf8');
    } catch (e) {
      throw new Error(`Cannot read "${file}": ${e.code === 'ENOENT' ? 'no such file' : e.message}`);
    }
    if (m) {
      const from = Number(m[2]);
      const to = Number(m[3]);
      text = text.split('\n').slice(from - 1, to).join('\n');
    }
    parts.push(`=== ${spec} ===\n${text}`);
    manifest.push({ file: spec, tokens: estimateTokens(text) });
  }
  return { text: parts.join('\n\n'), manifest };
}

function newSessionId() {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function rememberSession(id, model, messages, digest) {
  if (SESSIONS.size >= MAX_SESSIONS) SESSIONS.delete(SESSIONS.keys().next().value);
  SESSIONS.set(id, { model, digest, messages: messages.slice(-MAX_TURNS * 2), at: Date.now() });
}

async function generate({ messages, model, numCtx, numPredict, digest }) {
  const started = Date.now();
  const data = await ollama('/api/chat', {
    model,
    stream: false,
    // Both pruning layers off: an oversized prompt is an ERROR, never a silent
    // compaction. This is the single change that makes a starved model
    // distinguishable from an incapable one.
    truncate: false,
    shift: false,
    options: { num_ctx: numCtx, num_predict: numPredict },
    messages,
  });
  return {
    text: (data.message && data.message.content) || '',
    digest: digest || null,
    secs: (Date.now() - started) / 1000,
    promptTokens: data.prompt_eval_count,
    evalTokens: data.eval_count,
    doneReason: data.done_reason,
  };
}

// Pull the fenced block out here, once, rather than making every caller write
// the same regex. Callers of v1 re-implemented this three times in one session;
// that is the shape of a missing output schema.
function extractCode(text) {
  const fences = [...text.matchAll(/```(?:js|javascript|ts|typescript|python|json)?\n([\s\S]*?)```/g)]
    .map((m) => m[1].trim())
    .filter(Boolean);
  if (!fences.length) return null;
  return fences.sort((a, b) => b.length - a.length)[0];
}

function renderResult({ model, result, sessionId, manifest, numCtx, numPredict }) {
  const head = [
    `[unverified draft from ${model}, ${result.secs.toFixed(1)}s - review and test before use]`,
    `session: ${sessionId}   (pass this to ollama_refine with a diagnosis if the draft is wrong)`,
    `tokens: prompt ${result.promptTokens} / output ${result.evalTokens}`
    + `   budget: ${numCtx - numPredict - 1} input, num_predict ${numPredict}`,
  ];
  if (result.doneReason === 'length') {
    head.push(
      `WARNING: generation stopped at the num_predict ceiling (${numPredict}) - the draft is`
      + ` TRUNCATED mid-output. Raise num_predict and retry rather than using this.`,
    );
  }
  if (manifest && manifest.length) {
    head.push(`context read locally: ${manifest.map((f) => `${f.file} (~${f.tokens} tok)`).join(', ')}`);
  }
  const code = extractCode(result.text);
  const structured = {
    code,
    text: result.text,
    session: sessionId,
    model,
    model_digest: result.digest || null,
    seconds: Number(result.secs.toFixed(1)),
    prompt_tokens: result.promptTokens ?? null,
    output_tokens: result.evalTokens ?? null,
    truncated: result.doneReason === 'length',
    empty: !result.text.trim(),
    verified: false,
    context_files: manifest || [],
    budget: { num_ctx: numCtx, num_predict: numPredict, input_budget: numCtx - numPredict - 1 },
  };

  if (structured.empty) {
    head.push('');
    head.push('The model returned an EMPTY response. Nothing usable - write this yourself, or try another model.');
    return { text: head.join('\n'), structured };
  }
  if (!code) {
    head.push('NOTE: no fenced code block found, so `code` is null - `text` holds the raw reply.');
  }
  return { text: `${head.join('\n')}\n\n${result.text}`, structured };
}

// One result shape for both generate and refine. Equivalent concepts share
// field names and types, so a caller writes one parser, not two.
const DRAFT_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: ['string', 'null'], description: 'The largest fenced code block, already extracted. Null when the reply had no fenced block - read `text` then.' },
    text: { type: 'string', description: 'The model\'s full reply, including any prose around the code.' },
    session: { type: 'string', description: 'Pass to ollama_refine to continue this draft. In-memory only: lost if this server restarts.' },
    model: { type: 'string', description: 'The model tag that actually ran, after default resolution.' },
    model_digest: { type: ['string', 'null'], description: 'Digest of the weights that ran. Ollama tags are mutable, so a result without this is undated.' },
    seconds: { type: 'number', description: 'Wall-clock generation time.' },
    prompt_tokens: { type: ['number', 'null'], description: 'Tokens the server actually read. Authoritative - compare against budget.input_budget.' },
    output_tokens: { type: ['number', 'null'], description: 'Tokens generated.' },
    truncated: { type: 'boolean', description: 'True when generation hit the num_predict ceiling and the draft is cut off mid-output. Raise num_predict and retry; do not use a truncated draft.' },
    empty: { type: 'boolean', description: 'True when the model returned nothing usable.' },
    verified: { type: 'boolean', description: 'Always false. This server never runs or checks the code; the caller must test it.' },
    context_files: {
      type: 'array',
      description: 'Files this server read locally as context, with rough token cost.',
      items: {
        type: 'object',
        properties: { file: { type: 'string' }, tokens: { type: 'number' } },
        required: ['file', 'tokens'],
      },
    },
    budget: {
      type: 'object',
      description: 'The context budget this call ran under.',
      properties: {
        num_ctx: { type: 'number' },
        num_predict: { type: 'number' },
        input_budget: { type: 'number', description: 'num_ctx - num_predict - 1. Prompts above this are refused, never silently truncated.' },
      },
      required: ['num_ctx', 'num_predict', 'input_budget'],
    },
  },
  required: ['code', 'text', 'session', 'model', 'seconds', 'truncated', 'empty', 'verified', 'context_files', 'budget'],
};

const TOOLS = [
  {
    name: 'ollama_models',
    description:
      'List the models actually installed on the local Ollama daemon, with size and whether each '
      + 'supports tool calling. Call this before ollama_generate if unsure what is available - model '
      + 'tags differ per machine and a guessed tag fails at generation time, not at load time.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    outputSchema: {
      type: 'object',
      properties: {
        models: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'The exact tag to pass as `model`.' },
              size_gb: { type: 'number' },
              capabilities: { type: 'array', items: { type: 'string' }, description: 'e.g. completion, tools, thinking, insert.' },
            },
            required: ['name', 'size_gb', 'capabilities'],
          },
        },
        default_model: { type: ['string', 'null'], description: 'What ollama_generate picks when `model` is omitted. Resolved from this live inventory, not a hardcoded list.' },
        count: { type: 'number' },
      },
      required: ['models', 'default_model', 'count'],
    },
  },
  {
    name: 'ollama_generate',
    description:
      'Draft code or text using a locally hosted model. Returns an UNVERIFIED first draft: the local '
      + 'model is smaller than you and has been observed to write confident, plausible, wrong code on '
      + 'specifications that state the rule and give a worked example. Read what comes back, test it, '
      + 'and fix it before using it.\n'
      + 'Pass context with `files` (read locally, costs you nothing) rather than pasting source into '
      + '`context` - pasting spends your own output tokens to resend what is already on disk.\n'
      + 'MEASURED: cold single-shot delegation solved 1 of 3 real functions in this repository; the '
      + 'same model solved 3 of 3 when the caller read the failing draft and sent back a diagnosis '
      + 'naming the CAUSE. A failing test shows a symptom and cannot say why. So expect to call '
      + 'ollama_refine with the returned `session` - one-shot is the mode that does not work.\n'
      + 'Prefer this for well-specified, low-risk, self-contained work. Do not delegate architecture, '
      + 'security, concurrency, or multi-file refactors.',
    inputSchema: {
      type: 'object',
      properties: {
        spec: { type: 'string', description: 'What to write. Be complete: the model sees only this, the files, and context.' },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Paths to read as context, e.g. "src/a.js" or "src/a.js:40-120" for a line range. '
            + 'Read locally by this server - far cheaper than pasting into `context`.',
        },
        inline_context: {
          type: 'string',
          description: 'A SHORT snippet typed directly - a type signature, a naming convention. Anything that exists in a file belongs in `files` instead: text passed here is spent from your own output budget, whereas `files` is read locally and costs you nothing.',
        },
        model: { type: 'string', description: 'Optional model tag. Defaults to the best installed code model.' },
        num_ctx: { type: 'number', description: `Context window. Default ${DEFAULT_NUM_CTX}. Oversize is refused, never truncated.` },
        num_predict: { type: 'number', description: `Max output tokens. Default ${DEFAULT_NUM_PREDICT}.` },
      },
      required: ['spec'],
      additionalProperties: false,
    },
    outputSchema: DRAFT_OUTPUT_SCHEMA,
  },
  {
    name: 'ollama_refine',
    description:
      'Continue a previous ollama_generate with a diagnosis, keeping the prior turns in context. This '
      + 'is the tool that makes delegation work: measured on three real functions, cold generation got '
      + '1 of 3 and refinement with a named cause got 3 of 3, with directed turns running roughly twice '
      + 'as fast as cold ones.\n'
      + 'Send the CAUSE, not the symptom. "Expected x, received y" is what the test already said and it '
      + 'does not help. "You used spec.split(\':\', 2); JavaScript\'s split with a limit TRUNCATES rather '
      + 'than keeping the remainder, unlike Python maxsplit - use indexOf and slice" is a cause, and it '
      + 'fixed a function that had failed nine consecutive automated retries.\n'
      + 'Be specific about ordering and placement too: an underspecified diagnosis gets implemented '
      + 'faithfully and still fails - measured twice, once on check ordering and once on where a '
      + 'validation loop belonged.\n'
      + 'Use ollama_generate, not this tool, to START a draft; this tool requires a `session` that only '
      + 'ollama_generate can mint. Sessions live in this server process only and are lost on restart - '
      + 'an unknown session means starting over with ollama_generate rather than retrying here.',
    inputSchema: {
      type: 'object',
      properties: {
        session: { type: 'string', description: 'The `session` value returned by ollama_generate.' },
        diagnosis: { type: 'string', description: 'What is wrong and WHY, in terms of the cause. Include ordering/placement if it matters.' },
        files: { type: 'array', items: { type: 'string' }, description: 'Optional extra files to read as added context.' },
        num_predict: { type: 'number', description: `Max output tokens. Default ${DEFAULT_NUM_PREDICT}.` },
      },
      required: ['session', 'diagnosis'],
      additionalProperties: false,
    },
    outputSchema: DRAFT_OUTPUT_SCHEMA,
  },
];

async function callTool(name, args) {
  if (name === 'ollama_models') {
    const data = await ollama('/api/tags');
    const models = data.models || [];
    if (!models.length) {
      return {
        text: 'No models installed. Pull one with `ollama pull qwen3-coder:30b`.',
        structured: { models: [], default_model: null, count: 0 },
      };
    }
    const rows = await Promise.all(models.map(async (m) => {
      let caps = [];
      try {
        const show = await ollama('/api/show', { model: m.name });
        caps = show.capabilities || [];
      } catch {
        caps = ['(unknown)'];
      }
      const size_gb = Number((m.size / 1e9).toFixed(1));
      return {
        name: m.name,
        size_gb,
        capabilities: caps,
        row: `${m.name}\t${size_gb} GB\t${caps.join(',')}`,
      };
    }));
    const best = pickPreferred(models.map((m) => ({ name: m.name, size: m.size })));
    return {
      text: `name\tsize\tcapabilities\n${rows.map((r) => r.row).join('\n')}\n\n`
        + `default for ollama_generate: ${best ? best.name : '(none)'} (resolved from live inventory, not a hardcoded list)`,
      structured: {
        models: rows.map((r) => ({ name: r.name, size_gb: r.size_gb, capabilities: r.capabilities })),
        default_model: best ? best.name : null,
        count: rows.length,
      },
    };
  }

  if (name === 'ollama_generate') {
    const models = await inventory();
    const model = await resolveModel(args.model, models);
    const numCtx = Number(args.num_ctx || DEFAULT_NUM_CTX);
    const numPredict = Number(args.num_predict || DEFAULT_NUM_PREDICT);

    const { text: fileText, manifest } = args.files && args.files.length
      ? readFiles(args.files)
      : { text: '', manifest: [] };

    const prompt = [
      args.inline_context ? `Context:\n${args.inline_context}` : '',
      fileText,
      args.spec,
    ].filter(Boolean).join('\n\n');

    // Refuse before spending a minute of GPU time. The server would refuse too
    // (truncate:false), but this says WHICH files to drop.
    const budget = numCtx - numPredict - 1;
    const est = estimateTokens(prompt);
    if (est > budget) {
      const detail = manifest.length
        ? ` Largest: ${[...manifest].sort((a, b) => b.tokens - a.tokens).slice(0, 3).map((f) => `${f.file} ~${f.tokens}`).join(', ')}.`
        : '';
      throw new Error(
        `Prompt is about ${est} tokens (rough estimate), over the ${budget}-token input budget `
        + `(num_ctx ${numCtx} - num_predict ${numPredict} - 1).${detail} `
        + `Send fewer files or narrower line ranges, or raise num_ctx.`,
      );
    }

    const messages = [{ role: 'user', content: prompt }];
    const digest = (models.find((m) => m.name === model) || {}).digest;
    const result = await generate({ messages, model, numCtx, numPredict, digest });
    const sessionId = newSessionId();
    rememberSession(sessionId, model, [...messages, { role: 'assistant', content: result.text }], digest);
    return renderResult({ model, result, sessionId, manifest, numCtx, numPredict });
  }

  if (name === 'ollama_refine') {
    const session = SESSIONS.get(args.session);
    if (!session) {
      const known = [...SESSIONS.keys()];
      throw new Error(
        `Unknown session "${args.session}". ${known.length ? `Known: ${known.join(', ')}.` : 'None are open.'} `
        + `Sessions are in-memory and are lost when this server restarts - start again with ollama_generate.`,
      );
    }
    const numPredict = Number(args.num_predict || DEFAULT_NUM_PREDICT);
    const { text: fileText, manifest } = args.files && args.files.length
      ? readFiles(args.files)
      : { text: '', manifest: [] };

    const messages = [...session.messages, {
      role: 'user',
      content: [fileText, args.diagnosis].filter(Boolean).join('\n\n'),
    }];
    const result = await generate({
      messages, model: session.model, numCtx: DEFAULT_NUM_CTX, numPredict, digest: session.digest,
    });
    rememberSession(args.session, session.model, [...messages, { role: 'assistant', content: result.text }], session.digest);
    return renderResult({
      model: session.model, result, sessionId: args.session, manifest,
      numCtx: DEFAULT_NUM_CTX, numPredict,
    });
  }

  throw new Error(`Unknown tool: ${name}`);
}

async function handle(msg) {
  const { id, method, params } = msg;

  if (method === 'initialize') {
    const asked = params && params.protocolVersion;
    return reply(id, {
      protocolVersion: SUPPORTED.includes(asked) ? asked : LATEST,
      capabilities: { tools: {} },
      serverInfo: { name: 'qwen-local', version: '0.0.2-trial' },
    });
  }

  // Notifications carry no id and take no response.
  if (id === undefined) return;

  if (method === 'tools/list') return reply(id, { tools: TOOLS });

  if (method === 'tools/call') {
    try {
      const out = await callTool(params.name, params.arguments || {});
      const payload = { content: [{ type: 'text', text: out.text }] };
      // MCP 2025-06-18: servers MUST conform to a declared outputSchema. The
      // text block stays for LLM synthesis; structuredContent is what callers
      // parse, so nobody re-implements a fenced-block regex.
      if (out.structured) payload.structuredContent = out.structured;
      return reply(id, payload);
    } catch (e) {
      return toolError(id, e.message);
    }
  }

  send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
}

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  handle(msg).catch((e) => {
    if (msg.id !== undefined) toolError(msg.id, `adapter error: ${e.message}`);
  });
});
