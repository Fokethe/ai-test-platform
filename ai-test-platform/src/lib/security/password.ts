/**
 * 安全密码生成工具
 * 修复: 使用 crypto.randomBytes 替代 Math.random
 */

import { randomBytes } from 'crypto';

/**
 * 生成安全的随机密码
 * @param length 密码长度 (默认32)
 * @returns 随机密码字符串
 */
export function generateSecurePassword(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const bytes = randomBytes(length);
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  
  return password;
}

/**
 * 验证密码是否只包含允许的字符
 * @param password 密码字符串
 * @returns 是否有效
 */
export function isSecurePassword(password: string): boolean {
  const validChars = /^[A-Za-z0-9!@#$%^&*]+$/;
  return validChars.test(password);
}

/**
 * 生成临时用户密码 (用于用户邀请/重置)
 * @returns 16位临时密码
 */
export function generateTempPassword(): string {
  return generateSecurePassword(16);
}