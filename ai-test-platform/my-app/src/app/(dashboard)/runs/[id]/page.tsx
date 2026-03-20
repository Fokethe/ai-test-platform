/**
 * Run Detail Page - 执行详情
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import type { SWRConfiguration } from 'swr';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Play,
  ArrowLeft,
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
  type LucideIcon,
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
import { Skeleton } from '@/components/ui/skeleton';
import { BentoCard, BentoGrid } from '@/components/bento';
import { safeFetcher } from '@/lib/utils/fetcher';

type RunType = 'MANUAL' | 'SCHEDULED' | 'WEBHOOK' | 'API';
type RunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
type ExecutionStatus = 'PASSED' | 'FAILED' | 'PENDING' | 'RUNNING' | 'SKIPPED' | 'ERROR';
type LinkedIssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

interface Execution {
  id: string;
  status: string;
  test: { id: string; name: string; type: string };
  duration?: number;
}

interface LinkedIssue {
  id: string;
  title: string;
  severity: string;
  status: string;
}

interface RunDetail {
  id: string;
  name: string;
  type: RunType;
  status: RunStatus;
  project: { id: string; name: string };
  cron?: string;
  duration?: number;
  createdAt: string;
  completedAt?: string;
  executions: Execution[];
  issues: LinkedIssue[];
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

interface RunDetailResponse {
  data?: RunDetail;
}

interface BadgeConfig {
  icon: LucideIcon;
  label: string;
  color: string;
}

const DETAIL_TIMEOUT_MS = 10000;

const RUN_DETAIL_SWR_CONFIG: SWRConfiguration = {
  refreshInterval: 5000,
  loadingTimeout: DETAIL_TIMEOUT_MS,
  errorRetryCount: 2,
  errorRetryInterval: 2000,
  shouldRetryOnError: (error) =>
    error instanceof Error &&
    (error.message.toLowerCase().includes('timeout') ||
      error.message.toLowerCase().includes('network')),
};

const RUN_TYPE_CONFIG: Record<RunType, BadgeConfig> = {
  MANUAL: { icon: Play, label: '手动', color: 'bg-[var(--electric)]/10 text-[var(--electric)]' },
  SCHEDULED: { icon: Calendar, label: '定时', color: 'bg-purple-100 text-purple-700' },
  WEBHOOK: { icon: AlertCircle, label: 'Webhook', color: 'bg-orange-100 text-orange-700' },
  API: { icon: BarChart3, label: 'API', color: 'bg-slate-100 text-slate-700' },
};

const RUN_STATUS_STYLE: Record<RunStatus | 'ACTIVE' | 'CLOSED', string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
  RUNNING: 'bg-[var(--electric)]/10 text-[var(--electric)]',
  PENDING: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-slate-100 text-slate-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-slate-100 text-slate-700',
};

const RUN_STATUS_LABEL: Record<RunStatus | 'ACTIVE' | 'CLOSED', string> = {
  COMPLETED: '已完成',
  FAILED: '失败',
  RUNNING: '运行中',
  PENDING: '待开始',
  CANCELLED: '已取消',
  ACTIVE: '活跃',
  CLOSED: '已关闭',
};

const EXECUTION_STATUS_CONFIG: Record<ExecutionStatus, BadgeConfig> = {
  PASSED: { icon: CheckCircle, color: 'text-emerald-600', label: '通过' },
  FAILED: { icon: XCircle, color: 'text-red-600', label: '失败' },
  ERROR: { icon: XCircle, color: 'text-red-600', label: '错误' },
  PENDING: { icon: Clock, color: 'text-amber-600', label: '等待' },
  RUNNING: { icon: Loader2, color: 'text-[var(--electric)]', label: '运行中' },
  SKIPPED: { icon: AlertCircle, color: 'text-slate-600', label: '跳过' },
};

const LINKED_ISSUE_LABELS: Record<LinkedIssueStatus, string> = {
  OPEN: '待处理',
  IN_PROGRESS: '进行中',
  RESOLVED: '已解决',
  CLOSED: '已关闭',
};

function isRunningStatus(status: RunStatus) {
  return status === 'RUNNING' || status === 'PENDING';
}

function formatDuration(duration?: number) {
  if (!duration) {
    return '-';
  }
  return `${Math.round(duration / 1000)}s`;
}

function formatRunType(type: RunType) {
  if (type === 'MANUAL') {
    return '手动执行';
  }
  if (type === 'SCHEDULED') {
    return '定时任务';
  }
  return type;
}

function canCreateIssueFromExecution(status: string) {
  return status === 'FAILED' || status === 'ERROR';
}

function getIssueStatusLabel(status: string) {
  if (status in LINKED_ISSUE_LABELS) {
    return LINKED_ISSUE_LABELS[status as LinkedIssueStatus];
  }
  return status;
}

export default function RunDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<RunDetailResponse>(
    id ? `/api/runs/${id}` : null,
    (url: string) => safeFetcher(url, { timeoutMs: DETAIL_TIMEOUT_MS }),
    RUN_DETAIL_SWR_CONFIG
  );

  const run = data?.data;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/runs/${id}`, { method: 'DELETE' });
      if (response.ok) {
        router.push('/runs');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const response = await fetch(`/api/runs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (response.ok) {
        await mutate();
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRerun = async () => {
    if (!run) {
      return;
    }

    try {
      const response = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${run.name} (重跑)`,
          projectId: run.project.id,
          testIds: run.executions.map((execution) => execution.test.id),
        }),
      });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { data?: { id?: string } };
      const nextRunId = payload?.data?.id;
      if (nextRunId) {
        router.push(`/runs/${nextRunId}`);
      }
    } catch (requestError) {
      console.error('Rerun error:', requestError);
    }
  };

  if (isLoading) {
    return <RunDetailLoading />;
  }

  if (error || !run) {
    return (
      <RunDetailError
        onRetry={() => void mutate()}
        message={error instanceof Error ? error.message : undefined}
      />
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <RunHeader
        run={run}
        runId={id}
        isDeleting={isDeleting}
        isCancelling={isCancelling}
        onDelete={handleDelete}
        onCancel={handleCancel}
        onRerun={handleRerun}
      />

      <RunStats stats={run.stats} passRate={run.passRate} duration={run.duration} />

      {isRunningStatus(run.status) && <RunProgress stats={run.stats} />}

      <Tabs defaultValue="executions">
        <TabsList className="bg-white border">
          <TabsTrigger value="executions">执行详情 ({run.executions.length})</TabsTrigger>
          <TabsTrigger value="issues">关联问题 ({run.issues.length})</TabsTrigger>
          <TabsTrigger value="info">基本信息</TabsTrigger>
        </TabsList>

        <TabsContent value="executions" className="mt-4">
          <ExecutionsPanel run={run} runId={id} />
        </TabsContent>
        <TabsContent value="issues" className="mt-4">
          <LinkedIssuesPanel issues={run.issues} />
        </TabsContent>
        <TabsContent value="info" className="mt-4">
          <RunInfoPanel run={run} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RunDetailLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-24" />
        ))}
      </div>
    </div>
  );
}

function RunDetailError({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <div className="p-6">
      <BentoCard className="p-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-500 text-lg">加载失败</p>
        {message ? <p className="text-sm text-slate-500 mt-2">{message}</p> : null}
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          重试
        </Button>
      </BentoCard>
    </div>
  );
}

function RunHeader({
  run,
  runId,
  isDeleting,
  isCancelling,
  onDelete,
  onCancel,
  onRerun,
}: {
  run: RunDetail;
  runId: string;
  isDeleting: boolean;
  isCancelling: boolean;
  onDelete: () => void;
  onCancel: () => void;
  onRerun: () => void;
}) {
  const running = isRunningStatus(run.status);

  return (
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
            {run.project.name} · 创建于 {new Date(run.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!running && (
          <Button variant="outline" asChild data-testid="view-report-button">
            <Link href={`/runs/${runId}/report`}>
              <FileText className="w-4 h-4 mr-2" />
              查看报告
            </Link>
          </Button>
        )}

        {running ? (
          <Button variant="outline" onClick={onCancel} disabled={isCancelling}>
            <XCircle className="w-4 h-4 mr-2" />
            {isCancelling ? '取消中...' : '取消执行'}
          </Button>
        ) : (
          <Button variant="outline" onClick={onRerun}>
            <RotateCcw className="w-4 h-4 mr-2" />
            重新执行
          </Button>
        )}

        <DeleteRunDialog isDeleting={isDeleting} onDelete={onDelete} />
      </div>
    </div>
  );
}

function DeleteRunDialog({
  isDeleting,
  onDelete,
}: {
  isDeleting: boolean;
  onDelete: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="icon">
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除？</AlertDialogTitle>
          <AlertDialogDescription>
            该操作会永久删除当前执行记录，且无法恢复。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? '删除中...' : '确认删除'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RunStats({
  stats,
  passRate,
  duration,
}: {
  stats: RunDetail['stats'];
  passRate: number;
  duration?: number;
}) {
  const passRateColor = passRate >= 80 ? 'text-emerald-500' : passRate >= 60 ? 'text-amber-500' : 'text-red-500';

  return (
    <BentoGrid cols={4}>
      <BentoCard variant="bordered" className="p-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[var(--electric)]/10 rounded-xl">
            <BarChart3 className="h-5 w-5 text-[var(--electric)]" />
          </div>
          <div>
            <p className="text-sm text-slate-500">总用例</p>
            <p className="text-xl font-bold text-slate-900">{stats.total}</p>
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
            <p className={`text-xl font-bold ${passRateColor}`}>{passRate}%</p>
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
            <p className="text-xl font-bold text-red-500">{stats.failed}</p>
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
            <p className="text-xl font-bold text-slate-900">{formatDuration(duration)}</p>
          </div>
        </div>
      </BentoCard>
    </BentoGrid>
  );
}

function RunProgress({ stats }: { stats: RunDetail['stats'] }) {
  const finishedCount = stats.running + stats.passed + stats.failed;
  const progressValue = stats.total > 0 ? (finishedCount / stats.total) * 100 : 0;

  return (
    <BentoCard variant="bordered" className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-900">执行进度</span>
        <span className="text-sm text-slate-500">
          {finishedCount}/{stats.total}
        </span>
      </div>
      <Progress value={progressValue} className="h-2" />
    </BentoCard>
  );
}

function ExecutionsPanel({
  run,
  runId,
}: {
  run: RunDetail;
  runId: string;
}) {
  if (run.executions.length === 0) {
    return (
      <BentoCard variant="bordered" className="p-6">
        <div className="text-center py-12">
          <Beaker className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">暂无执行详情</p>
        </div>
      </BentoCard>
    );
  }

  return (
    <BentoCard variant="bordered" className="p-6">
      <h3 className="font-semibold text-slate-900 mb-4">执行详情</h3>
      <div className="space-y-3">
        {run.executions.map((execution, index) => (
          <div
            key={execution.id}
            className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 group"
          >
            <span className="w-8 h-8 flex items-center justify-center bg-[var(--electric)]/10 text-[var(--electric)] rounded-full text-sm font-medium shrink-0">
              {index + 1}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/tests/${execution.test.id}`}
                  className="font-medium text-slate-900 hover:text-[var(--electric)] transition-colors"
                >
                  {execution.test.name}
                </Link>
                <ExecutionStatusBadge status={execution.status} />
              </div>
              {execution.duration && (
                <p className="text-sm text-slate-500 mt-1">耗时: {Math.round(execution.duration / 1000)}s</p>
              )}
            </div>
            {canCreateIssueFromExecution(execution.status) && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Link
                  href={`/quality/issues/new?executionId=${execution.id}&runId=${runId}&testId=${execution.test.id}&projectId=${run.project.id}`}
                >
                  <Bug className="w-4 h-4 mr-1" />
                  提问题
                </Link>
              </Button>
            )}
          </div>
        ))}
      </div>
    </BentoCard>
  );
}

function LinkedIssuesPanel({ issues }: { issues: LinkedIssue[] }) {
  if (issues.length === 0) {
    return (
      <BentoCard variant="bordered" className="p-6">
        <div className="text-center py-12">
          <Bug className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">暂无关联问题</p>
        </div>
      </BentoCard>
    );
  }

  return (
    <BentoCard variant="bordered" className="p-6">
      <h3 className="font-semibold text-slate-900 mb-4">关联问题</h3>
      <div className="divide-y">
        {issues.map((issue) => (
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
              <Badge variant="outline">{getIssueStatusLabel(issue.status)}</Badge>
            </div>
          </div>
        ))}
      </div>
    </BentoCard>
  );
}

function RunInfoPanel({ run }: { run: RunDetail }) {
  return (
    <BentoCard variant="bordered" className="p-6">
      <h3 className="font-semibold text-slate-900 mb-4">基本信息</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-500">项目</label>
            <p className="mt-1 text-slate-900">{run.project.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-500">类型</label>
            <p className="mt-1 text-slate-900">{formatRunType(run.type)}</p>
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
            <p className="mt-1 text-slate-900">{Math.round(run.duration / 1000)} s</p>
          </div>
        )}
      </div>
    </BentoCard>
  );
}

function TypeBadge({ type }: { type: RunType }) {
  const config = RUN_TYPE_CONFIG[type];
  return <Badge className={config.color}>{config.label}</Badge>;
}

function StatusBadge({ status }: { status: RunStatus | 'ACTIVE' | 'CLOSED' }) {
  return (
    <Badge className={RUN_STATUS_STYLE[status]} variant="outline">
      {RUN_STATUS_LABEL[status]}
    </Badge>
  );
}

function ExecutionStatusBadge({ status }: { status: string }) {
  const config =
    status in EXECUTION_STATUS_CONFIG
      ? EXECUTION_STATUS_CONFIG[status as ExecutionStatus]
      : EXECUTION_STATUS_CONFIG.PENDING;
  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-1 ${config.color}`}>
      <Icon className={`w-4 h-4 ${status === 'RUNNING' ? 'animate-spin' : ''}`} />
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  );
}
