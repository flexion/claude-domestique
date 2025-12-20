/**
 * Shared test helpers for memento integration tests
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

/**
 * Create a temporary directory for tests
 * @param {string} prefix - Prefix for the temp directory name
 * @returns {string} Path to the created temp directory
 */
/* istanbul ignore next - prefix always provided */
function createTempDir(prefix = 'memento-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/**
 * Clean up a temporary directory
 * @param {string} tempDir - Path to the temp directory to remove
 */
/* istanbul ignore next - cleanup always called with valid tempDir */
function cleanupTempDir(tempDir) {
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * Set up a git repository in a directory
 * @param {string} tempDir - Directory to initialize as git repo
 * @param {string} branchName - Branch to create and checkout (optional)
 * @returns {void}
 */
function setupGitRepo(tempDir, branchName = null) {
  execSync('git init', { cwd: tempDir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });

  // Create initial commit so we can create branches
  fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test');
  execSync('git add .', { cwd: tempDir, stdio: 'pipe' });
  execSync('git commit -m "Initial commit"', { cwd: tempDir, stdio: 'pipe' });

  if (branchName) {
    execSync(`git checkout -b ${branchName}`, { cwd: tempDir, stdio: 'pipe' });
  }
}

module.exports = {
  createTempDir,
  cleanupTempDir,
  setupGitRepo,
};
