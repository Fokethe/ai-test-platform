/**
 * Feature Decomposer Node Tests
 * TDD for Complex Feature Decomposition
 */

import { featureDecomposerNode, decompositionRouter } from '../nodes/feature-decomposer-node';
import { AgentState, WorkflowStatus, TestPoint } from '../types';

describe('Feature Decomposer Node', () => {
  describe('Basic Decomposition', () => {
    it('should decompose simple feature into testable units', async () => {
      const state: AgentState = {
        status: WorkflowStatus.ANALYZING,
        document: {
          type: 'txt',
          filename: 'test.txt',
          title: '用户登录功能',
          content: '用户可以通过用户名和密码登录系统',
          rawText: '用户可以通过用户名和密码登录系统',
          size: 100,
        },
        features: ['用户登录功能'],
        businessRules: [
          { type: 'length', description: '用户名长度6-20字符' },
          { type: 'format', description: '密码必须包含字母和数字' },
        ],
        testPoints: [],
        similarCases: [],
        generatedCases: [],
        retryCount: 0,
      };

      const result = await featureDecomposerNode(state);
      
      expect(result.testPoints).toBeDefined();
      expect(result.testPoints!.length).toBeGreaterThan(0);
      expect(result.status).toBe(WorkflowStatus.ANALYZING);
    });

    it('should decompose complex e-commerce feature', async () => {
      const state: AgentState = {
        status: WorkflowStatus.ANALYZING,
        document: {
          type: 'txt',
          filename: 'ecommerce.txt',
          title: '电商订单系统',
          content: '用户可以将商品加入购物车，填写收货地址，选择支付方式完成下单',
          rawText: '用户可以将商品加入购物车，填写收货地址，选择支付方式完成下单',
          size: 200,
        },
        features: ['购物车管理', '地址管理', '订单创建', '支付处理'],
        businessRules: [
          { type: 'limit', description: '单个商品限购10件' },
          { type: 'range', description: '订单金额满99元免运费' },
        ],
        testPoints: [],
        similarCases: [],
        generatedCases: [],
        retryCount: 0,
      };

      const result = await featureDecomposerNode(state);
      
      // 复杂功能应该生成更多测试点
      expect(result.testPoints!.length).toBeGreaterThan(4);
      
      // 应该包含各个功能的测试点
      const featureNames = result.testPoints!.map(tp => tp.relatedFeature);
      expect(featureNames).toContain('购物车管理');
      expect(featureNames).toContain('地址管理');
      expect(featureNames).toContain('订单创建');
      expect(featureNames).toContain('支付处理');
    });
  });

  describe('Test Point Generation', () => {
    it('should generate P0 test points for core features', async () => {
      const state: AgentState = {
        status: WorkflowStatus.ANALYZING,
        features: ['用户注册', '用户登录'],
        businessRules: [],
        testPoints: [],
        similarCases: [],
        generatedCases: [],
        retryCount: 0,
      };

      const result = await featureDecomposerNode(state);
      
      const p0Points = result.testPoints!.filter(tp => tp.priority === 'P0');
      expect(p0Points.length).toBeGreaterThan(0);
    });

    it('should generate boundary test points based on business rules', async () => {
      const state: AgentState = {
        status: WorkflowStatus.ANALYZING,
        features: ['商品购买'],
        businessRules: [
          { type: 'length', description: '商品名称长度1-100字符' },
          { type: 'range', description: '价格范围0.01-999999.99' },
        ],
        testPoints: [],
        similarCases: [],
        generatedCases: [],
        retryCount: 0,
      };

      const result = await featureDecomposerNode(state);
      
      // 应该有边界值测试点
      const boundaryPoints = result.testPoints!.filter(tp => 
        tp.name.includes('边界') || tp.description.includes('边界')
      );
      expect(boundaryPoints.length).toBeGreaterThan(0);
    });

    it('should handle empty features gracefully', async () => {
      const state: AgentState = {
        status: WorkflowStatus.ANALYZING,
        features: [],
        businessRules: [],
        testPoints: [],
        similarCases: [],
        generatedCases: [],
        retryCount: 0,
      };

      const result = await featureDecomposerNode(state);
      
      expect(result.testPoints).toBeDefined();
      expect(result.testPoints!.length).toBe(0);
    });
  });

  describe('Conditional Routing', () => {
    it('should route to decompose when feature count > 3', () => {
      const state: AgentState = {
        status: WorkflowStatus.ANALYZING,
        features: ['功能1', '功能2', '功能3', '功能4', '功能5'],
        businessRules: [],
        testPoints: [],
        similarCases: [],
        generatedCases: [],
        retryCount: 0,
      };

      const route = decompositionRouter(state);
      expect(route).toBe('decompose');
    });

    it('should route to skip when feature count <= 3', () => {
      const state: AgentState = {
        status: WorkflowStatus.ANALYZING,
        features: ['功能1', '功能2'],
        businessRules: [],
        testPoints: [],
        similarCases: [],
        generatedCases: [],
        retryCount: 0,
      };

      const route = decompositionRouter(state);
      expect(route).toBe('skip');
    });

    it('should route to decompose when business rules are complex', () => {
      const state: AgentState = {
        status: WorkflowStatus.ANALYZING,
        features: ['简单功能'],
        businessRules: [
          { type: 'length', description: '规则1' },
          { type: 'format', description: '规则2' },
          { type: 'range', description: '规则3' },
          { type: 'limit', description: '规则4' },
        ],
        testPoints: [],
        similarCases: [],
        generatedCases: [],
        retryCount: 0,
      };

      const route = decompositionRouter(state);
      expect(route).toBe('decompose');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors with retry', async () => {
      const state: AgentState = {
        status: WorkflowStatus.ANALYZING,
        features: ['测试功能'],
        businessRules: [],
        testPoints: [],
        similarCases: [],
        generatedCases: [],
        retryCount: 0,
      };

      // Mock a scenario that might fail
      const result = await featureDecomposerNode(state);
      
      // Should complete without error
      expect(result.error).toBeUndefined();
    });
  });

  describe('Integration with Workflow', () => {
    it('should preserve existing test points', async () => {
      const existingPoints: TestPoint[] = [
        { id: 'tp-1', name: '已有测试点', description: '描述', priority: 'P0', relatedFeature: '功能' },
      ];
      
      const state: AgentState = {
        status: WorkflowStatus.ANALYZING,
        features: ['新功能'],
        businessRules: [],
        testPoints: existingPoints,
        similarCases: [],
        generatedCases: [],
        retryCount: 0,
      };

      const result = await featureDecomposerNode(state);
      
      // 应该保留已有测试点并添加新测试点
      expect(result.testPoints!.length).toBeGreaterThan(existingPoints.length);
      expect(result.testPoints!.some(tp => tp.id === 'tp-1')).toBe(true);
    });
  });
});
