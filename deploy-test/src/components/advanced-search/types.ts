/**
 * 高级搜索组件类型定义
 * TDD Batch 6C: 高级搜索功能
 */

// 测试状态
export type TestStatus = 'ACTIVE' | 'DRAFT' | 'DEPRECATED' | 'ARCHIVED';

// 测试优先级
export type TestPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// 测试类型
export type TestType = 'CASE' | 'SUITE' | 'FOLDER';

// 搜索筛选条件
export interface SearchFilters {
  keyword?: string;
  status?: TestStatus | '';
  priority?: TestPriority | '';
  type?: TestType | '';
  tags?: string[];
  startDate?: string;
  endDate?: string;
  customFields?: Record<string, string>;
}

// 筛选标签
export interface FilterTag {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
}

// 保存的筛选条件
export interface SavedSearchFilter {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: string;
}

// 高级搜索组件Props
export interface AdvancedSearchProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  savedFilters?: SavedSearchFilter[];
  onSaveFilter?: (name: string) => void;
  onDeleteSavedFilter?: (id: string) => void;
  customFieldDefinitions?: Array<{
    id: string;
    name: string;
    key: string;
    type: string;
    options?: string[];
  }>;
  className?: string;
}

// useAdvancedSearch Hook 选项
export interface UseAdvancedSearchOptions {
  initialFilters?: SearchFilters;
  onFiltersChange?: (filters: SearchFilters) => void;
}

// 搜索字段配置
export interface SearchFieldConfig {
  key: keyof SearchFilters;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange';
  options?: Array<{ value: string; label: string }>;
}

// 排序选项
export interface SortOption {
  field: string;
  order: 'asc' | 'desc';
  label: string;
}
