/**
 * BugHunter 可视化报告生成器测试
 * TDD: 先定义期望行为，再实现功能
 */

import {
  ReportGenerator,
  BugReport,
  ReportOptions,
  CodeDiff,
  QualityMetrics
} from '../report-generator';

describe('BugHunter Report Generator', () => {
  let generator: ReportGenerator;

  beforeEach(() => {
    generator = new ReportGenerator();
  });

  describe('🔴 红阶段测试 - 基本功能', () => {
    test('应该能创建报告生成器实例', () => {
      expect(generator).toBeInstanceOf(ReportGenerator);
    });

    test('应该能生成 HTML 格式的报告', async () => {
      const mockBug: BugReport = {
        id: 'BUG001',
        file: 'src/utils/api.ts',
        line: 42,
        severity: 'high',
        type: 'null-pointer',
        description: '访问可能为 null 的对象属性',
        codeSnippet: 'const name = user.profile.name;',
        fixSuggestion: '使用可选链操作符: user?.profile?.name',
        fixed: true,
        fixedCode: 'const name = user?.profile?.name ?? "Unknown";'
      };

      const options: ReportOptions = {
        format: 'html',
        title: 'BugHunter 修复报告',
        includeDiff: true,
        theme: 'dark'
      };

      const report = await generator.generate([mockBug], options);
      
      expect(report).toContain('<!DOCTYPE html>');
      expect(report).toContain('BugHunter 修复报告');
      expect(report).toContain('BUG001');
      expect(report).toContain('src/utils/api.ts');
    });

    test('应该包含代码 diff 高亮', async () => {
      const mockBug: BugReport = {
        id: 'BUG002',
        file: 'src/components/UserCard.tsx',
        line: 15,
        severity: 'medium',
        type: 'type-error',
        description: 'TypeScript 类型不匹配',
        codeSnippet: 'const data: any = fetchData();',
        fixSuggestion: '定义具体类型',
        fixed: true,
        fixedCode: 'const data: UserData = fetchData();'
      };

      const options: ReportOptions = {
        format: 'html',
        includeDiff: true
      };

      const report = await generator.generate([mockBug], options);
      
      // 应该包含 diff 相关标记
      expect(report).toMatch(/diff|before|after|removed|added/i);
    });
  });

  describe('🔴 红阶段测试 - 质量指标', () => {
    test('应该计算并显示代码健康度', async () => {
      const bugs: BugReport[] = [
        { id: '1', severity: 'critical', fixed: true } as BugReport,
        { id: '2', severity: 'high', fixed: true } as BugReport,
        { id: '3', severity: 'medium', fixed: false } as BugReport,
      ];

      const metrics: QualityMetrics = generator.calculateMetrics(bugs);
      
      expect(metrics.healthScore).toBeDefined();
      expect(metrics.healthScore).toBeGreaterThanOrEqual(0);
      expect(metrics.healthScore).toBeLessThanOrEqual(100);
      expect(metrics.totalBugs).toBe(3);
      expect(metrics.fixedBugs).toBe(2);
      expect(metrics.fixRate).toBeCloseTo(66.67, 1);
    });

    test('应该显示修复前后的对比', async () => {
      const beforeMetrics: QualityMetrics = {
        healthScore: 45,
        totalBugs: 10,
        fixedBugs: 0,
        fixRate: 0,
        bySeverity: { critical: 2, high: 3, medium: 3, low: 2 }
      };

      const afterMetrics: QualityMetrics = {
        healthScore: 85,
        totalBugs: 10,
        fixedBugs: 8,
        fixRate: 80,
        bySeverity: { critical: 0, high: 1, medium: 1, low: 0 }
      };

      const comparison = generator.compareMetrics(beforeMetrics, afterMetrics);
      
      expect(comparison.healthDelta).toBe(40);
      expect(comparison.improvement).toBe('significant');
    });
  });

  describe('🔴 红阶段测试 - 报告格式', () => {
    test('应该支持多种报告格式', async () => {
      const bugs: BugReport[] = [];
      
      const htmlReport = await generator.generate(bugs, { format: 'html' });
      const markdownReport = await generator.generate(bugs, { format: 'markdown' });
      const jsonReport = await generator.generate(bugs, { format: 'json' });

      expect(htmlReport).toContain('<html');
      expect(markdownReport).toContain('#');
      expect(() => JSON.parse(jsonReport)).not.toThrow();
    });

    test('应该生成包含图表的报告', async () => {
      const bugs: BugReport[] = [
        { id: '1', severity: 'critical', type: 'security' } as BugReport,
        { id: '2', severity: 'high', type: 'performance' } as BugReport,
        { id: '3', severity: 'medium', type: 'quality' } as BugReport,
      ];

      const options: ReportOptions = {
        format: 'html',
        includeCharts: true
      };

      const report = await generator.generate(bugs, options);
      
      // 应该包含图表相关代码（Chart.js 或 SVG）
      expect(report).toMatch(/chart|canvas|svg|data-chart/i);
    });
  });

  describe('🔴 红阶段测试 - 交互功能', () => {
    test('应该支持报告折叠/展开', async () => {
      const bugs: BugReport[] = [
        { id: '1', file: 'file1.ts', severity: 'high' } as BugReport,
        { id: '2', file: 'file2.ts', severity: 'medium' } as BugReport,
      ];

      const report = await generator.generate(bugs, { 
        format: 'html',
        collapsible: true 
      });

      expect(report).toMatch(/collapsible|accordion|details|summary/i);
    });

    test('应该支持搜索和过滤', async () => {
      const bugs: BugReport[] = [
        { id: '1', severity: 'high', type: 'security' } as BugReport,
        { id: '2', severity: 'low', type: 'style' } as BugReport,
      ];

      const report = await generator.generate(bugs, { 
        format: 'html',
        searchable: true 
      });

      expect(report).toMatch(/search|filter|input.*type.*search/i);
    });
  });

  describe('🔴 红阶段测试 - 文件输出', () => {
    test('应该能保存报告到文件', async () => {
      const bugs: BugReport[] = [];
      const outputPath = './reports/bughunter-report.html';

      const result = await generator.saveReport(bugs, {
        format: 'html',
        outputPath
      });

      expect(result.success).toBe(true);
      expect(result.filePath).toBe(outputPath);
    });

    test('应该创建报告目录（如果不存在）', async () => {
      const bugs: BugReport[] = [];
      const outputPath = './reports/nested/deep/report.html';

      const result = await generator.saveReport(bugs, {
        format: 'html',
        outputPath
      });

      expect(result.success).toBe(true);
    });
  });
});
