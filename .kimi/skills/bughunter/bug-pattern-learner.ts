/**
 * BugHunter 学习历史模块
 * 保存项目易错模式，持续学习改进
 */

import * as fs from 'fs';
import * as path from 'path';

// ==================== 类型定义 ====================

export interface BugPattern {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  signatures: string[];
  codePatterns: string[];
  fixStrategy: string;
  example: {
    before: string;
    after: string;
  };
  prevention?: string;
  projectSpecific?: boolean;
}

export interface PatternMatch {
  pattern: BugPattern;
  confidence: number;
  matchedSignature?: string;
  matchedCodePattern?: string;
}

export interface PatternStats {
  patternId: string;
  occurrences: number;
  lastOccurrence: Date;
  affectedFiles: string[];
}

export interface LearningStats {
  totalPatterns: number;
  projectSpecificPatterns: number;
  mostFrequentPattern: string;
  learningProgress: number;
  totalOccurrences: number;
}

export interface FixRecommendation {
  pattern: BugPattern;
  confidence: number;
  suggestion: string;
  autoFixable: boolean;
}

export interface IssuePrediction {
  type: string;
  probability: number;
  description: string;
  suggestedFix: string;
}

export interface SaveLoadResult {
  success: boolean;
  error?: string;
  filePath?: string;
}

// ==================== Bug 模式学习器 ====================

export class BugPatternLearner {
  private patterns: Map<string, BugPattern> = new Map();
  private projectPatterns: Map<string, BugPattern> = new Map();
  private patternStats: Map<string, PatternStats> = new Map();
  private fileIssues: Map<string, string[]> = new Map();
  private predefinedPatterns: BugPattern[] = [];

  constructor() {
    this.loadPredefinedPatterns();
  }

  /**
   * 加载预定义的 Bug 模式
   */
  loadPredefinedPatterns(): BugPattern[] {
    // 预定义的常见 Bug 模式
    this.predefinedPatterns = [
      {
        id: 'BP001',
        name: '空指针/未定义访问',
        severity: 'high',
        description: '访问可能为 null 或 undefined 的变量/属性',
        signatures: [
          'Cannot read property of null',
          'Cannot read property of undefined',
          'null is not an object',
          'undefined is not an object'
        ],
        codePatterns: [
          'obj.property without check',
          'array[index] without bounds check',
          'optional chaining missing'
        ],
        fixStrategy: '添加空值检查或使用可选链操作符 (?.)',
        example: {
          before: 'const name = user.profile.name;',
          after: 'const name = user?.profile?.name ?? \'Unknown\';'
        },
        prevention: '使用 TypeScript strict mode，启用 strictNullChecks'
      },
      {
        id: 'BP002',
        name: '异步错误处理缺失',
        severity: 'high',
        description: 'Promise/async 函数缺少错误处理',
        signatures: [
          'UnhandledPromiseRejection',
          'Promise rejection was not handled',
          'unhandled rejection'
        ],
        codePatterns: [
          'await without try-catch',
          'promise without .catch()',
          'async function without error boundary'
        ],
        fixStrategy: '添加 try-catch 或 .catch() 处理',
        example: {
          before: 'const data = await fetchData();',
          after: 'try {\n  const data = await fetchData();\n} catch (error) {\n  console.error(\'Fetch failed:\', error);\n}'
        },
        prevention: '使用 ESLint rule: require-atomic-updates, no-floating-promises'
      },
      {
        id: 'BP003',
        name: 'TypeScript 类型错误',
        severity: 'medium',
        description: '类型不匹配或滥用 any 类型',
        signatures: [
          "Type 'X' is not assignable to type 'Y'",
          'Property does not exist on type',
          'No overload matches this call'
        ],
        codePatterns: [
          'function parameter: any',
          'variable: any',
          'as any type assertion'
        ],
        fixStrategy: '定义具体类型，使用泛型，避免 any',
        example: {
          before: 'function process(data: any) { return data.value; }',
          after: 'interface Data { value: string; }\nfunction process<T extends Data>(data: T): string { return data.value; }'
        },
        prevention: '启用 no-explicit-any, no-unsafe-assignment ESLint rules'
      },
      {
        id: 'BP004',
        name: '内存泄漏',
        severity: 'high',
        description: '未清理的事件监听、定时器或闭包引用',
        signatures: [
          'Heap out of memory',
          'Memory leak detected',
          'Detached DOM tree'
        ],
        codePatterns: [
          'addEventListener without remove',
          'setInterval without clear',
          'subscription without unsubscribe',
          'closure capturing large objects'
        ],
        fixStrategy: '在组件卸载时清理所有订阅和监听器',
        example: {
          before: 'useEffect(() => {\n  const interval = setInterval(() => {...}, 1000);\n}, []);',
          after: 'useEffect(() => {\n  const interval = setInterval(() => {...}, 1000);\n  return () => clearInterval(interval);\n}, []);'
        },
        prevention: '使用 React DevTools Profiler，定期进行内存分析'
      },
      {
        id: 'BP005',
        name: '竞态条件',
        severity: 'high',
        description: '多个异步操作竞争修改同一状态',
        signatures: [
          'State update on unmounted component',
          "Warning: Can't perform a React state update",
          'Race condition detected'
        ],
        codePatterns: [
          'multiple async state updates',
          'fetch then setState without cleanup',
          'shared mutable state'
        ],
        fixStrategy: '使用 AbortController 或标志位取消过期操作',
        example: {
          before: 'useEffect(() => {\n  fetchData().then(data => setData(data));\n}, [id]);',
          after: 'useEffect(() => {\n  const controller = new AbortController();\n  fetchData({ signal: controller.signal })\n    .then(data => setData(data))\n    .catch(err => {\n      if (err.name !== \'AbortError\') throw err;\n    });\n  return () => controller.abort();\n}, [id]);'
        },
        prevention: '使用 React Query/SWR 等数据获取库，内置竞态处理'
      },
      {
        id: 'SEC001',
        name: 'SQL 注入漏洞',
        severity: 'critical',
        description: '用户输入直接拼接到 SQL 查询中',
        signatures: [
          'SQL syntax error',
          'unexpected token in SQL'
        ],
        codePatterns: [
          'query + userInput',
          'exec(`SELECT * FROM ${table}`)',
          'raw SQL with string interpolation'
        ],
        fixStrategy: '使用参数化查询或 ORM',
        example: {
          before: 'db.query(`SELECT * FROM users WHERE id = ${userId}`);',
          after: 'db.query(\'SELECT * FROM users WHERE id = ?\', [userId]);'
        },
        prevention: '使用 Prisma/TypeORM 等 ORM，启用 SQL 注入检测工具'
      },
      {
        id: 'SEC002',
        name: 'XSS 跨站脚本攻击',
        severity: 'critical',
        description: '未转义的用户输入直接渲染到页面',
        signatures: [
          'innerHTML assignment',
          'dangerouslySetInnerHTML'
        ],
        codePatterns: [
          'element.innerHTML = userInput',
          'dangerouslySetInnerHTML={{ __html: content }}',
          'eval(userInput)'
        ],
        fixStrategy: '使用 textContent 替代 innerHTML，或使用 DOMPurify 净化',
        example: {
          before: 'div.innerHTML = userComment;',
          after: 'div.textContent = userComment;\n// 或: div.innerHTML = DOMPurify.sanitize(userComment);'
        },
        prevention: '使用 Content-Security-Policy，启用 XSS 扫描工具'
      },
      {
        id: 'SEC003',
        name: '敏感信息硬编码',
        severity: 'critical',
        description: 'API 密钥、密码等敏感信息直接写在代码中',
        signatures: [
          'api_key',
          'password',
          'secret',
          'token'
        ],
        codePatterns: [
          "const API_KEY = 'sk-...'",
          "password: '123456'",
          'Authorization: Bearer token'
        ],
        fixStrategy: '使用环境变量或密钥管理服务',
        example: {
          before: "const API_KEY = 'sk-live-abc123';",
          after: 'const API_KEY = process.env.API_KEY;\nif (!API_KEY) throw new Error(\'API_KEY not configured\');'
        },
        prevention: '使用 git-secrets, detect-secrets 等工具扫描提交'
      },
      {
        id: 'PERF001',
        name: 'N+1 查询问题',
        severity: 'medium',
        description: '循环中执行数据库查询，导致性能问题',
        signatures: [
          'slow query log',
          'query timeout'
        ],
        codePatterns: [
          'for (item of items) { await db.query(...) }',
          'map + async fetch'
        ],
        fixStrategy: '使用 JOIN 或批量查询替代循环查询',
        example: {
          before: 'const users = await db.users.findAll();\nfor (const user of users) {\n  user.posts = await db.posts.find({ userId: user.id });\n}',
          after: 'const users = await db.users.findAll({\n  include: [{ model: db.posts, as: \'posts\' }]\n});'
        },
        prevention: '使用 Prisma 的 include/select，启用查询日志分析'
      },
      {
        id: 'PERF002',
        name: '无限循环/死循环',
        severity: 'high',
        description: '循环条件永远为真，导致程序卡死',
        signatures: [
          'Maximum call stack size exceeded',
          'Infinite loop detected',
          'Script timeout'
        ],
        codePatterns: [
          'while (true) without break',
          'for loop with i++ in wrong place',
          'recursive function without base case'
        ],
        fixStrategy: '确保循环有正确的终止条件',
        example: {
          before: 'while (current) {\n  if (current.value === target) return current;\n}',
          after: 'while (current) {\n  if (current.value === target) return current;\n  current = current.next;\n}'
        },
        prevention: '使用 ESLint no-unmodified-loop-condition rule'
      }
    ];

    // 加载到 patterns Map
    this.predefinedPatterns.forEach(pattern => {
      this.patterns.set(pattern.id, pattern);
    });

    return this.predefinedPatterns;
  }

  /**
   * 根据错误信息或代码片段匹配 Bug 模式
   */
  matchPattern(input: string): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const allPatterns = [...this.patterns.values(), ...this.projectPatterns.values()];

    for (const pattern of allPatterns) {
      let maxConfidence = 0;
      let matchedSignature: string | undefined;
      let matchedCodePattern: string | undefined;

      // 检查错误签名匹配
      for (const signature of pattern.signatures) {
        const similarity = this.calculateSimilarity(input, signature);
        if (similarity > maxConfidence) {
          maxConfidence = similarity;
          matchedSignature = signature;
        }
      }

      // 检查代码模式匹配
      for (const codePattern of pattern.codePatterns) {
        const similarity = this.calculateSimilarity(input, codePattern);
        if (similarity > maxConfidence) {
          maxConfidence = similarity;
          matchedCodePattern = codePattern;
        }
      }

      // 如果置信度超过阈值，添加到匹配结果
      if (maxConfidence > 0.3) {
        matches.push({
          pattern,
          confidence: maxConfidence,
          matchedSignature,
          matchedCodePattern
        });
      }
    }

    // 按置信度排序
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 学习新的 Bug 模式
   */
  learnPattern(pattern: BugPattern, isProjectSpecific: boolean = false): void {
    if (isProjectSpecific) {
      this.projectPatterns.set(pattern.id, pattern);
    } else {
      this.patterns.set(pattern.id, pattern);
    }
  }

  /**
   * 记录模式出现
   */
  recordOccurrence(patternId: string, filePath?: string): void {
    const existing = this.patternStats.get(patternId);
    
    if (existing) {
      existing.occurrences++;
      existing.lastOccurrence = new Date();
      if (filePath && !existing.affectedFiles.includes(filePath)) {
        existing.affectedFiles.push(filePath);
      }
    } else {
      this.patternStats.set(patternId, {
        patternId,
        occurrences: 1,
        lastOccurrence: new Date(),
        affectedFiles: filePath ? [filePath] : []
      });
    }
  }

  /**
   * 记录文件问题
   */
  recordFileIssue(filePath: string, patternId: string): void {
    const existing = this.fileIssues.get(filePath);
    if (existing) {
      if (!existing.includes(patternId)) {
        existing.push(patternId);
      }
    } else {
      this.fileIssues.set(filePath, [patternId]);
    }
  }

  /**
   * 获取高频出现的模式
   */
  getFrequentPatterns(minOccurrences: number = 2): string[] {
    const frequent: string[] = [];
    
    for (const [patternId, stats] of this.patternStats.entries()) {
      if (stats.occurrences >= minOccurrences) {
        frequent.push(patternId);
      }
    }
    
    return frequent.sort((a, b) => {
      const countA = this.patternStats.get(a)?.occurrences || 0;
      const countB = this.patternStats.get(b)?.occurrences || 0;
      return countB - countA;
    });
  }

  /**
   * 获取易错文件列表
   */
  getProblematicFiles(): string[] {
    const filesWithIssueCount: Array<{ file: string; count: number }> = [];
    
    for (const [filePath, patterns] of this.fileIssues.entries()) {
      filesWithIssueCount.push({
        file: filePath,
        count: patterns.length
      });
    }
    
    // 按问题数量排序
    filesWithIssueCount.sort((a, b) => b.count - a.count);
    
    return filesWithIssueCount.map(f => f.file);
  }

  /**
   * 获取模式统计
   */
  getPatternStats(patternId: string): PatternStats {
    return this.patternStats.get(patternId) || {
      patternId,
      occurrences: 0,
      lastOccurrence: new Date(),
      affectedFiles: []
    };
  }

  /**
   * 获取所有模式
   */
  getAllPatterns(): BugPattern[] {
    return [
      ...this.patterns.values(),
      ...this.projectPatterns.values()
    ];
  }

  /**
   * 获取项目特定模式
   */
  getProjectSpecificPatterns(): BugPattern[] {
    return [...this.projectPatterns.values()];
  }

  /**
   * 推荐修复方案
   */
  recommendFix(codeSnippet: string): FixRecommendation | null {
    const matches = this.matchPattern(codeSnippet);
    
    if (matches.length === 0) {
      return null;
    }

    const bestMatch = matches[0];
    const autoFixable = bestMatch.confidence > 0.8;

    return {
      pattern: bestMatch.pattern,
      confidence: bestMatch.confidence,
      suggestion: bestMatch.pattern.fixStrategy,
      autoFixable
    };
  }

  /**
   * 预测潜在问题
   */
  predictIssues(codeContext: string): IssuePrediction[] {
    const predictions: IssuePrediction[] = [];
    const matches = this.matchPattern(codeContext);

    for (const match of matches.slice(0, 3)) {
      predictions.push({
        type: match.pattern.id,
        probability: match.confidence,
        description: match.pattern.description,
        suggestedFix: match.pattern.fixStrategy
      });
    }

    return predictions;
  }

  /**
   * 导出学习到的模式
   */
  exportPatterns(): any {
    const commonPatterns: Record<string, any> = {};
    const projectSpecific: Record<string, any> = {};

    for (const [id, pattern] of this.patterns.entries()) {
      commonPatterns[id] = pattern;
    }

    for (const [id, pattern] of this.projectPatterns.entries()) {
      projectSpecific[id] = pattern;
    }

    return {
      version: '1.0.0',
      description: 'BugHunter 项目易错模式学习库',
      lastUpdated: new Date().toISOString(),
      patterns: {
        common: commonPatterns
      },
      projectSpecific: {
        description: '项目特定的 Bug 模式',
        patterns: projectSpecific
      },
      learning: {
        description: 'BugHunter 学习机制配置',
        autoLearn: true,
        minOccurrences: 2,
        confidenceThreshold: 0.8,
        retentionDays: 90
      }
    };
  }

  /**
   * 导入模式
   */
  importPatterns(data: any): void {
    // 导入通用模式
    if (data.patterns?.common) {
      for (const [id, pattern] of Object.entries(data.patterns.common)) {
        this.patterns.set(id, pattern as BugPattern);
      }
    }

    // 导入项目特定模式
    if (data.projectSpecific?.patterns) {
      for (const [id, pattern] of Object.entries(data.projectSpecific.patterns)) {
        this.projectPatterns.set(id, pattern as BugPattern);
      }
    }
  }

  /**
   * 保存到文件
   */
  async saveToFile(filePath: string): Promise<SaveLoadResult> {
    try {
      const data = this.exportPatterns();
      const dir = path.dirname(filePath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

      return {
        success: true,
        filePath
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '保存失败',
        filePath
      };
    }
  }

  /**
   * 从文件加载
   */
  async loadFromFile(filePath: string): Promise<SaveLoadResult> {
    try {
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `文件不存在: ${filePath}`,
          filePath
        };
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      this.importPatterns(data);

      return {
        success: true,
        filePath
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '加载失败',
        filePath
      };
    }
  }

  /**
   * 获取学习统计
   */
  getLearningStats(): LearningStats {
    const totalPatterns = this.patterns.size + this.projectPatterns.size;
    const projectSpecificPatterns = this.projectPatterns.size;
    
    // 找出最频繁的模式
    let mostFrequentPattern = '';
    let maxOccurrences = 0;
    let totalOccurrences = 0;

    for (const [patternId, stats] of this.patternStats.entries()) {
      totalOccurrences += stats.occurrences;
      if (stats.occurrences > maxOccurrences) {
        maxOccurrences = stats.occurrences;
        mostFrequentPattern = patternId;
      }
    }

    // 计算学习进度（基于预定义模式的学习程度）
    const learnedPatterns = this.patternStats.size;
    const predefinedCount = this.predefinedPatterns.length;
    const learningProgress = predefinedCount > 0 
      ? (learnedPatterns / predefinedCount) * 100 
      : 0;

    return {
      totalPatterns,
      projectSpecificPatterns,
      mostFrequentPattern,
      learningProgress: Math.round(learningProgress),
      totalOccurrences
    };
  }

  // ==================== 辅助方法 ====================

  private calculateSimilarity(str1: string, str2: string): number {
    // 简化的相似度计算（基于包含关系和编辑距离）
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // 如果完全包含，返回高相似度
    if (s1.includes(s2) || s2.includes(s1)) {
      return 0.9;
    }

    // 计算编辑距离
    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    
    return 1 - (distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

// 默认导出
export default BugPatternLearner;
