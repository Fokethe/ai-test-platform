/**
 * BugHunter 学习历史模块测试
 * TDD: 先定义期望行为，再实现功能
 */

import { BugPatternLearner, BugPattern, PatternMatch } from '../bug-pattern-learner';

describe('BugHunter Bug Pattern Learner', () => {
  let learner: BugPatternLearner;

  beforeEach(() => {
    learner = new BugPatternLearner();
  });

  describe('🔴 红阶段测试 - 基本功能', () => {
    test('应该能创建学习器实例', () => {
      expect(learner).toBeInstanceOf(BugPatternLearner);
    });

    test('应该能加载预定义的 Bug 模式', () => {
      const patterns = learner.loadPredefinedPatterns();
      expect(patterns).toBeDefined();
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]).toHaveProperty('id');
      expect(patterns[0]).toHaveProperty('name');
    });

    test('应该包含常见的 Bug 模式', () => {
      const patterns = learner.loadPredefinedPatterns();
      const patternNames = patterns.map(p => p.id);
      
      expect(patternNames).toContain('BP001'); // 空指针
      expect(patternNames).toContain('BP002'); // 异步错误
      expect(patternNames).toContain('SEC001'); // SQL注入
    });
  });

  describe('🔴 红阶段测试 - 模式匹配', () => {
    test('应该能根据错误信息匹配 Bug 模式', () => {
      const errorMessage = 'Cannot read property of null';
      const matches = learner.matchPattern(errorMessage);
      
      expect(matches).toBeDefined();
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].pattern.id).toBe('BP001');
    });

    test('应该能根据代码片段匹配 Bug 模式', () => {
      const codeSnippet = 'const name = user.profile.name;';
      const matches = learner.matchPattern(codeSnippet);
      
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].confidence).toBeGreaterThan(0.5);
    });

    test('应该返回匹配置信度', () => {
      const errorMessage = 'UnhandledPromiseRejection';
      const matches = learner.matchPattern(errorMessage);
      
      if (matches.length > 0) {
        expect(matches[0].confidence).toBeGreaterThanOrEqual(0);
        expect(matches[0].confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('🔴 红阶段测试 - 学习新模式', () => {
    test('应该能学习新的 Bug 模式', () => {
      const newPattern: BugPattern = {
        id: 'CUSTOM001',
        name: '自定义 Bug 模式',
        severity: 'high',
        description: '测试描述',
        signatures: ['custom error signature'],
        codePatterns: ['custom code pattern'],
        fixStrategy: '修复策略',
        example: { before: 'before', after: 'after' },
        prevention: '预防措施'
      };

      learner.learnPattern(newPattern);
      const patterns = learner.getAllPatterns();
      
      expect(patterns).toContainEqual(expect.objectContaining({ id: 'CUSTOM001' }));
    });

    test('应该记录模式出现次数', () => {
      const patternId = 'BP001';
      
      learner.recordOccurrence(patternId);
      learner.recordOccurrence(patternId);
      learner.recordOccurrence(patternId);
      
      const stats = learner.getPatternStats(patternId);
      expect(stats.occurrences).toBe(3);
    });

    test('应该识别高频出现的模式', () => {
      // 模拟多次出现
      for (let i = 0; i < 5; i++) {
        learner.recordOccurrence('BP001');
      }
      
      const frequentPatterns = learner.getFrequentPatterns(2);
      expect(frequentPatterns).toContain('BP001');
    });
  });

  describe('🔴 红阶段测试 - 项目特定模式', () => {
    test('应该能保存项目特定的模式', () => {
      const projectPattern: BugPattern = {
        id: 'PROJ001',
        name: '项目特定问题',
        severity: 'medium',
        description: '只在当前项目中出现的问题',
        signatures: ['project specific error'],
        codePatterns: ['project code pattern'],
        fixStrategy: '项目修复方案',
        projectSpecific: true
      };

      learner.learnPattern(projectPattern, true);
      const projectPatterns = learner.getProjectSpecificPatterns();
      
      expect(projectPatterns).toContainEqual(expect.objectContaining({ id: 'PROJ001' }));
    });

    test('应该能导出学习到的模式', () => {
      const exportData = learner.exportPatterns();
      
      expect(exportData).toHaveProperty('version');
      expect(exportData).toHaveProperty('patterns');
      expect(exportData).toHaveProperty('projectSpecific');
      expect(exportData).toHaveProperty('learning');
    });

    test('应该能从文件导入模式', () => {
      const mockData = {
        version: '1.0.0',
        patterns: {
          common: {
            TEST001: {
              id: 'TEST001',
              name: '测试模式',
              severity: 'low',
              description: '测试描述'
            }
          }
        }
      };

      learner.importPatterns(mockData);
      const patterns = learner.getAllPatterns();
      
      expect(patterns.some(p => p.id === 'TEST001')).toBe(true);
    });
  });

  describe('🔴 红阶段测试 - 智能推荐', () => {
    test('应该根据历史数据推荐修复方案', () => {
      const codeSnippet = 'const data = await fetchData();';
      const recommendation = learner.recommendFix(codeSnippet);
      
      expect(recommendation).toBeDefined();
      expect(recommendation).toHaveProperty('pattern');
      expect(recommendation).toHaveProperty('confidence');
      expect(recommendation).toHaveProperty('suggestion');
    });

    test('应该预测潜在问题', () => {
      const codeContext = 'function processUser(user) { return user.name; }';
      const predictions = learner.predictIssues(codeContext);
      
      expect(Array.isArray(predictions)).toBe(true);
      // 应该预测到空指针问题
      expect(predictions.some(p => p.type === 'null-pointer')).toBe(true);
    });
  });

  describe('🔴 红阶段测试 - 持久化', () => {
    test('应该能保存到 JSON 文件', async () => {
      const filePath = './test-patterns.json';
      const result = await learner.saveToFile(filePath);
      
      expect(result.success).toBe(true);
      expect(result.filePath).toBe(filePath);
    });

    test('应该能从 JSON 文件加载', async () => {
      const filePath = './test-patterns.json';
      
      // 先保存
      await learner.saveToFile(filePath);
      
      // 创建新实例并加载
      const newLearner = new BugPatternLearner();
      const result = await newLearner.loadFromFile(filePath);
      
      expect(result.success).toBe(true);
      expect(newLearner.getAllPatterns().length).toBeGreaterThan(0);
    });
  });

  describe('🔴 红阶段测试 - 统计分析', () => {
    test('应该生成学习统计报告', () => {
      // 记录一些数据
      learner.recordOccurrence('BP001');
      learner.recordOccurrence('BP002');
      learner.recordOccurrence('BP001');
      
      const stats = learner.getLearningStats();
      
      expect(stats).toHaveProperty('totalPatterns');
      expect(stats).toHaveProperty('projectSpecificPatterns');
      expect(stats).toHaveProperty('mostFrequentPattern');
      expect(stats).toHaveProperty('learningProgress');
    });

    test('应该识别易错文件', () => {
      learner.recordFileIssue('src/utils/api.ts', 'BP001');
      learner.recordFileIssue('src/utils/api.ts', 'BP002');
      learner.recordFileIssue('src/utils/api.ts', 'BP003');
      
      const problematicFiles = learner.getProblematicFiles();
      expect(problematicFiles).toContain('src/utils/api.ts');
    });
  });
});
