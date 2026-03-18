/** @type {import('jest').Config} */
module.exports = {
  // 根目录
  rootDir: __dirname,
  
  // 测试环境
  testEnvironment: 'jsdom',
  
  // 测试文件匹配 - 支持.ts和.tsx
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/__tests__/**/*.test.tsx'
  ],
  
  // 忽略模式
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/my-app_root/',
    '/deploy-test/',
    '/src_root/',
    '/docs/90-归档/99-历史归档/',
  ],
  
  // 模块搜索路径
  modulePaths: ['<rootDir>/src'],
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  
  // TypeScript转换 - 使用babel-jest替代ts-jest以更好支持ES模块
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }],
  },
  
  // 不转换node_modules中的文件，但允许ES模块
  transformIgnorePatterns: [
    '/node_modules/(?!(next|@next|react|react-dom|@testing-library|exceljs|uuid|\.prisma)/)',
  ],
  
  // 模块名映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^next/navigation$': '<rootDir>/src/__mocks__/next-navigation.ts',
    '^next-auth/react$': '<rootDir>/src/__mocks__/next-auth-react.ts',
    '^exceljs$': '<rootDir>/src/__mocks__/exceljs.ts',
  },
  
  // 启动文件
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // 代码覆盖率
  collectCoverageFrom: [
    'src/lib/**/*.{ts,tsx}',
    '!src/lib/__tests__/**',
    '!**/*.d.ts',
  ],
  
  // 扩展名
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
