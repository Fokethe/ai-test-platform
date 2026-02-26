/**
 * RAG 知识库检索服务
 * 基于测试点检索相似历史用例，作为 Few-shot 示例
 * TDD Round 10 实现
 */

import { TestCase } from '../agents/testcase-generator'

export interface TestPoint {
  id: string
  name: string
  description: string
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  relatedFeature: string
}

export interface RetrievalOptions {
  maxResults?: number
  minSimilarity?: number
}

export interface RetrievalResult {
  testCase: TestCase
  similarity: number
}

/**
 * 基于测试点检索相似历史用例
 */
export async function retrieveSimilarTestCases(
  testPoint: TestPoint,
  knowledgeBase: TestCase[],
  options: RetrievalOptions = {}
): Promise<RetrievalResult[]> {
  const { maxResults = 3, minSimilarity = 0.5 } = options

  // 空知识库处理
  if (knowledgeBase.length === 0) {
    return []
  }

  // 计算每个历史用例与测试点的相似度
  const scoredCases = knowledgeBase.map((testCase) => ({
    testCase,
    similarity: calculateSimilarity(testPoint, testCase),
  }))

  // 按相似度排序并过滤
  const filteredResults = scoredCases
    .filter((result) => result.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults)

  return filteredResults
}

/**
 * 将新用例添加到知识库
 */
export async function addToKnowledgeBase(
  newCase: TestCase,
  knowledgeBase: TestCase[]
): Promise<TestCase[]> {
  const existingIndex = knowledgeBase.findIndex((c) => c.id === newCase.id)

  if (existingIndex >= 0) {
    // 更新已存在的用例
    const updated = [...knowledgeBase]
    updated[existingIndex] = newCase
    return updated
  }

  // 添加新用例
  return [...knowledgeBase, newCase]
}

/**
 * 计算测试点与历史用例的相似度
 * 使用多维度加权评分
 */
function calculateSimilarity(testPoint: TestPoint, testCase: TestCase): number {
  let score = 0
  const weights = {
    module: 0.5,
    keyword: 0.3,
    feature: 0.2,
  }

  // 1. 模块匹配 (50%) - 提高权重确保同模块用例能通过阈值
  const testPointModule = extractModule(testPoint.relatedFeature)
  const caseModule = testCase.module.toLowerCase()
  if (caseModule.includes(testPointModule) || testPointModule.includes(caseModule)) {
    score += weights.module
  }

  // 2. 关键词匹配 (30%)
  const testPointKeywords = extractKeywords(testPoint.name + ' ' + testPoint.description)
  const caseKeywords = extractKeywords(testCase.title + ' ' + testCase.precondition + ' ' + testCase.expectedResult)
  const keywordScore = calculateKeywordSimilarity(testPointKeywords, caseKeywords)
  score += keywordScore * weights.keyword

  // 3. 功能特征匹配 (20%)
  const featureScore = calculateFeatureSimilarity(testPoint, testCase)
  score += featureScore * weights.feature

  return Math.min(score, 1)
}

/**
 * 提取模块名称
 */
function extractModule(feature: string): string {
  return feature.toLowerCase().replace(/模块$/, '').trim()
}

/**
 * 停用词集合 - 过滤无意义词汇
 */
const STOP_WORDS = new Set([
  '的', '了', '在', '是', '和', '与', '或', '测试', '功能', '用户', '输入', '点击', '访问',
  'to', 'the', 'and', 'of', 'a', 'in', 'is', 'for', 'with', 'on', 'at',
])

/**
 * 提取关键词
 * 移除停用词和单字词，提高匹配质量
 */
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
}

/**
 * 计算关键词相似度
 */
function calculateKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
  if (keywords1.length === 0 || keywords2.length === 0) {
    return 0
  }

  const set1 = new Set(keywords1)
  const set2 = new Set(keywords2)

  const intersection = new Set([...set1].filter((x) => set2.has(x)))
  const union = new Set([...set1, ...set2])

  return intersection.size / union.size
}

/**
 * 计算功能特征相似度
 */
function calculateFeatureSimilarity(testPoint: TestPoint, testCase: TestCase): number {
  let score = 0

  // 优先级匹配
  const priorityMap: Record<string, number> = { P0: 4, P1: 3, P2: 2, P3: 1, 高: 4, 中: 2, 低: 1 }
  const testPointPriority = priorityMap[testPoint.priority] || 2
  const casePriority = priorityMap[testCase.priority] || 2
  if (Math.abs(testPointPriority - casePriority) <= 1) {
    score += 0.5
  }

  // 描述语义相似度（简单实现）
  const testPointDesc = testPoint.description.toLowerCase()
  const caseTitle = testCase.title.toLowerCase()
  if (testPointDesc.includes(caseTitle) || caseTitle.includes(testPoint.name.toLowerCase())) {
    score += 0.5
  }

  return Math.min(score, 1)
}
