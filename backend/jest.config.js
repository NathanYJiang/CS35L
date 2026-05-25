/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/__tests__/setup.js'],
  testMatch: ['**/__tests__/**/*.test.js', '**/server.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/mocks/', '/__tests__/setup.js'],
};
