'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// The control arm removes guidance without adding a signal of its own. Negative
// wording such as "do not use this skill" is itself guidance and would measure
// avoidance rather than the absence of a trigger.
const NEUTRAL_DESCRIPTION = 'Skill.';

const CONTROL_VERSION_PREFIX = '0.0.0-control.';
const VERSION_SURFACES = [
  'package.json',
  path.join('.claude-plugin', 'plugin.json'),
  path.join('.codex-plugin', 'plugin.json'),
];
const IGNORED_DIRECTORIES = new Set(['.git', 'coverage', 'node_modules']);

function sanitizeRunId(runId) {
  if (typeof runId !== 'string' || !runId.trim()) {
    throw new Error('control copy: runId must be a non-empty string');
  }
  return runId.replace(/[^0-9A-Za-z-]/g, '-');
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function resolveLinkTarget(linkPath) {
  const lexical = path.resolve(path.dirname(linkPath), fs.readlinkSync(linkPath));
  try {
    return fs.realpathSync(lexical);
  } catch (error) {
    return lexical;
  }
}

function copyTree(sourceRoot, destinationRoot, realSourceRoot) {
  const directoryModes = [];

  const visit = (sourceDirectory, destinationDirectory) => {
    fs.mkdirSync(destinationDirectory, { recursive: true });
    directoryModes.push([destinationDirectory, fs.statSync(sourceDirectory).mode & 0o777]);

    const entries = fs.readdirSync(sourceDirectory, { withFileTypes: true })
      .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));

    for (const entry of entries) {
      if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
      const sourcePath = path.join(sourceDirectory, entry.name);
      const destinationPath = path.join(destinationDirectory, entry.name);

      if (entry.isSymbolicLink()) {
        const target = resolveLinkTarget(sourcePath);
        if (!isInside(realSourceRoot, target)) {
          throw new Error(`control copy: symlink ${toPosix(path.relative(sourceRoot, sourcePath))} escapes the plugin root`);
        }
        fs.symlinkSync(fs.readlinkSync(sourcePath), destinationPath);
        continue;
      }

      if (entry.isDirectory()) {
        visit(sourcePath, destinationPath);
        continue;
      }

      fs.copyFileSync(sourcePath, destinationPath);
      fs.chmodSync(destinationPath, fs.statSync(sourcePath).mode & 0o777);
    }
  };

  visit(sourceRoot, destinationRoot);

  // Apply directory modes deepest first so a read-only source directory does not
  // block writing the entries it contains.
  for (const [directory, mode] of directoryModes.reverse()) {
    fs.chmodSync(directory, mode);
  }
}

function splitFrontmatter(content, label) {
  const opening = /^---[ \t]*(\r?\n)/.exec(content);
  if (!opening) {
    throw new Error(`control copy: ${label} is missing YAML frontmatter`);
  }

  const start = opening[0].length;
  const closing = /(^|\r?\n)---[ \t]*(\r?\n|$)/.exec(content.slice(start));
  if (!closing) {
    throw new Error(`control copy: ${label} has unclosed YAML frontmatter`);
  }

  const frontmatterEnd = start + closing.index + closing[1].length;
  return {
    body: content.slice(start + closing.index + closing[0].length),
    closing: content.slice(frontmatterEnd, start + closing.index + closing[0].length),
    frontmatter: content.slice(start, frontmatterEnd),
    opening: content.slice(0, start),
  };
}

function splitLines(text) {
  return text.length === 0 ? [] : text.split('\n');
}

// Locates the top-level description entry and every continuation line that
// belongs to its scalar. Continuation lines are blank or more indented than the
// key; trailing blank lines stay with the following entry.
function locateDescription(frontmatter, label) {
  const lines = splitLines(frontmatter);
  const start = lines.findIndex(line => /^(?:description|"description"|'description')[ \t]*:/.test(line));
  if (start === -1) {
    throw new Error(`control copy: ${label} has no top-level description key`);
  }

  let end = start;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index].replace(/\r$/, '');
    if (line.trim() !== '' && !/^[ \t]/.test(line)) break;
    // An indented comment is a comment, not a scalar continuation. Swallowing it
    // would delete a line the ablation is not allowed to touch.
    if (/^[ \t]*#/.test(line)) break;
    end = index;
  }
  while (end > start && lines[end].replace(/\r$/, '').trim() === '') {
    end -= 1;
  }

  return { end, lines, start };
}

function neutralizeDescription(content, label) {
  const parts = splitFrontmatter(content, label);
  const { end, lines, start } = locateDescription(parts.frontmatter, label);
  const eol = /\r$/.test(lines[start]) ? '\r' : '';
  const rewritten = [
    ...lines.slice(0, start),
    `description: ${NEUTRAL_DESCRIPTION}${eol}`,
    ...lines.slice(end + 1),
  ].join('\n');

  return `${parts.opening}${rewritten}${parts.closing}${parts.body}`;
}

function removeDescription(content, label) {
  const parts = splitFrontmatter(content, label);
  const { end, lines, start } = locateDescription(parts.frontmatter, label);
  return [...lines.slice(0, start), ...lines.slice(end + 1)].join('\n');
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function stampVersions(destination, version) {
  const stamped = [];
  for (const surface of VERSION_SURFACES) {
    const surfacePath = path.join(destination, surface);
    if (!fs.existsSync(surfacePath)) continue;
    const manifest = JSON.parse(fs.readFileSync(surfacePath, 'utf8'));
    manifest.version = version;
    fs.writeFileSync(surfacePath, `${JSON.stringify(manifest, null, 2)}\n`);
    stamped.push(surface);
  }
  return stamped;
}

function inventory(root) {
  const entries = new Map();

  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      const relative = toPosix(path.relative(root, absolute));
      if (entry.isSymbolicLink()) {
        entries.set(relative, { kind: 'symlink', path: absolute });
      } else if (entry.isDirectory()) {
        entries.set(relative, { kind: 'directory', path: absolute });
        visit(absolute);
      } else {
        entries.set(relative, { kind: 'file', path: absolute });
      }
    }
  };

  visit(root);
  return entries;
}

function verifyTargetSkill(sourcePath, copyPath) {
  const sourceContent = fs.readFileSync(sourcePath, 'utf8');
  const copyContent = fs.readFileSync(copyPath, 'utf8');
  const label = 'target SKILL.md';

  const sourceParts = splitFrontmatter(sourceContent, label);
  const copyParts = splitFrontmatter(copyContent, label);

  if (copyParts.body !== sourceParts.body) {
    throw new Error('control copy: the target skill body changed');
  }
  if (copyParts.opening !== sourceParts.opening || copyParts.closing !== sourceParts.closing) {
    throw new Error('control copy: the target skill frontmatter delimiters changed');
  }
  if (removeDescription(copyContent, label) !== removeDescription(sourceContent, label)) {
    throw new Error('control copy: a target skill frontmatter key other than description changed');
  }

  const copyFrontmatter = yaml.load(copyParts.frontmatter);
  if (!copyFrontmatter || copyFrontmatter.description !== NEUTRAL_DESCRIPTION) {
    throw new Error('control copy: the target skill description is not the neutral description');
  }

  const sourceFrontmatter = yaml.load(sourceParts.frontmatter);
  if (copyFrontmatter.name !== sourceFrontmatter.name) {
    throw new Error('control copy: the target skill name changed');
  }
}

function verifyVersionSurface(sourcePath, copyPath, version) {
  const sourceManifest = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const copyManifest = JSON.parse(fs.readFileSync(copyPath, 'utf8'));
  if (copyManifest.version !== version) {
    throw new Error(`control copy: ${path.basename(copyPath)} was not stamped with ${version}`);
  }
  if (!deepEqual({ ...sourceManifest, version }, copyManifest)) {
    throw new Error(`control copy: ${path.basename(copyPath)} changed a field other than version`);
  }
}

function verifyAllowlist(sourceRoot, destination, targetRelative, stamped, version) {
  const allowed = new Set([targetRelative, ...stamped.map(toPosix)]);
  const source = inventory(sourceRoot);
  const copy = inventory(destination);

  for (const relative of source.keys()) {
    if (!copy.has(relative)) {
      throw new Error(`control copy: ${relative} is missing from the copy`);
    }
  }
  for (const relative of copy.keys()) {
    if (!source.has(relative)) {
      throw new Error(`control copy: ${relative} is not present in the source plugin`);
    }
  }

  for (const [relative, sourceEntry] of source) {
    const copyEntry = copy.get(relative);
    if (copyEntry.kind !== sourceEntry.kind) {
      throw new Error(`control copy: ${relative} changed entry kind`);
    }
    if (sourceEntry.kind === 'directory') continue;

    if (sourceEntry.kind === 'symlink') {
      if (fs.readlinkSync(copyEntry.path) !== fs.readlinkSync(sourceEntry.path)) {
        throw new Error(`control copy: ${relative} changed its symlink target`);
      }
      continue;
    }

    if (fs.readFileSync(sourceEntry.path).equals(fs.readFileSync(copyEntry.path))) continue;

    if (relative === targetRelative) {
      verifyTargetSkill(sourceEntry.path, copyEntry.path);
      continue;
    }
    if (allowed.has(relative)) {
      verifyVersionSurface(sourceEntry.path, copyEntry.path, version);
      continue;
    }
    throw new Error(`control copy: ${relative} differs but is not on the semantic diff allowlist`);
  }
}

function createControlCopy({ pluginRoot, skillName, destination, runId }) {
  if (typeof pluginRoot !== 'string' || !pluginRoot) {
    throw new Error('control copy: pluginRoot must be a path');
  }
  if (typeof skillName !== 'string' || !skillName) {
    throw new Error('control copy: skillName must be a non-empty string');
  }
  if (typeof destination !== 'string' || !destination) {
    throw new Error('control copy: destination must be a path');
  }

  const version = `${CONTROL_VERSION_PREFIX}${sanitizeRunId(runId)}`;

  if (!fs.existsSync(pluginRoot) || !fs.statSync(pluginRoot).isDirectory()) {
    throw new Error(`control copy: plugin root ${pluginRoot} is not a directory`);
  }
  if (fs.existsSync(destination)) {
    throw new Error(`control copy: destination already exists at ${destination}`);
  }

  const targetRelative = `skills/${skillName}/SKILL.md`;
  const sourceSkillPath = path.join(pluginRoot, 'skills', skillName, 'SKILL.md');
  if (!fs.existsSync(sourceSkillPath)) {
    throw new Error(`control copy: ${targetRelative} does not exist in ${pluginRoot}`);
  }
  // lstat, not stat: a symlinked target would be copied as a link, and writing
  // the neutralized description through it would follow the link back out of the
  // copy and modify the source plugin. Refuse rather than ablate in place.
  const sourceSkillStats = fs.lstatSync(sourceSkillPath);
  if (sourceSkillStats.isSymbolicLink()) {
    throw new Error(`control copy: ${targetRelative} is a symlink and cannot be ablated in isolation`);
  }
  if (!sourceSkillStats.isFile()) {
    throw new Error(`control copy: ${targetRelative} does not exist in ${pluginRoot}`);
  }

  const realSourceRoot = fs.realpathSync(pluginRoot);
  copyTree(pluginRoot, destination, realSourceRoot);

  const copiedSkillPath = path.join(destination, 'skills', skillName, 'SKILL.md');
  const copiedSkill = fs.readFileSync(copiedSkillPath, 'utf8');
  fs.writeFileSync(copiedSkillPath, neutralizeDescription(copiedSkill, targetRelative));

  const stamped = stampVersions(destination, version);
  verifyAllowlist(pluginRoot, destination, targetRelative, stamped, version);

  return destination;
}

module.exports = { NEUTRAL_DESCRIPTION, createControlCopy };
