'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Edit2,
  Loader2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { BentoCard, BentoGrid } from '@/components/bento';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { safeFetcher } from '@/lib/utils/fetcher';

type RequirementDetail = {
  id: string;
  title: string;
  content: string;
  fileName: string;
  fileType: string;
  project?: {
    id: string;
    name: string;
  } | null;
  testPoints: Array<{
    id: string;
    name: string;
    description: string;
    priority: 'P0' | 'P1' | 'P2' | 'P3';
    relatedFeature: string;
  }>;
  traceability?: {
    linkedTests: Array<{
      id: string;
      name: string;
      type: string;
      status: string;
      source: string;
      executionCount: number;
      issueCount: number;
    }>;
    summary: {
      linkedTestCount: number;
      totalExecutionCount: number;
    };
  };
  updatedAt: string;
  isConfirmed: boolean;
};

const PRIORITY_LABEL: Record<string, string> = {
  P0: 'P0',
  P1: 'P1',
  P2: 'P2',
  P3: 'P3',
};

export default function RequirementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
  });

  const { data, isLoading, mutate } = useSWR(id ? `/api/requirements/${id}` : null, safeFetcher, {
    revalidateOnFocus: false,
  });

  const detail: RequirementDetail | null = data?.data || null;

  const openEditDialog = () => {
    if (!detail) {
      return;
    }
    setEditForm({
      title: detail.title,
      content: detail.content,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!detail) {
      return;
    }
    if (!editForm.title.trim() || !editForm.content.trim()) {
      toast.error('标题和内容不能为空');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/requirements/${detail.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title.trim(),
          content: editForm.content.trim(),
        }),
      });
      const payload = await response.json();
      if (payload.code !== 0) {
        throw new Error(payload.error?.message || payload.message || '保存失败');
      }
      toast.success('需求已更新');
      setEditOpen(false);
      await mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!detail) {
      return;
    }
    if (!window.confirm('确认删除该需求吗？')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/requirements/${detail.id}`, {
        method: 'DELETE',
      });
      const payload = await response.json();
      if (payload.code !== 0) {
        throw new Error(payload.error?.message || payload.message || '删除失败');
      }
      toast.success('需求已删除');
      router.push('/requirements');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-8">
        <BentoCard className="p-12 text-center">
          <p className="text-slate-500">需求不存在或无权限访问</p>
          <Button className="mt-4" variant="outline" onClick={() => router.push('/requirements')}>
            返回需求列表
          </Button>
        </BentoCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/requirements')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{detail.title}</h1>
            <p className="text-sm text-slate-500 mt-1">
              项目：{detail.project?.name || '-'} · 更新时间：{new Date(detail.updatedAt).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={detail.isConfirmed ? 'default' : 'secondary'}>
            {detail.isConfirmed ? '已确认' : '待确认'}
          </Badge>
          <Button variant="outline" onClick={openEditDialog}>
            <Edit2 className="w-4 h-4 mr-2" />
            编辑
          </Button>
          <Button
            onClick={() => router.push(`/ai-generate/requirements/${detail.id}`)}
            className="bg-[var(--electric)] hover:bg-[var(--electric)]/90"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            生成用例
          </Button>
          <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            删除
          </Button>
        </div>
      </div>

      <BentoGrid cols={2}>
        <BentoCard variant="bordered" className="p-6">
          <h3 className="font-semibold mb-3">需求内容</h3>
          <p className="text-sm text-slate-500 mb-3">
            来源：{detail.fileName} ({detail.fileType})
          </p>
          <div className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{detail.content}</div>
        </BentoCard>

        <BentoCard variant="bordered" className="p-6">
          <h3 className="font-semibold mb-3">测试点 ({detail.testPoints.length})</h3>
          <div className="space-y-3">
            {detail.testPoints.map((point) => (
              <div key={point.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm">{point.name}</p>
                  <Badge variant="outline">{PRIORITY_LABEL[point.priority] || point.priority}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">{point.relatedFeature}</p>
                <p className="text-sm text-slate-600 mt-2">{point.description}</p>
              </div>
            ))}
            {detail.testPoints.length === 0 ? (
              <p className="text-sm text-slate-500">暂无测试点</p>
            ) : null}
          </div>
        </BentoCard>
      </BentoGrid>

      <BentoCard variant="bordered" className="p-6">
        <h3 className="font-semibold mb-3">关联追踪</h3>
        <div className="flex items-center gap-4 mb-4">
          <Badge variant="secondary">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            关联用例 {detail.traceability?.summary.linkedTestCount || 0}
          </Badge>
          <Badge variant="secondary">执行总数 {detail.traceability?.summary.totalExecutionCount || 0}</Badge>
        </div>
        <div className="space-y-2">
          {(detail.traceability?.linkedTests || []).map((item) => (
            <div key={item.id} className="rounded border border-slate-200 px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{item.name}</span>
                <span className="text-slate-500">{item.type} · {item.status}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                来源：{item.source} · 执行 {item.executionCount} · 问题 {item.issueCount}
              </p>
            </div>
          ))}
          {(detail.traceability?.linkedTests || []).length === 0 ? (
            <p className="text-sm text-slate-500">暂无关联用例</p>
          ) : null}
        </div>
      </BentoCard>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑需求</DialogTitle>
            <DialogDescription>保存后会重新解析功能点与业务规则</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>标题</Label>
              <Input
                value={editForm.title}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>内容</Label>
              <Textarea
                rows={10}
                value={editForm.content}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, content: event.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

