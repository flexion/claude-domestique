'use strict';

const fs = require('fs');
const path = require('path');

// Behavior classes and discovery expectations are listed alphabetically because
// their names appear verbatim in the error messages other suites assert on.
const CLASSES = ['direct', 'discovery', 'handoff', 'hook', 'isolation'];
const EXPECTATIONS = ['ambiguous', 'ordinary-negative', 'positive', 'side-effect-negative'];
const HOSTS = ['claude', 'codex'];

const SCHEMA_SUFFIX = '.schema.json';
const FIXTURES_DIRECTORY = 'fixtures';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function validateCommonFields(scenario, errors) {
  if (!isText(scenario.id)) {
    errors.push('id must be a non-empty string');
  }
  if (!CLASSES.includes(scenario.class)) {
    errors.push(`class must be one of ${CLASSES.join(', ')}`);
  }
  if (!isText(scenario.prompt)) {
    errors.push('prompt must be a non-empty string');
  }
  if (!isText(scenario.fixture)) {
    errors.push('fixture must be a non-empty string');
  }

  if (!Array.isArray(scenario.invariants)) {
    errors.push('invariants must be an array');
  } else {
    scenario.invariants.forEach((invariant, index) => {
      if (!isObject(invariant) || !isText(invariant.type) || !isText(invariant.description)) {
        errors.push(`invariants[${index}] must declare a non-empty type and description`);
      }
    });
  }

  if (!Array.isArray(scenario.forbidden)) {
    errors.push('forbidden must be an array');
  } else {
    scenario.forbidden.forEach((behavior, index) => {
      if (!isText(behavior)) {
        errors.push(`forbidden[${index}] must be a non-empty string`);
      }
    });
  }
}

function validateDirect(scenario, errors) {
  if (!isText(scenario.target_skill)) {
    errors.push('target_skill must be a non-empty string');
  }
  const invocation = scenario.invocation;
  if (
    !isObject(invocation) ||
    typeof invocation.claude !== 'string' ||
    typeof invocation.codex !== 'string'
  ) {
    errors.push('invocation must declare claude and codex syntax');
  }
}

function validateDiscovery(scenario, errors) {
  if (!isText(scenario.target_skill)) {
    errors.push('target_skill must be a non-empty string');
  }
  if (!isObject(scenario.control) || scenario.control.ablate_description !== true) {
    errors.push('control must declare ablate_description: true');
  }
  if (!EXPECTATIONS.includes(scenario.expectation)) {
    errors.push(`expectation must be one of ${EXPECTATIONS.join(', ')}`);
    return;
  }
  if (scenario.expectation === 'ambiguous' && !isNonEmptyArray(scenario.allowed_outcomes)) {
    errors.push('allowed_outcomes must be a non-empty array');
  }
  if (
    scenario.expectation === 'side-effect-negative' &&
    !isNonEmptyArray(scenario.forbidden_side_effects)
  ) {
    errors.push('forbidden_side_effects must be a non-empty array');
  }
}

function validateHook(scenario, errors) {
  const hook = scenario.hook;
  if (!isObject(hook) || !isText(hook.plugin) || !isText(hook.event) || !isObject(hook.payload)) {
    errors.push('hook must declare plugin, event, and payload');
  }
}

function validateHandoff(scenario, errors) {
  const handoff = scenario.handoff;
  if (
    !isObject(handoff) ||
    !HOSTS.includes(handoff.writer) ||
    !HOSTS.includes(handoff.reader) ||
    handoff.writer === handoff.reader
  ) {
    errors.push('handoff must declare distinct writer and reader hosts');
  }
}

function validateIsolation(scenario, errors) {
  const isolation = scenario.isolation;
  if (!isObject(isolation) || !isText(isolation.attestation_schema)) {
    errors.push('isolation must declare attestation_schema');
  }
}

const CLASS_VALIDATORS = {
  direct: validateDirect,
  discovery: validateDiscovery,
  handoff: validateHandoff,
  hook: validateHook,
  isolation: validateIsolation,
};

// Reports every problem it finds. Callers aggregate across files, so failing
// fast on the first missing field would hide the rest of a broken scenario.
function validateScenario(scenario) {
  if (!isObject(scenario)) {
    return ['scenario must be an object'];
  }

  const errors = [];
  validateCommonFields(scenario, errors);

  const classValidator = CLASS_VALIDATORS[scenario.class];
  if (classValidator) classValidator(scenario, errors);

  return errors;
}

function scenarioFiles(root) {
  const files = [];

  function walk(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        // Fixture workspaces carry their own package and manifest JSON.
        if (directory === root && entry.name === FIXTURES_DIRECTORY) continue;
        walk(entryPath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      if (entry.name.endsWith(SCHEMA_SUFFIX)) continue;
      files.push(entryPath);
    }
  }

  walk(root);
  return files
    .map(filePath => path.relative(root, filePath).split(path.sep).join('/'))
    .sort();
}

function loadScenarios(root) {
  if (!fs.existsSync(root)) return [];

  const problems = [];
  const scenarios = [];
  const seen = new Set();

  for (const label of scenarioFiles(root)) {
    let scenario;
    try {
      scenario = JSON.parse(fs.readFileSync(path.join(root, label), 'utf8'));
    } catch (error) {
      problems.push(`${label}: invalid JSON (${error.message})`);
      continue;
    }

    if (isObject(scenario) && isText(scenario.id)) {
      if (seen.has(scenario.id)) {
        problems.push(`${scenario.id}: duplicate scenario id`);
      } else {
        seen.add(scenario.id);
      }
    }

    const errors = validateScenario(scenario);
    for (const error of errors) {
      problems.push(`${label}: ${error}`);
    }
    if (errors.length === 0) scenarios.push(scenario);
  }

  if (problems.length > 0) {
    throw new Error(problems.join('\n'));
  }

  return scenarios.sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
}

module.exports = {
  loadScenarios,
  validateScenario,
};
