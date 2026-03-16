#!/usr/bin/env node

// 环境检查脚本
const fs = require('fs');
const path = require('path');

const requiredEnvVars = [
  'NEXTAUTH_SECRET',
  'DATABASE_URL',
];

const optionalEnvVars = [
  'KIMI_API_KEY',
  'OPENAI_API_KEY',
];

console.log('🔍 检查环境变量...\n');

// 检查 .env 文件
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.log('❌ 未找到 .env 文件');
  console.log('📝 请复制 .env.example 到 .env 并配置');
  process.exit(1);
}

// 读取 .env 文件
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

// 检查必需变量
let hasError = false;
requiredEnvVars.forEach(key => {
  if (!envVars[key] || envVars[key].includes('your-') || envVars[key] === '') {
    console.log(`❌ ${key}: 未配置`);
    hasError = true;
  } else {
    console.log(`✅ ${key}: 已配置`);
  }
});

console.log('');

// 检查可选变量
optionalEnvVars.forEach(key => {
  if (!envVars[key] || envVars[key] === '') {
    console.log(`⚠️  ${key}: 未配置（可选）`);
  } else {
    console.log(`✅ ${key}: 已配置`);
  }
});

console.log('');

if (hasError) {
  console.log('❌ 环境检查失败，请配置必需的变量');
  process.exit(1);
} else {
  console.log('✅ 环境检查通过！');
  process.exit(0);
}
