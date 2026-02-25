/**
 * Form Error Hook
 * 统一处理表单错误，支持 API 错误映射
 */

'use client';

import { useState, useCallback } from 'react';
import { ApiError } from '../api';

interface FieldErrors {
  [key: string]: string[];
}

interface UseFormErrorReturn {
  /** 字段级错误 { fieldName: [errors] } */
  fieldErrors: FieldErrors;
  /** 表单级错误 */
  formError: string | null;
  /** 设置 API 错误，自动映射到字段或表单 */
  setApiError: (error: ApiError) => void;
  /** 设置单个字段错误 */
  setFieldError: (field: string, message: string) => void;
  /** 设置表单级错误 */
  setFormError: (message: string) => void;
  /** 清除所有错误 */
  clearErrors: () => void;
  /** 清除指定字段错误 */
  clearFieldError: (field: string) => void;
  /** 获取字段的第一个错误 */
  getFieldError: (field: string) => string | undefined;
  /** 是否有错误 */
  hasErrors: boolean;
}

/**
 * 表单错误处理 Hook
 * 
 * @example
 * ```tsx
 * const { fieldErrors, formError, setApiError, clearErrors, getFieldError } = useFormError();
 * 
 * // 提交表单
 * try {
 *   await apiClient.post('/api/user', data);
 * } catch (err) {
 *   if (err instanceof ApiError) {
 *     setApiError(err);
 *   }
 * }
 * 
 * // 显示字段错误
 * <input />
 * <FormFieldError message={getFieldError('email')} />
 * ```
 */
export function useFormError(): UseFormErrorReturn {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormErrorState] = useState<string | null>(null);

  /**
   * 设置 API 错误
   * - 400 验证错误: 映射到字段
   * - 其他错误: 显示为表单级错误
   */
  const setApiError = useCallback((error: ApiError) => {
    // 清除之前的错误
    setFieldErrors({});
    setFormErrorState(null);

    // 验证错误 (400) 且有 details 时，映射到字段
    if (error.status === 400 && error.details) {
      setFieldErrors(error.details);
      // 如果没有具体字段错误，显示为表单错误
      if (Object.keys(error.details).length === 0) {
        setFormErrorState(error.message);
      }
    } else {
      // 其他错误显示为表单级错误
      setFormErrorState(error.message);
    }
  }, []);

  /**
   * 设置单个字段错误
   */
  const setFieldError = useCallback((field: string, message: string) => {
    setFieldErrors((prev) => ({
      ...prev,
      [field]: [message],
    }));
  }, []);

  /**
   * 设置表单级错误
   */
  const setFormError = useCallback((message: string) => {
    setFormErrorState(message);
  }, []);

  /**
   * 清除所有错误
   */
  const clearErrors = useCallback(() => {
    setFieldErrors({});
    setFormErrorState(null);
  }, []);

  /**
   * 清除指定字段错误
   */
  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  /**
   * 获取字段的第一个错误
   */
  const getFieldError = useCallback(
    (field: string): string | undefined => {
      return fieldErrors[field]?.[0];
    },
    [fieldErrors]
  );

  /**
   * 是否有任何错误
   */
  const hasErrors = Object.keys(fieldErrors).length > 0 || !!formError;

  return {
    fieldErrors,
    formError,
    setApiError,
    setFieldError,
    setFormError,
    clearErrors,
    clearFieldError,
    getFieldError,
    hasErrors,
  };
}
