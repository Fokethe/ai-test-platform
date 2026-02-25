/**
 * Form Error Components
 * 统一表单错误显示组件
 */

'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormFieldErrorProps {
  message?: string;
  className?: string;
}

/**
 * 字段级错误提示（显示在输入框下方）
 */
export function FormFieldError({ message, className = '' }: FormFieldErrorProps) {
  if (!message) return null;

  return (
    <div className={`flex items-center gap-1 mt-1 text-sm text-red-500 ${className}`}>
      <AlertCircle data-testid="error-icon" className="w-4 h-4" />
      <span>{message}</span>
    </div>
  );
}

interface FormErrorProps {
  message?: string;
  className?: string;
}

/**
 * 表单级错误提示（显示在表单顶部）
 */
export function FormError({ message, className = '' }: FormErrorProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={`flex items-center gap-2 p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md ${className}`}
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
