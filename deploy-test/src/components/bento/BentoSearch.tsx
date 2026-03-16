/**
 * BentoSearch - 统一搜索栏组件
 * 所有列表页使用一致的搜索风格
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Filter } from 'lucide-react';

interface BentoSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
  showFilter?: boolean;
  onFilterClick?: () => void;
  className?: string;
}

export function BentoSearch({
  value,
  onChange,
  onSearch,
  placeholder = '搜索...',
  showFilter = false,
  onFilterClick,
  className,
}: BentoSearchProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  const handleClear = () => {
    onChange('');
    onSearch();
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder={placeholder}
          className="pl-10 pr-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <Button variant="outline" onClick={onSearch}>
        搜索
      </Button>

      {showFilter && onFilterClick && (
        <Button variant="outline" size="icon" onClick={onFilterClick}>
          <Filter className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
