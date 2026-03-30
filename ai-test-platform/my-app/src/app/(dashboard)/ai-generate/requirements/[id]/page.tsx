'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  AlertTriangle,
  ChevronLeft,
  Edit2,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { safeFetcher } from '@/lib/utils/fetcher';
import { WorkflowIntegration } from './workflow-integration';

type Priority = 'P0' | 'P1' | 'P2' | 'P3';

type TestPoint = {
  id: string;
  name: string;
  description: string;
  priority: Priority;
  relatedFeature?: string;
};

type RequirementDetail = {
  id: string;
  title: string;
  content: string;
  fileName?: string;
  fileType?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  features?: string[];
  businessRules?: string[];
  testPoints: TestPoint[];
};

type TestPointForm = {
  id?: string;
  name: string;
  description: string;
  priority: Priority;
  relatedFeature: string;
};

const PRIORITY_LABEL: Record<Priority, string> = {
  P0: 'P0 核心',
  P1: 'P1 重要',
  P2: 'P2 常规',
  P3: 'P3 次要',
};

const PRIORITY_STYLE: Record<Priority, string> = {
  P0: 'bg-red-100 text-red-700 border-red-200',
  P1: 'bg-orange-100 text-orange-700 border-orange-200',
  P2: 'bg-blue-100 text-blue-700 border-blue-200',
  P3: 'bg-slate-100 text-slate-700 border-slate-200',
};

function toDateText(value: string) {
  try {
    return new Date(value).toLocaleString('zh-CN');
  } catch {
    return value;
  }
}

function getErrorMessage(payload: any, fallback: string) {
  return payload?.error?.message || payload?.message || payload?.error || fallback;
}

function toDefaultForm(point?: TestPoint): TestPointForm {
  if (!point) {
    return {
      name: '',
      description: '',
      priority: 'P1',
      relatedFeature: 'General',
    };
  }
  return {
    id: point.id,
    name: point.name,
    description: point.description || '',
    priority: point.priority,
    relatedFeature: point.relatedFeature || 'General',
  };
}

export default function AiRequirementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requirementId = String(params?.id || '');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingOpen, setEditingOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string>('');
  const [form, setForm] = useState<TestPointForm>(toDefaultForm());

  const { data, error, isLoading, mutate } = useSWR(
    requirementId ? `/api/requirements/${requirementId}` : null,
    safeFetcher,
    { revalidateOnFocus: false }
  );

  const requirement: RequirementDetail | null = data?.data || null;

  useEffect(() => {
    if (!requirement?.testPoints) {
      return;
    }
    setSelectedIds(new Set(requirement.testPoints.map((item) => item.id)));
  }, [requirement?.id, requirement?.testPoints]);

  const allSelected = useMemo(() => {
    const total = requirement?.testPoints?.length || 0;
    return total > 0 && selectedIds.size === total;
  }, [requirement?.testPoints, selectedIds.size]);

  const selectedCount = selectedIds.size;

  const handleToggleAll = (checked: boolean) => {
    if (!requirement?.testPoints) {
      return;
    }
    setSelectedIds(checked ? new Set(requirement.testPoints.map((item) => item.id)) : new Set());
  };

  const handleToggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const openCreateDialog = () => {
    setForm(toDefaultForm());
    setEditingOpen(true);
  };

  const openEditDialog = (point: TestPoint) => {
    setForm(toDefaultForm(point));
    setEditingOpen(true);
  };

  const closeEditDialog = () => {
    setEditingOpen(false);
    setForm(toDefaultForm());
  };

  const submitTestPoint = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error('请输入测试点名称');
      return;
    }

    setSubmitting(true);
    try {
      const url = form.id
        ? `/api/requirements/${requirementId}/test-points/${form.id}`
        : `/api/requirements/${requirementId}/test-points`;
      const method = form.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: form.description.trim(),
          priority: form.priority,
          relatedFeature: form.relatedFeature.trim() || 'General',
        }),
      });

      const payload = await response.json();
      if (payload.code !== 0) {
        throw new Error(getErrorMessage(payload, '保存测试点失败'));
      }

      await mutate();
      closeEditDialog();
      toast.success(form.id ? '测试点已更新' : '测试点已创建');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存测试点失败');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) {
      return;
    }
    try {
      const response = await fetch(
        `/api/requirements/${requirementId}/test-points/${deletingId}`,
        { method: 'DELETE' }
      );
      const payload = await response.json();
      if (payload.code !== 0) {
        throw new Error(getErrorMessage(payload, '删除测试点失败'));
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deletingId);
        return next;
      });
      await mutate();
      toast.success('测试点已删除');
      setDeletingId('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除测试点失败');
    }
  };

  const generateCases = async () => {
    if (selectedIds.size === 0) {
      toast.error('请至少选择一个测试点');
      return;
    }

    setGenerating(true);
    try {
      const selectedPointIds = Array.from(selectedIds);
      const search = new URLSearchParams({
        requirementId,
        testPointIds: selectedPointIds.join(','),
        testPointId: selectedPointIds[0],
      });
      router.push(`/ai-generate/testcases?${search.toString()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '生成测试用例失败');
    } finally {
      setGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !requirement) {
    return (
      <Card className="border-red-200">
        <CardContent className="py-8">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <span>需求详情加载失败</span>
          </div>
          <Button variant="outline" className="mt-4" onClick={() => mutate()}>
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" className="-ml-3" onClick={() => router.back()}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
          <h1 className="text-2xl font-bold">{requirement.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            创建时间: {toDateText(requirement.createdAt)} | 更新时间: {toDateText(requirement.updatedAt)}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>需求内容</CardTitle>
          <CardDescription>
            文件: {requirement.fileName || '-'} | 类型: {requirement.fileType || '-'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-56 rounded-md border p-4 bg-slate-50">
            <pre className="whitespace-pre-wrap text-sm leading-6">{requirement.content}</pre>
          </ScrollArea>
          {Array.isArray(requirement.features) && requirement.features.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {requirement.features.map((feature) => (
                <Badge key={feature} variant="secondary">
                  {feature}
                </Badge>
              ))}
            </div>
          ) : null}
          {Array.isArray(requirement.businessRules) && requirement.businessRules.length > 0 ? (
            <div className="mt-4 space-y-1 text-sm text-slate-600">
              {requirement.businessRules.map((rule, index) => (
                <p key={`${rule}-${index}`}>- {rule}</p>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <WorkflowIntegration
        requirementId={requirement.id}
        requirementText={requirement.content}
        onWorkflowComplete={(testCases) => {
          toast.success(`工作流已完成，生成 ${testCases.length} 条测试用例`);
          mutate();
        }}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>测试点</CardTitle>
              <CardDescription>
                已选 {selectedCount} / {requirement.testPoints.length}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-1" />
                新增测试点
              </Button>
              <Button onClick={generateCases} disabled={generating || selectedCount === 0}>
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1" />
                    生成用例
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-slate-50">
            <Checkbox checked={allSelected} onCheckedChange={(v) => handleToggleAll(Boolean(v))} />
            <span className="text-sm text-slate-600">全选/取消全选</span>
          </div>

          {requirement.testPoints.length === 0 ? (
            <div className="border border-dashed rounded-md py-10 text-center text-slate-500">
              当前暂无测试点，请先新增
            </div>
          ) : (
            requirement.testPoints.map((point) => (
              <div key={point.id} className="border rounded-md p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Checkbox
                      checked={selectedIds.has(point.id)}
                      onCheckedChange={(v) => handleToggleOne(point.id, Boolean(v))}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{point.name}</p>
                        <Badge variant="outline" className={PRIORITY_STYLE[point.priority]}>
                          {PRIORITY_LABEL[point.priority]}
                        </Badge>
                        {point.relatedFeature ? (
                          <Badge variant="secondary">{point.relatedFeature}</Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-slate-500 mt-2">{point.description || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(point)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeletingId(point.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={editingOpen} onOpenChange={setEditingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? '编辑测试点' : '新增测试点'}</DialogTitle>
            <DialogDescription>请填写测试点名称、优先级和描述。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>测试点名称</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="例如：手机号登录成功"
              />
            </div>
            <div className="space-y-2">
              <Label>优先级</Label>
              <Select
                value={form.priority}
                onValueChange={(value: Priority) => setForm((prev) => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P0">P0</SelectItem>
                  <SelectItem value="P1">P1</SelectItem>
                  <SelectItem value="P2">P2</SelectItem>
                  <SelectItem value="P3">P3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>关联功能</Label>
              <Input
                value={form.relatedFeature}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, relatedFeature: event.target.value }))
                }
                placeholder="例如：认证模块"
              />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="补充该测试点覆盖范围"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              取消
            </Button>
            <Button onClick={submitTestPoint} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingId)} onOpenChange={(open) => (open ? null : setDeletingId(''))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除测试点</DialogTitle>
            <DialogDescription>删除后不可恢复，确认继续吗？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId('')}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
