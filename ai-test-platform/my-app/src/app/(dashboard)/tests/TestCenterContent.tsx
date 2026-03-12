/**
 * TestCenter Content - 测试中心内容组件
 * 被 Suspense 边界包裹
 */

'use client';

import React, { useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import {
  Beaker,
  Plus,
  Folder,
  Sparkles,
  Search,
  Loader2,
  MoreHorizontal,
  FolderOpen,
  Upload,
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  X,
  Filter,
  ArrowUpDown,
  Trash2,
  FolderInput,
  CheckSquare,
  Square,
  Settings,
  RefreshCw,
} from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Pagination } from '@/components/ui/pagination';
import { InfiniteScroll } from '@/components/ui/virtual-list';
import { toast } from 'sonner';
import Link from 'next/link';
import { safeJsonParse } from '@/lib/utils/json';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// SWR 配置 - 30分钟定时刷新
const swrOptions = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 2000,
  refreshInterval: 30 * 60 * 1000, // 30分钟定时刷新
};

interface Test {
  id: string;
  name: string;
  description?: string;
  type: 'CASE' | 'SUITE' | 'FOLDER';
  status: string;
  priority: string;
  tags?: string;
  createdAt: string;
  customFieldValues?: CustomFieldValue[];
  _count?: { executions: number };
}

interface CustomFieldValue {
  id: string;
  fieldId: string;
  value: string;
  field: {
    name: string;
    type: string;
  };
}

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface FolderItem {
  id: string;
  name: string;
}

interface SuiteItem {
  id: string;
  name: string;
}

type TestStatus = 'ACTIVE' | 'DRAFT' | 'DEPRECATED' | 'ARCHIVED';

// 支持的导入格式
const IMPORT_FORMATS = [
  { ext: '.xlsx', name: 'Excel', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { ext: '.json', name: 'JSON', mime: 'application/json' },
  { ext: '.csv', name: 'CSV', mime: 'text/csv' },
];

export default function TestCenterContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'cases';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 筛选状态
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [tagsFilter, setTagsFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});
  
  // 排序状态
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // 无限滚动状态（用于大数据场景）
  const [infiniteItems, setInfiniteItems] = useState<Test[]>([]);
  const [infinitePage, setInfinitePage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [useInfiniteScroll, setUseInfiniteScroll] = useState(false);

  // 导入状态
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  // ===== 批量操作状态 =====
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [batchMoveDialogOpen, setBatchMoveDialogOpen] = useState(false);
  const [batchStatusDialogOpen, setBatchStatusDialogOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchMoving, setBatchMoving] = useState(false);
  const [batchUpdatingStatus, setBatchUpdatingStatus] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<string>('');
  const [targetSuiteId, setTargetSuiteId] = useState<string>('');
  const [targetStatus, setTargetStatus] = useState<TestStatus>('ACTIVE');

  // 根据当前 tab 确定 type 参数
  const getTypeParam = () => {
    switch (activeTab) {
      case 'cases':
        return 'CASE';
      case 'suites':
        return 'SUITE';
      default:
        return '';
    }
  };

  // 构建 API URL
  const buildApiUrl = useCallback(() => {
    const params = new URLSearchParams();
    const type = getTypeParam();
    if (type) params.set('type', type);
    if (searchQuery) params.set('search', searchQuery);
    if (priorityFilter) params.set('priority', priorityFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter) params.set('type', typeFilter);
    if (tagsFilter.length > 0) params.set('tags', tagsFilter.join(','));
    if (dateRange.start) params.set('startDate', dateRange.start);
    if (dateRange.end) params.set('endDate', dateRange.end);
    if (sortField) {
      params.set('sort', sortField);
      params.set('order', sortOrder);
    }
    params.set('page', page.toString());
    params.set('pageSize', pageSize.toString());
    return `/api/tests?${params.toString()}`;
  }, [activeTab, searchQuery, priorityFilter, statusFilter, typeFilter, tagsFilter, dateRange, sortField, sortOrder, page, pageSize]);

  // 获取数据
  const { data, error, isLoading, mutate } = useSWR(
    activeTab !== 'ai' ? buildApiUrl() : null,
    fetcher,
    swrOptions
  );

  // 获取文件夹和套件列表（用于批量移动）
  const { data: foldersData } = useSWR<FolderItem[]>(
    activeTab !== 'ai' ? '/api/folders' : null,
    fetcher,
    swrOptions
  );
  const { data: suitesData } = useSWR<SuiteItem[]>(
    activeTab !== 'ai' ? '/api/suites' : null,
    fetcher,
    swrOptions
  );

  const tests: Test[] = data?.data?.list || [];
  const meta: PaginationMeta = data?.data?.pagination || { total: 0, page: 1, pageSize: 20, totalPages: 0 };

  // ===== 批量选择操作 =====
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleAllSelection = useCallback(() => {
    if (selectedIds.size === tests.length && tests.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tests.map(t => t.id)));
    }
  }, [selectedIds.size, tests]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ===== 批量删除 =====
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setBatchDeleting(true);
    try {
      const res = await fetch('/api/tests/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      
      const result = await res.json();
      if (result.code === 0) {
        toast.success('批量删除成功', {
          description: `已删除 ${result.data?.deleted || 0} 个测试`,
        });
        clearSelection();
        mutate();
      } else {
        throw new Error(result.message || '删除失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除失败';
      toast.error('批量删除失败', { description: message });
    } finally {
      setBatchDeleting(false);
      setBatchDeleteDialogOpen(false);
    }
  };

  // ===== 批量更新状态 =====
  const handleBatchUpdateStatus = async () => {
    if (selectedIds.size === 0) return;
    
    setBatchUpdatingStatus(true);
    try {
      const res = await fetch('/api/tests/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ids: Array.from(selectedIds),
          status: targetStatus 
        }),
      });
      
      const result = await res.json();
      if (result.code === 0) {
        toast.success('状态更新成功', {
          description: `已更新 ${result.data?.updated || 0} 个测试`,
        });
        clearSelection();
        mutate();
      } else {
        throw new Error(result.message || '更新失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '更新失败';
      toast.error('状态更新失败', { description: message });
    } finally {
      setBatchUpdatingStatus(false);
      setBatchStatusDialogOpen(false);
    }
  };

  // ===== 批量移动 =====
  const handleBatchMove = async () => {
    if (selectedIds.size === 0) return;
    
    setBatchMoving(true);
    try {
      const res = await fetch('/api/tests/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ids: Array.from(selectedIds),
          folderId: targetFolderId || undefined,
          suiteId: targetSuiteId || undefined,
        }),
      });
      
      const result = await res.json();
      if (result.code === 0) {
        toast.success('移动成功', {
          description: `已移动 ${result.data?.moved || 0} 个测试`,
        });
        clearSelection();
        setTargetFolderId('');
        setTargetSuiteId('');
        mutate();
      } else {
        throw new Error(result.message || '移动失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '移动失败';
      toast.error('移动失败', { description: message });
    } finally {
      setBatchMoving(false);
      setBatchMoveDialogOpen(false);
    }
  };

  // 处理优先级筛选
  const handlePriorityFilter = (value: string) => {
    setPriorityFilter(value === 'ALL' ? '' : value);
    setPage(1);
    setInfinitePage(1);
    setInfiniteItems([]);
    clearSelection();
  };

  // 处理状态筛选
  const handleStatusFilter = (value: string) => {
    setStatusFilter(value === 'ALL' ? '' : value);
    setPage(1);
    setInfinitePage(1);
    setInfiniteItems([]);
    clearSelection();
  };

  // 处理排序
  const handleSort = (value: string) => {
    const [field, order] = value.split(':');
    setSortField(field);
    setSortOrder(order as 'asc' | 'desc');
    setPage(1);
    setInfinitePage(1);
    setInfiniteItems([]);
    clearSelection();
  };

  // 清除所有筛选
  const handleClearFilters = () => {
    setPriorityFilter('');
    setStatusFilter('');
    setTypeFilter('');
    setTagsFilter([]);
    setDateRange({});
    setSortField('createdAt');
    setSortOrder('desc');
    setSearchQuery('');
    setPage(1);
    setInfinitePage(1);
    setInfiniteItems([]);
    clearSelection();
  };

  // 是否有激活的筛选
  const hasActiveFilters = priorityFilter || statusFilter || typeFilter || tagsFilter.length > 0 || dateRange.start || dateRange.end || searchQuery;

  // 删除测试
  const handleDeleteTest = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/tests/${id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.code === 0) {
        mutate();
      } else {
        alert(result.message || '删除失败');
      }
    } catch (e) {
      alert('删除失败');
    }
  }, [mutate]);

  // 处理搜索
  const handleSearch = () => {
    setPage(1);
    setInfinitePage(1);
    setInfiniteItems([]);
    clearSelection();
    mutate();
  };

  // 加载更多（无限滚动）
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    
    const nextPage = infinitePage + 1;
    const params = new URLSearchParams();
    const type = getTypeParam();
    if (type) params.set('type', type);
    if (searchQuery) params.set('search', searchQuery);
    if (priorityFilter) params.set('priority', priorityFilter);
    if (statusFilter) params.set('status', statusFilter);
    params.set('page', nextPage.toString());
    params.set('pageSize', '20');
    
    try {
      const res = await fetch(`/api/tests?${params.toString()}`);
      const result = await res.json();
      
      if (result.data?.list?.length > 0) {
        setInfiniteItems(prev => [...prev, ...result.data.list]);
        setInfinitePage(nextPage);
        setHasMore(result.data.length === 20);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error('Load more failed:', e);
    }
  }, [hasMore, isLoading, infinitePage, searchQuery, priorityFilter, statusFilter, activeTab]);

  // 切换分页模式
  const togglePaginationMode = () => {
    setUseInfiniteScroll(!useInfiniteScroll);
    setInfiniteItems(tests);
    setInfinitePage(page);
    setHasMore(meta.page < meta.totalPages);
  };

  // 处理导入文件选择
  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  // 执行导入
  const handleImport = async () => {
    if (!importFile) return;
    
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      
      const response = await fetch('/api/tests/import', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('导入成功', {
          description: `成功导入 ${result.data?.count || 0} 条测试用例`,
        });
        setImportDialogOpen(false);
        setImportFile(null);
        mutate();
      } else {
        throw new Error(result.error || '导入失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '导入失败';
      toast.error('导入失败', { description: message });
    } finally {
      setImporting(false);
    }
  };

  // 执行导出
  const handleExport = async (format: 'xlsx' | 'json' | 'csv') => {
    try {
      const params = new URLSearchParams();
      params.set('format', format);
      if (searchQuery) params.set('search', searchQuery);
      if (activeTab !== 'ai') params.set('type', getTypeParam());
      
      const response = await fetch(`/api/tests/export?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('导出失败');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tests-export-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('导出成功', {
        description: `已导出为 ${format.toUpperCase()} 格式`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '导出失败';
      toast.error('导出失败', { description: message });
    }
  };

  const tabs = [
    { id: 'cases', label: '用例', icon: Beaker },
    { id: 'suites', label: '套件', icon: Folder },
    { id: 'ai', label: 'AI生成', icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">测试中心</h1>
          <p className="text-slate-500">
            共 {meta?.total || 0} 个{activeTab === 'cases' ? '用例' : activeTab === 'suites' ? '套件' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab !== 'ai' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePaginationMode}
                className="text-slate-500"
              >
                {useInfiniteScroll ? '分页模式' : '无限滚动'}
              </Button>
              {/* 导入按钮 */}
              <Button
                data-testid="import-button"
                variant="outline"
                size="sm"
                onClick={() => setImportDialogOpen(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                导入
              </Button>
              {/* 导出按钮 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    data-testid="export-button"
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    导出
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    导出为 Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('json')}>
                    <FileJson className="w-4 h-4 mr-2" />
                    导出为 JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    <FileText className="w-4 h-4 mr-2" />
                    导出为 CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <Button asChild>
            <Link href={`/tests/new?type=${getTypeParam()}`}>
              <Plus className="w-4 h-4 mr-2" />
              新建{activeTab === 'cases' ? '用例' : activeTab === 'suites' ? '套件' : ''}
            </Link>
          </Button>
        </div>
      </div>

      {/* ===== 批量操作工具栏 ===== */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">
              已选择 {selectedIds.size} 项
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  更新状态
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setTargetStatus('ACTIVE'); setBatchStatusDialogOpen(true); }}>
                  设为激活
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setTargetStatus('DRAFT'); setBatchStatusDialogOpen(true); }}>
                  设为草稿
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setTargetStatus('DEPRECATED'); setBatchStatusDialogOpen(true); }}>
                  设为弃用
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setBatchMoveDialogOpen(true)}
            >
              <FolderInput className="w-4 h-4 mr-2" />
              移动
            </Button>
            
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setBatchDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              删除
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={clearSelection}
            >
              <X className="w-4 h-4 mr-2" />
              取消选择
            </Button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* 搜索行 */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="搜索测试用例、套件..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>
            搜索
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={async () => { console.log('手动刷新触发'); await mutate(undefined, { revalidate: true }); }}
            disabled={isLoading}
            title="刷新"
          >
            <RefreshCw className={"w-4 h-4 " + (isLoading ? 'animate-spin' : '')} />
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings/custom-fields">
              <Settings className="w-4 h-4 mr-2" />
              自定义字段
            </Link>
          </Button>
        </div>

        {/* 筛选和排序行 */}
        {activeTab !== 'ai' && (
          <div className="flex flex-wrap items-center gap-3">
            {/* 优先级筛选 */}
            <Select
              value={priorityFilter || 'ALL'}
              onValueChange={handlePriorityFilter}
            >
              <SelectTrigger 
                data-testid="priority-filter"
                className="w-[140px]"
              >
                <SelectValue placeholder="优先级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部优先级</SelectItem>
                <SelectItem value="CRITICAL">紧急</SelectItem>
                <SelectItem value="HIGH">高优先级</SelectItem>
                <SelectItem value="MEDIUM">中</SelectItem>
                <SelectItem value="LOW">低</SelectItem>
              </SelectContent>
            </Select>

            {/* 状态筛选 */}
            <Select
              value={statusFilter || 'ALL'}
              onValueChange={handleStatusFilter}
            >
              <SelectTrigger 
                data-testid="status-filter"
                className="w-[140px]"
              >
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部状态</SelectItem>
                <SelectItem value="ACTIVE">已激活</SelectItem>
                <SelectItem value="DRAFT">草稿</SelectItem>
                <SelectItem value="DEPRECATED">已弃用</SelectItem>
              </SelectContent>
            </Select>

            {/* 类型筛选 */}
            <Select
              value={typeFilter || 'ALL'}
              onValueChange={(value) => {
                setTypeFilter(value === 'ALL' ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部类型</SelectItem>
                <SelectItem value="CASE">用例</SelectItem>
                <SelectItem value="SUITE">套件</SelectItem>
                <SelectItem value="FOLDER">文件夹</SelectItem>
              </SelectContent>
            </Select>

            {/* 排序 */}
            <Select
              value={`${sortField}:${sortOrder}`}
              onValueChange={handleSort}
            >
              <SelectTrigger 
                data-testid="sort-select"
                className="w-[160px]"
              >
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue placeholder="排序" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt:desc">最新创建</SelectItem>
                <SelectItem value="createdAt:asc">最早创建</SelectItem>
                <SelectItem value="name:asc">名称 A-Z</SelectItem>
                <SelectItem value="name:desc">名称 Z-A</SelectItem>
                <SelectItem value="priority:desc">优先级高到低</SelectItem>
                <SelectItem value="priority:asc">优先级低到高</SelectItem>
              </SelectContent>
            </Select>

            {/* 清除筛选按钮 */}
            {hasActiveFilters && (
              <Button
                data-testid="clear-filters-button"
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-slate-500"
              >
                <X className="w-4 h-4 mr-1" />
                清除筛选
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v);
        setPage(1);
        setInfinitePage(1);
        setInfiniteItems([]);
        clearSelection();
      }}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="cases" className="mt-6">
          {useInfiniteScroll ? (
            <InfiniteTestList
              tests={infiniteItems.length > 0 ? infiniteItems : tests}
              hasMore={hasMore}
              isLoading={isLoading}
              onLoadMore={loadMore}
              onDelete={handleDeleteTest}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
              onToggleAll={toggleAllSelection}
            />
          ) : (
            <>
              <TestList
                tests={tests}
                isLoading={isLoading}
                error={error}
                emptyText="暂无测试用例"
                onRefresh={() => mutate()}
                onDelete={handleDeleteTest}
                selectedIds={selectedIds}
                onToggleSelection={toggleSelection}
                onToggleAll={toggleAllSelection}
              />
              <Pagination
                currentPage={page}
                totalPages={meta.totalPages}
                totalItems={meta.total}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="suites" className="mt-6">
          {useInfiniteScroll ? (
            <InfiniteTestList
              tests={infiniteItems.length > 0 ? infiniteItems : tests}
              hasMore={hasMore}
              isLoading={isLoading}
              onLoadMore={loadMore}
              onDelete={handleDeleteTest}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
              onToggleAll={toggleAllSelection}
            />
          ) : (
            <>
              <TestList
                tests={tests}
                isLoading={isLoading}
                error={error}
                emptyText="暂无测试套件"
                onRefresh={() => mutate()}
                onDelete={handleDeleteTest}
                selectedIds={selectedIds}
                onToggleSelection={toggleSelection}
                onToggleAll={toggleAllSelection}
              />
              <Pagination
                currentPage={page}
                totalPages={meta.totalPages}
                totalItems={meta.total}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <AIGeneratePanel />
        </TabsContent>
      </Tabs>

      {/* 导入对话框 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导入测试用例</DialogTitle>
            <DialogDescription>
              选择要导入的文件，支持 Excel、JSON、CSV 格式
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* 文件格式说明 */}
            <div className="flex gap-2">
              {IMPORT_FORMATS.map(format => (
                <Badge key={format.ext} variant="secondary">
                  {format.ext}
                </Badge>
              ))}
            </div>
            
            {/* 文件选择 */}
            {!importFile ? (
              <div
                className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors"
                onClick={() => importInputRef.current?.click()}
              >
                <input
                  ref={importInputRef}
                  type="file"
                  data-testid="import-file-input"
                  onChange={handleImportFileSelect}
                  accept=".xlsx,.json,.csv"
                  className="hidden"
                />
                <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-500">点击选择文件</p>
                <p className="text-xs text-slate-400 mt-1">支持 .xlsx、.json、.csv</p>
              </div>
            ) : (
              <div className="border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium">{importFile.name}</p>
                    <p className="text-xs text-slate-500">
                      {(importFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setImportFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportDialogOpen(false);
                setImportFile(null);
              }}
            >
              取消
            </Button>
            <Button
              data-testid="confirm-import-button"
              onClick={handleImport}
              disabled={!importFile || importing}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  导入中...
                </>
              ) : (
                '确认导入'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量删除确认对话框 */}
      <Dialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认批量删除</DialogTitle>
            <DialogDescription>
              确定要删除选中的 {selectedIds.size} 个测试吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBatchDelete}
              disabled={batchDeleting}
            >
              {batchDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  删除中...
                </>
              ) : (
                '确认删除'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量更新状态确认对话框 */}
      <Dialog open={batchStatusDialogOpen} onOpenChange={setBatchStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认更新状态</DialogTitle>
            <DialogDescription>
              确定要将选中的 {selectedIds.size} 个测试状态更新为 "{targetStatus === 'ACTIVE' ? '激活' : targetStatus === 'DRAFT' ? '草稿' : '弃用'}" 吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchStatusDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleBatchUpdateStatus}
              disabled={batchUpdatingStatus}
            >
              {batchUpdatingStatus ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  更新中...
                </>
              ) : (
                '确认更新'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量移动对话框 */}
      <Dialog open={batchMoveDialogOpen} onOpenChange={setBatchMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量移动</DialogTitle>
            <DialogDescription>
              选择目标位置，将选中的 {selectedIds.size} 个测试移动过去
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">目标文件夹</label>
              <Select value={targetFolderId} onValueChange={setTargetFolderId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择文件夹（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">无</SelectItem>
                  {foldersData?.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">目标套件</label>
              <Select value={targetSuiteId} onValueChange={setTargetSuiteId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择套件（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">无</SelectItem>
                  {suitesData?.map((suite) => (
                    <SelectItem key={suite.id} value={suite.id}>
                      {suite.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchMoveDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleBatchMove}
              disabled={batchMoving || (!targetFolderId && !targetSuiteId)}
            >
              {batchMoving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  移动中...
                </>
              ) : (
                '确认移动'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 无限滚动测试列表
function InfiniteTestList({
  tests,
  hasMore,
  isLoading,
  onLoadMore,
  onDelete,
  selectedIds,
  onToggleSelection,
  onToggleAll,
}: {
  tests: Test[];
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  onDelete?: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleAll: () => void;
}) {
  if (tests.length === 0 && !isLoading) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <Beaker className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p className="text-slate-500">暂无测试用例</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/tests/new">创建第一个</Link>
        </Button>
      </div>
    );
  }

  const allSelected = tests.length > 0 && tests.every(t => selectedIds.has(t.id));

  return (
    <div className="border rounded-lg divide-y">
      {/* 表头 - 全选 */}
      {tests.length > 0 && (
        <div className="flex items-center p-3 bg-slate-50 border-b">
          <Checkbox 
            checked={allSelected}
            onCheckedChange={onToggleAll}
            className="mr-3"
          />
          <span className="text-sm text-slate-500">
            {allSelected ? '取消全选' : '全选'}
          </span>
        </div>
      )}
      <InfiniteScroll
        items={tests}
        hasMore={hasMore}
        isLoading={isLoading}
        onLoadMore={onLoadMore}
        renderItem={(test) => (
          <TestItem 
            test={test} 
            onDelete={onDelete}
            isSelected={selectedIds.has(test.id)}
            onToggleSelection={() => onToggleSelection(test.id)}
          />
        )}
      />
    </div>
  );
}

// 测试列表组件
function TestList({
  tests,
  isLoading,
  error,
  emptyText,
  onRefresh,
  onDelete,
  selectedIds,
  onToggleSelection,
  onToggleAll,
}: {
  tests: Test[];
  isLoading: boolean;
  error: any;
  emptyText: string;
  onRefresh: () => void;
  onDelete?: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleAll: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">加载失败</p>
        <Button variant="outline" className="mt-4" onClick={onRefresh}>
          重试
        </Button>
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <Beaker className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p className="text-slate-500">{emptyText}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/tests/new">创建第一个</Link>
        </Button>
      </div>
    );
  }

  const allSelected = tests.length > 0 && tests.every(t => selectedIds.has(t.id));

  return (
    <div className="border rounded-lg divide-y">
      {/* 表头 - 全选 */}
      <div className="flex items-center p-3 bg-slate-50 border-b">
        <Checkbox 
          checked={allSelected}
          onCheckedChange={onToggleAll}
          className="mr-3"
        />
        <span className="text-sm text-slate-500">
          {allSelected ? '取消全选' : '全选'}
        </span>
      </div>
      {tests.map((test) => (
        <TestItem 
          key={test.id} 
          test={test} 
          onDelete={onDelete}
          isSelected={selectedIds.has(test.id)}
          onToggleSelection={() => onToggleSelection(test.id)}
        />
      ))}
    </div>
  );
}

// 单个测试项 - 使用 React.memo 优化渲染
const TestItem = React.memo(function TestItem({ 
  test,
  onDelete,
  isSelected,
  onToggleSelection,
}: { 
  test: Test;
  onDelete?: (id: string) => void;
  isSelected: boolean;
  onToggleSelection: () => void;
}) {
  const tags = safeJsonParse<string[]>(test.tags, []);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm(`确定要删除测试 "${test.name}" 吗？`)) return;
    setDeleting(true);
    await onDelete(test.id);
    setDeleting(false);
  };

  return (
    <div className={`flex items-center p-4 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
      <Checkbox 
        checked={isSelected}
        onCheckedChange={onToggleSelection}
        className="mr-3"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/tests/${test.id}`}
            className="font-medium hover:text-blue-600 truncate"
          >
            {test.name}
          </Link>
          <PriorityBadge priority={test.priority} />
          <StatusBadge status={test.status} />
        </div>
        {test.description && (
          <p className="text-sm text-slate-500 mt-1 truncate">{test.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          {tags.slice(0, 5).map((tag: string) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {tags.length > 5 && (
            <Badge variant="outline" className="text-xs">+{tags.length - 5}</Badge>
          )}
          <span className="text-xs text-slate-400">
            执行 {test._count?.executions || 0} 次
          </span>
          {/* 显示自定义字段值 */}
          {test.customFieldValues && test.customFieldValues.length > 0 && (
            <>
              <span className="text-slate-300">|</span>
              {test.customFieldValues.slice(0, 2).map((cfv) => (
                <Badge key={cfv.id} variant="outline" className="text-xs">
                  {cfv.field.name}: {cfv.value}
                </Badge>
              ))}
              {test.customFieldValues.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{test.customFieldValues.length - 2}
                </Badge>
              )}
            </>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={deleting}>
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/tests/${test.id}`}>查看</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/tests/${test.id}/edit`}>编辑</Link>
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="text-red-600"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? '删除中...' : '删除'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

// 优先级标签
function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700',
    HIGH: 'bg-orange-100 text-orange-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    LOW: 'bg-slate-100 text-slate-700',
  };

  return (
    <Badge className={colors[priority] || colors.MEDIUM} variant="secondary">
      {priority === 'CRITICAL' ? '紧急' : priority === 'HIGH' ? '高' : priority === 'MEDIUM' ? '中' : '低'}
    </Badge>
  );
}

// 状态标签
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    DRAFT: 'bg-yellow-100 text-yellow-700',
    DEPRECATED: 'bg-gray-100 text-gray-700',
    ARCHIVED: 'bg-red-100 text-red-700',
  };

  const labels: Record<string, string> = {
    ACTIVE: '激活',
    DRAFT: '草稿',
    DEPRECATED: '弃用',
    ARCHIVED: '归档',
  };

  return (
    <Badge className={colors[status] || colors.DRAFT} variant="secondary">
      {labels[status] || status}
    </Badge>
  );
}

// AI 生成面板
function AIGeneratePanel() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="border rounded-lg p-6 hover:border-blue-300 transition-colors">
          <Sparkles className="w-8 h-8 mb-4 text-blue-500" />
          <h3 className="font-medium mb-2">从需求生成</h3>
          <p className="text-sm text-slate-500 mb-4">
            输入功能需求，AI 自动生成测试用例
          </p>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/ai-generate">开始生成</Link>
          </Button>
        </div>
        
        <div className="border rounded-lg p-6 hover:border-blue-300 transition-colors">
          <FolderOpen className="w-8 h-8 mb-4 text-green-500" />
          <h3 className="font-medium mb-2">从页面生成</h3>
          <p className="text-sm text-slate-500 mb-4">
            选择页面，AI 自动识别元素并生成用例
          </p>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/assets?type=page">选择页面</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}