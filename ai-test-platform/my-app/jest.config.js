/** @type {import('jest').Config} */
module.exports = {
  // 使用 projects 配置区分不同类型的测试
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/src'],
      testMatch: [
        '**/lib/**/__tests__/**/*.test.ts',
        '**/components/**/__tests__/**/*.test.tsx',
        '**/app/**/__tests__/**/*.test.tsx',
        '!**/app/api/**/__tests__/**/*.test.ts',
      ],
      transform: {
        '^.+\.tsx?$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
          },
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^next-auth$': '<rootDir>/src/lib/__mocks__/next-auth.ts',
        '^@/lib/auth$': '<rootDir>/src/lib/__mocks__/auth.ts',
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    },
    {
      displayName: 'api',
      testEnvironment: 'node',
      roots: ['<rootDir>/src'],
      testMatch: [
        '**/app/api/**/__tests__/**/*.test.ts',
      ],
      transform: {
        '^.+\.tsx?$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
          },
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^next-auth$': '<rootDir>/src/lib/__mocks__/next-auth.ts',
        '^@/lib/auth$': '<rootDir>/src/lib/__mocks__/auth.ts',
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.node.js'],
    },
  ],
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    'src/app/api/**/*.ts',
    '!src/lib/__tests__/**',
    '!**/*.d.ts',
  ],
};
