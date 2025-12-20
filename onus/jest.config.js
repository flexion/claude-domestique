module.exports = {
  testEnvironment: 'node',
  reporters: [
    'default',
    'jest-github-actions-reporter',
  ],
  coverageThreshold: {
    global: {
      lines: 78,
      branches: 65,
    },
  },
};
