/**
 * Human Review Node
 * LangGraph Node: 人工审核集成 (Human-in-the-Loop)
 */

import { AgentState, WorkflowStatus, GeneratedTestCase } from '../types';

interface ReviewConfig {
  enableReview: boolean;
  maxRetries?: number;
}

/**
 * 人工审核节点
 * 输入: generatedCases[], reviewDecision?, reviewComments?
 * 输出: reviewedCases[], status (REVIEWING/COMPLETED/GENERATING)
 */
export async function humanReviewNode(state: AgentState): Promise<AgentState> {
  try {
    const { generatedCases = [], reviewDecision, reviewedCases, retryCount = 0 } = state;

    // 如果没有生成的用例，直接完成
    if (generatedCases.length === 0) {
      return {
        ...state,
        status: WorkflowStatus.COMPLETED,
        reviewedCases: [],
        error: undefined,
      };
    }

    // 首次进入审核状态（从GENERATING进入）
    if (state.status === WorkflowStatus.GENERATING) {
      return {
        ...state,
        status: WorkflowStatus.REVIEWING,
        reviewedCases: generatedCases, // 默认使用生成的用例作为待审核版本
        error: undefined,
      };
    }

    // 等待审核决策
    if (!reviewDecision) {
      return {
        ...state,
        status: WorkflowStatus.REVIEWING,
        reviewedCases: reviewedCases || generatedCases,
        error: undefined,
      };
    }

    // 处理审核决策
    switch (reviewDecision) {
      case 'approve':
        // 批准：使用原始生成的用例完成
        return {
          ...state,
          status: WorkflowStatus.COMPLETED,
          reviewedCases: generatedCases,
          error: undefined,
        };

      case 'edit':
        // 编辑：使用用户编辑后的版本完成
        return {
          ...state,
          status: WorkflowStatus.COMPLETED,
          reviewedCases: reviewedCases || generatedCases,
          error: undefined,
        };

      case 'regenerate':
        // 重新生成：检查重试次数
        if (retryCount >= 3) {
          // 超过最大重试次数，强制完成
          return {
            ...state,
            status: WorkflowStatus.COMPLETED,
            reviewedCases: generatedCases,
            error: 'Max retries reached, using last generated version',
          };
        }
        
        // 回到生成阶段重新生成
        return {
          ...state,
          status: WorkflowStatus.GENERATING,
          reviewedCases: undefined,
          retryCount: retryCount + 1,
          error: undefined,
        };

      default:
        // 未知决策，保持等待
        return {
          ...state,
          status: WorkflowStatus.REVIEWING,
          reviewedCases: reviewedCases || generatedCases,
          error: undefined,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Human review failed';
    
    if (state.retryCount < 3) {
      return {
        ...state,
        retryCount: state.retryCount + 1,
        error: errorMessage,
      };
    }

    return {
      ...state,
      status: WorkflowStatus.ERROR,
      error: errorMessage,
    };
  }
}

/**
 * 条件边: 审核流程路由
 * - enableReview=false: 跳过审核直接完成
 * - reviewDecision=undefined: 进入等待状态
 * - reviewDecision='approve'/'edit': 完成
 * - reviewDecision='regenerate': 回到生成阶段
 */
export function reviewRouter(
  state: AgentState,
  config: ReviewConfig
): 'review' | 'complete' | 'regenerate' {
  const { enableReview } = config;
  const { status, reviewDecision, retryCount = 0 } = state;

  // 审核功能禁用，直接完成
  if (!enableReview) {
    return 'complete';
  }

  // 从生成阶段进入，需要审核
  if (status === WorkflowStatus.GENERATING) {
    return 'review';
  }

  // 已在审核状态，根据决策路由
  if (status === WorkflowStatus.REVIEWING) {
    switch (reviewDecision) {
      case 'regenerate':
        // 检查重试次数
        if (retryCount >= 3) {
          return 'complete'; // 超过重试次数，强制完成
        }
        return 'regenerate';
      
      case 'approve':
      case 'edit':
        return 'complete';
      
      default:
        // 无决策，保持在审核状态
        return 'review';
    }
  }

  // 其他状态默认完成
  return 'complete';
}
