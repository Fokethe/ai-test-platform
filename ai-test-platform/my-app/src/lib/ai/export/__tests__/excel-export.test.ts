/**
 * TDD Round 9: Excel 导出功能测试
 * 功能：将测试用例导出为 Excel 文件，供测试人员执行使用
 */

import { exportTestCasesToExcel, generateExcelBuffer } from '../excel-export'
import { TestCase } from '../../agents/testcase-generator'

describe('Excel 导出功能', () => {
  const mockTestCases: TestCase[] = [
    {
      id: 'tc-001',
      title: '有效用户名和密码登录成功',
      precondition: '用户已注册，网络连接正常',
      steps: ['访问登录页面', '输入有效用户名', '输入有效密码', '点击登录按钮'],
      expectedResult: '登录成功，跳转到首页',
      priority: '高',
      module: '登录模块',
    },
    {
      id: 'tc-002',
      title: '无效密码登录失败',
      precondition: '用户已注册，网络连接正常',
      steps: ['访问登录页面', '输入有效用户名', '输入无效密码', '点击登录按钮'],
      expectedResult: '显示错误提示：密码错误',
      priority: '高',
      module: '登录模块',
    },
    {
      id: 'tc-003',
      title: '空用户名登录失败',
      precondition: '网络连接正常',
      steps: ['访问登录页面', '留空用户名', '输入密码', '点击登录按钮'],
      expectedResult: '显示错误提示：用户名不能为空',
      priority: '中',
      module: '登录模块',
    },
  ]

  describe('generateExcelBuffer', () => {
    it('应生成有效的 Excel Buffer', async () => {
      const buffer = await generateExcelBuffer(mockTestCases)
      
      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
    })

    it('应包含正确的表头', async () => {
      const buffer = await generateExcelBuffer(mockTestCases)
      
      // Excel 文件以 PK 开头（ZIP 格式）
      expect(buffer.toString('hex', 0, 2)).toBe('504b')
    })

    it('应处理空用例列表', async () => {
      const buffer = await generateExcelBuffer([])
      
      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
    })

    it('应处理单条用例', async () => {
      const singleCase = [mockTestCases[0]]
      const buffer = await generateExcelBuffer(singleCase)
      
      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
    })
  })

  describe('exportTestCasesToExcel', () => {
    it('应返回包含文件名和 buffer 的对象', async () => {
      const result = await exportTestCasesToExcel(mockTestCases, '登录模块测试')
      
      expect(result).toHaveProperty('filename')
      expect(result).toHaveProperty('buffer')
      expect(result.filename).toContain('登录模块测试')
      expect(result.filename).toMatch(/\.xlsx$/)
      expect(result.buffer).toBeInstanceOf(Buffer)
    })

    it('应生成带时间戳的文件名', async () => {
      const result = await exportTestCasesToExcel(mockTestCases, '测试用例')
      
      // 文件名格式: 测试用例_YYYYMMDD_HHMMSS.xlsx
      expect(result.filename).toMatch(/测试用例_\d{8}_\d{6}\.xlsx/)
    })

    it('应处理特殊字符的文件名', async () => {
      const result = await exportTestCasesToExcel(mockTestCases, '测试/模块\\:*?"<>|')
      
      // 特殊字符应被替换或移除
      expect(result.filename).not.toMatch(/[\\/:*?"<>|]/)
      expect(result.filename).toMatch(/\.xlsx$/)
    })

    it('应处理空模块名称', async () => {
      const result = await exportTestCasesToExcel(mockTestCases, '')
      
      expect(result.filename).toMatch(/testcases_\d{8}_\d{6}\.xlsx/)
    })
  })

  describe('Excel 内容格式', () => {
    it('应包含所有必要的列', async () => {
      const buffer = await generateExcelBuffer(mockTestCases)
      
      // 验证 Buffer 不为空且格式正确
      expect(buffer.length).toBeGreaterThan(100)
    })

    it('应正确处理多行步骤', async () => {
      const testCaseWithManySteps: TestCase = {
        id: 'tc-004',
        title: '复杂流程测试',
        precondition: '系统初始化完成',
        steps: [
          '步骤1: 打开应用',
          '步骤2: 登录账号',
          '步骤3: 进入设置页面',
          '步骤4: 修改配置',
          '步骤5: 保存设置',
          '步骤6: 验证结果',
        ],
        expectedResult: '所有步骤执行成功',
        priority: '中',
        module: '设置模块',
      }
      
      const buffer = await generateExcelBuffer([testCaseWithManySteps])
      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
    })

    it('应处理超长文本', async () => {
      const longTextCase: TestCase = {
        id: 'tc-005',
        title: 'a'.repeat(200),
        precondition: 'b'.repeat(500),
        steps: ['c'.repeat(300)],
        expectedResult: 'd'.repeat(400),
        priority: '低',
        module: '长文本模块',
      }
      
      const buffer = await generateExcelBuffer([longTextCase])
      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
    })
  })

  describe('错误处理', () => {
    it('应处理无效的用例数据', async () => {
      const invalidCases = [
        {
          id: 'tc-invalid',
          title: '',
          precondition: '',
          steps: [],
          expectedResult: '',
          priority: '高',
          module: '',
        } as TestCase,
      ]
      
      const buffer = await generateExcelBuffer(invalidCases)
      expect(buffer).toBeInstanceOf(Buffer)
    })

    it('应处理缺失字段的用例', async () => {
      const incompleteCase = {
        id: 'tc-incomplete',
        title: '不完整用例',
        // 缺少其他字段
      } as TestCase
      
      const buffer = await generateExcelBuffer([incompleteCase])
      expect(buffer).toBeInstanceOf(Buffer)
    })
  })
})
