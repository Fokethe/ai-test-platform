// encoding: utf-8
/**
 * TDD Round 16 - 视觉用例生成 Agent
 * 基于 UI 元素树生成 UI 测试用例
 */

import { UIElement, UIElementType } from '../vision/ui-element-detector'
import { callAI } from '../client'

export type UICaseType = 'click' | 'input' | 'verify' | 'navigate'

export interface UICaseStep {
  action: string
  target: string
  value?: string
  description?: string
}

export interface GeneratedUICase {
  id: string
  title: string
  type: UICaseType
  description: string
  preCondition?: string
  steps: UICaseStep[]
  expectedResult: string
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  targetElements: string[]
}

export interface GenerateOptions {
  maxCases?: number
  includeNegativeCases?: boolean
  priority?: 'P0' | 'P1' | 'P2' | 'P3'
}

export interface GenerationResult {
  cases: GeneratedUICase[]
  totalElements: number
  generatedCount: number
  coverage: number
}

/**
 * 构建生成提示词
 */
function buildGenerationPrompt(elements: UIElement[], options: GenerateOptions): string {
  const elementJson = JSON.stringify(elements, null, 2)
  
  return `基于以下 UI 元素树生成测试用例：

${elementJson}

要求：
1. 生成 ${options.maxCases || 5} 个测试用例
2. 包含点击、输入、验证、导航等类型的用例
3. 每个用例必须包含：标题、前置条件、步骤、预期结果
4. 返回 JSON 格式：
{
  "cases": [
    {
      "title": "用例标题",
      "type": "click|input|verify|navigate",
      "description": "用例描述",
      "preCondition": "前置条件",
      "steps": [
        {
          "action": "点击|输入|验证|导航",
          "target": "目标元素",
          "value": "输入值（可选）",
          "description": "步骤描述"
        }
      ],
      "expectedResult": "预期结果",
      "priority": "P0|P1|P2|P3",
      "targetElements": ["元素ID列表"]
    }
  ]
}

注意：
- 只返回 JSON，不要其他说明文字
- 步骤要具体可执行
- 预期结果要明确可验证`;
}

/**
 * 解析 AI 生成的用例
 */
function parseGeneratedCases(response: string): GeneratedUICase[] {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return []
    
    const data = JSON.parse(jsonMatch[0])
    
    if (!data.cases || !Array.isArray(data.cases)) {
      return []
    }
    
    return data.cases.map((c: any, index: number) => ({
      id: c.id || `ui-case-${index}`,
      title: c.title || '未命名用例',
      type: parseCaseType(c.type),
      description: c.description || '',
      preCondition: c.preCondition || c.precondition || '',
      steps: Array.isArray(c.steps) ? c.steps.map((s: any) => ({
        action: s.action || '',
        target: s.target || '',
        value: s.value,
        description: s.description,
      })) : [],
      expectedResult: c.expectedResult || c.expected || '',
      priority: parsePriority(c.priority),
      targetElements: Array.isArray(c.targetElements) ? c.targetElements : [],
    }))
  } catch (error) {
    console.error('解析生成的用例失败:', error)
    return []
  }
}

/**
 * 解析用例类型
 */
function parseCaseType(type: string): UICaseType {
  const typeMap: Record<string, UICaseType> = {
    click: 'click',
    input: 'input',
    verify: 'verify',
    navigation: 'navigate',
    navigate: 'navigate',
  }
  return typeMap[type?.toLowerCase()] || 'click'
}

/**
 * 解析优先级
 */
function parsePriority(priority: string): 'P0' | 'P1' | 'P2' | 'P3' {
  if (['P0', 'P1', 'P2', 'P3'].includes(priority)) {
    return priority as 'P0' | 'P1' | 'P2' | 'P3'
  }
  return 'P2'
}

/**
 * 根据元素自动生成基础用例
 */
function generateBasicCases(elements: UIElement[]): GeneratedUICase[] {
  const cases: GeneratedUICase[] = []
  
  for (const element of elements) {
    // 根据元素类型生成基础用例
    switch (element.type) {
      case UIElementType.BUTTON:
        cases.push({
          id: `case-btn-${element.id}`,
          title: `点击按钮: ${element.text || element.id}`,
          type: 'click',
          description: `测试 ${element.text || '按钮'} 的点击功能`,
          steps: [{
            action: '点击',
            target: element.text || element.id,
            description: `点击${element.text || '按钮'}`,
          }],
          expectedResult: '按钮响应点击事件',
          priority: 'P1',
          targetElements: [element.id],
        })
        break
        
      case UIElementType.INPUT:
        cases.push({
          id: `case-input-${element.id}`,
          title: `输入框: ${element.attributes?.placeholder || element.id}`,
          type: 'input',
          description: `测试 ${element.attributes?.placeholder || '输入框'} 的输入功能`,
          steps: [{
            action: '输入',
            target: element.attributes?.placeholder || element.id,
            value: '测试数据',
            description: `在输入框中输入测试数据`,
          }],
          expectedResult: '输入框正确显示输入内容',
          priority: 'P1',
          targetElements: [element.id],
        })
        break
        
      case UIElementType.LINK:
        cases.push({
          id: `case-link-${element.id}`,
          title: `链接导航: ${element.text || element.id}`,
          type: 'navigate',
          description: `测试 ${element.text || '链接'} 的导航功能`,
          steps: [{
            action: '点击',
            target: element.text || element.id,
            description: `点击${element.text || '链接'}`,
          }],
          expectedResult: `页面导航到 ${element.attributes?.href || '目标页面'}`,
          priority: 'P2',
          targetElements: [element.id],
        })
        break
    }
    
    // 递归处理子元素
    if (element.children) {
      cases.push(...generateBasicCases(element.children))
    }
  }
  
  return cases
}

/**
 * 视觉用例生成 Agent
 */
export class VisionCaseAgent {
  /**
   * 基于 UI 元素树生成测试用例
   */
  async generateFromUITree(
    elements: UIElement[],
    options: GenerateOptions = {}
  ): Promise<GenerationResult> {

    // Empty array check
    if (elements.length === 0) {
      return {
        cases: [],
        totalElements: 0,
        generatedCount: 0,
        coverage: 0,
      }
    }
    const opts = {
      maxCases: 5,
      includeNegativeCases: false,
      priority: 'P2' as const,
      ...options,
    }
    
    // 1. 使用 AI 生成智能用例
    const prompt = buildGenerationPrompt(elements, opts)
    
    try {
      const response = await callAI({
        prompt,
        model: 'kimi-k2.5',
      })
      
      const aiCases = parseGeneratedCases(response)
      
      // 2. 生成基础用例作为补充
      const basicCases = generateBasicCases(elements)
      
      // 3. 合并去重
      const allCases = [...aiCases]
      for (const basicCase of basicCases) {
        const exists = allCases.some(
          (c) => c.targetElements.join(',') === basicCase.targetElements.join(',')
        )
        if (!exists && allCases.length < opts.maxCases) {
          allCases.push(basicCase)
        }
      }
      
      // 4. 限制数量并计算覆盖率
      const limitedCases = allCases.slice(0, opts.maxCases)
      const coverage = calculateCoverage(limitedCases, elements)
      
      return {
        cases: limitedCases,
        totalElements: countElements(elements),
        generatedCount: limitedCases.length,
        coverage,
      }
    } catch (error) {
      console.error('生成用例失败:', error)
      
      // 降级到基础用例生成
      const basicCases = generateBasicCases(elements).slice(0, opts.maxCases)
      
      return {
        cases: basicCases,
        totalElements: countElements(elements),
        generatedCount: basicCases.length,
        coverage: calculateCoverage(basicCases, elements),
      }
    }
  }
  
  /**
   * 批量生成多页面用例
   */
  async generateFromMultipleTrees(
    trees: { name: string; elements: UIElement[] }[],
    options: GenerateOptions = {}
  ): Promise<GenerationResult[]> {
    const results: GenerationResult[] = []
    
    for (const tree of trees) {
      const result = await this.generateFromUITree(tree.elements, options)
      results.push({
        ...result,
        cases: result.cases.map((c) => ({
          ...c,
          title: `[${tree.name}] ${c.title}`,
        })),
      })
    }
    
    return results
  }
  
  /**
   * 生成反向测试用例
   */
  generateNegativeCases(elements: UIElement[]): GeneratedUICase[] {
    const cases: GeneratedUICase[] = []
    
    for (const element of elements) {
      if (element.type === UIElementType.INPUT) {
        // 空值测试
        cases.push({
          id: `case-negative-empty-${element.id}`,
          title: `输入框空值验证: ${element.attributes?.placeholder || element.id}`,
          type: 'verify',
          description: `测试 ${element.attributes?.placeholder || '输入框'} 的空值验证`,
          steps: [{
            action: '验证',
            target: element.attributes?.placeholder || element.id,
            description: '留空输入框并提交',
          }],
          expectedResult: '显示必填提示',
          priority: 'P1',
          targetElements: [element.id],
        })
        
        // 超长输入测试
        cases.push({
          id: `case-negative-long-${element.id}`,
          title: `输入框超长字符验证`,
          type: 'input',
          description: '测试超长字符输入',
          steps: [{
            action: '输入',
            target: element.attributes?.placeholder || element.id,
            value: 'a'.repeat(1000),
            description: '输入超长字符串',
          }],
          expectedResult: '正确处理超长输入或显示限制提示',
          priority: 'P2',
          targetElements: [element.id],
        })
      }
      
      if (element.children) {
        cases.push(...this.generateNegativeCases(element.children))
      }
    }
    
    return cases
  }
}

/**
 * 计算元素总数
 */
function countElements(elements: UIElement[]): number {
  let count = elements.length
  for (const el of elements) {
    if (el.children) {
      count += countElements(el.children)
    }
  }
  return count
}

/**
 * 计算用例覆盖率
 */
function calculateCoverage(cases: GeneratedUICase[], elements: UIElement[]): number {
  const coveredElements = new Set<string>()
  
  for (const c of cases) {
    for (const targetId of c.targetElements) {
      coveredElements.add(targetId)
    }
  }
  
  const total = countElements(elements)
  if (total === 0) return 0
  
  return coveredElements.size / total
}

/**
 * 便捷函数：快速生成用例
 */
export async function generateUICases(
  elements: UIElement[],
  options?: GenerateOptions
): Promise<GenerationResult> {
  const agent = new VisionCaseAgent()
  return agent.generateFromUITree(elements, options)
}
