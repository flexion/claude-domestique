module.exports = {
  testEnvironment: 'node',
  reporters: [
    'default',
    'jest-github-actions-reporter',
  ],
  coverageThreshold: {
    global: {
      lines: 85,
      branches: 75,
    },
  },
};
