/**
 * Test Detail Page - 用例/套件详情
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500">加载失败</p>
        <Button variant="outline" className="mt-4" onClick={() => mutate()}>
          重试
        </Button>
      </div>
    );
  }

  const passRate = test.executionCount > 0
    ? Math.round((test.passCount / test.executionCount) * 100)
    : 0;

  return (
    <div className="space-y-6">
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
              <h1 className="text-2xl font-bold">{test.name}</h1>
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
          <Button asChild>
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
        <StatCard label="执行次数" value={test.executionCount.toString()} icon={History} />
        <StatCard label="通过率" value={`${passRate}%`} icon={CheckCircle} 
          valueClass={passRate >= 80 ? 'text-green-600' : passRate >= 60 ? 'text-yellow-600' : 'text-red-600'} />
        <StatCard label="通过" value={test.passCount.toString()} icon={CheckCircle} valueClass="text-green-600" />
        <StatCard label="失败" value={test.failCount.toString()} icon={XCircle} valueClass="text-red-600" />
      </div>

      {/* Content */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">基本信息</TabsTrigger>
          {test.type === 'CASE' && <TabsTrigger value="steps">测试步骤</TabsTrigger>}
          {test.type === 'SUITE' && <TabsTrigger value="children">包含用例 ({test.children?.length || 0})</TabsTrigger>}
          <TabsTrigger value="executions">执行历史 ({test.executions?.length || 0})</TabsTrigger>
          <TabsTrigger value="issues">关联问题 ({test.issues?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {test.description && (
                <div>
                  <label className="text-sm font-medium text-slate-500">描述</label>
                  <p className="mt-1">{test.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">项目</label>
                  <p className="mt-1">{test.project?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">类型</label>
                  <p className="mt-1">{test.type === 'CASE' ? '测试用例' : test.type === 'SUITE' ? '测试套件' : '文件夹'}</p>
                </div>
              </div>
              {test.tags?.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-500">标签</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {test.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {test.parent && (
                <div>
                  <label className="text-sm font-medium text-slate-500">所属套件</label>
                  <p className="mt-1">
                    <Link href={`/tests/${test.parent.id}`} className="text-blue-600 hover:underline">
                      {test.parent.name}
                    </Link>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {test.type === 'CASE' && (
          <TabsContent value="steps" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>测试步骤</CardTitle>
              </CardHeader>
              <CardContent>
                {test.steps?.length > 0 ? (
                  <div className="space-y-3">
                    {test.steps.map((step: any, index: number) => (
                      <div key={index} className="flex gap-4 p-3 border rounded-lg">
                        <span className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-sm font-medium">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium">{step.action}</p>
                          {step.expected && (
                            <p className="text-sm text-slate-500 mt-1">预期: {step.expected}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">暂无步骤</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {test.type === 'SUITE' && (
          <TabsContent value="children" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>包含用例</CardTitle>
              </CardHeader>
              <CardContent>
                {(test.children?.length ?? 0) > 0 ? (
                  <div className="divide-y">
                    {(test.children ?? []).map((child) => (
                      <div key={child.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-2">
                          <Beaker className="w-4 h-4 text-slate-400" />
                          <Link href={`/tests/${child.id}`} className="font-medium hover:text-blue-600">
                            {child.name}
                          </Link>
                        </div>
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={child.priority} />
                          <StatusBadge status={child.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">暂无子用例</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="executions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>执行历史</CardTitle>
            </CardHeader>
            <CardContent>
              {test.executions?.length > 0 ? (
                <div className="divide-y">
                  {test.executions.map((exec: any) => (
                    <div key={exec.id} className="flex items-center justify-between py-3">
                      <div>
                        <Link href={`/runs/${exec.run?.id}`} className="font-medium hover:text-blue-600">
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
                <p className="text-slate-500 text-center py-8">暂无执行记录</p>
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
              {test.issues?.length > 0 ? (
                <div className="divide-y">
                  {test.issues.map((issue: any) => (
                    <div key={issue.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2">
                        <Bug className="w-4 h-4 text-red-500" />
                        <Link href={`/quality/issues/${issue.id}`} className="font-medium hover:text-blue-600">
                          {issue.title}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={issue.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>
                          {issue.severity}
                        </Badge>
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
    CASE: { icon: Beaker, label: '用例', color: 'bg-blue-100 text-blue-700' },
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
    ACTIVE: 'bg-green-100 text-green-700',
    DRAFT: 'bg-yellow-100 text-yellow-700',
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
    PASSED: { icon: CheckCircle, color: 'text-green-600', label: '通过' },
    FAILED: { icon: XCircle, color: 'text-red-600', label: '失败' },
    PENDING: { icon: Clock, color: 'text-yellow-600', label: '等待' },
    RUNNING: { icon: Loader2, color: 'text-blue-600', label: '运行中' },
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
