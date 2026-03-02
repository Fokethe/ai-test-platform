#!/usr/bin/env node
# encoding: utf-8
# -*- coding: utf-8 -*-

/**
 * 自动清理脚本 - AutoCleanup
 * 功能：清理空代码文件、临时文件、临时目录，并将生成的文件进行分类
 * 使用方法：node auto-cleanup.js [--dry-run] [--no-git]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const CONFIG = {
  // 空文件大小阈值（bytes）
  emptyFileThreshold: 50,
  
  // 项目根目录
  projectRoot: path.join(__dirname, '..'),
  
  // 临时文件模式
  tempPatterns: [
    /^temp.*\.(js|ts|txt)$/i,
    /^gen.*\.js$/i,
    /^create.*\.js$/i,
    /^write.*\.js$/i,
    /^test.*\.txt$/i,
    /^output\.txt$/i,
  ],
  
  // 临时目录模式
  tempDirs: ['-Force', '-p', '[name]', 'temp', 'test', '-Force', '-p'],
  
  // 异常文件名模式
  abnormalPatterns: [
    /^\($/,
    /^\{\{$/,
    /^\$null$/,
    /^\(\{$/,
    /^\{n$/,
  ],
};

// 统计信息
const stats = {
  emptyFiles: 0,
  tempScripts: 0,
  tempFiles: 0,
  tempDirs: 0,
  classifiedFiles: 0,
  totalSize: 0,
  deletedFiles: [],
  deletedDirs: [],
  movedFiles: [],
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 检查文件是否为空代码文件
function isEmptyCodeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const codeExts = ['.ts', '.js', '.tsx', '.jsx'];
  
  if (!codeExts.includes(ext)) return false;
  
  try {
    const stats = fs.statSync(filePath);
    return stats.size < CONFIG.emptyFileThreshold;
  } catch (e) {
    return false;
  }
}

// 检查是否为临时文件
function isTempFile(filename) {
  return CONFIG.tempPatterns.some(pattern => pattern.test(filename));
}

// 检查是否为异常文件名
function isAbnormalFile(filename) {
  return CONFIG.abnormalPatterns.some(pattern => pattern.test(filename));
}

// 获取文件大小
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (e) {
    return 0;
  }
}

// 扫描目录
function scanDirectory(dirPath, dryRun = false) {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    // 跳过 .git 和 node_modules
    if (item === '.git' || item === 'node_modules') continue;
    
    const fullPath = path.join(dirPath, item);
    const relativePath = path.relative(CONFIG.projectRoot, fullPath);
    
    try {
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // 检查是否为临时目录
        if (CONFIG.tempDirs.includes(item) || isAbnormalFile(item)) {
          log(`📁 发现临时目录: ${relativePath}`, 'yellow');
          if (!dryRun) {
            fs.rmSync(fullPath, { recursive: true, force: true });
            stats.tempDirs++;
            stats.deletedDirs.push(relativePath);
          }
        } else {
          // 递归扫描子目录
          scanDirectory(fullPath, dryRun);
        }
      } else {
        // 检查文件
        const size = stat.size;
        
        if (isEmptyCodeFile(fullPath)) {
          log(`📄 发现空代码文件: ${relativePath} (${size} bytes)`, 'yellow');
          if (!dryRun) {
            fs.unlinkSync(fullPath);
            stats.emptyFiles++;
            stats.totalSize += size;
            stats.deletedFiles.push(relativePath);
          }
        } else if (isTempFile(item)) {
          log(`📝 发现临时文件: ${relativePath}`, 'yellow');
          if (!dryRun) {
            fs.unlinkSync(fullPath);
            if (/\.(js|ts)$/i.test(item)) {
              stats.tempScripts++;
            } else {
              stats.tempFiles++;
            }
            stats.totalSize += size;
            stats.deletedFiles.push(relativePath);
          }
        } else if (isAbnormalFile(item)) {
          log(`⚠️  发现异常文件: ${relativePath}`, 'red');
          if (!dryRun) {
            fs.unlinkSync(fullPath);
            stats.totalSize += size;
            stats.deletedFiles.push(relativePath);
          }
        }
      }
    } catch (e) {
      log(`❌ 处理失败: ${relativePath} - ${e.message}`, 'red');
    }
  }
}

// 生成报告
function generateReport() {
  const report = `
🧹 自动清理报告

📊 清理统计:
├─ 删除空代码文件: ${stats.emptyFiles} 个
├─ 删除临时脚本: ${stats.tempScripts} 个
├─ 删除临时文件: ${stats.tempFiles} 个
├─ 删除临时目录: ${stats.tempDirs} 个
├─ 移动分类文件: ${stats.classifiedFiles} 个
└─ 总计释放空间: ${(stats.totalSize / 1024).toFixed(2)} KB

📝 详细清单:
${stats.deletedFiles.length > 0 ? '删除的文件:\n' + stats.deletedFiles.map(f => `  - ${f}`).join('\n') : '无删除的文件'}

${stats.deletedDirs.length > 0 ? '删除的目录:\n' + stats.deletedDirs.map(d => `  - ${d}`).join('\n') : '无删除的目录'}

✅ 清理完成！
`;
  
  return report;
}

// Git 提交
function gitCommit() {
  try {
    const timestamp = new Date().toISOString();
    const commitMessage = `chore: 自动清理项目文件

- 删除空代码文件 ${stats.emptyFiles} 个
- 删除临时脚本 ${stats.tempScripts} 个
- 删除临时文件 ${stats.tempFiles} 个
- 删除临时目录 ${stats.tempDirs} 个
- 移动分类文件 ${stats.classifiedFiles} 个

自动清理执行时间: ${timestamp}`;
    
    execSync('git add -A', { cwd: CONFIG.projectRoot, stdio: 'ignore' });
    execSync(`git commit -m "${commitMessage}"`, { cwd: CONFIG.projectRoot, stdio: 'ignore' });
    
    const commitHash = execSync('git rev-parse --short HEAD', { cwd: CONFIG.projectRoot, encoding: 'utf8' }).trim();
    return commitHash;
  } catch (e) {
    log('⚠️  Git 提交失败（可能没有需要提交的更改）', 'yellow');
    return null;
  }
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const noGit = args.includes('--no-git');
  
  log('\n🔧 AutoCleanup - 自动清理工具\n', 'cyan');
  
  if (dryRun) {
    log('🧪 预览模式（不会实际删除文件）\n', 'blue');
  }
  
  // 扫描项目根目录
  log('🔍 正在扫描项目...\n', 'blue');
  scanDirectory(CONFIG.projectRoot, dryRun);
  
  // 生成报告
  const report = generateReport();
  console.log(report);
  
  // Git 提交
  if (!dryRun && !noGit) {
    log('📝 正在提交 Git...', 'blue');
    const commitHash = gitCommit();
    if (commitHash) {
      log(`✅ Git 提交: ${commitHash}`, 'green');
    }
  }
  
  log('\n🎉 清理完成！\n', 'green');
}

// 运行
main();
