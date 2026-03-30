'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import {
  ArrowRight,
  Beaker,
  Download,
  FileText,
  Folder,
  Loader2,
  ListChecks,
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

type RequirementSummary = {
  id: string;
  title: string;
  testPointCount: number;
  isConfirmed: boolean;
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
  const router = useRouter();
  const pathname = usePathname();
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

  useEffect(() => {
    const nextTab = getTab(params.get('tab'));
    setActiveTab((current) => (current === nextTab ? current : nextTab));
  }, [params]);

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
  const { data: aiRequirementPayload, mutate: mutateAiRequirements } = useSWR(
    activeTab === 'ai' ? '/api/requirements?page=1&pageSize=4' : null,
    swrFetcher
  );
  const { data: aiCasePayload, mutate: mutateAiCases } = useSWR(
    activeTab === 'ai' ? '/api/tests?type=CASE&source=AI&page=1&pageSize=4' : null,
    swrFetcher
  );
  const folders = normalizeList<{ id: string; name: string }>(folderPayload);
  const suites = normalizeList<{ id: string; name: string }>(suitePayload);
  const aiRequirements = normalizeList<RequirementSummary>(aiRequirementPayload);
  const aiCases = normalizeList<TestItem>(aiCasePayload);
  const aiRequirementTotal = aiRequirementPayload?.data?.pagination?.total ?? aiRequirements.length;
  const aiCaseTotal = aiCasePayload?.data?.pagination?.total ?? aiCases.length;
  const aiTestPointTotal = aiRequirements.reduce((sum, item) => sum + (item.testPointCount || 0), 0);

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

  const refreshAiStable = async () => {
    await Promise.all([mutateAiRequirements(), mutateAiCases()]);
  };

  const handleTabChange = (value: string) => {
    const nextTab = value as ActiveTab;
    setActiveTab(nextTab);
    setPage(1);
    setSelectedIds(new Set());

    const nextParams = new URLSearchParams(params.toString());
    if (nextTab === 'cases') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', nextTab);
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
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
        description={activeTab === 'ai' ? '直接进入 AI 生成工作台，少跳页完成需求到用例的闭环' : '管理测试用例和套件'}
        count={activeTab === 'ai' ? aiCaseTotal : pagination.total}
        countLabel={activeTab === 'ai' ? '个 AI 用例' : '项'}
        actionLabel={activeTab === 'ai' ? '直接生成用例' : activeTab === 'suites' ? '新建套件' : '新建用例'}
        actionHref={activeTab === 'ai' ? '/ai-generate/testcases' : `/tests/new?type=${type}`}
        onRefresh={activeTab === 'ai' ? () => void refreshAiStable() : () => mutate()}
        isRefreshing={activeTab === 'ai' ? false : isLoading}
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

      {activeTab !== 'ai' && selectedIds.size > 0 ? (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={batchStatus}>批量改状态</Button>
          <Button variant="outline" size="sm" onClick={batchMove}>批量移动</Button>
          <Button variant="destructive" size="sm" onClick={batchDelete}>
            <Trash2 className="w-4 h-4 mr-1" />
            批量删除
          </Button>
        </div>
      ) : null}

      {activeTab !== 'ai' ? (
        <BentoSearch value={search} onChange={setSearch} onSearch={() => { setPage(1); mutate(); }} placeholder="搜索测试项" />
      ) : null}

      {activeTab !== 'ai' ? (
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
      ) : null}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
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
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr),minmax(280px,0.8fr)]">
              <BentoCard
                variant="featured"
                className="overflow-hidden border-blue-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_44%),linear-gradient(135deg,rgba(239,246,255,0.96),rgba(255,255,255,0.98))] p-8"
              >
                <div className="space-y-5">
                  <Badge className="w-fit bg-white/80 text-blue-700 hover:bg-white/80">少跳页工作流</Badge>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold tracking-tight text-slate-950">AI 智能生成</h3>
                    <p className="max-w-2xl text-sm leading-7 text-slate-600">
                      从测试中心直接进入生成工作台，不再先去需求详情页兜一圈。常用路径压成了“选需求、勾测试点、生成并保存”。
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <BentoCard className="p-5">
                      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-800">
                        <Sparkles className="h-4 w-4 text-[var(--electric)]" />
                        直接生成用例
                      </div>
                      <p className="text-sm leading-6 text-slate-500">
                        在同一页完成需求选择、测试点勾选、结果筛选与保存。
                      </p>
                      <Button className="mt-4" asChild>
                        <Link href="/ai-generate/testcases">
                          打开生成工作台
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </BentoCard>

                    <BentoCard className="p-5">
                      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-800">
                        <FileText className="h-4 w-4 text-emerald-600" />
                        管理需求输入
                      </div>
                      <p className="text-sm leading-6 text-slate-500">
                        上传新需求、整理已有需求，或者补测试点之后再进入生成页。
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="outline" asChild>
                          <Link href="/ai-generate/requirements">需求列表</Link>
                        </Button>
                        <Button variant="outline" asChild>
                          <Link href="/ai-generate/requirements/upload">上传需求</Link>
                        </Button>
                      </div>
                    </BentoCard>
                  </div>
                </div>
              </BentoCard>

              <BentoCard className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-[var(--electric)]" />
                  <span className="text-sm font-medium text-slate-700">AI 资产概览</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs text-slate-500">需求数</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{aiRequirementTotal}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs text-slate-500">测试点</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{aiTestPointTotal}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs text-slate-500">AI 用例</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{aiCaseTotal}</p>
                  </div>
                </div>
              </BentoCard>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <BentoCard className="p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-slate-900">最近需求</h4>
                    <p className="mt-1 text-sm text-slate-500">直接从这里继续进入生成，而不是先翻详情页。</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/ai-generate/requirements">全部需求</Link>
                  </Button>
                </div>
                <div className="space-y-3">
                  {aiRequirements.length > 0 ? (
                    aiRequirements.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/ai-generate/requirements/${item.id}`} className="font-medium text-slate-900 hover:text-[var(--electric)]">
                            {item.title}
                          </Link>
                          <Badge variant="outline">{item.testPointCount} 个测试点</Badge>
                          {item.isConfirmed ? <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">已确认</Badge> : <Badge variant="secondary">待确认</Badge>}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" asChild>
                            <Link href={`/ai-generate/testcases?requirementId=${item.id}`}>
                              直接生成
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/ai-generate/requirements/${item.id}`}>查看详情</Link>
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center text-sm text-slate-500">
                      还没有需求记录，先上传一个需求文档即可开始。
                    </div>
                  )}
                </div>
              </BentoCard>

              <BentoCard className="p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-slate-900">最近 AI 用例</h4>
                    <p className="mt-1 text-sm text-slate-500">生成完成后回到测试中心，这里就能继续批量管理。</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/tests">查看全部</Link>
                  </Button>
                </div>
                <div className="space-y-3">
                  {aiCases.length > 0 ? (
                    aiCases.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/tests/${item.id}`} className="font-medium text-slate-900 hover:text-[var(--electric)]">
                            {item.name}
                          </Link>
                          <Badge variant="outline">{item.priority}</Badge>
                          <Badge variant="secondary">执行 {item._count?.executions || 0}</Badge>
                        </div>
                        {item.description ? <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p> : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center text-sm text-slate-500">
                      还没有 AI 保存的用例，去生成工作台跑一轮后这里会出现最新记录。
                    </div>
                  )}
                </div>
              </BentoCard>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
