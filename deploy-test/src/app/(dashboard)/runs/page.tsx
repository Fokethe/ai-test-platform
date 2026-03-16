/**
 * RunCenter Page - Bento Grid风格重构版
 * 合并执行历史 + 定时任务
 */

'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import {
  Play,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  RotateCcw,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Pagination } from '@/components/ui/pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { toast } from 'sonner';
import { BentoCard, BentoGrid, BentoItem } from '@/components/bento';
import { BentoHeader } from '@/components/bento';
import { BentoSearch } from '@/components/bento';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Run {
  id: string;
  name: string;
  type: 'MANUAL' | 'SCHEDULED' | 'WEBHOOK' | 'API';
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  totalCount: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  duration?: number;
  cron?: string;
  nextRunAt?: string;
  createdAt: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const swrOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
};

export default function RunCenterPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin h-10 w-10 border-3 border-[var(--electric)]/20 border-t-[var(--electric)] rounded-full" /></div>}>
      <RunsContent />
    </Suspense>
  );
}

function RunsContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'history';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: runsData, isLoading: runsLoading } = useSWR(
    activeTab === 'history' ? `/api/runs?page=${page}&pageSize=${pageSize}${searchQuery ? `&search=${searchQuery}` : ''}` : null,
    fetcher,
    { ...swrOptions, refreshInterval: 10000 }
  );

  const { data: scheduledData, isLoading: scheduledLoading } = useSWR(
    activeTab === 'scheduled' ? `/api/runs?type=SCHEDULED&page=${page}&pageSize=${pageSize}` : null,
    fetcher,
    swrOptions
  );

  const runs: Run[] = Array.isArray(runsData?.data) ? runsData.data : [];
  const scheduled: Run[] = Array.isArray(scheduledData?.data) ? scheduledData.data : [];
  const runsMeta: PaginationMeta = runsData?.meta || { total: 0, page: 1, pageSize: 20, totalPages: 0 };
  const scheduledMeta: PaginationMeta = scheduledData?.meta || { total: 0, page: 1, pageSize: 20, totalPages: 0 };

  const stats = {
    today: runs.filter(r => new Date(r.createdAt).toDateString() === new Date().toDateString()).length,
    successRate: runs.length > 0 
      ? Math.round(runs.reduce((acc, r) => acc + (r.passedCount || 0), 0) / 
          runs.reduce((acc, r) => acc + (r.totalCount || 0), 0) * 100) || 0
      : 0,
    avgDuration: runs.length > 0
      ? Math.round(runs.reduce((acc, r) => acc + (r.duration || 0), 0) / runs.length / 1000)
      : 0,
    scheduled: scheduled.length,
  };

  const handleSearch = () => {
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <BentoHeader
        title="执行中心"
        description="管理测试执行和定时任务"
        count={activeTab === 'history' ? runsMeta.total : scheduledMeta.total}
        countLabel="个"
        actionLabel="立即执行"
        actionHref="/runs/new"
      />

      {/* Stats Grid */}
      <BentoGrid cols={4}>
        <StatCard label="今日执行" value={stats.today.toString()} trend={`+${Math.max(1, Math.floor(stats.today/2))}`} />
        <StatCard label="成功率" value={`${stats.successRate}%`} trend={stats.successRate > 80 ? '+2%' : '-3%'} />
        <StatCard label="平均耗时" value={`${stats.avgDuration}s`} trend="-5s" />
        <StatCard label="定时任务" value={stats.scheduled.toString()} />
      </BentoGrid>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v);
        setPage(1);
      }}>
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="history" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <Play className="w-4 h-4 mr-2" />
            执行历史
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <Calendar className="w-4 h-4 mr-2" />
            定时任务
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-6 space-y-4">
          <BentoSearch
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
            placeholder="搜索执行记录..."
          />

          <RunHistoryPanel runs={runs} isLoading={runsLoading} />
          
          <Pagination
            currentPage={page}
            totalPages={runsMeta.totalPages}
            totalItems={runsMeta.total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </TabsContent>

        <TabsContent value="scheduled" className="mt-6">
          <ScheduledTasksPanel runs={scheduled} isLoading={scheduledLoading} />
          <div className="mt-4">
            <Pagination
              currentPage={page}
              totalPages={scheduledMeta.totalPages}
              totalItems={scheduledMeta.total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, trend }: { label: string; value: string; trend?: string }) {
  const isPositive = trend?.startsWith('+');
  
  return (
    <BentoCard variant="bordered" className="p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-2xl font-bold">{value}</span>
        {trend && (
          <Badge variant={isPositive ? 'default' : 'secondary'} className="text-xs">
            {trend}
          </Badge>
        )}
      </div>
    </BentoCard>
  );
}

function RunHistoryPanel({ runs, isLoading }: { runs: Run[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-10 w-10 border-3 border-[var(--electric)]/20 border-t-[var(--electric)] rounded-full" />
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <BentoCard className="p-12 text-center">
        <Play className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p className="text-slate-500">暂无执行记录</p>
        <Button className="mt-4 bg-[var(--electric)] hover:bg-[var(--electric)]/90" asChild>
          <Link href="/runs/new">开始第一次执行</Link>
        </Button>
      </BentoCard>
    );
  }

  return (
    <BentoGrid cols={1} className="gap-3">
      {runs.map((run) => (
        <RunItem key={run.id} run={run} />
      ))}
    </BentoGrid>
  );
}

function RunItem({ run }: { run: Run }) {
  const passRate = run.totalCount > 0 ? Math.round((run.passedCount / run.totalCount) * 100) : 0;
  
  const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    COMPLETED: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: '完成' },
    FAILED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: '失败' },
    RUNNING: { icon: Play, color: 'text-[var(--electric)]', bg: 'bg-[var(--electric)]/10', label: '运行中' },
    PENDING: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: '等待中' },
    CANCELLED: { icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-50', label: '已取消' },
  };

  const config = statusConfig[run.status] || statusConfig.PENDING;
  const Icon = config.icon;

  const handleRerun = async () => {
    try {
      const res = await fetch(`/api/runs/${run.id}/rerun`, { method: 'POST' });
      if (res.ok) {
        toast.success('重新执行已启动');
      } else {
        toast.error('启动失败');
      }
    } catch {
      toast.error('启动失败');
    }
  };

  const handleCancel = async () => {
    try {
      const res = await fetch(`/api/runs/${run.id}`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' })
      });
      if (res.ok) {
        toast.success('执行已取消');
      } else {
        toast.error('取消失败');
      }
    } catch {
      toast.error('取消失败');
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除此执行记录吗？')) return;
    try {
      const res = await fetch(`/api/runs/${run.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('执行记录已删除');
      } else {
        toast.error('删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  return (
    <BentoCard variant="bordered" className="p-4 hover:border-[var(--electric)] transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`p-1.5 rounded-lg ${config.bg}`}>
              <Icon className={`w-4 h-4 ${config.color}`} />
            </div>
            <Link href={`/runs/${run.id}`} className="font-medium hover:text-[var(--electric)]">
              {run.name}
            </Link>
            <Badge variant="outline" className="text-xs">{config.label}</Badge>
            <Badge variant="secondary" className="text-xs">{run.type}</Badge>
          </div>
          
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>总计: {run.totalCount}</span>
              <span className="text-green-600">通过: {run.passedCount}</span>
              <span className="text-red-600">失败: {run.failedCount}</span>
              {run.skippedCount > 0 && <span>跳过: {run.skippedCount}</span>}
            </div>
            
            <div className="flex items-center gap-2">
              <Progress value={passRate} className="h-2 w-32" />
              <span className="text-sm text-slate-500">{passRate}%</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-right mr-4">
            <p className="text-sm text-slate-500">{new Date(run.createdAt).toLocaleString()}</p>
            {run.duration && (
              <p className="text-xs text-slate-400 mt-1">耗时: {Math.round(run.duration / 1000)}s</p>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleRerun}>
                <RotateCcw className="w-4 h-4 mr-2" />
                重新执行
              </DropdownMenuItem>
              {(run.status === 'PENDING' || run.status === 'RUNNING') && (
                <DropdownMenuItem onClick={handleCancel}>
                  <XCircle className="w-4 h-4 mr-2" />
                  取消执行
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                删除记录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </BentoCard>
  );
}

function ScheduledTasksPanel({ runs, isLoading }: { runs: Run[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-10 w-10 border-3 border-[var(--electric)]/20 border-t-[var(--electric)] rounded-full" />
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <BentoCard className="p-12 text-center">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p className="text-slate-500">暂无定时任务</p>
        <Button className="mt-4 bg-[var(--electric)] hover:bg-[var(--electric)]/90" asChild>
          <Link href="/runs/scheduled/new">创建定时任务</Link>
        </Button>
      </BentoCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">定时任务</h2>
        <Button variant="outline" size="sm" asChild>
          <Link href="/runs/scheduled/new">
            <Clock className="w-4 h-4 mr-2" />
            新建任务
          </Link>
        </Button>
      </div>

      <BentoGrid cols={3}>
        {runs.map((run) => (
          <ScheduledTaskCard key={run.id} run={run} />
        ))}
      </BentoGrid>
    </div>
  );
}

function ScheduledTaskCard({ run }: { run: Run }) {
  return (
    <BentoCard variant="bordered" className="p-4 hover:border-[var(--electric)] transition-colors">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-medium line-clamp-1">{run.name}</h3>
        <Badge variant={run.status === 'COMPLETED' ? 'default' : 'secondary'}>
          {run.status === 'COMPLETED' ? '活跃' : '暂停'}
        </Badge>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center text-slate-500">
          <Clock className="w-4 h-4 mr-2" />
          <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">{run.cron || '0 9 * * *'}</code>
        </div>
        
        {run.nextRunAt && (
          <p className="text-slate-500">下次执行: {new Date(run.nextRunAt).toLocaleString()}</p>
        )}
        
        <div className="pt-2 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            编辑
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            立即执行
          </Button>
        </div>
      </div>
    </BentoCard>
  );
}
