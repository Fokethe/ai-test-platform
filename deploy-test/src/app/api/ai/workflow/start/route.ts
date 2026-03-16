/**
 * AI Workflow Start API
 * POST /api/ai/workflow/start
 * 启动AI测试用例生成工作流
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { createWorkflow } from '@/lib/ai/langgraph/workflow';
import { AgentState, WorkflowStatus } from '@/lib/ai/langgraph/types';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// 请求体验证
const StartWorkflowSchema = z.object({
  requirementId: z.string().optional(),
  requirementText: z.string().min(1, '需求文本不能为空'),
  document: z.object({
    type: z.enum(['txt', 'md', 'pdf', 'docx']),
    filename: z.string(),
    content: z.string(),
    title: z.string(),
    size: z.number(),
  }).optional(),
  config: z.object({
    enableRAG: z.boolean().default(true),
    enableReview: z.boolean().default(false),
    maxRetries: z.number().default(3),
  }).optional(),
});

// 内存中存储工作流状态（生产环境应使用Redis）
const workflowStore = new Map<string, {
  state: AgentState;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}>();

/**
 * POST /api/ai/workflow/start
 * 启动工作流
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
    const validated = StartWorkflowSchema.safeParse(body);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: '请求参数错误', details: validated.error.errors },
        { status: 400 }
      );
    }

    const { requirementId, requirementText, document, config } = validated.data;

    // 生成工作流ID
    const workflowId = `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 创建初始状态
    const initialState: AgentState = {
      status: WorkflowStatus.IDLE,
      requirementText,
      document: document ? {
        ...document,
        rawText: document.content,
      } : undefined,
      features: [],
      businessRules: [],
      testPoints: [],
      similarCases: [],
      generatedCases: [],
      retryCount: 0,
    };

    // 存储工作流状态
    workflowStore.set(workflowId, {
      state: initialState,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: session.user.id,
    });

    // 异步启动工作流
    startWorkflowAsync(workflowId, initialState, config);

    // 如果有关联需求，更新需求状态
    if (requirementId) {
      await prisma.requirement.update({
        where: { id: requirementId },
        data: { status: 'PROCESSING' },
      }).catch(() => {
        // 忽略更新失败，不影响工作流启动
      });
    }

    return NextResponse.json({
      success: true,
      workflowId,
      status: WorkflowStatus.IDLE,
      message: '工作流已启动',
    });

  } catch (error) {
    console.error('启动工作流失败:', error);
    return NextResponse.json(
      { error: '启动工作流失败', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 异步启动工作流
 */
async function startWorkflowAsync(
  workflowId: string,
  initialState: AgentState,
  config?: { enableRAG?: boolean; enableReview?: boolean; maxRetries?: number }
) {
  try {
    const workflow = createWorkflow(config);
    
    // 更新状态为执行中
    const storeEntry = workflowStore.get(workflowId);
    if (storeEntry) {
      storeEntry.state.status = WorkflowStatus.PARSING;
      storeEntry.updatedAt = new Date();
    }

    // 执行工作流
    const result = await workflow.invoke(initialState);

    // 更新最终结果
    const finalEntry = workflowStore.get(workflowId);
    if (finalEntry) {
      finalEntry.state = result;
      finalEntry.updatedAt = new Date();
    }

    console.log(`工作流 ${workflowId} 执行完成，状态: ${result.status}`);
    
    // 如果有生成的测试用例，可以保存到数据库
    if (result.generatedCases && result.generatedCases.length > 0) {
      // TODO: 保存测试用例到数据库
      console.log(`生成了 ${result.generatedCases.length} 个测试用例`);
    }

  } catch (error) {
    console.error(`工作流 ${workflowId} 执行失败:`, error);
    
    const storeEntry = workflowStore.get(workflowId);
    if (storeEntry) {
      storeEntry.state.status = WorkflowStatus.ERROR;
      storeEntry.state.error = (error as Error).message;
      storeEntry.updatedAt = new Date();
    }
  }
}

// 导出存储供其他API使用
export { workflowStore };
