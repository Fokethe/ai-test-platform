/** @type {import('jest').Config} */
module.exports = {
  // 根目录 - 严格限制为当前项目
  rootDir: __dirname,
  
  // 只从当前项目的src目录搜索
  roots: ['<rootDir>/src'],
  
  // 测试环境
  testEnvironment: 'jsdom',
  
  // 测试文件匹配 - 只匹配当前项目
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  
  // 严格忽略其他目录
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '<rootDir>/../',
    'my-app_root',
    'deploy-test',
    'src_root',
  ],
  
  // 模块搜索路径
  modulePaths: ['<rootDir>/src'],
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  
  // TypeScript转换
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
    }],
  },
  
  // 模块名映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // 忽略模块路径冲突
  modulePathIgnorePatterns: [
    '<rootDir>/../',
    'my-app_root',
    'deploy-test',
    'src_root',
  ],
  
  // Haste配置
  haste: {
    forceNodeFilesystemAPI: true,
    throwOnModuleCollision: false,
  },
  
  // 启动文件
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // 代码覆盖率
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    '!src/lib/__tests__/**',
    '!**/*.d.ts',
  ],
};
