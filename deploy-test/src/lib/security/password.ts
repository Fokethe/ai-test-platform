/**
 * 密码安全工具
 * 提供临时密码生成和密码强度验证功能
 */

import crypto from "crypto";

/**
 * 生成随机临时密码
 * @param length 密码长度，默认12
 * @returns 生成的临时密码
 */
export function generateTempPassword(length: number = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  
  // 确保包含至少一个大写字母、一个小写字母、一个数字和一个特殊字符
  password += charset.match(/[A-Z]/)![0];
  password += charset.match(/[a-z]/)![0];
  password += charset.match(/[0-9]/)![0];
  password += charset.match(/[!@#$%^&*]/)![0];
  
  // 填充剩余长度
  const randomBytes = crypto.randomBytes(length - 4);
  for (let i = 0; i < length - 4; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  
  // 打乱顺序
  return password.split("").sort(() => Math.random() - 0.5).join("");
}

/**
 * 验证密码强度
 * @param password 要验证的密码
 * @returns 密码强度评分 (0-100)
 */
export function validatePasswordStrength(password: string): number {
  let score = 0;
  
  // 长度检查
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  
  // 复杂度检查
  if (/[a-z]/.test(password)) score += 15; // 小写字母
  if (/[A-Z]/.test(password)) score += 15; // 大写字母
  if (/[0-9]/.test(password)) score += 15; // 数字
  if (/[^a-zA-Z0-9]/.test(password)) score += 15; // 特殊字符
  
  // 多样性奖励
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= password.length * 0.7) score += 10;
  
  return Math.min(score, 100);
}

/**
 * 检查密码是否符合要求
 * @param password 要检查的密码
 * @returns 是否符合要求
 */
export function isPasswordValid(password: string): boolean {
  return validatePasswordStrength(password) >= 60;
}

/**
 * 生成密码重置令牌
 * @returns 重置令牌和过期时间
 */
export function generatePasswordResetToken(): {
  token: string;
  expiresAt: Date;
} {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期
  
  return { token, expiresAt };
}
