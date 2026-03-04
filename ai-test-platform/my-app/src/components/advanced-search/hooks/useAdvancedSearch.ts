/**
 * 高级搜索自定义 Hook
 * TDD Batch 6C: 高级搜索功能
 */

import { useState, useCallback, useMemo } from 'react';
import {
  SearchFilters,
  FilterTag,
  UseAdvancedSearchOptions,
  TestStatus,
  TestPriority,
  TestType,
} from '../types';

const defaultFilters: SearchFilters = {
  keyword: '',
  status: '',
  priority: '',
  type: '',
  tags: [],
  startDate: undefined,
  endDate: undefined,
  customFields: {},
};

export function useAdvancedSearch(options: UseAdvancedSearchOptions = {}) {
  const { initialFilters = defaultFilters, onFiltersChange } = options;

  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // 更新单个筛选条件
  const updateFilter = useCallback(<K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      onFiltersChange?.(newFilters);
      return newFilters;
    });
  }, [onFiltersChange]);

  // 清除单个筛选条件
  const clearFilter = useCallback((key: keyof SearchFilters) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: defaultFilters[key] };
      onFiltersChange?.(newFilters);
      return newFilters;
    });
  }, [onFiltersChange]);

  // 清除所有筛选条件
  const clearAllFilters = useCallback(() => {
    setFilters(defaultFilters);
    onFiltersChange?.(defaultFilters);
  }, [onFiltersChange]);

  // 重置为初始值
  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    onFiltersChange?.(initialFilters);
  }, [initialFilters, onFiltersChange]);

  // 是否有激活的筛选条件
  const hasActiveFilters = useMemo(() => {
    return (
      (filters.keyword && filters.keyword.trim() !== '') ||
      filters.status !== '' ||
      filters.priority !== '' ||
      filters.type !== '' ||
      (filters.tags && filters.tags.length > 0) ||
      filters.startDate !== undefined ||
      filters.endDate !== undefined ||
      (filters.customFields && Object.keys(filters.customFields).length > 0)
    );
  }, [filters]);

  // 获取筛选标签列表
  const filterTags = useMemo<FilterTag[]>(() => {
    const tags: FilterTag[] = [];

    if (filters.keyword) {
      tags.push({
        key: 'keyword',
        label: '关键词',
        value: filters.keyword,
        onRemove: () => clearFilter('keyword'),
      });
    }

    if (filters.status) {
      tags.push({
        key: 'status',
        label: '状态',
        value: getStatusLabel(filters.status),
        onRemove: () => clearFilter('status'),
      });
    }

    if (filters.priority) {
      tags.push({
        key: 'priority',
        label: '优先级',
        value: getPriorityLabel(filters.priority),
        onRemove: () => clearFilter('priority'),
      });
    }

    if (filters.type) {
      tags.push({
        key: 'type',
        label: '类型',
        value: getTypeLabel(filters.type),
        onRemove: () => clearFilter('type'),
      });
    }

    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach((tag, index) => {
        tags.push({
          key: `tag-${index}`,
          label: '标签',
          value: tag,
          onRemove: () => {
            const newTags = filters.tags?.filter((_, i) => i !== index);
            updateFilter('tags', newTags);
          },
        });
      });
    }

    if (filters.startDate || filters.endDate) {
      const dateRangeText = `${filters.startDate || '开始'} ~ ${filters.endDate || '结束'}`;
      tags.push({
        key: 'dateRange',
        label: '创建时间',
        value: dateRangeText,
        onRemove: () => {
          clearFilter('startDate');
          clearFilter('endDate');
        },
      });
    }

    // 自定义字段标签
    if (filters.customFields) {
      Object.entries(filters.customFields).forEach(([key, value]) => {
        if (value) {
          tags.push({
            key: `custom-${key}`,
            label: key,
            value: value,
            onRemove: () => {
              const newCustomFields = { ...filters.customFields };
              delete newCustomFields[key];
              updateFilter('customFields', newCustomFields);
            },
          });
        }
      });
    }

    return tags;
  }, [filters, clearFilter, updateFilter]);

  // 切换高级筛选展开状态
  const toggleAdvanced = useCallback(() => {
    setIsAdvancedOpen(prev => !prev);
  }, []);

  // 添加标签
  const addTag = useCallback((tag: string) => {
    if (tag.trim() && !filters.tags?.includes(tag.trim())) {
      updateFilter('tags', [...(filters.tags || []), tag.trim()]);
    }
  }, [filters.tags, updateFilter]);

  // 移除标签
  const removeTag = useCallback((tagToRemove: string) => {
    updateFilter('tags', filters.tags?.filter(tag => tag !== tagToRemove) || []);
  }, [filters.tags, updateFilter]);

  return {
    filters,
    setFilters,
    updateFilter,
    clearFilter,
    clearAllFilters,
    resetFilters,
    hasActiveFilters,
    filterTags,
    isAdvancedOpen,
    setIsAdvancedOpen,
    toggleAdvanced,
    addTag,
    removeTag,
  };
}

// 辅助函数
function getStatusLabel(status: TestStatus): string {
  const labels: Record<TestStatus, string> = {
    ACTIVE: '激活',
    DRAFT: '草稿',
    DEPRECATED: '弃用',
    ARCHIVED: '归档',
  };
  return labels[status] || status;
}

function getPriorityLabel(priority: TestPriority): string {
  const labels: Record<TestPriority, string> = {
    CRITICAL: '紧急',
    HIGH: '高',
    MEDIUM: '中',
    LOW: '低',
  };
  return labels[priority] || priority;
}

function getTypeLabel(type: TestType): string {
  const labels: Record<TestType, string> = {
    CASE: '用例',
    SUITE: '套件',
    FOLDER: '文件夹',
  };
  return labels[type] || type;
}
