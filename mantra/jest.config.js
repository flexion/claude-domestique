module.exports = {
  testEnvironment: 'node',
  reporters: [
    'default',
    'jest-github-actions-reporter',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/lib/shared.js',  // Bundled from shared module, tested separately
  ],
  coverageThreshold: {
    global: {
      lines: 40,
      branches: 35,
    },
  },
};
