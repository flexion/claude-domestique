'use strict';

// Deterministic classification of already-normalized parity results. This module
// executes nothing, retries nothing, and reads no files: it only decides whether
// observations satisfy declared invariants and whether a five-trial set clears
// its approved threshold.

const DEFAULT_REQUIRED_TRIALS = 5;

// A trial boolean always means "that trial met its own declared expectation".
// The declared expectation differs by kind — a control trial expects the
// target's skill-specific invariants to be absent, an ordinary negative expects
// the target to stay unselected — so the ratios below never invert the boolean.
const TRIAL_KINDS = {
  'control': { minimumRatio: 3 / 5 },
  'positive': { minimumRatio: 4 / 5 },
  'ordinary-negative': { minimumRatio: 4 / 5 },
  'side-effect-negative': { minimumRatio: 1, forbidMisses: true },
  'ambiguous': { requiresAllowedOutcomes: true },
};

function describe(value) {
  if (typeof value === 'string') return JSON.stringify(value);
  if (value === undefined) return 'undefined';
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
}

function pass() {
  return { pass: true, message: '' };
}

function fail(message) {
  return { pass: false, message };
}

function deepEqual(left, right) {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    return left.every((entry, index) => deepEqual(entry, right[index]));
  }
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length) return false;
  if (leftKeys.some((key, index) => key !== rightKeys[index])) return false;
  return leftKeys.every(key => deepEqual(left[key], right[key]));
}

function readPath(container, dottedPath) {
  if (typeof dottedPath !== 'string' || dottedPath === '') return undefined;
  return dottedPath.split('.').reduce((current, segment) => {
    if (!current || typeof current !== 'object') return undefined;
    return current[segment];
  }, container);
}

function evaluateInvariant(invariant, observation) {
  if (!invariant || typeof invariant !== 'object' || Array.isArray(invariant)) {
    return fail('invariant must be an object');
  }

  const observed = observation && typeof observation === 'object' ? observation : {};
  const selectedSkill = observed.selected_skill;
  const output = observed.output;
  // observations.state_files maps a project-relative path to that file's contents. It is distinct
  // from a result's top-level state_changes array, which records created/modified/removed paths.
  const stateFiles = observed.state_files && typeof observed.state_files === 'object'
    ? observed.state_files
    : {};

  switch (invariant.type) {
    case 'selected_skill':
      if (selectedSkill === invariant.value) return pass();
      return fail(`expected selected skill ${describe(invariant.value)}, observed ${
        selectedSkill === undefined || selectedSkill === null ? 'none' : describe(selectedSkill)
      }`);

    case 'skill_not_selected':
      if (selectedSkill !== invariant.value) return pass();
      return fail(`selected skill must not be ${describe(invariant.value)}`);

    case 'output_contains':
      if (typeof output !== 'string') {
        return fail(`output must be text containing ${describe(invariant.value)}`);
      }
      if (output.includes(invariant.value)) return pass();
      return fail(`output must contain ${describe(invariant.value)}`);

    case 'output_absent':
      // No output cannot contain the forbidden text, so absence holds.
      if (typeof output !== 'string' || !output.includes(invariant.value)) return pass();
      return fail(`output must not contain ${describe(invariant.value)}`);

    case 'state_file_contains': {
      const content = stateFiles[invariant.path];
      if (typeof content !== 'string') {
        return fail(`state file ${describe(invariant.path)} is missing or is not text`);
      }
      if (content.includes(invariant.value)) return pass();
      return fail(
        `state file ${describe(invariant.path)} must contain ${describe(invariant.value)}`
      );
    }

    case 'exit_status':
      if (observed.exit_status === invariant.value) return pass();
      return fail(
        `expected exit status ${describe(invariant.value)}, observed ${describe(observed.exit_status)}`
      );

    case 'extra_equals': {
      const actual = readPath(observed.extra, invariant.path);
      if (deepEqual(actual, invariant.value)) return pass();
      return fail(`extra ${describe(invariant.path)} must equal ${describe(invariant.value)}, observed ${describe(actual)}`);
    }

    default:
      // Fail closed: an unrecognized assertion is never evidence of parity.
      return fail(`unknown invariant type: ${String(invariant.type)}`);
  }
}

function firstDefined(record, camelKey, snakeKey) {
  return record[camelKey] !== undefined ? record[camelKey] : record[snakeKey];
}

function normalizeTrial(entry, index) {
  if (typeof entry === 'boolean') {
    return {
      index,
      metExpectation: entry,
      outcome: null,
      forbiddenActions: [],
      infrastructureFailure: false,
    };
  }
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return {
      index,
      metExpectation: false,
      outcome: null,
      forbiddenActions: [],
      infrastructureFailure: false,
    };
  }

  const forbidden = firstDefined(entry, 'forbiddenActions', 'forbidden_actions');
  const outcome = entry.outcome;
  return {
    index,
    metExpectation: firstDefined(entry, 'metExpectation', 'met_expectation') === true,
    outcome: typeof outcome === 'string' ? outcome : null,
    forbiddenActions: Array.isArray(forbidden)
      ? forbidden.filter(action => typeof action === 'string' && action.trim() !== '')
      : [],
    // A trial is infrastructure-affected when it says so either way the result
    // contract allows: the INFRASTRUCTURE_FAILURE outcome, or a populated
    // infrastructure_failure cause. Requiring a literal `true` would let a
    // schema-valid infrastructure trial be counted as a behavioral miss, which
    // silently converts an infrastructure failure into a passing threshold.
    infrastructureFailure: isInfrastructureTrial(entry, outcome),
  };
}

function isInfrastructureTrial(entry, outcome) {
  if (outcome === 'INFRASTRUCTURE_FAILURE') return true;
  const cause = firstDefined(entry, 'infrastructureFailure', 'infrastructure_failure');
  if (cause === true) return true;
  if (typeof cause === 'string') return cause.trim() !== '';
  if (cause && typeof cause === 'object') return true;
  return false;
}

function countTrials(trials, required) {
  const evaluable = trials.filter(trial => !trial.infrastructureFailure);
  const met = evaluable.filter(trial => trial.metExpectation).length;
  return {
    evaluated: evaluable.length,
    infrastructure: trials.length - evaluable.length,
    met,
    missed: evaluable.length - met,
    required,
  };
}

function evaluateTrials(kind, trials, options = {}) {
  const settings = options && typeof options === 'object' ? options : {};
  const required = Number.isInteger(settings.requiredTrials) && settings.requiredTrials > 0
    ? settings.requiredTrials
    : DEFAULT_REQUIRED_TRIALS;

  if (!Array.isArray(trials)) {
    return {
      pass: false,
      reason: 'trials must be an array',
      counts: { evaluated: 0, infrastructure: 0, met: 0, missed: 0, required },
    };
  }

  const normalized = trials.map(normalizeTrial);
  const counts = countTrials(normalized, required);

  // 1. A forbidden action fails the scenario immediately, before any threshold.
  for (const trial of normalized) {
    const [action] = trial.forbiddenActions;
    if (action) {
      return {
        pass: false,
        reason: `trial ${trial.index} performed a forbidden action: ${action}`,
        counts,
      };
    }
  }

  // 2. Infrastructure failures leave the behavioral denominator short rather
  //    than counting as behavioral misses.
  if (counts.evaluated < required) {
    const plural = counts.infrastructure === 1 ? 'failure' : 'failures';
    return {
      pass: false,
      reason: `insufficient trial set: ${counts.evaluated} of ${required} trials were behaviorally evaluable after excluding ${counts.infrastructure} infrastructure ${plural}`,
      counts,
    };
  }

  // The approved thresholds are ratios of an exact five-trial set. Accepting a
  // larger set would let a fixed minimum clear a weaker ratio, so an oversized
  // set is a malformed trial set rather than extra evidence.
  if (counts.evaluated > required) {
    return {
      pass: false,
      reason: `oversized trial set: ${counts.evaluated} behaviorally evaluable trials exceed the required ${required}`,
      counts,
    };
  }

  const kindRules = Object.prototype.hasOwnProperty.call(TRIAL_KINDS, kind)
    ? TRIAL_KINDS[kind]
    : null;
  if (!kindRules) {
    // 4. Unknown kinds never pass.
    return { pass: false, reason: `unknown trial kind: ${String(kind)}`, counts };
  }

  const evaluable = normalized.filter(trial => !trial.infrastructureFailure);

  // 3. Approved thresholds.
  if (kindRules.requiresAllowedOutcomes) {
    const allowed = settings.allowedOutcomes;
    if (!Array.isArray(allowed) || allowed.length === 0) {
      return {
        pass: false,
        reason: 'allowed_outcomes must be a non-empty array for an ambiguous trial set',
        counts,
      };
    }
    for (const trial of evaluable) {
      if (trial.outcome === null) {
        return {
          pass: false,
          reason: `trial ${trial.index} recorded no outcome to compare against the allowed outcome set`,
          counts,
        };
      }
      if (!allowed.includes(trial.outcome)) {
        return {
          pass: false,
          reason: `trial ${trial.index} produced outcome ${describe(trial.outcome)} outside the allowed outcome set`,
          counts,
        };
      }
    }
    return { pass: true, reason: '', counts };
  }

  const minimumMet = Math.ceil(kindRules.minimumRatio * required);
  const clears = counts.met >= minimumMet && (!kindRules.forbidMisses || counts.missed === 0);
  if (clears) return { pass: true, reason: '', counts };

  return {
    pass: false,
    reason: `${kind} trials met the declared expectation in ${counts.met} of ${counts.evaluated} evaluable trials; ${minimumMet} required`,
    counts,
  };
}

function classifyFailure(result) {
  if (!result || typeof result !== 'object') return null;
  if (result.outcome === 'INFRASTRUCTURE_FAILURE' || result.infrastructure_failure) {
    return 'infrastructure';
  }
  if (result.outcome === 'FAIL') return 'behavioral';
  return null;
}

module.exports = {
  classifyFailure,
  evaluateInvariant,
  evaluateTrials,
};
