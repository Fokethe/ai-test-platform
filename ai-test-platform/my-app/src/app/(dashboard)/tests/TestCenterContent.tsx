'use client';

import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import {
  Beaker,
  Download,
  Folder,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BentoCard, BentoHeader, BentoSearch } from '@/components/bento';
import { swrFetcher } from '@/lib/utils/fetcher';
import { safeJsonParse } from '@/lib/utils/json';

type ActiveTab = 'cases' | 'suites' | 'ai';
type TestStatus = 'ACTIVE' | 'DRAFT' | 'DEPRECATED' | 'ARCHIVED';

type TestItem = {
  id: string;
  name: string;
  description?: string | null;
  priority: string;
  status: string;
  tags?: string | null;
  _count?: { executions: number };
};

type PaginationMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function normalizeList<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.list)) return payload.data.list;
  return [];
}

function getErrorMessage(payload: any, fallback: string) {
  return payload?.error?.message || payload?.message || payload?.error || fallback;
}

function getBatchSucceeded(payload: any): number {
  return (
    payload?.data?.summary?.succeeded ??
    payload?.data?.deleted ??
    payload?.data?.updated ??
    payload?.data?.moved ??
    0
  );
}

function getTab(value: string | null): ActiveTab {
  if (value === 'cases' || value === 'suites' || value === 'ai') return value;
  return 'cases';
}

export function TestCenterContent() {
  const params = useSearchParams();
  const [activeTab, setActiveTab] = useState<ActiveTab>(getTab(params.get('tab')));
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const type = activeTab === 'cases' ? 'CASE' : activeTab === 'suites' ? 'SUITE' : '';
  const apiUrl = useMemo(() => {
    const q = new URLSearchParams();
    if (type) q.set('type', type);
    if (search.trim()) q.set('search', search.trim());
    if (priority) q.set('priority', priority);
    if (status) q.set('status', status);
    q.set('page', String(page));
    q.set('pageSize', String(pageSize));
    return `/api/tests?${q.toString()}`;
  }, [type, search, priority, status, page, pageSize]);

  const { data, error, isLoading, mutate } = useSWR(
    activeTab === 'ai' ? null : apiUrl,
    swrFetcher
  );
  const { data: folderPayload } = useSWR(activeTab === 'ai' ? null : '/api/folders', swrFetcher);
  const { data: suitePayload } = useSWR(activeTab === 'ai' ? null : '/api/suites', swrFetcher);
  const folders = normalizeList<{ id: string; name: string }>(folderPayload);
  const suites = normalizeList<{ id: string; name: string }>(suitePayload);

  const list: TestItem[] = Array.isArray(data?.data?.list) ? data.data.list : [];
  const pagination: PaginationMeta = data?.data?.pagination || { total: 0, page: 1, pageSize: 20, totalPages: 0 };
  const allSelected = list.length > 0 && list.every((item) => selectedIds.has(item.id));

  const refreshStable = async () => {
    const next = await mutate();
    const totalPages = (next as any)?.data?.pagination?.totalPages;
    if (typeof totalPages === 'number' && totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(list.map((item) => item.id)));
  };

  const batchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`确认删除 ${selectedIds.size} 项吗？`)) return;
    const response = await fetch('/api/tests/batch', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    const payload = await response.json();
    if (!response.ok || payload?.code !== 0) {
      toast.error(getErrorMessage(payload, '批量删除失败'));
      return;
    }
    toast.success(`批量删除成功，共 ${getBatchSucceeded(payload)} 项`);
    setSelectedIds(new Set());
    await refreshStable();
  };

  const batchStatus = async () => {
    if (selectedIds.size === 0) return;
    const nextStatus = window.prompt('输入目标状态: ACTIVE / DRAFT / DEPRECATED / ARCHIVED', 'ACTIVE');
    if (!nextStatus) return;
    const valid = ['ACTIVE', 'DRAFT', 'DEPRECATED', 'ARCHIVED'];
    if (!valid.includes(nextStatus)) {
      toast.error('状态无效');
      return;
    }
    const response = await fetch('/api/tests/batch', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedIds), status: nextStatus as TestStatus }),
    });
    const payload = await response.json();
    if (!response.ok || payload?.code !== 0) {
      toast.error(getErrorMessage(payload, '批量更新失败'));
      return;
    }
    toast.success(`状态更新成功，共 ${getBatchSucceeded(payload)} 项`);
    setSelectedIds(new Set());
    await refreshStable();
  };

  const batchMove = async () => {
    if (selectedIds.size === 0) return;
    const folderId = window.prompt('输入目标 Folder ID（可留空）', '');
    const suiteId = window.prompt('输入目标 Suite ID（可留空）', '');
    if (!folderId && !suiteId) {
      toast.error('请至少提供一个目标 ID');
      return;
    }
    const response = await fetch('/api/tests/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: Array.from(selectedIds),
        folderId: folderId || undefined,
        suiteId: suiteId || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok || payload?.code !== 0) {
      toast.error(getErrorMessage(payload, '批量移动失败'));
      return;
    }
    toast.success(`移动成功，共 ${getBatchSucceeded(payload)} 项`);
    setSelectedIds(new Set());
    await refreshStable();
  };

  const importFile = async (file: File) => {
    setImporting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch('/api/tests/import', { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(getErrorMessage(payload, '导入失败'));
      }
      toast.success(`导入成功，共 ${payload?.data?.count || 0} 条`);
      await refreshStable();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '导入失败');
    } finally {
      setImporting(false);
    }
  };

  const exportFile = async (format: 'xlsx' | 'csv' | 'json') => {
    const q = new URLSearchParams();
    q.set('format', format);
    if (type) q.set('type', type);
    if (search.trim()) q.set('search', search.trim());
    const response = await fetch(`/api/tests/export?${q.toString()}`);
    if (!response.ok) {
      toast.error(`导出失败 (HTTP ${response.status})`);
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tests-${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('导出成功');
  };

  return (
    <div className="space-y-6">
      <BentoHeader
        title="测试中心"
        description="管理测试用例和套件"
        count={pagination.total}
        countLabel="项"
        actionLabel={activeTab === 'suites' ? '新建套件' : '新建用例'}
        actionHref={`/tests/new?type=${type}`}
        onRefresh={() => mutate()}
        isRefreshing={isLoading}
        secondaryActions={
          activeTab !== 'ai' ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.json,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void importFile(file);
                }}
              />
              <Button variant="outline" size="sm" disabled={importing} onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                {importing ? '导入中...' : '导入'}
              </Button>
              <Select onValueChange={(v) => exportFile(v as 'xlsx' | 'csv' | 'json')}>
                <SelectTrigger className="w-[120px] h-9">
                  <Download className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="导出" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </>
          ) : null
        }
      />

      {selectedIds.size > 0 ? (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={batchStatus}>批量改状态</Button>
          <Button variant="outline" size="sm" onClick={batchMove}>批量移动</Button>
          <Button variant="destructive" size="sm" onClick={batchDelete}>
            <Trash2 className="w-4 h-4 mr-1" />
            批量删除
          </Button>
        </div>
      ) : null}

      <BentoSearch value={search} onChange={setSearch} onSearch={() => { setPage(1); mutate(); }} placeholder="搜索测试项" />

      <div className="flex gap-2 flex-wrap">
        <Select value={priority || 'ALL'} onValueChange={(v) => { setPriority(v === 'ALL' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="优先级" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部优先级</SelectItem>
            <SelectItem value="CRITICAL">CRITICAL</SelectItem>
            <SelectItem value="HIGH">HIGH</SelectItem>
            <SelectItem value="MEDIUM">MEDIUM</SelectItem>
            <SelectItem value="LOW">LOW</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status || 'ALL'} onValueChange={(v) => { setStatus(v === 'ALL' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部状态</SelectItem>
            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
            <SelectItem value="DRAFT">DRAFT</SelectItem>
            <SelectItem value="DEPRECATED">DEPRECATED</SelectItem>
            <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
          </SelectContent>
        </Select>
        {(folders.length > 0 || suites.length > 0) ? (
          <Badge variant="outline">Folders: {folders.length} | Suites: {suites.length}</Badge>
        ) : null}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as ActiveTab); setPage(1); setSelectedIds(new Set()); }}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="cases"><Beaker className="w-4 h-4 mr-2" />用例</TabsTrigger>
          <TabsTrigger value="suites"><Folder className="w-4 h-4 mr-2" />套件</TabsTrigger>
          <TabsTrigger value="ai"><Sparkles className="w-4 h-4 mr-2" />AI</TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="mt-6">
          {isLoading ? <div className="py-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div> : null}
          {error ? <BentoCard className="p-8 text-red-600">加载失败</BentoCard> : null}
          {!isLoading && !error ? (
            <BentoCard variant="bordered" className="divide-y">
              <div className="p-3">
                <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                <span className="ml-2 text-sm">全选当前页</span>
              </div>
              {list.length === 0 ? <div className="p-8 text-center text-slate-500">暂无数据</div> : null}
              {list.map((item) => {
                const tags = safeJsonParse<string[]>(item.tags, []);
                return (
                  <div key={item.id} className="p-4 flex items-start gap-3">
                    <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={(c) => toggleSelect(item.id, Boolean(c))} />
                    <div className="flex-1 min-w-0">
                      <Link href={`/tests/${item.id}`} className="font-medium hover:text-[var(--electric)]">{item.name}</Link>
                      <div className="mt-1 flex gap-2 flex-wrap">
                        <Badge variant="outline">{item.priority}</Badge>
                        <Badge variant="outline">{item.status}</Badge>
                        <Badge variant="secondary">执行 {item._count?.executions || 0}</Badge>
                        {tags.slice(0, 3).map((t) => <Badge key={`${item.id}-${t}`} variant="secondary">{t}</Badge>)}
                      </div>
                      {item.description ? <p className="text-sm text-slate-500 mt-2">{item.description}</p> : null}
                    </div>
                    <Button variant="ghost" size="icon" onClick={async () => {
                      if (!window.confirm('确认删除该测试项吗？')) return;
                      const response = await fetch(`/api/tests/${item.id}`, { method: 'DELETE' });
                      const payload = await response.json();
                      if (!response.ok || payload?.code !== 0) {
                        toast.error(getErrorMessage(payload, '删除失败'));
                        return;
                      }
                      await refreshStable();
                    }}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                );
              })}
            </BentoCard>
          ) : null}
          <div className="mt-4">
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </TabsContent>

        <TabsContent value="suites" className="mt-6">
          {isLoading ? <div className="py-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div> : null}
          {error ? <BentoCard className="p-8 text-red-600">加载失败</BentoCard> : null}
          {!isLoading && !error ? (
            <BentoCard variant="bordered" className="divide-y">
              <div className="p-3">
                <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                <span className="ml-2 text-sm">全选当前页</span>
              </div>
              {list.length === 0 ? <div className="p-8 text-center text-slate-500">暂无套件</div> : null}
              {list.map((item) => {
                const tags = safeJsonParse<string[]>(item.tags, []);
                return (
                  <div key={item.id} className="p-4 flex items-start gap-3">
                    <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={(c) => toggleSelect(item.id, Boolean(c))} />
                    <div className="flex-1 min-w-0">
                      <Link href={`/tests/${item.id}`} className="font-medium hover:text-[var(--electric)]">{item.name}</Link>
                      <div className="mt-1 flex gap-2 flex-wrap">
                        <Badge variant="outline">{item.priority}</Badge>
                        <Badge variant="outline">{item.status}</Badge>
                        <Badge variant="secondary">执行 {item._count?.executions || 0}</Badge>
                        {tags.slice(0, 3).map((t) => <Badge key={`${item.id}-${t}`} variant="secondary">{t}</Badge>)}
                      </div>
                      {item.description ? <p className="text-sm text-slate-500 mt-2">{item.description}</p> : null}
                    </div>
                    <Button variant="ghost" size="icon" onClick={async () => {
                      if (!window.confirm('确认删除该测试项吗？')) return;
                      const response = await fetch(`/api/tests/${item.id}`, { method: 'DELETE' });
                      const payload = await response.json();
                      if (!response.ok || payload?.code !== 0) {
                        toast.error(getErrorMessage(payload, '删除失败'));
                        return;
                      }
                      await refreshStable();
                    }}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                );
              })}
            </BentoCard>
          ) : null}
          <div className="mt-4">
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <BentoCard className="p-12 text-center border-dashed">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--electric)] to-[var(--neon)] flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI 智能生成</h3>
            <p className="text-slate-500 mb-6">前往 AI 生成中心继续完成需求与用例生成。</p>
            <Button asChild>
              <Link href="/ai-generate">
                前往 AI 生成中心
                <Plus className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </BentoCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
