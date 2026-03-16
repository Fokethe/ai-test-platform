/**
 * AI Workflow Review API
 * POST /api/ai/workflow/review
 * 提交人工审核决策
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { workflowStore } from '../start/route';
import { GeneratedTestCase } from '@/lib/ai/langgraph/types';

// 请求体验证
const ReviewDecisionSchema = z.object({
  workflowId: z.string().min(1, '工作流ID不能为空'),
  decision: z.enum(['approve', 'edit', 'regenerate'], {
    errorMap: () => ({ message: '决策必须是 approve、edit 或 regenerate' }),
  }),
  comments: z.string().optional(),
  editedCases: z.array(z.object({
    id: z.string(),
    title: z.string(),
    precondition: z.string(),
    steps: z.array(z.string()),
    expectedResult: z.string(),
    priority: z.string(),
    testPointId: z.string(),
    relatedFeature: z.string(),
  })).optional(),
});

/**
 * POST /api/ai/workflow/review
 * 提交审核决策
 */
export async function POST(req: NextRequest) {
  try {
    // 认证检查
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await req.json();
    const validated = ReviewDecisionSchema.safeParse(body);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: '请求参数错误', details: validated.error.errors },
        { status: 400 }
      );
    }

    const { workflowId, decision, comments, editedCases } = validated.data;

    // 获取工作流状态
    const storeEntry = workflowStore.get(workflowId);

    if (!storeEntry) {
      return NextResponse.json(
        { error: '工作流不存在或已过期' },
        { status: 404 }
      );
    }

    // 检查权限
    if (storeEntry.userId !== session.user.id) {
      return NextResponse.json(
        { error: '无权访问该工作流' },
        { status: 403 }
      );
    }

    // 检查工作流是否处于审核状态
    if (storeEntry.state.status !== 'reviewing') {
      return NextResponse.json(
        { error: '工作流不处于审核状态', currentStatus: storeEntry.state.status },
        { status: 400 }
      );
    }

    // 更新审核决策
    storeEntry.state.reviewDecision = decision;
    storeEntry.state.reviewComments = comments;
    storeEntry.updatedAt = new Date();

    // 处理不同决策
    switch (decision) {
      case 'approve':
        // 批准：使用原始生成的用例
        storeEntry.state.reviewedCases = storeEntry.state.generatedCases;
        storeEntry.state.status = 'completed';
        break;

      case 'edit':
        // 编辑：使用编辑后的用例
        if (editedCases && editedCases.length > 0) {
          storeEntry.state.reviewedCases = editedCases as GeneratedTestCase[];
        } else {
          storeEntry.state.reviewedCases = storeEntry.state.generatedCases;
        }
        storeEntry.state.status = 'completed';
        break;

      case 'regenerate':
        // 重新生成：增加重试计数并回到生成阶段
        if (storeEntry.state.retryCount >= 3) {
          // 超过最大重试次数，强制完成
          storeEntry.state.reviewedCases = storeEntry.state.generatedCases;
          storeEntry.state.status = 'completed';
          storeEntry.state.error = '已达到最大重试次数，使用最后一次生成的用例';
        } else {
          storeEntry.state.retryCount += 1;
          storeEntry.state.status = 'generating';
          // 清除审核决策，等待重新生成后再次进入审核
          storeEntry.state.reviewDecision = undefined;
          
          // TODO: 触发重新生成逻辑
          // 这里应该异步调用重新生成流程
        }
        break;
    }

    // 如果已完成，可以保存到数据库
    if (storeEntry.state.status === 'completed') {
      // TODO: 保存测试用例到数据库
      console.log(`工作流 ${workflowId} 审核完成，生成 ${storeEntry.state.reviewedCases?.length || 0} 个测试用例`);
    }

    return NextResponse.json({
      success: true,
      workflowId,
      decision,
      status: storeEntry.state.status,
      message: getDecisionMessage(decision, storeEntry.state.status === 'completed'),
      reviewedCases: storeEntry.state.reviewedCases,
      retryCount: storeEntry.state.retryCount,
    });

  } catch (error) {
    console.error('提交审核决策失败:', error);
    return NextResponse.json(
      { error: '提交审核决策失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 获取决策消息
 */
function getDecisionMessage(decision: string, isCompleted: boolean): string {
  if (!isCompleted && decision === 'regenerate') {
    return '已收到重新生成请求，正在重新生成测试用例';
  }
  
  const messages: Record<string, string> = {
    'approve': '已批准，测试用例已保存',
    'edit': '已保存编辑后的测试用例',
    'regenerate': '已达到最大重试次数，使用最后一次生成的用例',
  };
  
  return messages[decision] || '审核完成';
}
