/**
 * Run Detail Page - 执行详情
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500">加载失败</p>
        <Button variant="outline" className="mt-4" onClick={() => mutate()}>
          重试
        </Button>
      </div>
    );
  }

  const isRunning = run.status === 'RUNNING' || run.status === 'PENDING';

  return (
    <div className="space-y-6">
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
              <h1 className="text-2xl font-bold">{run.name}</h1>
              <TypeBadge type={run.type} />
              <StatusBadge status={run.status} />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {run.project?.name} · 创建于 {new Date(run.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? '删除中...' : '确认删除'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard 
          label="总用例" 
          value={run.stats.total.toString()} 
          icon={BarChart3} 
        />
        <StatCard 
          label="通过率" 
          value={`${run.passRate}%`} 
          icon={CheckCircle}
          valueClass={run.passRate >= 80 ? 'text-green-600' : run.passRate >= 60 ? 'text-yellow-600' : 'text-red-600'}
        />
        <StatCard 
          label="通过/失败" 
          value={`${run.stats.passed}/${run.stats.failed}`} 
          icon={run.stats.failed > 0 ? XCircle : CheckCircle}
          valueClass={run.stats.failed > 0 ? 'text-red-600' : 'text-green-600'}
        />
        <StatCard 
          label="耗时" 
          value={run.duration ? `${Math.round(run.duration / 1000)}s` : '-'} 
          icon={Clock} 
        />
      </div>

      {/* Progress bar for running */}
      {isRunning && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">执行进度</span>
              <span className="text-sm text-slate-500">
                {run.stats.running + run.stats.passed + run.stats.failed}/{run.stats.total}
              </span>
            </div>
            <Progress 
              value={run.stats.total > 0 ? ((run.stats.running + run.stats.passed + run.stats.failed) / run.stats.total) * 100 : 0} 
              className="h-2" 
            />
          </CardContent>
        </Card>
      )}

      {/* Content */}
      <Tabs defaultValue="executions">
        <TabsList>
          <TabsTrigger value="executions">
            执行详情 ({run.executions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="issues">
            关联问题 ({run.issues?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="info">基本信息</TabsTrigger>
        </TabsList>

        <TabsContent value="executions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>执行详情</CardTitle>
            </CardHeader>
            <CardContent>
              {run.executions?.length > 0 ? (
                <div className="space-y-3">
                  {run.executions.map((exec, index) => (
                    <div key={exec.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <span className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-sm font-medium">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/tests/${exec.test.id}`}
                            className="font-medium hover:text-blue-600"
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
                        <Button variant="ghost" size="sm" asChild>
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
                <p className="text-slate-500 text-center py-8">暂无执行详情</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>关联问题</CardTitle>
            </CardHeader>
            <CardContent>
              {run.issues?.length > 0 ? (
                <div className="divide-y">
                  {run.issues.map((issue) => (
                    <div key={issue.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2">
                        <Bug className="w-4 h-4 text-red-500" />
                        <Link 
                          href={`/quality/issues/${issue.id}`}
                          className="font-medium hover:text-blue-600"
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
                <p className="text-slate-500 text-center py-8">暂无关联问题</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">项目</label>
                  <p className="mt-1">{run.project?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">类型</label>
                  <p className="mt-1">
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
                    <code className="bg-slate-100 px-2 py-1 rounded">{run.cron}</code>
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">创建时间</label>
                  <p className="mt-1">{new Date(run.createdAt).toLocaleString()}</p>
                </div>
                {run.completedAt && (
                  <div>
                    <label className="text-sm font-medium text-slate-500">完成时间</label>
                    <p className="mt-1">{new Date(run.completedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
              {run.duration && (
                <div>
                  <label className="text-sm font-medium text-slate-500">执行耗时</label>
                  <p className="mt-1">{Math.round(run.duration / 1000)} 秒</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, valueClass }: { label: string; value: string; icon: any; valueClass?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Icon className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className={`text-2xl font-bold ${valueClass || ''}`}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { icon: any; label: string; color: string }> = {
    MANUAL: { icon: Play, label: '手动', color: 'bg-blue-100 text-blue-700' },
    SCHEDULED: { icon: Calendar, label: '定时', color: 'bg-purple-100 text-purple-700' },
    WEBHOOK: { icon: AlertCircle, label: 'Webhook', color: 'bg-orange-100 text-orange-700' },
    API: { icon: BarChart3, label: 'API', color: 'bg-slate-100 text-slate-700' },
  };
  const c = config[type] || config.MANUAL;
  return <Badge className={c.color}>{c.label}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
    RUNNING: 'bg-blue-100 text-blue-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    CANCELLED: 'bg-slate-100 text-slate-700',
    ACTIVE: 'bg-green-100 text-green-700',
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
    PASSED: { icon: CheckCircle, color: 'text-green-600', label: '通过' },
    FAILED: { icon: XCircle, color: 'text-red-600', label: '失败' },
    PENDING: { icon: Clock, color: 'text-yellow-600', label: '等待' },
    RUNNING: { icon: Loader2, color: 'text-blue-600', label: '运行中' },
    SKIPPED: { icon: AlertCircle, color: 'text-slate-600', label: '跳过' },
  };
  const c = config[status] || config.PENDING;
  const Icon = c.icon;
  return (
    <div className={`flex items-center gap-1 ${c.color}`}>
      <Icon className={`w-4 h-4 ${status === 'RUNNING' ? 'animate-spin' : ''}`} />
      <span className="text-sm">{c.label}</span>
    </div>
  );
}
