/**
 * Human-in-the-Loop Review Node Tests
 * TDD for Human Review Integration
 */

import { humanReviewNode, reviewRouter } from '../nodes/human-review-node';
import { AgentState, WorkflowStatus, GeneratedTestCase } from '../types';

describe('Human Review Node', () => {
  describe('Review State Management', () => {
    it('should set state to REVIEWING when entering review', async () => {
      const state: AgentState = {
        status: WorkflowStatus.GENERATING,
        generatedCases: [
          {
            id: 'tc-1',
            title: '用户登录测试',
            precondition: '用户已注册',
            steps: ['输入用户名', '输入密码', '点击登录'],
            expectedResult: '登录成功',
            priority: 'P0',
            testPointId: 'tp-1',
            relatedFeature: '用户登录',
          },
        ],
        testPoints: [],
        similarCases: [],
        retryCount: 0,
      };

      const result = await humanReviewNode(state);
      
      expect(result.status).toBe(WorkflowStatus.REVIEWING);
      expect(result.reviewedCases).toBeDefined();
    });

    it('should handle approve decision', async () => {
      const state: AgentState = {
        status: WorkflowStatus.REVIEWING,
        generatedCases: [
          {
            id: 'tc-1',
            title: '测试用例1',
            precondition: '准备条件',
            steps: ['步骤1'],
            expectedResult: '预期结果',
            priority: 'P0',
            testPointId: 'tp-1',
            relatedFeature: '功能1',
          },
        ],
        reviewDecision: 'approve',
        retryCount: 0,
      };

      const result = await humanReviewNode(state);
      
      expect(result.status).toBe(WorkflowStatus.COMPLETED);
      expect(result.reviewedCases?.length).toBe(1);
    });

    it('should handle regenerate decision', async () => {
      const state: AgentState = {
        status: WorkflowStatus.REVIEWING,
        generatedCases: [
          {
            id: 'tc-1',
            title: '测试用例1',
            precondition: '准备条件',
            steps: ['步骤1'],
            expectedResult: '预期结果',
            priority: 'P0',
            testPointId: 'tp-1',
            relatedFeature: '功能1',
          },
        ],
        reviewDecision: 'regenerate',
        reviewComments: '需要补充边界值测试',
        retryCount: 0,
      };

      const result = await humanReviewNode(state);
      
      // 应该回到生成阶段重新生成
      expect(result.status).toBe(WorkflowStatus.GENERATING);
      expect(result.reviewComments).toBe('需要补充边界值测试');
    });

    it('should handle edit decision', async () => {
      const state: AgentState = {
        status: WorkflowStatus.REVIEWING,
        generatedCases: [
          {
            id: 'tc-1',
            title: '原测试用例',
            precondition: '原条件',
            steps: ['原步骤'],
            expectedResult: '原结果',
            priority: 'P0',
            testPointId: 'tp-1',
            relatedFeature: '功能1',
          },
        ],
        reviewedCases: [
          {
            id: 'tc-1',
            title: '编辑后的测试用例',
            precondition: '编辑后的条件',
            steps: ['编辑后的步骤'],
            expectedResult: '编辑后的结果',
            priority: 'P1',
            testPointId: 'tp-1',
            relatedFeature: '功能1',
          },
        ],
        reviewDecision: 'edit',
        retryCount: 0,
      };

      const result = await humanReviewNode(state);
      
      expect(result.status).toBe(WorkflowStatus.COMPLETED);
      // 应该使用编辑后的版本
      expect(result.reviewedCases?.[0].title).toBe('编辑后的测试用例');
    });
  });

  describe('Review Router', () => {
    it('should route to review when review is enabled', () => {
      const state: AgentState = {
        status: WorkflowStatus.GENERATING,
        generatedCases: [{ id: 'tc-1' } as GeneratedTestCase],
        retryCount: 0,
      };

      // Simulate config with review enabled
      const route = reviewRouter(state, { enableReview: true });
      expect(route).toBe('review');
    });

    it('should route to complete when review is disabled', () => {
      const state: AgentState = {
        status: WorkflowStatus.GENERATING,
        generatedCases: [{ id: 'tc-1' } as GeneratedTestCase],
        retryCount: 0,
      };

      const route = reviewRouter(state, { enableReview: false });
      expect(route).toBe('complete');
    });

    it('should route based on review decision', () => {
      const state: AgentState = {
        status: WorkflowStatus.REVIEWING,
        generatedCases: [{ id: 'tc-1' } as GeneratedTestCase],
        reviewDecision: 'approve',
        retryCount: 0,
      };

      const route = reviewRouter(state, { enableReview: true });
      expect(route).toBe('complete');
    });

    it('should route to regenerate when decision is regenerate', () => {
      const state: AgentState = {
        status: WorkflowStatus.REVIEWING,
        generatedCases: [{ id: 'tc-1' } as GeneratedTestCase],
        reviewDecision: 'regenerate',
        retryCount: 0,
      };

      const route = reviewRouter(state, { enableReview: true });
      expect(route).toBe('regenerate');
    });

    it('should route to edit handling when decision is edit', () => {
      const state: AgentState = {
        status: WorkflowStatus.REVIEWING,
        generatedCases: [{ id: 'tc-1' } as GeneratedTestCase],
        reviewDecision: 'edit',
        retryCount: 0,
      };

      const route = reviewRouter(state, { enableReview: true });
      expect(route).toBe('complete'); // edit后也是完成
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty generated cases', async () => {
      const state: AgentState = {
        status: WorkflowStatus.GENERATING,
        generatedCases: [],
        retryCount: 0,
      };

      const result = await humanReviewNode(state);
      
      expect(result.status).toBe(WorkflowStatus.COMPLETED);
      expect(result.reviewedCases).toEqual([]);
    });

    it('should handle no review decision (waiting)', async () => {
      const state: AgentState = {
        status: WorkflowStatus.REVIEWING,
        generatedCases: [
          {
            id: 'tc-1',
            title: '测试用例',
            precondition: '条件',
            steps: ['步骤'],
            expectedResult: '结果',
            priority: 'P0',
            testPointId: 'tp-1',
            relatedFeature: '功能',
          },
        ],
        reviewDecision: undefined,
        retryCount: 0,
      };

      const result = await humanReviewNode(state);
      
      // 没有决策时保持等待状态
      expect(result.status).toBe(WorkflowStatus.REVIEWING);
    });

    it('should preserve review comments', async () => {
      const state: AgentState = {
        status: WorkflowStatus.REVIEWING,
        generatedCases: [{ id: 'tc-1' } as GeneratedTestCase],
        reviewDecision: 'regenerate',
        reviewComments: '请补充更多异常场景',
        retryCount: 0,
      };

      const result = await humanReviewNode(state);
      
      expect(result.reviewComments).toBe('请补充更多异常场景');
    });
  });

  describe('Retry Limit', () => {
    it('should handle max retry for regenerate', async () => {
      const state: AgentState = {
        status: WorkflowStatus.REVIEWING,
        generatedCases: [{ id: 'tc-1' } as GeneratedTestCase],
        reviewDecision: 'regenerate',
        retryCount: 3, // 已达到最大重试次数
      };

      const result = await humanReviewNode(state);
      
      // 超过重试次数，强制完成
      expect(result.status).toBe(WorkflowStatus.COMPLETED);
    });
  });
});
