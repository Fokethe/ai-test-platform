/**
 * TDD Round 9: Excel 导出 API
 * POST /api/testcases/export
 * 将测试用例导出为 Excel 文件
 */

import { NextRequest, NextResponse } from 'next/server'
import { exportTestCasesToExcel } from '@/lib/ai/export/excel-export'
import { TestCase } from '@/lib/ai/agents/testcase-generator'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    let body: { testCases: TestCase[]; moduleName?: string }
    try {
      body = await request.json()
    } catch {
      return errorResponse('无效的请求体', 400)
    }

    const { testCases, moduleName } = body

    // 验证测试用例列表
    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      return errorResponse('测试用例列表不能为空', 400)
    }

    // 验证每个测试用例的基本结构
    for (const tc of testCases) {
      if (!tc.id || !tc.title) {
        return errorResponse('测试用例缺少必要字段（id 或 title）', 400)
      }
    }

    // 生成 Excel 文件
    const result = await exportTestCasesToExcel(testCases, moduleName)

    // 返回文件信息（前端可以使用这些信息触发下载）
    return successResponse({
      filename: result.filename,
      size: result.buffer.length,
      // 将 buffer 转换为 base64，方便前端处理
      data: result.buffer.toString('base64'),
    })
  } catch (error) {
    console.error('导出 Excel 失败:', error)
    return errorResponse('导出失败: 服务器内部错误', 500)
  }
}
