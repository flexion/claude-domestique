module.exports = {
  testEnvironment: 'node',
  reporters: [
    'default',
    'jest-github-actions-reporter',
  ],
  coverageThreshold: {
    global: {
      lines: 77,
      branches: 69,
    },
  },
};
