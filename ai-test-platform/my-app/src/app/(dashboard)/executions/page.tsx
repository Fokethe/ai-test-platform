'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Loader2,
  Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state';
import { useExecutionStatus } from '@/lib/hooks/use-api';
import { SkeletonList } from '@/components/skeleton-card';

// Stats card skeleton component
function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-200 animate-pulse" />
              <div>
                <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
                <div className="h-6 w-8 bg-slate-200 rounded animate-pulse mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ExecutionsPage() {
  const { data, isLoading, error, mutate } = useExecutionStatus();

  // 取消执行
  const cancelExecution = useCallback(async (executionId: string) => {
    try {
      const res = await fetch(`/api/executions/${executionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FAILED', error: '用户取消执行' }),
      });
      if (!res.ok) throw new Error('取消失败');
      toast.success('已取消执行');
      mutate(); // 刷新数据
    } catch (error) {
      toast.error('取消执行失败');
    }
  }, [mutate]);

  // 手动刷新
  const handleRefresh = () => {
    mutate();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'PASSED':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      RUNNING: 'bg-blue-100 text-blue-700 border-blue-200',
      PASSED: 'bg-green-100 text-green-700 border-green-200',
      FAILED: 'bg-red-100 text-red-700 border-red-200',
      PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      TIMEOUT: 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const runningExecutions = data?.running ?? [];
  const recentExecutions = data?.recent ?? [];
  const stats = data?.stats ?? { running: 0, passed: 0, failed: 0, pending: 0 };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">执行历史</h1>
            <p className="text-slate-600 mt-1">查看测试执行状态和结果</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {isLoading ? (
          <StatsGridSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Loader2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">执行中</p>
                    <p className="text-2xl font-bold">{stats.running}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">已通过</p>
                    <p className="text-2xl font-bold">{stats.passed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">已失败</p>
                    <p className="text-2xl font-bold">{stats.failed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">等待中</p>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Running Executions */}
        {runningExecutions.length > 0 && (
          <Card className="mb-8 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                正在执行 ({runningExecutions.length})
              </CardTitle>
              <CardDescription>实时监控测试执行进度</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {runningExecutions.map((execution) => (
                  <div
                    key={execution.id}
                    className="flex items-center justify-between p-4 bg-blue-50/50 rounded-lg border border-blue-100"
                  >
                    <div className="flex items-center gap-4">
                      {getStatusIcon(execution.status)}
                      <div>
                        <p className="font-medium">{execution.testCase.title}</p>
                        <p className="text-sm text-slate-600">
                          开始时间: {execution.startedAt
                            ? new Date(execution.startedAt).toLocaleString('zh-CN')
                            : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusBadge(execution.status)}>
                        {execution.status === 'RUNNING' ? '执行中...' : execution.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => cancelExecution(execution.id)}
                      >
                        <Square className="h-4 w-4 mr-1" />
                        取消
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Executions */}
        <Card>
          <CardHeader>
            <CardTitle>最近执行记录</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <SkeletonList count={3} />
            ) : recentExecutions.length === 0 ? (
              <EmptyState
                icon={Play}
                title="暂无执行记录"
                description="执行测试后将在此显示记录"
              />
            ) : (
              <div className="space-y-3">
                {recentExecutions.map((execution) => (
                  <Link
                    key={execution.id}
                    href={`/executions/${execution.id}`}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-lg border transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {getStatusIcon(execution.status)}
                      <div>
                        <p className="font-medium">{execution.testCase.title}</p>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span>
                            耗时: {formatDuration(execution.duration)}
                          </span>
                          <span>
                            完成: {execution.completedAt
                              ? new Date(execution.completedAt).toLocaleString('zh-CN')
                              : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusBadge(execution.status)}>
                        {execution.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
