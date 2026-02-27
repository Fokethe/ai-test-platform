/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/app/api/**/__tests__/**/*.test.ts',
    '**/lib/**/__tests__/**/*.test.ts',
    '!**/lib/ai/**/__tests__/**/*.test.ts',
    '!**/lib/__tests__/*navigation*.test.tsx',
    '!**/lib/__tests__/*form*.test.tsx',
  ],
  transform: {
    '^.+\\.tsx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.node.js'],
  testTimeout: 10000,
};