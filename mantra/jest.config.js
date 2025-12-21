module.exports = {
  testEnvironment: 'node',
  reporters: [
    'default',
    'jest-github-actions-reporter',
  ],
  coverageThreshold: {
    global: {
      lines: 90,
      branches: 83,
    },
  },
};
