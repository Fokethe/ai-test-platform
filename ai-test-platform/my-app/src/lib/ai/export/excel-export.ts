/**
 * Excel 导出功能
 * 将测试用例导出为 Excel 文件，供测试人员执行使用
 */

import * as XLSX from 'xlsx'
import { TestCase } from '../agents/testcase-generator'

export interface ExcelExportResult {
  filename: string
  buffer: Buffer
}

/**
 * 生成 Excel Buffer
 * @param testCases 测试用例列表
 * @returns Excel 文件 Buffer
 */
export async function generateExcelBuffer(testCases: TestCase[]): Promise<Buffer> {
  // 创建工作簿
  const workbook = XLSX.utils.book_new()

  // 准备数据
  const data = testCases.map((tc, index) => ({
    '序号': index + 1,
    '用例编号': tc.id,
    '所属模块': tc.module || '',
    '用例标题': tc.title,
    '前置条件': tc.precondition || '',
    '测试步骤': formatSteps(tc.steps),
    '预期结果': tc.expectedResult || '',
    '优先级': tc.priority || '中',
    '执行结果': '', // 留空供测试人员填写
    '备注': '', // 留空供测试人员填写
  }))

  // 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(data)

  // 设置列宽
  const colWidths = [
    { wch: 6 },   // 序号
    { wch: 15 },  // 用例编号
    { wch: 15 },  // 所属模块
    { wch: 40 },  // 用例标题
    { wch: 30 },  // 前置条件
    { wch: 50 },  // 测试步骤
    { wch: 40 },  // 预期结果
    { wch: 8 },   // 优先级
    { wch: 10 },  // 执行结果
    { wch: 20 },  // 备注
  ]
  worksheet['!cols'] = colWidths

  // 设置行高
  worksheet['!rows'] = testCases.map(() => ({ hpt: 30 }))

  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(workbook, worksheet, '测试用例')

  // 生成 Buffer
  const buffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  })

  return Buffer.from(buffer)
}

/**
 * 格式化测试步骤
 * @param steps 步骤数组
 * @returns 格式化后的步骤文本
 */
function formatSteps(steps: string[] | undefined): string {
  if (!steps || steps.length === 0) {
    return ''
  }

  return steps.map((step, index) => `${index + 1}. ${step}`).join('\n')
}

/**
 * 导出测试用例到 Excel
 * @param testCases 测试用例列表
 * @param moduleName 模块名称（用于生成文件名）
 * @returns 包含文件名和 buffer 的对象
 */
export async function exportTestCasesToExcel(
  testCases: TestCase[],
  moduleName: string = 'testcases'
): Promise<ExcelExportResult> {
  // 生成时间戳
  const now = new Date()
  const timestamp = formatDateTime(now)

  // 清理文件名中的特殊字符
  const safeModuleName = sanitizeFilename(moduleName) || 'testcases'

  // 生成文件名
  const filename = `${safeModuleName}_${timestamp}.xlsx`

  // 生成 Excel Buffer
  const buffer = await generateExcelBuffer(testCases)

  return {
    filename,
    buffer,
  }
}

/**
 * 格式化日期时间
 * @param date 日期对象
 * @returns YYYYMMDD_HHMMSS 格式字符串
 */
function formatDateTime(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}${month}${day}_${hours}${minutes}${seconds}`
}

/**
 * 清理文件名中的特殊字符
 * @param filename 原始文件名
 * @returns 清理后的文件名
 */
function sanitizeFilename(filename: string): string {
  if (!filename) {
    return 'testcases'
  }

  // 替换 Windows 和 Unix 不允许的文件名字符
  return filename
    .replace(/[\\/:*?"<>|]/g, '_')  // 替换特殊字符为下划线
    .replace(/\s+/g, '_')            // 替换空格为下划线
    .replace(/_+/g, '_')             // 多个下划线合并为一个
    .replace(/^_+|_+$/g, '')         // 移除开头和结尾的下划线
    .substring(0, 100)               // 限制长度
}
