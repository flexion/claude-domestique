module.exports = {
  testEnvironment: 'node',
  reporters: [
    'default',
    'jest-github-actions-reporter',
  ],
  coverageThreshold: {
    global: {
      lines: 92,
      branches: 92,
    },
  },
};
