// encoding: utf-8
/**
 * Few-shot 自动选择器
 * TDD Round 12 实现
 * 功能：智能选择策略、多样性保证、按模块分类
 */

import { TestCase } from '../agents/testcase-generator'
import { TestPoint, RetrievalResult, retrieveSimilarTestCases } from './retrieval'

export type SelectionStrategy = 'similarity' | 'diversity' | 'coverage' | 'combined'

export interface FewShotConfig {
  strategy: SelectionStrategy
  maxResults: number
  minSimilarity?: number
  targetModule?: string
  categoryWeights?: Record<string, number>
}

export interface SelectedExample extends RetrievalResult {
  diversityScore?: number
  category?: string
}

export interface SelectionResult {
  examples: SelectedExample[]
  totalAvailable: number
  strategy: SelectionStrategy
  categories: string[]
  diversity: number
}

export interface ModularResult {
  module: string
  examples: SelectedExample[]
  count: number
}

/**
 * Few-shot 选择器类
 * 支持多种选择策略和多样性保证
 */
export class FewShotSelector {
  private knowledgeBase: TestCase[]

  constructor(knowledgeBase: TestCase[]) {
    this.knowledgeBase = knowledgeBase
  }

  /**
   * 根据策略选择 Few-shot 示例
   */
  async select(
    testPoint: TestPoint,
    config: Partial<FewShotConfig> = {}
  ): Promise<SelectionResult> {
    const fullConfig: FewShotConfig = {
      strategy: 'combined',
      maxResults: 3,
      minSimilarity: 0.5,
      ...config,
    }

    switch (fullConfig.strategy) {
      case 'similarity':
        return this.selectBySimilarity(testPoint, fullConfig)
      case 'diversity':
        return this.selectWithDiversity(testPoint, fullConfig)
      case 'coverage':
        return this.selectWithCoverage(testPoint, fullConfig)
      case 'combined':
      default:
        return this.selectWithCombined(testPoint, fullConfig)
    }
  }

  /**
   * 基于相似度选择
   */
  private async selectBySimilarity(
    testPoint: TestPoint,
    config: FewShotConfig
  ): Promise<SelectionResult> {
    const results = await retrieveSimilarTestCases(testPoint, this.knowledgeBase, {
      maxResults: config.maxResults,
      minSimilarity: config.minSimilarity,
    })

    const examples: SelectedExample[] = results.map((r) => ({
      ...r,
      category: r.testCase.module,
    }))

    return {
      examples,
      totalAvailable: this.knowledgeBase.length,
      strategy: 'similarity',
      categories: [...new Set(examples.map((e) => e.category || '未知'))],
      diversity: this.calculateDiversity(examples),
    }
  }

  /**
   * 多样性保证选择
   * 避免选择过于相似的用例
   */
  private async selectWithDiversity(
    testPoint: TestPoint,
    config: FewShotConfig
  ): Promise<SelectionResult> {
    // 先获取更多候选
    const candidates = await retrieveSimilarTestCases(testPoint, this.knowledgeBase, {
      maxResults: config.maxResults * 3,
      minSimilarity: config.minSimilarity,
    })

    if (candidates.length === 0) {
      return {
        examples: [],
        totalAvailable: 0,
        strategy: 'diversity',
        categories: [],
        diversity: 0,
      }
    }

    // 使用贪心算法选择多样化样本
    const selected: SelectedExample[] = []
    const remaining = [...candidates]

    // 先选择最相似的
    const firstCase = remaining.shift()
    if (!firstCase) {
      return {
        examples: [],
        totalAvailable: 0,
        strategy: 'diversity',
        categories: [],
        diversity: 0,
      }
    }
    selected.push({
      ...firstCase,
      diversityScore: 1.0,
      category: firstCase.testCase.module,
    })

    // 然后选择与已选样本差异最大的
    while (selected.length < config.maxResults && remaining.length > 0) {
      let maxMinDistance = -1
      let bestIndex = 0

      for (let i = 0; i < remaining.length; i++) {
        const minDistance = Math.min(
          ...selected.map((s) => this.calculateCaseDistance(remaining[i].testCase, s.testCase))
        )
        if (minDistance > maxMinDistance) {
          maxMinDistance = minDistance
          bestIndex = i
        }
      }

      const selectedCase = remaining.splice(bestIndex, 1)[0]
      selected.push({
        ...selectedCase,
        diversityScore: maxMinDistance,
        category: selectedCase.testCase.module,
      })
    }

    return {
      examples: selected,
      totalAvailable: this.knowledgeBase.length,
      strategy: 'diversity',
      categories: [...new Set(selected.map((e) => e.category || '未知'))],
      diversity: this.calculateDiversity(selected),
    }
  }

  /**
   * 覆盖度最大化选择
   * 优先选择不同类别的用例
   */
  private async selectWithCoverage(
    testPoint: TestPoint,
    config: FewShotConfig
  ): Promise<SelectionResult> {
    const candidates = await retrieveSimilarTestCases(testPoint, this.knowledgeBase, {
      maxResults: config.maxResults * 4,
      minSimilarity: config.minSimilarity,
    })

    if (candidates.length === 0) {
      return {
        examples: [],
        totalAvailable: 0,
        strategy: 'coverage',
        categories: [],
        diversity: 0,
      }
    }

    // 按模块分组
    const byModule = new Map<string, RetrievalResult[]>()
    candidates.forEach((c) => {
      const module = c.testCase.module
      if (!byModule.has(module)) {
        byModule.set(module, [])
      }
      byModule.get(module)!.push(c)
    })

    // 轮询选择，确保多样性
    const selected: SelectedExample[] = []
    const modules = [...byModule.keys()]
    const categoryWeights = config.categoryWeights || {}

    while (selected.length < config.maxResults) {
      let added = false
      for (const module of modules) {
        if (selected.length >= config.maxResults) break

        const moduleCases = byModule.get(module) || []
        const nextCase = moduleCases.find(
          (c) => !selected.some((s) => s.testCase.id === c.testCase.id)
        )

        if (nextCase) {
          const weight = categoryWeights[module] || 1
          selected.push({
            ...nextCase,
            diversityScore: weight,
            category: module,
          })
          added = true
        }
      }
      if (!added) break
    }

    return {
      examples: selected,
      totalAvailable: this.knowledgeBase.length,
      strategy: 'coverage',
      categories: modules,
      diversity: this.calculateDiversity(selected),
    }
  }

  /**
   * 综合策略选择
   * 结合相似度和多样性
   */
  private async selectWithCombined(
    testPoint: TestPoint,
    config: FewShotConfig
  ): Promise<SelectionResult> {
    // 获取候选
    const candidates = await retrieveSimilarTestCases(testPoint, this.knowledgeBase, {
      maxResults: Math.max(config.maxResults * 2, 10),
      minSimilarity: config.minSimilarity,
    })

    if (candidates.length === 0) {
      return {
        examples: [],
        totalAvailable: 0,
        strategy: 'combined',
        categories: [],
        diversity: 0,
      }
    }

    // 综合评分 = 相似度 * 0.6 + 多样性奖励 * 0.4
    const selected: SelectedExample[] = []
    const remaining = candidates.map((c) => ({ ...c, category: c.testCase.module }))

    while (selected.length < config.maxResults && remaining.length > 0) {
      // 计算每个候选的综合得分
      const scores = remaining.map((candidate, index) => {
        const similarityScore = candidate.similarity

        // 多样性奖励：与已选样本的平均距离
        let diversityBonus = 0
        if (selected.length > 0) {
          const avgDistance =
            selected.reduce((sum, s) => sum + this.calculateCaseDistance(candidate.testCase, s.testCase), 0) /
            selected.length
          diversityBonus = avgDistance
        } else {
          diversityBonus = 1 // 第一个候选给满分多样性
        }

        const combinedScore = similarityScore * 0.6 + diversityBonus * 0.4
        return { index, score: combinedScore, candidate }
      })

      // 选择得分最高的
      scores.sort((a, b) => b.score - a.score)
      const best = scores[0]

      selected.push({
        ...best.candidate,
        diversityScore: best.score,
      })
      remaining.splice(best.index, 1)
    }

    return {
      examples: selected,
      totalAvailable: this.knowledgeBase.length,
      strategy: 'combined',
      categories: [...new Set(selected.map((e) => e.category || '未知'))],
      diversity: this.calculateDiversity(selected),
    }
  }

  /**
   * 按模块分类选择
   * 为每个模块选择代表性用例
   */
  async selectByModules(
    testPoint: TestPoint,
    maxPerModule: number = 2
  ): Promise<ModularResult[]> {
    // 按模块分组
    const byModule = new Map<string, TestCase[]>()
    this.knowledgeBase.forEach((c) => {
      const module = c.module
      if (!byModule.has(module)) {
        byModule.set(module, [])
      }
      byModule.get(module)!.push(c)
    })

    const results: ModularResult[] = []

    for (const [module, cases] of byModule) {
      const moduleSelector = new FewShotSelector(cases)
      const selection = await moduleSelector.select(testPoint, {
        strategy: 'similarity',
        maxResults: maxPerModule,
        minSimilarity: 0.3, // 模块内降低阈值
      })

      results.push({
        module,
        examples: selection.examples,
        count: selection.examples.length,
      })
    }

    return results.sort((a, b) => b.count - a.count)
  }

  /**
   * 自定义数量选择
   */
  async selectWithCustomCount(
    testPoint: TestPoint,
    count: number,
    strategy: SelectionStrategy = 'combined'
  ): Promise<SelectionResult> {
    return this.select(testPoint, {
      strategy,
      maxResults: count,
    })
  }

  /**
   * 计算两个用例之间的距离（用于多样性计算）
   */
  private calculateCaseDistance(case1: TestCase, case2: TestCase): number {
    // 基于关键词的 Jaccard 距离
    const keywords1 = new Set(this.extractCaseKeywords(case1))
    const keywords2 = new Set(this.extractCaseKeywords(case2))

    if (keywords1.size === 0 && keywords2.size === 0) return 0

    const intersection = new Set([...keywords1].filter((x) => keywords2.has(x)))
    const union = new Set([...keywords1, ...keywords2])

    return 1 - intersection.size / union.size
  }

  /**
   * 提取用例关键词
   */
  private extractCaseKeywords(testCase: TestCase): string[] {
    const text = `${testCase.title} ${testCase.precondition} ${testCase.expectedResult}`
    return text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 1)
  }

  /**
   * 计算选择结果的多样性分数
   */
  private calculateDiversity(examples: SelectedExample[]): number {
    if (examples.length <= 1) return 1

    let totalDistance = 0
    let pairs = 0

    for (let i = 0; i < examples.length; i++) {
      for (let j = i + 1; j < examples.length; j++) {
        totalDistance += this.calculateCaseDistance(examples[i].testCase, examples[j].testCase)
        pairs++
      }
    }

    return pairs > 0 ? totalDistance / pairs : 1
  }
}

/**
 * 便捷函数：快速选择 Few-shot 示例
 */
export async function selectFewShotExamples(
  testPoint: TestPoint,
  knowledgeBase: TestCase[],
  config?: Partial<FewShotConfig>
): Promise<SelectionResult> {
  const selector = new FewShotSelector(knowledgeBase)
  return selector.select(testPoint, config)
}

/**
 * 便捷函数：按模块选择
 */
export async function selectFewShotByModules(
  testPoint: TestPoint,
  knowledgeBase: TestCase[],
  maxPerModule?: number
): Promise<ModularResult[]> {
  const selector = new FewShotSelector(knowledgeBase)
  return selector.selectByModules(testPoint, maxPerModule)
}
