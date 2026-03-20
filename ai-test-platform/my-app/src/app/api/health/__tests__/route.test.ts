/**
 * Health API 集成测试
 * @group api
 * @group integration
 */
import { GET } from '../route';
import { createMockRequest, parseJsonResponse, API_TEST_TIMEOUT } from '../../__tests__/integration.setup';
import { prisma } from '@/lib/prisma';

// 模拟 Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

describe('Health API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * @test 健康检查 - 所有服务正常
   */
  test(
    'should return healthy status when all services are up',
    async () => {
      // Arrange
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }]);

      // Act
      const response = await GET();
      const data = await parseJsonResponse(response);

      // Assert
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        status: 'healthy',
        version: '1.0.0',
        services: {
          database: 'connected',
          api: 'running',
        },
      });
      expect(data).toHaveProperty('timestamp');
      expect(new Date(data.timestamp as string).getTime()).not.toBeNaN();
    },
    API_TEST_TIMEOUT
  );

  /**
   * @test 健康检查 - 数据库连接失败
   */
  test(
    'should return unhealthy status when database is down',
    async () => {
      // Arrange
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(
        new Error('Connection refused')
      );

      // Act
      const response = await GET();
      const data = await parseJsonResponse(response);

      // Assert
      expect(response.status).toBe(503);
      expect(data).toMatchObject({
        status: 'unhealthy',
        error: 'Database connection failed',
      });
      expect(data).toHaveProperty('timestamp');
    },
    API_TEST_TIMEOUT
  );

  /**
   * @test 响应格式验证
   */
  test(
    'should return valid JSON response',
    async () => {
      // Arrange
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }]);

      // Act
      const response = await GET();

      // Assert
      const contentType =
        response.headers.get('content-type') || response.headers.get('Content-Type');
      if (contentType) {
        expect(contentType).toContain('application/json');
      }
    },
    API_TEST_TIMEOUT
  );
});
