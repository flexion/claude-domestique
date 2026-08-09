'use strict';

// Fail-closed validation of the Stilus blind-review isolation attestation. This
// module delegates nothing, spawns nothing, and reads no files: it decides
// whether one returned result proves that `review-summary` ran in a context that
// never saw the orchestrator's parent-only material.
//
// Every state that is not provably clean is a failure. Nothing is coerced: the
// string 'false' is not false, 0 is not false, and undefined is not false. The
// attestation is a tested guardrail for cooperative models, not cryptographic
// proof of isolation, so a passing result means only that the specialist
// reported a clean context and that the current canary is nowhere in its output.

// Listed in the order the approved design prints them, because a leakage reason
// names the field and reviewers read it against that document.
const FORBIDDEN_CONTEXT_FIELDS = [
  'purpose',
  'audience',
  'intended_point',
  'voice_profile',
  'rubric',
  'prior_findings',
];

// `received_fields` inventories substantive task content only. The request ID and
// the attestation schema are isolation control metadata and never appear here.
const ALLOWED_RECEIVED_FIELDS = [['prose'], ['path']];

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function describe(value) {
  if (value === undefined) return 'undefined';
  try {
    const text = JSON.stringify(value);
    return text === undefined ? String(value) : text;
  } catch (error) {
    return String(value);
  }
}

function fail(reason) {
  return { ok: false, reason };
}

function isText(value) {
  return typeof value === 'string' && value.trim() !== '';
}

// Deep equality, not a prefix or length match: an array that carries extra own
// properties beside its indexed entries is not the declared inventory.
function sameFields(received, allowed) {
  return (
    received.length === allowed.length &&
    Object.keys(received).length === allowed.length &&
    allowed.every((field, index) => received[index] === field)
  );
}

function receivedFieldsReason(received) {
  if (!Array.isArray(received)) {
    return `received_fields must be an array, observed ${describe(received)}`;
  }
  if (ALLOWED_RECEIVED_FIELDS.some(allowed => sameFields(received, allowed))) return null;
  return `received_fields must be exactly ["prose"] or ["path"], observed ${describe(received)}`;
}

function forbiddenContextReason(forbidden) {
  if (!isObject(forbidden)) {
    return `forbidden_context must be an object, observed ${describe(forbidden)}`;
  }

  const unexpected = Object.keys(forbidden)
    .filter(key => !FORBIDDEN_CONTEXT_FIELDS.includes(key))
    .sort();
  if (unexpected.length > 0) {
    return `forbidden_context declares unexpected fields: ${unexpected.join(', ')}`;
  }

  for (const field of FORBIDDEN_CONTEXT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(forbidden, field)) {
      return `forbidden_context is missing ${field}`;
    }
  }

  for (const field of FORBIDDEN_CONTEXT_FIELDS) {
    const flag = forbidden[field];
    if (flag === true) return `forbidden context leaked: ${field}`;
    if (flag !== false) {
      return `forbidden_context.${field} must be boolean false, observed ${describe(flag)}`;
    }
  }

  return null;
}

function canaryReason(isolation, canary) {
  if (isolation.canary_seen === true) {
    return 'the specialist reported seeing an isolation canary';
  }
  if (isolation.canary_seen !== false) {
    return `canary_seen must be boolean false, observed ${describe(isolation.canary_seen)}`;
  }
  if (isolation.observed_canary === null) return null;
  if (isText(canary) && isolation.observed_canary === canary) {
    return 'observed_canary reports the current isolation canary';
  }
  return `observed_canary must be null, observed ${describe(isolation.observed_canary)}`;
}

// A leaked canary invalidates the pass even when the specialist did not
// self-report it, so the whole returned result is swept, not just the summary.
function leakedCanaryReason(result, canary) {
  if (!isText(canary)) return null;

  let serialized;
  try {
    serialized = JSON.stringify(result);
  } catch (error) {
    return `result could not be serialized to check for canary leakage (${error.message})`;
  }
  if (typeof serialized !== 'string') {
    return 'result could not be serialized to check for canary leakage';
  }
  if (!serialized.includes(canary)) return null;
  return 'the current isolation canary appears in the returned result';
}

function validateIsolation(result, requestId, canary) {
  if (!isText(requestId)) {
    return fail(
      `the delegated request ID must be a non-empty string, observed ${describe(requestId)}`
    );
  }
  if (!isObject(result)) {
    return fail(`result must be an object, observed ${describe(result)}`);
  }

  const isolation = result.isolation;
  if (!isObject(isolation)) {
    return fail(
      `attestation absent: result.isolation must be an object, observed ${describe(isolation)}`
    );
  }
  if (typeof isolation.request_id !== 'string') {
    return fail(`request_id must be a string, observed ${describe(isolation.request_id)}`);
  }
  if (isolation.request_id !== requestId) {
    return fail(
      `stale attestation: request_id ${describe(isolation.request_id)} does not match the delegated ${describe(requestId)}`
    );
  }

  const reason =
    receivedFieldsReason(isolation.received_fields) ||
    forbiddenContextReason(isolation.forbidden_context) ||
    canaryReason(isolation, canary) ||
    leakedCanaryReason(result, canary);

  return reason ? fail(reason) : { ok: true };
}

module.exports = {
  validateIsolation,
};
