/**
 * BugHunter 可视化报告生成器
 * 生成 HTML/Markdown/JSON 格式的代码修复报告，支持 diff 高亮和图表
 */

import * as fs from 'fs';
import * as path from 'path';

// ==================== 类型定义 ====================

export interface BugReport {
  id: string;
  file: string;
  line: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  description: string;
  codeSnippet: string;
  fixSuggestion: string;
  fixed: boolean;
  fixedCode?: string;
}

export interface ReportOptions {
  format: 'html' | 'markdown' | 'json';
  title?: string;
  includeDiff?: boolean;
  includeCharts?: boolean;
  theme?: 'light' | 'dark';
  collapsible?: boolean;
  searchable?: boolean;
  outputPath?: string;
}

export interface CodeDiff {
  before: string;
  after: string;
  fileName: string;
  lineNumber: number;
}

export interface QualityMetrics {
  healthScore: number;
  totalBugs: number;
  fixedBugs: number;
  fixRate: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byType?: Record<string, number>;
}

export interface MetricsComparison {
  healthDelta: number;
  improvement: 'significant' | 'moderate' | 'minor' | 'none';
  details: string;
}

export interface SaveResult {
  success: boolean;
  filePath: string;
  error?: string;
}

// ==================== 报告生成器类 ====================

export class ReportGenerator {
  private readonly severityWeights = {
    critical: 10,
    high: 5,
    medium: 2,
    low: 1
  };

  /**
   * 生成报告
   */
  async generate(bugs: BugReport[], options: ReportOptions): Promise<string> {
    switch (options.format) {
      case 'html':
        return this.generateHTML(bugs, options);
      case 'markdown':
        return this.generateMarkdown(bugs, options);
      case 'json':
        return this.generateJSON(bugs, options);
      default:
        throw new Error(`不支持的报告格式: ${options.format}`);
    }
  }

  /**
   * 生成 HTML 报告
   */
  private generateHTML(bugs: BugReport[], options: ReportOptions): string {
    const metrics = this.calculateMetrics(bugs);
    const title = options.title || 'BugHunter 修复报告';
    const theme = options.theme || 'dark';
    
    const cssStyles = this.getCSSStyles(theme);
    const jsScripts = this.getJSScripts(options);
    
    const bugCards = bugs.map(bug => this.generateBugCard(bug, options)).join('\n');
    const charts = options.includeCharts ? this.generateCharts(bugs) : '';
    const summary = this.generateSummary(metrics);
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${cssStyles}</style>
</head>
<body class="theme-${theme}">
  <div class="container">
    <header class="report-header">
      <h1>🔍 ${title}</h1>
      <div class="meta">
        <span class="timestamp">生成时间: ${new Date().toLocaleString('zh-CN')}</span>
        <span class="version">BugHunter v1.0.0</span>
      </div>
    </header>

    ${summary}
    ${charts}
    
    <section class="bugs-section">
      <h2>🐛 发现的 Bug (${bugs.length})</h2>
      <div class="bugs-list">
        ${bugCards || '<p class="no-bugs">🎉 未发现 Bug！</p>'}
      </div>
    </section>

    <footer class="report-footer">
      <p>由 BugHunter 自动生成 | 代码质量持续改进 💪</p>
    </footer>
  </div>

  <script>${jsScripts}</script>
</body>
</html>`;
  }

  /**
   * 生成单个 Bug 卡片
   */
  private generateBugCard(bug: BugReport, options: ReportOptions): string {
    const severityClass = `severity-${bug.severity}`;
    const statusBadge = bug.fixed 
      ? '<span class="badge fixed">✅ 已修复</span>' 
      : '<span class="badge pending">⏳ 待修复</span>';
    
    const diffSection = options.includeDiff && bug.fixedCode 
      ? this.generateDiffSection(bug.codeSnippet, bug.fixedCode)
      : '';

    const collapsibleAttr = options.collapsible ? 'class="collapsible"' : '';
    
    return `
    <article class="bug-card ${severityClass}" ${collapsibleAttr} data-bug-id="${bug.id}">
      <div class="bug-header">
        <div class="bug-title">
          <span class="bug-id">${bug.id}</span>
          <span class="severity-badge ${severityClass}">${this.getSeverityLabel(bug.severity)}</span>
          ${statusBadge}
        </div>
        <div class="bug-location">
          📁 ${bug.file}:${bug.line}
        </div>
      </div>
      
      <div class="bug-content">
        <div class="bug-type">🏷️ ${bug.type}</div>
        <p class="description">${bug.description}</p>
        
        <div class="code-section">
          <h4>原始代码:</h4>
          <pre class="code-block"><code>${this.escapeHtml(bug.codeSnippet)}</code></pre>
        </div>

        ${diffSection}
        
        <div class="fix-suggestion">
          <h4>💡 修复建议:</h4>
          <p>${bug.fixSuggestion}</p>
          ${bug.fixedCode ? `
          <div class="fixed-code">
            <h4>修复后代码:</h4>
            <pre class="code-block fixed"><code>${this.escapeHtml(bug.fixedCode)}</code></pre>
          </div>
          ` : ''}
        </div>
      </div>
    </article>`;
  }

  /**
   * 生成代码 diff 对比
   */
  private generateDiffSection(before: string, after: string): string {
    return `
    <div class="diff-section">
      <h4>📝 代码对比:</h4>
      <div class="diff-container">
        <div class="diff-before">
          <div class="diff-label">Before</div>
          <pre class="code-block removed"><code>${this.escapeHtml(before)}</code></pre>
        </div>
        <div class="diff-arrow">→</div>
        <div class="diff-after">
          <div class="diff-label">After</div>
          <pre class="code-block added"><code>${this.escapeHtml(after)}</code></pre>
        </div>
      </div>
    </div>`;
  }

  /**
   * 生成质量指标摘要
   */
  private generateSummary(metrics: QualityMetrics): string {
    const healthColor = metrics.healthScore >= 80 ? 'good' : 
                       metrics.healthScore >= 60 ? 'warning' : 'bad';
    
    return `
    <section class="summary-section">
      <h2>📊 质量概览</h2>
      <div class="metrics-grid">
        <div class="metric-card health ${healthColor}">
          <div class="metric-value">${metrics.healthScore.toFixed(1)}%</div>
          <div class="metric-label">代码健康度</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${metrics.totalBugs}</div>
          <div class="metric-label">总 Bug 数</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${metrics.fixedBugs}</div>
          <div class="metric-label">已修复</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${metrics.fixRate.toFixed(1)}%</div>
          <div class="metric-label">修复率</div>
        </div>
      </div>
      
      <div class="severity-breakdown">
        <h3>按严重程度分布:</h3>
        <div class="severity-bars">
          <div class="severity-bar critical" style="--count: ${metrics.bySeverity.critical}">
            <span class="label">致命</span>
            <span class="count">${metrics.bySeverity.critical}</span>
          </div>
          <div class="severity-bar high" style="--count: ${metrics.bySeverity.high}">
            <span class="label">严重</span>
            <span class="count">${metrics.bySeverity.high}</span>
          </div>
          <div class="severity-bar medium" style="--count: ${metrics.bySeverity.medium}">
            <span class="label">警告</span>
            <span class="count">${metrics.bySeverity.medium}</span>
          </div>
          <div class="severity-bar low" style="--count: ${metrics.bySeverity.low}">
            <span class="label">建议</span>
            <span class="count">${metrics.bySeverity.low}</span>
          </div>
        </div>
      </div>
    </section>`;
  }

  /**
   * 生成图表
   */
  private generateCharts(bugs: BugReport[]): string {
    const typeDistribution = this.getTypeDistribution(bugs);
    const severityData = this.getSeverityData(bugs);
    
    return `
    <section class="charts-section">
      <h2>📈 可视化分析</h2>
      <div class="charts-grid">
        <div class="chart-container">
          <h3>Bug 类型分布</h3>
          <div class="chart-svg type-chart" data-chart="${JSON.stringify(typeDistribution)}">
            ${this.generateSVGChart(typeDistribution, 'pie')}
          </div>
        </div>
        <div class="chart-container">
          <h3>严重程度分布</h3>
          <div class="chart-svg severity-chart" data-chart="${JSON.stringify(severityData)}">
            ${this.generateSVGChart(severityData, 'bar')}
          </div>
        </div>
      </div>
    </section>`;
  }

  /**
   * 生成 SVG 图表
   */
  private generateSVGChart(data: Record<string, number>, type: 'pie' | 'bar'): string {
    if (type === 'bar') {
      const max = Math.max(...Object.values(data));
      const bars = Object.entries(data).map(([key, value], index) => {
        const height = (value / max) * 100;
        const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
        const color = colors[index % colors.length];
        return `
          <rect x="${index * 60 + 10}" y="${100 - height}" width="50" height="${height}" 
                fill="${color}" rx="4" />
          <text x="${index * 60 + 35}" y="115" text-anchor="middle" font-size="10">${key}</text>
          <text x="${index * 60 + 35}" y="${100 - height - 5}" text-anchor="middle" font-size="10">${value}</text>
        `;
      }).join('');
      
      return `<svg viewBox="0 0 240 130" class="chart-svg-bar">${bars}</svg>`;
    }
    
    // 简化的饼图
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    let currentAngle = 0;
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
    
    const slices = Object.entries(data).map(([key, value], index) => {
      const angle = (value / total) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      // 简化的扇形表示
      return `<circle cx="60" cy="60" r="${30 + index * 5}" fill="none" 
              stroke="${colors[index % colors.length]}" stroke-width="8" 
              stroke-dasharray="${angle * 0.87} 360" 
              transform="rotate(${startAngle} 60 60)" />`;
    }).join('');
    
    return `<svg viewBox="0 0 120 120" class="chart-svg-pie">${slices}</svg>`;
  }

  /**
   * 生成 Markdown 报告
   */
  private generateMarkdown(bugs: BugReport[], options: ReportOptions): string {
    const title = options.title || 'BugHunter 修复报告';
    const metrics = this.calculateMetrics(bugs);
    
    const bugList = bugs.map(bug => `
### ${bug.id} - ${bug.type} (${bug.severity})

**位置:** \`${bug.file}:${bug.line}\`

**状态:** ${bug.fixed ? '✅ 已修复' : '⏳ 待修复'}

**描述:** ${bug.description}

**原始代码:**
\`\`\`typescript
${bug.codeSnippet}
\`\`\`

**修复建议:** ${bug.fixSuggestion}

${bug.fixedCode ? `**修复后:**
\`\`\`typescript
${bug.fixedCode}
\`\`\`
` : ''}
---
`).join('\n');

    return `# ${title}

> 生成时间: ${new Date().toLocaleString('zh-CN')}

## 📊 质量概览

- **代码健康度:** ${metrics.healthScore.toFixed(1)}%
- **总 Bug 数:** ${metrics.totalBugs}
- **已修复:** ${metrics.fixedBugs}
- **修复率:** ${metrics.fixRate.toFixed(1)}%

### 按严重程度分布

| 级别 | 数量 |
|------|------|
| 🔴 致命 | ${metrics.bySeverity.critical} |
| 🟠 严重 | ${metrics.bySeverity.high} |
| 🟡 警告 | ${metrics.bySeverity.medium} |
| 🟢 建议 | ${metrics.bySeverity.low} |

## 🐛 Bug 详情 (${bugs.length})

${bugList || '> 🎉 未发现 Bug！'}

---

*由 BugHunter 自动生成* 💪
`;
  }

  /**
   * 生成 JSON 报告
   */
  private generateJSON(bugs: BugReport[], options: ReportOptions): string {
    const report = {
      meta: {
        title: options.title || 'BugHunter 修复报告',
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      },
      metrics: this.calculateMetrics(bugs),
      bugs: bugs,
      summary: {
        total: bugs.length,
        fixed: bugs.filter(b => b.fixed).length,
        pending: bugs.filter(b => !b.fixed).length
      }
    };
    
    return JSON.stringify(report, null, 2);
  }

  /**
   * 计算质量指标
   */
  calculateMetrics(bugs: BugReport[]): QualityMetrics {
    const total = bugs.length;
    const fixed = bugs.filter(b => b.fixed).length;
    
    const bySeverity = {
      critical: bugs.filter(b => b.severity === 'critical').length,
      high: bugs.filter(b => b.severity === 'high').length,
      medium: bugs.filter(b => b.severity === 'medium').length,
      low: bugs.filter(b => b.severity === 'low').length
    };

    // 计算健康度: 基础分 100，减去未修复 bug 的权重
    const pendingBugs = bugs.filter(b => !b.fixed);
    const penalty = pendingBugs.reduce((sum, bug) => {
      return sum + this.severityWeights[bug.severity];
    }, 0);
    
    const healthScore = Math.max(0, Math.min(100, 100 - penalty * 2));
    
    return {
      healthScore,
      totalBugs: total,
      fixedBugs: fixed,
      fixRate: total > 0 ? (fixed / total) * 100 : 0,
      bySeverity
    };
  }

  /**
   * 对比修复前后的指标
   */
  compareMetrics(before: QualityMetrics, after: QualityMetrics): MetricsComparison {
    const healthDelta = after.healthScore - before.healthScore;
    
    let improvement: MetricsComparison['improvement'];
    if (healthDelta >= 30) improvement = 'significant';
    else if (healthDelta >= 15) improvement = 'moderate';
    else if (healthDelta > 0) improvement = 'minor';
    else improvement = 'none';
    
    return {
      healthDelta,
      improvement,
      details: `代码健康度从 ${before.healthScore}% 提升到 ${after.healthScore}% (${healthDelta > 0 ? '+' : ''}${healthDelta}%)`
    };
  }

  /**
   * 保存报告到文件
   */
  async saveReport(bugs: BugReport[], options: ReportOptions): Promise<SaveResult> {
    try {
      if (!options.outputPath) {
        throw new Error('必须提供 outputPath');
      }

      // 确保目录存在
      const dir = path.dirname(options.outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 生成报告内容
      const content = await this.generate(bugs, options);
      
      // 写入文件
      fs.writeFileSync(options.outputPath, content, 'utf-8');

      return {
        success: true,
        filePath: options.outputPath
      };
    } catch (error) {
      return {
        success: false,
        filePath: options.outputPath || '',
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  // ==================== 辅助方法 ====================

  private getSeverityLabel(severity: string): string {
    const labels: Record<string, string> = {
      critical: '致命',
      high: '严重',
      medium: '警告',
      low: '建议'
    };
    return labels[severity] || severity;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#039;');
  }

  private getTypeDistribution(bugs: BugReport[]): Record<string, number> {
    return bugs.reduce((acc, bug) => {
      acc[bug.type] = (acc[bug.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getSeverityData(bugs: BugReport[]): Record<string, number> {
    return {
      critical: bugs.filter(b => b.severity === 'critical').length,
      high: bugs.filter(b => b.severity === 'high').length,
      medium: bugs.filter(b => b.severity === 'medium').length,
      low: bugs.filter(b => b.severity === 'low').length
    };
  }

  private getCSSStyles(theme: string): string {
    const isDark = theme === 'dark';
    const colors = isDark ? {
      bg: '#0f172a',
      text: '#e2e8f0',
      card: '#1e293b',
      border: '#334155',
      critical: '#ef4444',
      high: '#f97316',
      medium: '#eab308',
      low: '#22c55e'
    } : {
      bg: '#ffffff',
      text: '#1e293b',
      card: '#f8fafc',
      border: '#e2e8f0',
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#ca8a04',
      low: '#16a34a'
    };

    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: ${colors.bg};
        color: ${colors.text};
        line-height: 1.6;
      }
      .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
      
      .report-header {
        text-align: center;
        padding: 40px 0;
        border-bottom: 2px solid ${colors.border};
        margin-bottom: 30px;
      }
      .report-header h1 { font-size: 2.5em; margin-bottom: 10px; }
      .meta { color: ${isDark ? '#94a3b8' : '#64748b'}; font-size: 0.9em; }
      .meta span { margin: 0 10px; }
      
      .summary-section {
        background: ${colors.card};
        border-radius: 12px;
        padding: 30px;
        margin-bottom: 30px;
        border: 1px solid ${colors.border};
      }
      .summary-section h2 { margin-bottom: 20px; font-size: 1.5em; }
      
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      }
      .metric-card {
        background: ${isDark ? '#334155' : '#ffffff'};
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        border: 1px solid ${colors.border};
      }
      .metric-value {
        font-size: 2em;
        font-weight: bold;
        color: ${colors.low};
      }
      .metric-card.health.good .metric-value { color: ${colors.low}; }
      .metric-card.health.warning .metric-value { color: ${colors.medium}; }
      .metric-card.health.bad .metric-value { color: ${colors.critical}; }
      .metric-label { font-size: 0.9em; color: ${isDark ? '#94a3b8' : '#64748b'}; margin-top: 5px; }
      
      .severity-bars {
        display: flex;
        gap: 10px;
        margin-top: 15px;
      }
      .severity-bar {
        flex: 1;
        padding: 10px;
        border-radius: 6px;
        text-align: center;
        color: white;
        font-weight: bold;
      }
      .severity-bar.critical { background: ${colors.critical}; }
      .severity-bar.high { background: ${colors.high}; }
      .severity-bar.medium { background: ${colors.medium}; }
      .severity-bar.low { background: ${colors.low}; }
      
      .bugs-section h2 { margin-bottom: 20px; }
      .bugs-list { display: flex; flex-direction: column; gap: 20px; }
      
      .bug-card {
        background: ${colors.card};
        border-radius: 12px;
        border: 1px solid ${colors.border};
        overflow: hidden;
      }
      .bug-card.severity-critical { border-left: 4px solid ${colors.critical}; }
      .bug-card.severity-high { border-left: 4px solid ${colors.high}; }
      .bug-card.severity-medium { border-left: 4px solid ${colors.medium}; }
      .bug-card.severity-low { border-left: 4px solid ${colors.low}; }
      
      .bug-header {
        padding: 15px 20px;
        background: ${isDark ? '#252f47' : '#f1f5f9'};
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .bug-title { display: flex; align-items: center; gap: 10px; }
      .bug-id { font-weight: bold; font-size: 1.1em; }
      .severity-badge {
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 0.8em;
        font-weight: bold;
        color: white;
      }
      .severity-badge.severity-critical { background: ${colors.critical}; }
      .severity-badge.severity-high { background: ${colors.high}; }
      .severity-badge.severity-medium { background: ${colors.medium}; }
      .severity-badge.severity-low { background: ${colors.low}; }
      
      .badge {
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 0.8em;
        font-weight: bold;
      }
      .badge.fixed { background: ${colors.low}; color: white; }
      .badge.pending { background: ${colors.medium}; color: white; }
      
      .bug-content { padding: 20px; }
      .bug-type { color: ${isDark ? '#94a3b8' : '#64748b'}; margin-bottom: 10px; }
      .description { margin-bottom: 15px; }
      
      .code-section { margin: 15px 0; }
      .code-section h4 { margin-bottom: 8px; font-size: 0.9em; color: ${isDark ? '#94a3b8' : '#64748b'}; }
      .code-block {
        background: ${isDark ? '#0f172a' : '#f8fafc'};
        border: 1px solid ${colors.border};
        border-radius: 6px;
        padding: 12px;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 0.85em;
        overflow-x: auto;
      }
      .code-block.fixed { border-color: ${colors.low}; }
      .code-block.removed { background: ${isDark ? '#450a0a' : '#fef2f2'}; border-color: ${colors.critical}; }
      .code-block.added { background: ${isDark ? '#052e16' : '#f0fdf4'}; border-color: ${colors.low}; }
      
      .diff-section { margin: 15px 0; }
      .diff-container {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 15px;
        align-items: center;
      }
      .diff-label {
        font-size: 0.8em;
        color: ${isDark ? '#94a3b8' : '#64748b'};
        margin-bottom: 5px;
      }
      .diff-arrow { font-size: 1.5em; color: ${isDark ? '#94a3b8' : '#64748b'}; }
      
      .fix-suggestion {
        background: ${isDark ? '#1e3a5f' : '#eff6ff'};
        border-radius: 8px;
        padding: 15px;
        margin-top: 15px;
      }
      .fix-suggestion h4 { margin-bottom: 8px; color: ${isDark ? '#60a5fa' : '#2563eb'}; }
      
      .charts-section {
        background: ${colors.card};
        border-radius: 12px;
        padding: 30px;
        margin-bottom: 30px;
        border: 1px solid ${colors.border};
      }
      .charts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 30px;
        margin-top: 20px;
      }
      .chart-container { text-align: center; }
      .chart-container h3 { margin-bottom: 15px; font-size: 1em; }
      
      .report-footer {
        text-align: center;
        padding: 30px;
        color: ${isDark ? '#94a3b8' : '#64748b'};
        border-top: 1px solid ${colors.border};
        margin-top: 30px;
      }
      
      .no-bugs {
        text-align: center;
        padding: 40px;
        font-size: 1.2em;
        color: ${colors.low};
      }
      
      @media (max-width: 768px) {
        .metrics-grid { grid-template-columns: repeat(2, 1fr); }
        .diff-container { grid-template-columns: 1fr; }
        .bug-header { flex-direction: column; align-items: flex-start; gap: 10px; }
      }
    `;
  }

  private getJSScripts(options: ReportOptions): string {
    const scripts: string[] = [];
    
    if (options.collapsible) {
      scripts.push(`
        document.querySelectorAll('.collapsible').forEach(card => {
          const header = card.querySelector('.bug-header');
          const content = card.querySelector('.bug-content');
          if (header && content) {
            content.style.display = 'none';
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
              content.style.display = content.style.display === 'none' ? 'block' : 'none';
            });
          }
        });
      `);
    }
    
    if (options.searchable) {
      scripts.push(`
        const searchInput = document.createElement('input');
        searchInput.type = 'search';
        searchInput.placeholder = '🔍 搜索 Bug...';
        searchInput.style.cssText = 'width:100%;padding:12px;margin-bottom:20px;border:1px solid ${options.theme === 'dark' ? '#334155' : '#e2e8f0'};border-radius:8px;background:${options.theme === 'dark' ? '#1e293b' : '#fff'};color:inherit;';
        document.querySelector('.bugs-section').insertBefore(searchInput, document.querySelector('.bugs-list'));
        
        searchInput.addEventListener('input', (e) => {
          const term = e.target.value.toLowerCase();
          document.querySelectorAll('.bug-card').forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(term) ? 'block' : 'none';
          });
        });
      `);
    }
    
    return scripts.join('\n');
  }
}

// 默认导出
export default ReportGenerator;
