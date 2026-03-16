/**
 * Run Detail Page - 执行详情 (Bento风格)
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Play,
  ArrowLeft,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Calendar,
  BarChart3,
  Bug,
  Beaker,
  RotateCcw,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { BentoCard, BentoGrid } from '@/components/bento';
import { Skeleton } from '@/components/ui/skeleton';

import { swrFetcher as fetcher } from '@/lib/utils/fetcher';

interface Execution {
  id: string;
  status: string;
  test: { id: string; name: string; type: string };
  logs?: string;
  screenshot?: string;
  duration?: number;
  createdAt: string;
}

interface RunDetail {
  id: string;
  name: string;
  type: 'MANUAL' | 'SCHEDULED' | 'WEBHOOK' | 'API';
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  project: { id: string; name: string };
  cron?: string;
  duration?: number;
  createdAt: string;
  completedAt?: string;
  executions: Execution[];
  issues: { id: string; title: string; severity: string; status: string }[];
  stats: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    running: number;
    pending: number;
  };
  passRate: number;
}

export default function RunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/runs/${id}` : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  const run: RunDetail = data?.data;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/runs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/runs');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/runs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (res.ok) {
        mutate();
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRerun = async () => {
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: `${run.name} (重跑)`,
          projectId: run.project.id,
          testIds: run.executions.map((e) => e.test.id)
        }),
      });
      if (res.ok) {
        const result = await res.json();
        router.push(`/runs/${result.data.id}`);
      }
    } catch (error) {
      console.error('Rerun error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="p-6">
        <BentoCard className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 text-lg">加载失败</p>
          <Button variant="outline" className="mt-4" onClick={() => mutate()}>
            重试
          </Button>
        </BentoCard>
      </div>
    );
  }

  const isRunning = run.status === 'RUNNING' || run.status === 'PENDING';

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/runs">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{run.name}</h1>
              <TypeBadge type={run.type} />
              <StatusBadge status={run.status} />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {run.project?.name} · 创建于 {new Date(run.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isRunning && (
            <Button variant="outline" asChild data-testid="view-report-button">
              <Link href={`/runs/${id}/report`}>
                <FileText className="w-4 h-4 mr-2" />
                查看报告
              </Link>
            </Button>
          )}
          {isRunning ? (
            <Button variant="outline" onClick={handleCancel} disabled={isCancelling}>
              <XCircle className="w-4 h-4 mr-2" />
              {isCancelling ? '取消中...' : '取消执行'}
            </Button>
          ) : (
            <Button variant="outline" onClick={handleRerun}>
              <RotateCcw className="w-4 h-4 mr-2" />
              重新执行
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除?</AlertDialogTitle>
                <AlertDialogDescription>
                  此操作将删除该执行记录，不可恢复。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                  {isDeleting ? '删除中...' : '确认删除'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats - Bento风格 */}
      <BentoGrid cols={4}>
        <BentoCard variant="bordered" className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[var(--electric)]/10 rounded-xl">
              <BarChart3 className="h-5 w-5 text-[var(--electric)]" />
            </div>
            <div>
              <p className="text-sm text-slate-500">总用例</p>
              <p className="text-xl font-bold text-slate-900">{run.stats.total}</p>
            </div>
          </div>
        </BentoCard>

        <BentoCard variant="bordered" className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">通过率</p>
              <p className={`text-xl font-bold ${run.passRate >= 80 ? 'text-emerald-500' : run.passRate >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                {run.passRate}%
              </p>
            </div>
          </div>
        </BentoCard>

        <BentoCard variant="bordered" className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/10 rounded-xl">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">失败</p>
              <p className="text-xl font-bold text-red-500">{run.stats.failed}</p>
            </div>
          </div>
        </BentoCard>

        <BentoCard variant="bordered" className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-xl">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">耗时</p>
              <p className="text-xl font-bold text-slate-900">
                {run.duration ? `${Math.round(run.duration / 1000)}s` : '-'}
              </p>
            </div>
          </div>
        </BentoCard>
      </BentoGrid>

      {/* Progress bar for running */}
      {isRunning && (
        <BentoCard variant="bordered" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-900">执行进度</span>
            <span className="text-sm text-slate-500">
              {run.stats.running + run.stats.passed + run.stats.failed}/{run.stats.total}
            </span>
          </div>
          <Progress 
            value={run.stats.total > 0 ? ((run.stats.running + run.stats.passed + run.stats.failed) / run.stats.total) * 100 : 0} 
            className="h-2"
          />
        </BentoCard>
      )}

      {/* Content Tabs */}
      <Tabs defaultValue="executions">
        <TabsList className="bg-white border">
          <TabsTrigger value="executions">
            执行详情 ({run.executions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="issues">
            关联问题 ({run.issues?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="info">基本信息</TabsTrigger>
        </TabsList>

        <TabsContent value="executions" className="mt-4">
          <BentoCard variant="bordered" className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">执行详情</h3>
            {run.executions?.length > 0 ? (
              <div className="space-y-3">
                {run.executions.map((exec, index) => (
                  <div key={exec.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 group">
                    <span className="w-8 h-8 flex items-center justify-center bg-[var(--electric)]/10 text-[var(--electric)] rounded-full text-sm font-medium shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link 
                          href={`/tests/${exec.test.id}`}
                          className="font-medium text-slate-900 hover:text-[var(--electric)] transition-colors"
                        >
                          {exec.test.name}
                        </Link>
                        <ExecutionStatusBadge status={exec.status} />
                      </div>
                      {exec.duration && (
                        <p className="text-sm text-slate-500 mt-1">
                          耗时: {Math.round(exec.duration / 1000)}s
                        </p>
                      )}
                    </div>
                    {exec.status === 'FAILED' && (
                      <Button variant="ghost" size="sm" asChild className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Link href={`/quality/issues/new?executionId=${exec.id}`}>
                          <Bug className="w-4 h-4 mr-1" />
                          提问题
                        </Link>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Beaker className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">暂无执行详情</p>
              </div>
            )}
          </BentoCard>
        </TabsContent>

        <TabsContent value="issues" className="mt-4">
          <BentoCard variant="bordered" className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">关联问题</h3>
            {run.issues?.length > 0 ? (
              <div className="divide-y">
                {run.issues.map((issue) => (
                  <div key={issue.id} className="flex items-center justify-between py-3 group">
                    <div className="flex items-center gap-3">
                      <Bug className="w-4 h-4 text-red-500" />
                      <Link 
                        href={`/quality/issues/${issue.id}`}
                        className="font-medium text-slate-900 hover:text-[var(--electric)] transition-colors"
                      >
                        {issue.title}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={issue.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>
                        {issue.severity}
                      </Badge>
                      <StatusBadge status={issue.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bug className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">暂无关联问题</p>
              </div>
            )}
          </BentoCard>
        </TabsContent>

        <TabsContent value="info" className="mt-4">
          <BentoCard variant="bordered" className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">基本信息</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">项目</label>
                  <p className="mt-1 text-slate-900">{run.project?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">类型</label>
                  <p className="mt-1 text-slate-900">
                    {run.type === 'MANUAL' ? '手动执行' : 
                     run.type === 'SCHEDULED' ? '定时任务' : 
                     run.type === 'WEBHOOK' ? 'Webhook' : 'API'}
                  </p>
                </div>
              </div>
              {run.cron && (
                <div>
                  <label className="text-sm font-medium text-slate-500">定时规则</label>
                  <p className="mt-1">
                    <code className="bg-slate-100 px-3 py-1.5 rounded-lg text-sm">{run.cron}</code>
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">创建时间</label>
                  <p className="mt-1 text-slate-900">{new Date(run.createdAt).toLocaleString()}</p>
                </div>
                {run.completedAt && (
                  <div>
                    <label className="text-sm font-medium text-slate-500">完成时间</label>
                    <p className="mt-1 text-slate-900">{new Date(run.completedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
              {run.duration && (
                <div>
                  <label className="text-sm font-medium text-slate-500">执行耗时</label>
                  <p className="mt-1 text-slate-900">{Math.round(run.duration / 1000)} 秒</p>
                </div>
              )}
            </div>
          </BentoCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { icon: any; label: string; color: string }> = {
    MANUAL: { icon: Play, label: '手动', color: 'bg-[var(--electric)]/10 text-[var(--electric)]' },
    SCHEDULED: { icon: Calendar, label: '定时', color: 'bg-purple-100 text-purple-700' },
    WEBHOOK: { icon: AlertCircle, label: 'Webhook', color: 'bg-orange-100 text-orange-700' },
    API: { icon: BarChart3, label: 'API', color: 'bg-slate-100 text-slate-700' },
  };
  const c = config[type] || config.MANUAL;
  return <Badge className={c.color}>{c.label}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    FAILED: 'bg-red-100 text-red-700',
    RUNNING: 'bg-[var(--electric)]/10 text-[var(--electric)]',
    PENDING: 'bg-amber-100 text-amber-700',
    CANCELLED: 'bg-slate-100 text-slate-700',
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    CLOSED: 'bg-slate-100 text-slate-700',
  };
  const labels: Record<string, string> = {
    COMPLETED: '完成',
    FAILED: '失败',
    RUNNING: '运行中',
    PENDING: '等待中',
    CANCELLED: '已取消',
    ACTIVE: '活跃',
    CLOSED: '已关闭',
  };
  return (
    <Badge className={colors[status] || colors.PENDING} variant="outline">
      {labels[status] || status}
    </Badge>
  );
}

function ExecutionStatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: any; color: string; label: string }> = {
    PASSED: { icon: CheckCircle, color: 'text-emerald-600', label: '通过' },
    FAILED: { icon: XCircle, color: 'text-red-600', label: '失败' },
    PENDING: { icon: Clock, color: 'text-amber-600', label: '等待' },
    RUNNING: { icon: Loader2, color: 'text-[var(--electric)]', label: '运行中' },
    SKIPPED: { icon: AlertCircle, color: 'text-slate-600', label: '跳过' },
  };
  const c = config[status] || config.PENDING;
  const Icon = c.icon;
  return (
    <div className={`flex items-center gap-1 ${c.color}`}>
      <Icon className={`w-4 h-4 ${status === 'RUNNING' ? 'animate-spin' : ''}`} />
      <span className="text-sm font-medium">{c.label}</span>
    </div>
  );
}
