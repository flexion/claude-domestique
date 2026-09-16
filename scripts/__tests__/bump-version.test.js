'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SOURCE = path.join(__dirname, '..', 'bump-version.js');

function writeJson(root, relative, value) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

test('bumps Vernaculus across package, host, and marketplace metadata', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bump-version-'));
  try {
    const script = path.join(root, 'scripts', 'bump-version.js');
    fs.mkdirSync(path.dirname(script), { recursive: true });
    fs.copyFileSync(SOURCE, script);
    writeJson(root, 'vernaculus/package.json', { name: 'vernaculus', version: '0.1.0' });
    writeJson(root, 'vernaculus/.claude-plugin/plugin.json', {
      name: 'vernaculus', version: '0.1.0',
    });
    writeJson(root, 'vernaculus/.codex-plugin/plugin.json', {
      name: 'vernaculus', version: '0.1.0',
    });
    writeJson(root, '.claude-plugin/marketplace.json', {
      plugins: [{ name: 'vernaculus', version: '0.1.0' }],
    });

    const result = spawnSync(process.execPath, [script, 'vernaculus', 'minor'], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    for (const file of [
      'vernaculus/package.json',
      'vernaculus/.claude-plugin/plugin.json',
      'vernaculus/.codex-plugin/plugin.json',
    ]) {
      expect(JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')).version).toBe('0.2.0');
    }
    const marketplace = JSON.parse(fs.readFileSync(
      path.join(root, '.claude-plugin/marketplace.json'), 'utf8',
    ));
    expect(marketplace.plugins[0].version).toBe('0.2.0');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
