/**
 * TestCenter Content - Bento Grid风格重构版
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
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
  Upload,
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  X,
  ArrowUpDown,
  ArrowRight,
  Trash2,
  FolderInput,
  CheckSquare,
  Filter,
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
import { toast } from 'sonner';
import Link from 'next/link';
import { safeJsonParse } from '@/lib/utils/json';
import { BentoCard, BentoGrid, BentoItem } from '@/components/bento';
import { BentoHeader } from '@/components/bento';
import { BentoSearch } from '@/components/bento';

import { swrFetcher as fetcher } from '@/lib/utils/fetcher';

const swrOptions = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 2000,
  refreshInterval: 30 * 60 * 1000,
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

const IMPORT_FORMATS = [
  { ext: '.xlsx', name: 'Excel', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { ext: '.json', name: 'JSON', mime: 'application/json' },
  { ext: '.csv', name: 'CSV', mime: 'text/csv' },
];

export function TestCenterContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'cases';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

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

  const buildApiUrl = useCallback(() => {
    const params = new URLSearchParams();
    const type = getTypeParam();
    if (type) params.set('type', type);
    if (searchQuery) params.set('search', searchQuery);
    if (priorityFilter) params.set('priority', priorityFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (sortField) {
      params.set('sort', sortField);
      params.set('order', sortOrder);
    }
    params.set('page', page.toString());
    params.set('pageSize', pageSize.toString());
    return `/api/tests?${params.toString()}`;
  }, [activeTab, searchQuery, priorityFilter, statusFilter, sortField, sortOrder, page, pageSize]);

  const { data, error, isLoading, mutate } = useSWR(
    activeTab !== 'ai' ? buildApiUrl() : null,
    fetcher,
    swrOptions
  );

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

  const handlePriorityFilter = (value: string) => {
    setPriorityFilter(value === 'ALL' ? '' : value);
    setPage(1);
    clearSelection();
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value === 'ALL' ? '' : value);
    setPage(1);
    clearSelection();
  };

  const handleSort = (value: string) => {
    const [field, order] = value.split(':');
    setSortField(field);
    setSortOrder(order as 'asc' | 'desc');
    setPage(1);
    clearSelection();
  };

  const handleClearFilters = () => {
    setPriorityFilter('');
    setStatusFilter('');
    setSortField('createdAt');
    setSortOrder('desc');
    setSearchQuery('');
    setPage(1);
    clearSelection();
  };

  const hasActiveFilters = priorityFilter || statusFilter || searchQuery;

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

  const handleSearch = () => {
    setPage(1);
    clearSelection();
    mutate();
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

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

  const getCreateLabel = () => {
    switch (activeTab) {
      case 'cases':
        return '新建用例';
      case 'suites':
        return '新建套件';
      default:
        return '新建';
    }
  };

  return (
    <>
      {/* Header */}
      <BentoHeader
        title="测试中心"
        description="管理测试用例、套件和AI生成"
        count={meta?.total || 0}
        countLabel="个"
        actionLabel={getCreateLabel()}
        actionHref={`/tests/new?type=${getTypeParam()}`}
        onRefresh={() => mutate(undefined, { revalidate: true })}
        isRefreshing={isLoading}
        secondaryActions={
          activeTab !== 'ai' && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    导入
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    从文件导入
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
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
          )
        }
      />

      {/* ===== 批量操作工具栏 ===== */}
      {selectedIds.size > 0 && (
        <BentoCard variant="bordered" className="p-4 border-[var(--electric)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--electric)]/10 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-[var(--electric)]" />
              </div>
              <span className="font-medium">
                已选择 <span className="text-[var(--electric)]">{selectedIds.size}</span> 项
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
                取消
              </Button>
            </div>
          </div>
        </BentoCard>
      )}

      {/* Search and Filters */}
      <BentoGrid cols={1} className="gap-4">
        <BentoSearch
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          placeholder="搜索测试用例、套件..."
        />

        {activeTab !== 'ai' && (
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={priorityFilter || 'ALL'}
              onValueChange={handlePriorityFilter}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="优先级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部优先级</SelectItem>
                <SelectItem value="CRITICAL">紧急</SelectItem>
                <SelectItem value="HIGH">高</SelectItem>
                <SelectItem value="MEDIUM">中</SelectItem>
                <SelectItem value="LOW">低</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter || 'ALL'}
              onValueChange={handleStatusFilter}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部状态</SelectItem>
                <SelectItem value="ACTIVE">已激活</SelectItem>
                <SelectItem value="DRAFT">草稿</SelectItem>
                <SelectItem value="DEPRECATED">已弃用</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={`${sortField}:${sortOrder}`}
              onValueChange={handleSort}
            >
              <SelectTrigger className="w-[160px]">
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

            {hasActiveFilters && (
              <Button
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
      </BentoGrid>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v);
        setPage(1);
        clearSelection();
      }}>
        <TabsList className="grid w-full max-w-md grid-cols-3 bg-slate-100 dark:bg-slate-800">
          {tabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="cases" className="mt-6">
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
          <div className="mt-4">
            <Pagination
              currentPage={page}
              totalPages={meta.totalPages}
              totalItems={meta.total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </TabsContent>

        <TabsContent value="suites" className="mt-6">
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
          <div className="mt-4">
            <Pagination
              currentPage={page}
              totalPages={meta.totalPages}
              totalItems={meta.total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
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
            <div className="flex gap-2">
              {IMPORT_FORMATS.map(format => (
                <Badge key={format.ext} variant="secondary">
                  {format.ext}
                </Badge>
              ))}
            </div>
            
            {!importFile ? (
              <div
                className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-[var(--electric)] hover:bg-[var(--electric)]/5 transition-colors"
                onClick={() => importInputRef.current?.click()}
              >
                <input
                  ref={importInputRef}
                  type="file"
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
              onClick={handleImport}
              disabled={!importFile || importing}
              className="bg-[var(--electric)] hover:bg-[var(--electric)]/90"
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
              className="bg-[var(--electric)] hover:bg-[var(--electric)]/90"
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
              className="bg-[var(--electric)] hover:bg-[var(--electric)]/90"
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
    </>
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
        <Loader2 className="w-8 h-8 animate-spin text-[var(--electric)]" />
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
      <BentoCard className="p-12 text-center">
        <Beaker className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p className="text-slate-500">{emptyText}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/tests/new">创建第一个</Link>
        </Button>
      </BentoCard>
    );
  }

  const allSelected = tests.length > 0 && tests.every(t => selectedIds.has(t.id));

  return (
    <BentoCard variant="bordered" className="divide-y divide-slate-100 dark:divide-slate-800">
      {/* 表头 - 全选 */}
      <div className="flex items-center p-3 bg-slate-50/50 dark:bg-slate-800/50">
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
    </BentoCard>
  );
}

// 单个测试项
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
    <div className={`flex items-center p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isSelected ? 'bg-[var(--electric)]/5' : ''}`}>
      <Checkbox 
        checked={isSelected}
        onCheckedChange={onToggleSelection}
        className="mr-3"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/tests/${test.id}`}
            className="font-medium hover:text-[var(--electric)] truncate"
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
    CRITICAL: 'bg-red-100 text-red-700 border-red-200',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
    MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    LOW: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const labels: Record<string, string> = {
    CRITICAL: '紧急',
    HIGH: '高',
    MEDIUM: '中',
    LOW: '低',
  };

  return (
    <Badge className={`${colors[priority] || colors.MEDIUM} border`} variant="outline">
      {labels[priority] || priority}
    </Badge>
  );
}

// 状态标签
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700 border-green-200',
    DRAFT: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    DEPRECATED: 'bg-slate-100 text-slate-700 border-slate-200',
    ARCHIVED: 'bg-red-100 text-red-700 border-red-200',
  };

  const labels: Record<string, string> = {
    ACTIVE: '激活',
    DRAFT: '草稿',
    DEPRECATED: '弃用',
    ARCHIVED: '归档',
  };

  return (
    <Badge className={`${colors[status] || colors.DRAFT} border`} variant="outline">
      {labels[status] || status}
    </Badge>
  );
}

// AI 生成面板 - 引导到AI生成中心
function AIGeneratePanel() {
  return (
    <BentoCard className="p-12 text-center border-dashed">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--electric)] to-[var(--neon)] flex items-center justify-center mx-auto mb-6">
        <Sparkles className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 mb-2">AI 智能生成</h3>
      <p className="text-slate-500 max-w-md mx-auto mb-6">
        使用AI技术快速生成测试需求和测试用例，提升测试效率
      </p>
      <Button 
        className="bg-[var(--electric)] hover:bg-[var(--electric)]/90"
        asChild
      >
        <Link href="/ai-generate">
          前往 AI 生成中心
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </Button>
    </BentoCard>
  );
}
