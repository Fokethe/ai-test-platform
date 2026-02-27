/**
 * BugHunter 报告生成器使用示例
 * 展示如何使用可视化报告功能
 */

import { ReportGenerator, BugReport, ReportOptions } from './report-generator';

async function main() {
  // 创建报告生成器实例
  const generator = new ReportGenerator();

  // 模拟 Bug 数据
  const mockBugs: BugReport[] = [
    {
      id: 'BUG001',
      file: 'src/utils/api.ts',
      line: 42,
      severity: 'high',
      type: 'null-pointer',
      description: '访问可能为 null 的对象属性，导致运行时错误',
      codeSnippet: 'const name = user.profile.name;',
      fixSuggestion: '使用可选链操作符 (?.) 和空值合并运算符 (??)',
      fixed: true,
      fixedCode: 'const name = user?.profile?.name ?? "Unknown";'
    },
    {
      id: 'BUG002',
      file: 'src/components/UserCard.tsx',
      line: 15,
      severity: 'medium',
      type: 'type-error',
      description: 'TypeScript 类型不匹配，使用了 any 类型',
      codeSnippet: 'const data: any = fetchData();',
      fixSuggestion: '定义具体的数据接口类型',
      fixed: true,
      fixedCode: 'interface UserData {\n  id: string;\n  name: string;\n}\nconst data: UserData = fetchData();'
    },
    {
      id: 'BUG003',
      file: 'src/hooks/useAuth.ts',
      line: 28,
      severity: 'critical',
      type: 'security',
      description: '敏感信息硬编码在源代码中',
      codeSnippet: 'const API_KEY = "sk-live-abc123xyz";',
      fixSuggestion: '使用环境变量存储敏感信息',
      fixed: true,
      fixedCode: 'const API_KEY = process.env.API_KEY;\nif (!API_KEY) {\n  throw new Error("API_KEY not configured");\n}'
    },
    {
      id: 'BUG004',
      file: 'src/lib/database.ts',
      line: 56,
      severity: 'high',
      type: 'sql-injection',
      description: '用户输入直接拼接到 SQL 查询中，存在注入风险',
      codeSnippet: 'const query = `SELECT * FROM users WHERE id = ${userId}`;',
      fixSuggestion: '使用参数化查询',
      fixed: true,
      fixedCode: 'const query = "SELECT * FROM users WHERE id = ?";\nawait db.query(query, [userId]);'
    },
    {
      id: 'BUG005',
      file: 'src/app/page.tsx',
      line: 34,
      severity: 'medium',
      type: 'performance',
      description: 'useEffect 中缺少清理函数，可能导致内存泄漏',
      codeSnippet: 'useEffect(() => {\n  const interval = setInterval(() => {\n    fetchData();\n  }, 5000);\n}, []);',
      fixSuggestion: '返回清理函数清除定时器',
      fixed: false
    }
  ];

  console.log('🚀 BugHunter 报告生成示例\n');

  // 1. 计算质量指标
  console.log('📊 计算质量指标...');
  const metrics = generator.calculateMetrics(mockBugs);
  console.log('质量指标:', JSON.stringify(metrics, null, 2));
  console.log();

  // 2. 生成 HTML 报告（完整功能）
  console.log('📝 生成 HTML 报告...');
  const htmlOptions: ReportOptions = {
    format: 'html',
    title: 'BugHunter 修复报告 - 示例项目',
    includeDiff: true,
    includeCharts: true,
    theme: 'dark',
    collapsible: true,
    searchable: true,
    outputPath: './reports/bughunter-report.html'
  };

  const htmlResult = await generator.saveReport(mockBugs, htmlOptions);
  if (htmlResult.success) {
    console.log(`✅ HTML 报告已保存: ${htmlResult.filePath}`);
  } else {
    console.error(`❌ 保存失败: ${htmlResult.error}`);
  }
  console.log();

  // 3. 生成 Markdown 报告
  console.log('📝 生成 Markdown 报告...');
  const mdOptions: ReportOptions = {
    format: 'markdown',
    title: 'BugHunter 修复报告',
    outputPath: './reports/bughunter-report.md'
  };

  const mdResult = await generator.saveReport(mockBugs, mdOptions);
  if (mdResult.success) {
    console.log(`✅ Markdown 报告已保存: ${mdResult.filePath}`);
  }
  console.log();

  // 4. 生成 JSON 报告
  console.log('📝 生成 JSON 报告...');
  const jsonOptions: ReportOptions = {
    format: 'json',
    title: 'BugHunter 修复报告',
    outputPath: './reports/bughunter-report.json'
  };

  const jsonResult = await generator.saveReport(mockBugs, jsonOptions);
  if (jsonResult.success) {
    console.log(`✅ JSON 报告已保存: ${jsonResult.filePath}`);
  }
  console.log();

  // 5. 对比修复前后的指标
  console.log('📈 对比修复前后指标...');
  const beforeMetrics = {
    healthScore: 45,
    totalBugs: 10,
    fixedBugs: 0,
    fixRate: 0,
    bySeverity: { critical: 2, high: 3, medium: 3, low: 2 }
  };

  const afterMetrics = generator.calculateMetrics(mockBugs);
  const comparison = generator.compareMetrics(beforeMetrics, afterMetrics);
  
  console.log('修复前健康度:', beforeMetrics.healthScore + '%');
  console.log('修复后健康度:', afterMetrics.healthScore + '%');
  console.log('提升幅度:', comparison.healthDelta + '%');
  console.log('改进程度:', comparison.improvement);
  console.log('详情:', comparison.details);
  console.log();

  // 6. 生成内存中的报告（不保存文件）
  console.log('💾 生成内存中的 HTML 报告...');
  const htmlContent = await generator.generate(mockBugs, {
    format: 'html',
    title: '内存报告示例',
    includeDiff: true,
    includeCharts: true,
    theme: 'light'
  });
  
  console.log(`✅ 生成了 ${htmlContent.length} 字符的 HTML 内容`);
  console.log('前 200 字符预览:');
  console.log(htmlContent.substring(0, 200) + '...');
  console.log();

  console.log('🎉 所有报告生成完成！');
  console.log('\n📁 生成的文件:');
  console.log('  - reports/bughunter-report.html (交互式 HTML 报告)');
  console.log('  - reports/bughunter-report.md (Markdown 报告)');
  console.log('  - reports/bughunter-report.json (JSON 数据)');
  console.log('\n💡 提示: 在浏览器中打开 HTML 报告查看完整效果！');
}

// 运行示例
main().catch(console.error);
