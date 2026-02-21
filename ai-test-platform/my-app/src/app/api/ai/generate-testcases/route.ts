import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { generateTestCases } from '@/lib/ai/client';
import { authOptions } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const body = await request.json();
    const { 
      requirementText, 
      options = {},
      temperature,
      apiKey,  // 用户传递的API Key
    } = body;

    if (!requirementText || requirementText.trim().length < 5) {
      return NextResponse.json(
        errorResponse('需求描述至少需要5个字符', 1002),
        { status: 400 }
      );
    }

    const temp = temperature ?? 0.3;

    console.log('[API] Generating test cases:', {
      hasApiKey: !!apiKey,
      temperature: temp,
      testCaseType: options.testCaseType,
    });

    // 调用AI生成，优先使用用户提供的API Key
    const result = await generateTestCases(requirementText, {
      ...options,
      temperature: temp,
      apiKey,  // 传递给client
    });

    try {
      const parsed = JSON.parse(result);
      const isUsingRealAI = !!apiKey || !!process.env.KIMI_API_KEY;
      
      return NextResponse.json(successResponse({
        ...parsed,
        isMock: !isUsingRealAI,
        meta: {
          temperature: temp,
          requirementLength: requirementText.length,
          testCaseType: options.testCaseType || 'web',
          usingUserApiKey: !!apiKey,
        }
      }));
    } catch (parseError) {
      console.error('Parse AI response error:', parseError);
      return NextResponse.json(
        errorResponse('AI 返回格式错误', 2001),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Generate test cases error:', error);
    return NextResponse.json(
      errorResponse('生成测试用例失败'),
      { status: 500 }
    );
  }
}
