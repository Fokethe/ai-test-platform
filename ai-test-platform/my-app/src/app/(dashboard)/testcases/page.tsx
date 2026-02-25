'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Play, Edit, Trash2, Upload, Download, FileJson, FileSpreadsheet, ChevronLeft, ChevronRight, X, Loader2, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/empty-state';
import { useTestCases, useWorkspaces, globalMutate } from '@/lib/hooks/use-api';
import { ListSkeleton } from '@/components/ui/skeleton-list';
import { PrefetchLink } from '@/components/ui/prefetch-link';

interface TestCase {
  id: string;
  title: string;
  priority: string;
  status: string;
  isAiGenerated: boolean;
  page: {
    name: string;
    system: {
      name: string;
    };
  } | null;
}

interface ExecutionState {
  testCaseId: string;
  executionId: string;
  status: 'RUNNING' | 'CANCELLING';
  startTime: number;
}

const PAGE_SIZE = 5;

export default function TestCasesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [runningId, setRunningId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [executions, setExecutions] = useState<ExecutionState[]>([]);
  
  // 批量操作状态
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchExecuting, setBatchExecuting] = useState(false);
  
  // 导入对话框层级选择状态
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedSystem, setSelectedSystem] = useState('');
  const [selectedPageId, setSelectedPageId] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [systems, setSystems] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);

  const { data: testCasesData, isLoading: testCasesLoading, error: testCasesError } = useTestCases();
  const { data: workspacesData } = useWorkspaces();

  const testCases = testCasesData?.list || [];
  const workspaces = workspacesData?.list || [];

  // 获取工作空间的项目
  useEffect(() => {
    if (selectedWorkspace) {
      fetch(`/api/workspaces/${selectedWorkspace}/projects`)
        .then(res => res.json())
        .then(data => {
          if (data.code === 0) {
            setProjects(data.data.list || []);
          }
        });
      setSelectedProject('');
      setSelectedSystem('');
      setSelectedPageId('');
      setSystems([]);
      setPages([]);
    }
  }, [selectedWorkspace]);

  // 获取项目的系统
  useEffect(() => {
    if (selectedProject) {
      fetch(`/api/projects/${selectedProject}/systems`)
        .then(res => res.json())
        .then(data => {
          if (data.code === 0) {
            setSystems(data.data.list || []);
          }
        });
      setSelectedSystem('');
      setSelectedPageId('');
      setPages([]);
    }
  }, [selectedProject]);

  // 获取系统的页面
  useEffect(() => {
    if (selectedSystem) {
      fetch(`/api/systems/${selectedSystem}/pages`)
        .then(res => res.json())
        .then(data => {
          if (data.code === 0) {
            setPages(data.data.list || []);
          }
        });
      setSelectedPageId('');
    }
  }, [selectedSystem]);

  useEffect(() => {
    if (testCasesError) {
      toast.error('获取测试用例失败');
    }
  }, [testCasesError]);

  const handleRun = async (testCaseId: string) => {
    setRunningId(testCaseId);
    try {
      const response = await fetch('/api/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCaseId,
          config: { browser: 'chromium', headless: true },
        }),
      });

      const data = await response.json();
      if (data.code === 0) {
        toast.success('测试已开始执行');
        setExecutions(prev => [...prev, {
          testCaseId,
          executionId: data.data.executionId,
          status: 'RUNNING',
          startTime: Date.now(),
        }]);
      } else {
        toast.error(data.message || '执行失败');
      }
    } catch (error) {
      toast.error('执行失败，请稍后重试');
    } finally {
      setRunningId(null);
    }
  };

  const handleCancelExecution = async (executionId: string) => {
    console.log('[TestCases] 开始取消执行:', executionId);
    try {
      setExecutions(prev => prev.map(e => 
        e.executionId === executionId ? { ...e, status: 'CANCELLING' } : e
      ));
      
      const res = await fetch(`/api/executions/${executionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'FAILED', 
          errorMessage: '用户取消执行',
          completedAt: new Date().toISOString(),
        }),
      });

      console.log('[TestCases] 取消执行API响应状态:', res.status);
      
      const data = await res.json();
      console.log('[TestCases] 取消执行API响应数据:', data);
      
      if (res.ok && data.code === 0) {
        toast.success('已取消执行');
        setExecutions(prev => prev.filter(e => e.executionId !== executionId));
        // 刷新测试用例列表状态
        await globalMutate('/api/testcases');
      } else {
        const errorMsg = data.message || '取消执行失败';
        console.error('[TestCases] 取消执行失败:', errorMsg);
        toast.error(errorMsg);
        setExecutions(prev => prev.map(e => 
          e.executionId === executionId ? { ...e, status: 'RUNNING' } : e
        ));
      }
    } catch (error) {
      console.error('[TestCases] 取消执行异常:', error);
      toast.error('取消执行失败，请检查网络连接');
      setExecutions(prev => prev.map(e => 
        e.executionId === executionId ? { ...e, status: 'RUNNING' } : e
      ));
    }
  };

  const handleImport = async () => {
    try {
      let testCases;
      try {
        testCases = JSON.parse(importData);
        if (!Array.isArray(testCases)) testCases = [testCases];
      } catch (e) {
        toast.error('JSON 格式错误，请检查输入');
        return;
      }

      if (!selectedPageId) {
        toast.error('请选择所属页面');
        return;
      }

      const res = await fetch('/api/testcases/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: selectedPageId, testCases }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setImportOpen(false);
        setImportData('');
        setSelectedWorkspace('');
        setSelectedProject('');
        setSelectedSystem('');
        setSelectedPageId('');
        setProjects([]);
        setSystems([]);
        setPages([]);
        await globalMutate('/api/testcases');
      } else {
        toast.error(data.error || '导入失败');
      }
    } catch (error) {
      toast.error('导入失败');
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const res = await fetch(`/api/testcases/export?format=${format}`);
      if (!res.ok) throw new Error('导出失败');

      if (format === 'csv') {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `testcases_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `testcases_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
      toast.success('导出成功');
    } catch (error) {
      toast.error('导出失败');
    }
  };

  // 批量操作函数
  const handleBatchSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedTestCases.map(tc => tc.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBatchDelete = async () => {
    try {
      const res = await fetch('/api/testcases/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids: selectedIds }),
      });
      const data = await res.json();
      if (data.code === 0) {
        toast.success(data.message);
        setSelectedIds([]);
        setBatchDeleteOpen(false);
        await globalMutate('/api/testcases');
      } else {
        toast.error(data.message || '批量删除失败');
      }
    } catch (error) {
      toast.error('批量删除失败');
    }
  };

  const handleBatchExecute = async () => {
    try {
      setBatchExecuting(true);
      const res = await fetch('/api/testcases/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute', ids: selectedIds }),
      });
      const data = await res.json();
      if (data.code === 0) {
        toast.success(data.message);
        setSelectedIds([]);
        await globalMutate('/api/testcases');
      } else {
        toast.error(data.message || '批量执行失败');
      }
    } catch (error) {
      toast.error('批量执行失败');
    } finally {
      setBatchExecuting(false);
    }
  };

  const handleBatchUpdatePriority = async (priority: string) => {
    try {
      const res = await fetch('/api/testcases/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', ids: selectedIds, data: { priority } }),
      });
      const data = await res.json();
      if (data.code === 0) {
        toast.success(data.message);
        setSelectedIds([]);
        await globalMutate('/api/testcases');
      } else {
        toast.error(data.message || '批量更新失败');
      }
    } catch (error) {
      toast.error('批量更新失败');
    }
  };

  const handleBatchExportSelected = async (format: 'json' | 'csv') => {
    try {
      const res = await fetch('/api/testcases/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export', ids: selectedIds, format }),
      });
      
      if (format === 'csv') {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `testcases_batch_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success('导出成功');
        setSelectedIds([]);
      } else {
        const data = await res.json();
        if (data.code === 0) {
          const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `testcases_batch_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
          toast.success('导出成功');
          setSelectedIds([]);
        } else {
          toast.error(data.message || '导出失败');
        }
      }
    } catch (error) {
      toast.error('导出失败');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P0': return 'bg-red-100 text-red-700';
      case 'P1': return 'bg-orange-100 text-orange-700';
      case 'P2': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const filteredTestCases = testCases.filter((tc: TestCase) =>
    tc.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTestCases.length / PAGE_SIZE);
  const paginatedTestCases = filteredTestCases.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const isLoading = testCasesLoading;
  const getExecutionForTestCase = (testCaseId: string) => executions.find(e => e.testCaseId === testCaseId);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">用例库</h1>
            <p className="text-slate-600 mt-1">管理您的测试用例</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog 
              open={importOpen} 
              onOpenChange={(open) => {
                setImportOpen(open);
                if (!open) {
                  // 关闭时重置状态
                  setSelectedWorkspace('');
                  setSelectedProject('');
                  setSelectedSystem('');
                  setSelectedPageId('');
                  setImportData('');
                  setProjects([]);
                  setSystems([]);
                  setPages([]);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="sm:size-default">
                  <Upload className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">导入</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>导入测试用例</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* 层级选择 */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium block">选择目标页面</label>
                    
                    {/* 工作空间 */}
                    <select
                      className="w-full p-2 border rounded-md text-sm"
                      value={selectedWorkspace}
                      onChange={(e) => setSelectedWorkspace(e.target.value)}
                    >
                      <option value="">选择工作空间...</option>
                      {workspaces.map((ws: any) => (
                        <option key={ws.id} value={ws.id}>{ws.name}</option>
                      ))}
                    </select>

                    {/* 项目 */}
                    {selectedWorkspace && (
                      <select
                        className="w-full p-2 border rounded-md text-sm"
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                      >
                        <option value="">选择项目...</option>
                        {projects.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    )}

                    {/* 系统 */}
                    {selectedProject && (
                      <select
                        className="w-full p-2 border rounded-md text-sm"
                        value={selectedSystem}
                        onChange={(e) => setSelectedSystem(e.target.value)}
                      >
                        <option value="">选择系统...</option>
                        {systems.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    )}

                    {/* 页面 */}
                    {selectedSystem && (
                      <select
                        className="w-full p-2 border rounded-md text-sm"
                        value={selectedPageId}
                        onChange={(e) => setSelectedPageId(e.target.value)}
                      >
                        <option value="">选择页面...</option>
                        {pages.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium block">测试用例 JSON</label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('json-file-input')?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />选择文件
                      </Button>
                    </div>
                    <input
                      type="file"
                      accept=".json"
                      id="json-file-input"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => setImportData(event.target?.result as string);
                          reader.readAsText(file);
                        }
                      }}
                    />
                    <Textarea
                      value={importData}
                      onChange={(e) => setImportData(e.target.value)}
                      placeholder={`[{ "title": "标题", "preCondition": "前置", "steps": ["步骤1"], "expectation": "预期", "priority": "P1" }]`}
                      className="min-h-[200px] max-h-[400px] overflow-y-auto font-mono text-sm"
                    />
                  </div>
                  <Button onClick={handleImport} className="w-full">导入</Button>
                </div>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="sm:size-default">
                  <Download className="mr-2 h-4 w-4" />导出
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  <FileJson className="mr-2 h-4 w-4" />导出为 JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />导出为 CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button asChild size="sm" className="sm:size-default">
              <PrefetchLink href="/testcases/new">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">新建用例</span>
              </PrefetchLink>
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="搜索测试用例..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Running Executions */}
        {executions.length > 0 && (
          <div className="space-y-2 mb-4">
            {executions.map((exec) => {
              const testCase = testCases.find(tc => tc.id === exec.testCaseId);
              const duration = Math.floor((Date.now() - exec.startTime) / 1000);
              return (
                <Card key={exec.executionId} className="bg-blue-50 border-blue-200">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                        <div>
                          <p className="font-medium text-sm">{testCase?.title}</p>
                          <p className="text-xs text-slate-500">
                            {exec.status === 'CANCELLING' ? '正在取消...' : `执行中... (${duration}秒)`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleCancelExecution(exec.executionId)}
                        disabled={exec.status === 'CANCELLING'}
                      >
                        <X className="h-4 w-4 mr-1" />取消
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <ListSkeleton count={5} />
        ) : filteredTestCases.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? '未找到匹配的测试用例' : '还没有测试用例'}
              </h3>
              <Button asChild>
                <PrefetchLink href="/testcases/new">
                  <Plus className="mr-2 h-4 w-4" />新建用例
                </PrefetchLink>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 批量操作工具栏 */}
            {selectedIds.length > 0 && (
              <Card className="bg-blue-50/50 border-blue-200">
                <CardContent className="py-3 px-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-900">
                        已选择 {selectedIds.length} 项
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* 批量执行 */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBatchExecute}
                        disabled={batchExecuting}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        执行
                      </Button>
                      
                      {/* 批量更新优先级 */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            优先级
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleBatchUpdatePriority('P0')}>
                            <Badge className="bg-red-100 text-red-700 mr-2">P0</Badge> 紧急
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBatchUpdatePriority('P1')}>
                            <Badge className="bg-orange-100 text-orange-700 mr-2">P1</Badge> 高
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBatchUpdatePriority('P2')}>
                            <Badge className="bg-blue-100 text-blue-700 mr-2">P2</Badge> 中
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBatchUpdatePriority('P3')}>
                            <Badge className="bg-slate-100 text-slate-600 mr-2">P3</Badge> 低
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* 批量导出选中项 */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-1" />
                            导出选中
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleBatchExportSelected('json')}>
                            <FileJson className="mr-2 h-4 w-4" />导出为 JSON
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBatchExportSelected('csv')}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" />导出为 CSV
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBatchDeleteOpen(true)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        删除
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedIds([])}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 表头 - 全选 */}
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg">
              <button
                onClick={() => handleSelectAll(selectedIds.length !== paginatedTestCases.length)}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
              >
                {selectedIds.length === paginatedTestCases.length ? (
                  <CheckSquare className="h-5 w-5 text-blue-600" />
                ) : (
                  <Square className="h-5 w-5" />
                )}
                <span className="text-sm">
                  {selectedIds.length === paginatedTestCases.length ? '取消全选' : '全选'}
                </span>
              </button>
            </div>

            <div className="space-y-4">
              {paginatedTestCases.map((testCase: TestCase) => {
                const execution = getExecutionForTestCase(testCase.id);
                return (
                  <TestCaseItem 
                    key={testCase.id} 
                    testCase={testCase} 
                    execution={execution}
                    onRun={handleRun}
                    onCancelExecution={handleCancelExecution}
                    runningId={runningId}
                    selected={selectedIds.includes(testCase.id)}
                    onSelect={(checked) => handleBatchSelect(testCase.id, checked)}
                  />
                );
              })}
            </div>

            {/* Pagination - Only at bottom */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <p className="text-sm text-slate-600">
                  共 {filteredTestCases.length} 条用例，第 {currentPage} / {totalPages} 页
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />上一页
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm" className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    下一页<ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* 批量删除确认对话框 */}
        <Dialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认批量删除</DialogTitle>
              <DialogDescription>
                您确定要删除选中的 <strong>{selectedIds.length}</strong> 个测试用例吗？
                <br />
                此操作不可撤销，所有执行记录也将被删除。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBatchDeleteOpen(false)}>
                取消
              </Button>
              <Button variant="destructive" onClick={handleBatchDelete}>
                确认删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// 测试用例列表项组件
function TestCaseItem({ 
  testCase, 
  execution, 
  onRun, 
  onCancelExecution,
  runningId,
  selected,
  onSelect,
}: { 
  testCase: TestCase; 
  execution?: ExecutionState;
  onRun: (id: string) => void;
  onCancelExecution: (id: string) => void;
  runningId: string | null;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P0': return 'bg-red-100 text-red-700';
      case 'P1': return 'bg-orange-100 text-orange-700';
      case 'P2': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const handleDelete = async () => {
    setDeleting(true);

    try {
      const response = await fetch(`/api/testcases/${testCase.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.code === 0) {
        toast.success('测试用例已删除');
        setDeleteDialogOpen(false);
        globalMutate('/api/testcases');
      } else {
        toast.error(data.message || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card className={`hover:shadow-md transition-shadow ${execution ? 'border-blue-300' : ''} ${selected ? 'ring-2 ring-blue-500' : ''}`}>
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* 复选框 */}
            {onSelect && (
              <button
                onClick={() => onSelect(!selected)}
                className="flex-shrink-0 text-slate-400 hover:text-blue-600 transition-colors"
              >
                {selected ? (
                  <CheckSquare className="h-5 w-5 text-blue-600" />
                ) : (
                  <Square className="h-5 w-5" />
                )}
              </button>
            )}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <PrefetchLink 
                href={`/testcases/${testCase.id}`}
                className="font-semibold truncate hover:text-blue-600 transition-colors max-w-[300px] sm:max-w-[400px] block"
                title={testCase.title}
              >
                {testCase.title}
              </PrefetchLink>
              {testCase.isAiGenerated && <Badge variant="secondary" className="text-xs shrink-0">AI生成</Badge>}
              {execution && <Badge className="bg-blue-100 text-blue-700 text-xs shrink-0">执行中</Badge>}
            </div>
            <p className="text-sm text-slate-600 truncate max-w-[300px] sm:max-w-[400px]">
              {testCase.page?.system?.name || '未知系统'} / {testCase.page?.name || '未知页面'}
            </p>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-4">
            <Badge className={getPriorityColor(testCase.priority)}>{testCase.priority}</Badge>
            <div className="flex gap-1 sm:gap-2">
              {execution ? (
                <Button 
                  variant="ghost" size="icon" className="h-9 w-9 text-red-600"
                  onClick={() => onCancelExecution(execution.executionId)}
                  disabled={execution.status === 'CANCELLING'}
                >
                  {execution.status === 'CANCELLING' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                </Button>
              ) : (
                <Button 
                  variant="ghost" size="icon" className="h-9 w-9"
                  onClick={() => onRun(testCase.id)}
                  disabled={runningId === testCase.id}
                >
                  {runningId === testCase.id ? <span className="animate-spin">⏳</span> : <Play className="h-4 w-4" />}
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                <PrefetchLink href={`/testcases/${testCase.id}/edit`}><Edit className="h-4 w-4" /></PrefetchLink>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              您确定要删除测试用例 <strong>{testCase.title}</strong> 吗？
              <br />
              此操作不可撤销，该测试用例的所有执行记录也将被删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
