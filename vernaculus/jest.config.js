module.exports = {
  testEnvironment: 'node',
  reporters: [
    'default',
    'jest-github-actions-reporter',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/skills/',  // shipped skill content, not unit-tested here
  ],
  coverageThreshold: {
    global: {
      lines: 50,
      branches: 45,
    },
  },
};
