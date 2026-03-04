/**
 * 高级搜索组件
 * TDD Batch 6C: 高级搜索功能
 */

'use client';

import React, { useState } from 'react';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Save,
  Trash2,
  Tag,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useAdvancedSearch } from './hooks/useAdvancedSearch';
import { AdvancedSearchProps } from './types';

export function AdvancedSearch({
  onFiltersChange,
  onSearch,
  savedFilters = [],
  onSaveFilter,
  onDeleteSavedFilter,
  customFieldDefinitions = [],
  className,
}: AdvancedSearchProps) {
  const {
    filters,
    updateFilter,
    clearFilter,
    clearAllFilters,
    hasActiveFilters,
    filterTags,
    isAdvancedOpen,
    toggleAdvanced,
    addTag,
    removeTag,
  } = useAdvancedSearch({ onFiltersChange });

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [newTag, setNewTag] = useState('');

  const handleSaveFilter = () => {
    if (filterName.trim() && onSaveFilter) {
      onSaveFilter(filterName.trim());
      setFilterName('');
      setSaveDialogOpen(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      addTag(newTag.trim());
      setNewTag('');
    }
  };

  const applySavedFilter = (savedFilter: typeof savedFilters[0]) => {
    onFiltersChange(savedFilter.filters);
    onSearch();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 基础搜索栏 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索测试用例、套件..."
            className="pl-10"
            value={filters.keyword}
            onChange={(e) => updateFilter('keyword', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          />
        </div>
        
        <Button variant="outline" onClick={onSearch}>
          搜索
        </Button>
        
        <Button
          variant="outline"
          onClick={toggleAdvanced}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          高级筛选
          {isAdvancedOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1">
              {filterTags.length}
            </Badge>
          )}
        </Button>
        
        {savedFilters.length > 0 && (
          <Select onValueChange={(id) => {
            const saved = savedFilters.find(s => s.id === id);
            if (saved) applySavedFilter(saved);
          }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="选择保存的筛选" />
            </SelectTrigger>
            <SelectContent>
              {savedFilters.map((saved) => (
                <SelectItem key={saved.id} value={saved.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{saved.name}</span>
                    {onDeleteSavedFilter && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSavedFilter(saved.id);
                        }}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* 已选筛选标签 */}
      {filterTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">已选筛选:</span>
          {filterTags.map((tag) => (
            <Badge
              key={tag.key}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1"
            >
              <span className="text-slate-500">{tag.label}:</span>
              <span>{tag.value}</span>
              <button
                onClick={tag.onRemove}
                className="ml-1 hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-slate-500"
          >
            清除全部
          </Button>
          {onSaveFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSaveDialogOpen(true)}
              className="text-blue-600"
            >
              <Save className="w-3 h-3 mr-1" />
              保存筛选
            </Button>
          )}
        </div>
      )}

      {/* 高级筛选区域 */}
      {isAdvancedOpen && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 状态筛选 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">状态</label>
                <Select
                  value={filters.status || 'ALL'}
                  onValueChange={(value) =>
                    updateFilter('status', value === 'ALL' ? '' : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">全部状态</SelectItem>
                    <SelectItem value="ACTIVE">激活</SelectItem>
                    <SelectItem value="DRAFT">草稿</SelectItem>
                    <SelectItem value="DEPRECATED">弃用</SelectItem>
                    <SelectItem value="ARCHIVED">归档</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 优先级筛选 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">优先级</label>
                <Select
                  value={filters.priority || 'ALL'}
                  onValueChange={(value) =>
                    updateFilter('priority', value === 'ALL' ? '' : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择优先级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">全部优先级</SelectItem>
                    <SelectItem value="CRITICAL">紧急</SelectItem>
                    <SelectItem value="HIGH">高</SelectItem>
                    <SelectItem value="MEDIUM">中</SelectItem>
                    <SelectItem value="LOW">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 类型筛选 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">类型</label>
                <Select
                  value={filters.type || 'ALL'}
                  onValueChange={(value) =>
                    updateFilter('type', value === 'ALL' ? '' : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">全部类型</SelectItem>
                    <SelectItem value="CASE">用例</SelectItem>
                    <SelectItem value="SUITE">套件</SelectItem>
                    <SelectItem value="FOLDER">文件夹</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 创建时间范围 */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  创建时间从
                </label>
                <Input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => updateFilter('startDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  创建时间到
                </label>
                <Input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => updateFilter('endDate', e.target.value)}
                />
              </div>

              {/* 标签筛选 */}
              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  标签
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="输入标签按回车添加"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="max-w-xs"
                  />
                  <Button variant="outline" size="sm" onClick={handleAddTag}>
                    添加
                  </Button>
                </div>
                {filters.tags && filters.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {filters.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* 自定义字段筛选 */}
              {customFieldDefinitions.map((field) => (
                <div key={field.id} className="space-y-2">
                  <label className="text-sm font-medium">{field.name}</label>
                  {field.type === 'SELECT' && field.options ? (
                    <Select
                      value={filters.customFields?.[field.key] || 'ALL'}
                      onValueChange={(value) => {
                        const newCustomFields = {
                          ...filters.customFields,
                          [field.key]: value === 'ALL' ? '' : value,
                        };
                        updateFilter('customFields', newCustomFields);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`选择${field.name}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">全部</SelectItem>
                        {field.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder={`输入${field.name}`}
                      value={filters.customFields?.[field.key] || ''}
                      onChange={(e) => {
                        const newCustomFields = {
                          ...filters.customFields,
                          [field.key]: e.target.value,
                        };
                        updateFilter('customFields', newCustomFields);
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* 高级筛选操作按钮 */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={clearAllFilters}>
                重置
              </Button>
              <Button onClick={onSearch}>应用筛选</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 保存筛选对话框 */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>保存筛选条件</DialogTitle>
            <DialogDescription>
              为当前筛选条件设置一个名称，方便下次快速使用
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="输入筛选名称"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveFilter();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveFilter} disabled={!filterName.trim()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdvancedSearch;
