#!/usr/bin/env node
/**
 * 编码检查与修复工具
 * 自动检测项目中的乱码文件并提供修复建议
 * 
 * 使用方法:
 *   node scripts/check-encoding.js          # 检查整个项目
 *   node scripts/check-encoding.js --fix    # 自动修复检测到的乱码
 *   node scripts/check-encoding.js --file path/to/file  # 检查指定文件
 */

const fs = require('fs');
const path = require('path');

// 乱码特征字符（问号替换符）
const GARBLED_PATTERNS = [
  /[\ufffd\u001a]/g,  // Unicode 替换字符
  /[\u0000-\u0008\u000b-\u000c\u000e-\u001f]/g,  // 控制字符
];

// 真正的乱码模式（中文字符后跟问号）
const CHINESE_GARBLED_PATTERN = /[\u4e00-\u9fa5][?]/g;

// TypeScript 语法中的问号（不应该被当作乱码）
const TS_SYNTAX_PATTERNS = [
  /\?\s*:/,     // 可选链或类型定义
  /\?\s*\./,    // 可选链调用
  /\?\s*\?/,    // 空值合并
  /\?\s*\)/,    // 函数参数可选
  /\?\s*,/,     // 对象属性可选
  /\?\s*\]/,    // 数组可选
  /\?\s*>/,     // 泛型可选
];

// 检查问号是否是 TypeScript 语法的一部分
function isTsSyntax(line, matchIndex) {
  const before = line.substring(Math.max(0, matchIndex - 10), matchIndex + 2);
  return TS_SYNTAX_PATTERNS.some(pattern => pattern.test(before));
}

// 需要检查的文件扩展名
const CHECK_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx',
  '.prisma', '.sql',
  '.json', '.md', '.mdx',
  '.yml', '.yaml',
  '.css', '.scss', '.less',
  '.html', '.htm',
  '.txt'
];

// 排除的目录
const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  '.vercel',
  '.vscode',
  'prisma/migrations'
];

// 颜色输出
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 检查文件是否有乱码
function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const issues = [];
    
    // 检查每行内容
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      // 检查 Unicode 替换字符
      GARBLED_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          issues.push({
            line: index + 1,
            content: line.trim().substring(0, 80),
            pattern: 'Unicode 替换字符'
          });
        }
      });
      
      // 检查中文后紧跟问号的乱码
      let match;
      CHINESE_GARBLED_PATTERN.lastIndex = 0;
      while ((match = CHINESE_GARBLED_PATTERN.exec(line)) !== null) {
        // 确认不是 TypeScript 语法
        if (!isTsSyntax(line, match.index + 1)) {
          issues.push({
            line: index + 1,
            content: line.trim().substring(0, 80),
            pattern: '中文乱码 (?)'
          });
          break; // 一行只报告一次
        }
      }
    });
    
    return issues;
  } catch (error) {
    return [{ error: error.message }];
  }
}

// 尝试修复文件
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let fixed = false;
    
    // 常见乱码替换映射
    const replacements = [
      { from: /模\?/g, to: '模块' },
      { from: /字\?/g, to: '字段' },
      { from: /数\?/g, to: '数据' },
      { from: /元\?/g, to: '元数据' },
      { from: /解\?/g, to: '解析' },
      { from: /详\?/g, to: '详情' },
      { from: /类\?/g, to: '类型' },
      { from: /资\?/g, to: '资源' },
      { from: /查\?/g, to: '查询' },
      { from: /记\?/g, to: '记录' },
      { from: /简\?/g, to: '简化' },
      { from: /\?channel/g, to: '如 channel' },
      { from: /\?jobName/g, to: 'jobName' },
      { from: /显示\?/g, to: '显示用' },
      { from: /内嵌\?Run/g, to: '内嵌到 Run' },
    ];
    
    replacements.forEach(({ from, to }) => {
      if (from.test(content)) {
        content = content.replace(from, to);
        fixed = true;
      }
    });
    
    if (fixed) {
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    }
    return false;
  } catch (error) {
    log(`修复失败: ${filePath} - ${error.message}`, 'red');
    return false;
  }
}

// 递归扫描目录
function scanDirectory(dir, results = []) {
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(item) && !item.startsWith('.')) {
        scanDirectory(fullPath, results);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(item).toLowerCase();
      if (CHECK_EXTENSIONS.includes(ext)) {
        const issues = checkFile(fullPath);
        if (issues.length > 0) {
          results.push({ file: fullPath, issues });
        }
      }
    }
  });
  
  return results;
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  const fileArg = args.find(arg => arg.startsWith('--file='));
  
  log('🔍 编码检查工具', 'blue');
  log('='.repeat(50), 'blue');
  
  let results = [];
  
  if (fileArg) {
    const filePath = fileArg.split('=')[1];
    log(`检查文件: ${filePath}`, 'blue');
    const issues = checkFile(filePath);
    if (issues.length > 0) {
      results.push({ file: filePath, issues });
    }
  } else {
    log('正在扫描项目...', 'blue');
    results = scanDirectory(process.cwd());
  }
  
  // 显示结果
  if (results.length === 0) {
    log('\n✅ 未发现乱码问题！', 'green');
    return;
  }
  
  log(`\n⚠️  发现 ${results.length} 个文件可能存在乱码:`, 'yellow');
  
  let fixedCount = 0;
  
  results.forEach(({ file, issues }) => {
    log(`\n📄 ${file}`, 'yellow');
    issues.forEach(issue => {
      if (issue.error) {
        log(`  错误: ${issue.error}`, 'red');
      } else {
        log(`  第 ${issue.line} 行: ${issue.content}`, 'red');
      }
    });
    
    if (shouldFix) {
      if (fixFile(file)) {
        log(`  ✅ 已自动修复`, 'green');
        fixedCount++;
      } else {
        log(`  ⚠️  无法自动修复，请手动检查`, 'yellow');
      }
    }
  });
  
  // 总结
  log('\n' + '='.repeat(50), 'blue');
  if (shouldFix) {
    log(`✅ 修复完成: ${fixedCount}/${results.length} 个文件`, 'green');
    if (fixedCount < results.length) {
      log(`⚠️  ${results.length - fixedCount} 个文件需要手动修复`, 'yellow');
    }
  } else {
    log(`发现 ${results.length} 个文件需要处理`, 'yellow');
    log('运行以下命令自动修复:', 'blue');
    log(`  node scripts/check-encoding.js --fix`, 'green');
  }
}

main();
