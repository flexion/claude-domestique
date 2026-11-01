module.exports = {
  testEnvironment: 'node',
  // Helper scripts spawned by tests live beside them but are not test files.
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/fixtures/'],
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
