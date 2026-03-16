/**
 * Test Detail Page - 用例/套件详情 (Bento风格)
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Beaker,
  ArrowLeft,
  Edit,
  Trash2,
  Play,
  Folder,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Tag,
  History,
  Bug,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { BentoCard, BentoGrid, BentoHeader } from '@/components/bento';
import { Skeleton } from '@/components/ui/skeleton';

import { swrFetcher as fetcher } from '@/lib/utils/fetcher';

interface TestDetail {
  id: string;
  name: string;
  description?: string;
  type: 'CASE' | 'SUITE' | 'FOLDER';
  status: string;
  priority: string;
  tags: string[];
  steps: any[];
  project: { id: string; name: string };
  parent?: { id: string; name: string; type: string };
  children?: { id: string; name: string; type: string; status: string; priority: string }[];
  executions: any[];
  issues: any[];
  executionCount: number;
  passCount: number;
  failCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function TestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/tests/${id}` : null,
    fetcher
  );

  const test: TestDetail = data?.data;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tests/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/tests');
      }
    } finally {
      setIsDeleting(false);
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

  if (error || !test) {
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

  const passRate = test.executionCount > 0
    ? Math.round((test.passCount / test.executionCount) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tests">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{test.name}</h1>
              <TypeBadge type={test.type} />
              <PriorityBadge priority={test.priority} />
              <StatusBadge status={test.status} />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {test.project?.name} · 更新于 {new Date(test.updatedAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/tests/${id}/edit`}>
              <Edit className="w-4 h-4 mr-2" />
              编辑
            </Link>
          </Button>
          <Button asChild className="bg-[var(--electric)] hover:bg-[var(--electric)]/90">
            <Link href={`/runs/new?testId=${id}`}>
              <Play className="w-4 h-4 mr-2" />
              执行
            </Link>
          </Button>
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
                  此操作将删除该测试，删除后可在回收站恢复。
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
              <History className="h-5 w-5 text-[var(--electric)]" />
            </div>
            <div>
              <p className="text-sm text-slate-500">执行次数</p>
              <p className="text-xl font-bold text-slate-900">{test.executionCount}</p>
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
              <p className={`text-xl font-bold ${passRate >= 80 ? 'text-emerald-500' : passRate >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                {passRate}%
              </p>
            </div>
          </div>
        </BentoCard>

        <BentoCard variant="bordered" className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">通过</p>
              <p className="text-xl font-bold text-emerald-500">{test.passCount}</p>
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
              <p className="text-xl font-bold text-red-500">{test.failCount}</p>
            </div>
          </div>
        </BentoCard>
      </BentoGrid>

      {/* Content Tabs */}
      <Tabs defaultValue="info">
        <TabsList className="bg-white border">
          <TabsTrigger value="info">基本信息</TabsTrigger>
          {test.type === 'CASE' && <TabsTrigger value="steps">测试步骤</TabsTrigger>}
          {test.type === 'SUITE' && <TabsTrigger value="children">包含用例 ({test.children?.length || 0})</TabsTrigger>}
          <TabsTrigger value="executions">执行历史 ({test.executions?.length || 0})</TabsTrigger>
          <TabsTrigger value="issues">关联问题 ({test.issues?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <BentoCard variant="bordered" className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">基本信息</h3>
            <div className="space-y-4">
              {test.description && (
                <div>
                  <label className="text-sm font-medium text-slate-500">描述</label>
                  <p className="mt-1 text-slate-900">{test.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">项目</label>
                  <p className="mt-1 text-slate-900">{test.project?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">类型</label>
                  <p className="mt-1 text-slate-900">
                    {test.type === 'CASE' ? '测试用例' : test.type === 'SUITE' ? '测试套件' : '文件夹'}
                  </p>
                </div>
              </div>
              {test.tags?.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-500">标签</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {test.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="bg-slate-100">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {test.parent && (
                <div>
                  <label className="text-sm font-medium text-slate-500">所属套件</label>
                  <p className="mt-1">
                    <Link href={`/tests/${test.parent.id}`} className="text-[var(--electric)] hover:underline">
                      {test.parent.name}
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </BentoCard>
        </TabsContent>

        {test.type === 'CASE' && (
          <TabsContent value="steps" className="mt-4">
            <BentoCard variant="bordered" className="p-6">
              <h3 className="font-semibold text-slate-900 mb-4">测试步骤</h3>
              {test.steps?.length > 0 ? (
                <div className="space-y-3">
                  {test.steps.map((step: any, index: number) => (
                    <div key={index} className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="w-8 h-8 flex items-center justify-center bg-[var(--electric)]/10 text-[var(--electric)] rounded-full text-sm font-medium shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{step.action}</p>
                        {step.expected && (
                          <p className="text-sm text-slate-500 mt-1">预期: {step.expected}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">暂无步骤</p>
                </div>
              )}
            </BentoCard>
          </TabsContent>
        )}

        {test.type === 'SUITE' && (
          <TabsContent value="children" className="mt-4">
            <BentoCard variant="bordered" className="p-6">
              <h3 className="font-semibold text-slate-900 mb-4">包含用例</h3>
              {(test.children?.length ?? 0) > 0 ? (
                <div className="divide-y">
                  {(test.children ?? []).map((child) => (
                    <div key={child.id} className="flex items-center justify-between py-3 group">
                      <div className="flex items-center gap-3">
                        <Beaker className="w-4 h-4 text-slate-400" />
                        <Link href={`/tests/${child.id}`} className="font-medium text-slate-900 hover:text-[var(--electric)] transition-colors">
                          {child.name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={child.priority} />
                        <StatusBadge status={child.status} />
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[var(--electric)] group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Folder className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">暂无子用例</p>
                </div>
              )}
            </BentoCard>
          </TabsContent>
        )}

        <TabsContent value="executions" className="mt-4">
          <BentoCard variant="bordered" className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">执行历史</h3>
            {test.executions?.length > 0 ? (
              <div className="divide-y">
                {test.executions.map((exec: any) => (
                  <div key={exec.id} className="flex items-center justify-between py-3 group">
                    <div>
                      <Link href={`/runs/${exec.run?.id}`} className="font-medium text-slate-900 hover:text-[var(--electric)] transition-colors">
                        {exec.run?.name || '执行'}
                      </Link>
                      <p className="text-sm text-slate-500">
                        {new Date(exec.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <ExecutionStatusBadge status={exec.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <History className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">暂无执行记录</p>
              </div>
            )}
          </BentoCard>
        </TabsContent>

        <TabsContent value="issues" className="mt-4">
          <BentoCard variant="bordered" className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">关联问题</h3>
            {test.issues?.length > 0 ? (
              <div className="divide-y">
                {test.issues.map((issue: any) => (
                  <div key={issue.id} className="flex items-center justify-between py-3 group">
                    <div className="flex items-center gap-3">
                      <Bug className="w-4 h-4 text-red-500" />
                      <Link href={`/issues/${issue.id}`} className="font-medium text-slate-900 hover:text-[var(--electric)] transition-colors">
                        {issue.title}
                      </Link>
                    </div>
                    <Badge variant={issue.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>
                      {issue.severity}
                    </Badge>
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
      </Tabs>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { icon: any; label: string; color: string }> = {
    CASE: { icon: Beaker, label: '用例', color: 'bg-[var(--electric)]/10 text-[var(--electric)]' },
    SUITE: { icon: Folder, label: '套件', color: 'bg-purple-100 text-purple-700' },
    FOLDER: { icon: Folder, label: '文件夹', color: 'bg-slate-100 text-slate-700' },
  };
  const c = config[type] || config.CASE;
  return <Badge className={c.color}>{c.label}</Badge>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700',
    HIGH: 'bg-orange-100 text-orange-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    LOW: 'bg-slate-100 text-slate-700',
  };
  const labels: Record<string, string> = {
    CRITICAL: '紧急', HIGH: '高', MEDIUM: '中', LOW: '低',
  };
  return (
    <Badge className={colors[priority] || colors.MEDIUM} variant="secondary">
      {labels[priority] || priority}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    DRAFT: 'bg-amber-100 text-amber-700',
    ARCHIVED: 'bg-slate-100 text-slate-700',
  };
  const labels: Record<string, string> = {
    ACTIVE: '活跃', DRAFT: '草稿', ARCHIVED: '已归档',
  };
  return (
    <Badge className={colors[status] || colors.DRAFT} variant="outline">
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
