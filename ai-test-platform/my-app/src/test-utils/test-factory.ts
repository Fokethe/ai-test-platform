/**
 * 测试数据工厂 - 使用 Faker 生成真实测试数据
 */
import { faker } from '@faker-js/faker/locale/zh_CN';

/**
 * 用户数据类型
 */
export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 会话数据类型
 */
export interface TestSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  expires: string;
}

/**
 * 用户凭证类型
 */
export interface UserCredentials {
  email: string;
  password: string;
}

/**
 * 创建测试用户
 */
export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  
  return {
    id: overrides.id ?? faker.string.uuid(),
    email: overrides.email ?? faker.internet.email({ firstName, lastName }),
    password: overrides.password ?? faker.internet.password({ length: 12, memorable: false }),
    name: overrides.name ?? faker.person.fullName({ firstName, lastName }),
    role: overrides.role ?? 'user',
    createdAt: overrides.createdAt ?? faker.date.past(),
    updatedAt: overrides.updatedAt ?? faker.date.recent(),
  };
}

/**
 * 创建多个测试用户
 */
export function createTestUsers(count: number, overrides: Partial<TestUser> = {}): TestUser[] {
  return Array.from({ length: count }, () => createTestUser(overrides));
}

/**
 * 创建管理员用户
 */
export function createAdminUser(overrides: Partial<TestUser> = {}): TestUser {
  return createTestUser({
    role: 'admin',
    email: `admin-${faker.string.alphanumeric(6)}@example.com`,
    ...overrides,
  });
}

/**
 * 创建有效的用户凭证
 */
export function createValidCredentials(overrides: Partial<UserCredentials> = {}): UserCredentials {
  return {
    email: overrides.email ?? faker.internet.email(),
    password: overrides.password ?? faker.internet.password({ length: 12 }),
  };
}

/**
 * 创建无效的凭证组合（用于负面测试）
 */
export function createInvalidCredentials(): UserCredentials[] {
  return [
    // 无效邮箱格式
    { email: 'invalid-email', password: faker.internet.password() },
    // 空邮箱
    { email: '', password: faker.internet.password() },
    // 空密码
    { email: faker.internet.email(), password: '' },
    // 邮箱过长
    { email: `${faker.string.alphanumeric(250)}@test.com`, password: faker.internet.password() },
    // 密码过短
    { email: faker.internet.email(), password: '123' },
    // 特殊字符注入尝试
    { email: "test@test.com'; DROP TABLE users; --", password: faker.internet.password() },
  ];
}

/**
 * 创建测试会话
 */
export function createTestSession(overrides: Partial<TestSession> = {}): TestSession {
  const user = createTestUser();
  
  return {
    user: {
      id: overrides.user?.id ?? user.id,
      email: overrides.user?.email ?? user.email,
      name: overrides.user?.name ?? user.name,
      role: overrides.user?.role ?? user.role,
    },
    expires: overrides.expires ?? faker.date.future().toISOString(),
  };
}

/**
 * 创建已过期会话
 */
export function createExpiredSession(): TestSession {
  return {
    user: {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      role: 'user',
    },
    expires: faker.date.past().toISOString(),
  };
}

/**
 * API 响应工厂
 */
export const apiResponses = {
  /**
   * 成功响应
   */
  success<T>(data: T) {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * 错误响应
   */
  error(message: string, code: string = 'ERROR') {
    return {
      success: false,
      error: {
        message,
        code,
      },
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * 分页响应
   */
  paginated<T>(items: T[], page: number = 1, limit: number = 10, total?: number) {
    const totalItems = total ?? items.length;
    return {
      success: true,
      data: {
        items: items.slice((page - 1) * limit, page * limit),
        pagination: {
          page,
          limit,
          total: totalItems,
          totalPages: Math.ceil(totalItems / limit),
        },
      },
      timestamp: new Date().toISOString(),
    };
  },
};

/**
 * HTTP 状态码常量
 */
export const httpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * 测试超时配置
 */
export const timeouts = {
  /** 单元测试默认超时 */
  unit: 5000,
  /** 集成测试超时 */
  integration: 10000,
  /** API 测试超时 */
  api: 15000,
  /** E2E 测试超时 */
  e2e: 30000,
} as const;

/**
 * 测试数据清理助手
 */
export const cleanupHelpers = {
  /**
   * 清理数据库中的测试用户（根据邮箱模式）
   */
  testEmailPattern: /@test\.|@example\./,
  
  /**
   * 生成临时邮箱（用于自动清理）
   */
  generateTempEmail(prefix: string = 'test'): string {
    return `${prefix}-${faker.string.alphanumeric(8)}@test.example.com`;
  },
};
