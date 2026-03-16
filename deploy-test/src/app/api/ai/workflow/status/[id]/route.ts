/**
 * AI Workflow Status API
 * GET /api/ai/workflow/status/[id]
 * 查询工作流执行状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { workflowStore } from '../../start/route';

/**
 * GET /api/ai/workflow/status/[id]
 * 获取工作流状态
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 认证检查
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const workflowId = params.id;

    if (!workflowId) {
      return NextResponse.json(
        { error: '工作流ID不能为空' },
        { status: 400 }
      );
    }

    // 从存储中获取工作流状态
    const storeEntry = workflowStore.get(workflowId);

    if (!storeEntry) {
      return NextResponse.json(
        { error: '工作流不存在或已过期' },
        { status: 404 }
      );
    }

    // 检查权限（只能查看自己的工作流）
    if (storeEntry.userId !== session.user.id) {
      return NextResponse.json(
        { error: '无权访问该工作流' },
        { status: 403 }
      );
    }

    const { state, createdAt, updatedAt } = storeEntry;

    // 构建响应
    const response = {
      success: true,
      workflowId,
      status: state.status,
      progress: calculateProgress(state.status),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      data: {
        // 根据状态返回不同的数据
        features: state.features || [],
        businessRules: state.businessRules || [],
        testPoints: state.testPoints || [],
        generatedCases: state.generatedCases || [],
        reviewedCases: state.reviewedCases || [],
      },
      // 如果处于审核状态，返回审核相关信息
      reviewRequired: state.status === 'reviewing',
      reviewInfo: state.status === 'reviewing' ? {
        generatedCases: state.generatedCases || [],
        canApprove: true,
        canEdit: true,
        canRegenerate: true,
        retryCount: state.retryCount,
      } : undefined,
      // 如果有错误
      error: state.error,
      // 完成后的摘要
      summary: state.status === 'completed' ? {
        totalFeatures: state.features?.length || 0,
        totalTestPoints: state.testPoints?.length || 0,
        totalTestCases: state.generatedCases?.length || 0,
      } : undefined,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('获取工作流状态失败:', error);
    return NextResponse.json(
      { error: '获取工作流状态失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 计算进度百分比
 */
function calculateProgress(status: string): number {
  const progressMap: Record<string, number> = {
    'idle': 0,
    'parsing': 10,
    'analyzing': 30,
    'decomposing': 40,
    'retrieving': 50,
    'generating': 70,
    'reviewing': 90,
    'completed': 100,
    'error': -1,
  };
  
  return progressMap[status] || 0;
}
