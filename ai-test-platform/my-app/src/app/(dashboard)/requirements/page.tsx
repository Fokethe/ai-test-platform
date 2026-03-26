'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import {
  FileText,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { BentoCard, BentoGrid, BentoHeader, BentoSearch } from '@/components/bento';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { safeFetcher } from '@/lib/utils/fetcher';

type ProjectOption = {
  id: string;
  name: string;
};

type RequirementItem = {
  id: string;
  title: string;
  content: string;
  testPointCount: number;
  isConfirmed: boolean;
  projectId: string;
  project?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString('zh-CN');
  } catch {
    return value;
  }
}

const fetcher = (url: string) => safeFetcher(url);

export default function RequirementsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    projectId: '',
    content: '',
  });

  const requirementKey = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('pageSize', '100');
    if (search.trim()) {
      params.set('search', search.trim());
    }
    return `/api/requirements?${params.toString()}`;
  }, [search]);

  const {
    data: requirementsPayload,
    isLoading,
    mutate: mutateRequirements,
    isValidating,
  } = useSWR(requirementKey, fetcher, { revalidateOnFocus: false });

  const { data: projectsPayload } = useSWR('/api/projects?page=1&pageSize=100', fetcher, {
    revalidateOnFocus: false,
  });

  const requirements: RequirementItem[] = Array.isArray(requirementsPayload?.data?.list)
    ? requirementsPayload.data.list
    : [];

  const projects: ProjectOption[] = Array.isArray(projectsPayload?.data?.list)
    ? projectsPayload.data.list.map((item: { id: string; name: string }) => ({
        id: item.id,
        name: item.name,
      }))
    : [];

  const selectedCount = selectedIds.size;

  const toggleSelected = (id: string, checked: boolean) => {
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

  const clearSelected = () => {
    setSelectedIds(new Set());
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      return;
    }

    if (!window.confirm(`确认删除已选中的 ${ids.length} 条需求吗？`)) {
      return;
    }

    try {
      const response = await fetch('/api/requirements', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const payload = await response.json();
      if (payload.code !== 0) {
        throw new Error(payload.error?.message || payload.message || '删除失败');
      }
      toast.success(`已删除 ${payload.data?.deleted ?? ids.length} 条需求`);
      clearSelected();
      await mutateRequirements();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  const handleDeleteOne = async (id: string) => {
    if (!window.confirm('确认删除该需求吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/requirements/${id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (payload.code !== 0) {
        throw new Error(payload.error?.message || payload.message || '删除失败');
      }
      toast.success('需求已删除');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await mutateRequirements();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  const handleCreate = async () => {
    if (!createForm.projectId) {
      toast.error('请选择项目');
      return;
    }
    if (!createForm.content.trim()) {
      toast.error('请输入需求内容');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: createForm.projectId,
          title: createForm.title.trim(),
          content: createForm.content.trim(),
        }),
      });
      const payload = await response.json();
      if (payload.code !== 0) {
        throw new Error(payload.error?.message || payload.message || '创建失败');
      }

      toast.success('需求创建成功');
      setCreateOpen(false);
      setCreateForm({ title: '', projectId: createForm.projectId, content: '' });
      await mutateRequirements();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建失败');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <BentoHeader
        title="需求管理"
        description="管理 AI 解析需求，并串联生成测试用例流程"
        count={requirements.length}
        countLabel="条需求"
        actionLabel="新建需求"
        onAction={() => setCreateOpen(true)}
        onRefresh={() => mutateRequirements()}
        isRefreshing={isValidating}
        secondaryActions={
          selectedCount > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">已选 {selectedCount} 条</span>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleBatchDelete}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                批量删除
              </Button>
            </div>
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Button
          variant="outline"
          className="justify-start h-12"
          onClick={() => router.push('/ai-generate/requirements/upload')}
        >
          <Upload className="w-4 h-4 mr-2" />
          上传需求文档
        </Button>
        <Button
          variant="outline"
          className="justify-start h-12"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          手动录入需求
        </Button>
        <Button
          variant="outline"
          className="justify-start h-12"
          onClick={() => router.push('/ai-generate/requirements')}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          AI 需求页
        </Button>
      </div>

      <BentoSearch
        value={search}
        onChange={setSearch}
        onSearch={() => mutateRequirements()}
        placeholder="搜索需求标题/内容"
      />

      {isLoading ? (
        <BentoCard className="p-12 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400" />
        </BentoCard>
      ) : requirements.length === 0 ? (
        <BentoCard className="p-12 text-center">
          <FileText className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">暂无需求数据</p>
        </BentoCard>
      ) : (
        <BentoGrid cols={2}>
          {requirements.map((item) => (
            <BentoCard key={item.id} variant="bordered" className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={(checked) => toggleSelected(item.id, Boolean(checked))}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <button
                      className="text-left font-semibold text-base text-slate-900 hover:text-[var(--electric)] truncate block w-full"
                      onClick={() => router.push(`/requirements/${item.id}`)}
                    >
                      {item.title}
                    </button>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">
                        {item.isConfirmed ? '已确认' : '待确认'}
                      </Badge>
                      <Badge variant="secondary">{item.testPointCount} 个测试点</Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-3 line-clamp-3">
                      {item.content || '暂无内容'}
                    </p>
                    <div className="text-xs text-slate-400 mt-3 space-y-1">
                      <p>项目：{item.project?.name || item.projectId}</p>
                      <p>更新时间：{formatDateTime(item.updatedAt)}</p>
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/requirements/${item.id}`)}>
                      查看详情
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(`/ai-generate/requirements/${item.id}`)
                      }
                    >
                      生成用例
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => handleDeleteOne(item.id)}
                    >
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </BentoCard>
          ))}
        </BentoGrid>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建需求</DialogTitle>
            <DialogDescription>录入需求内容后自动解析测试点</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>所属项目</Label>
              <Select
                value={createForm.projectId}
                onValueChange={(projectId) => setCreateForm((prev) => ({ ...prev, projectId }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择项目" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>需求标题（可选）</Label>
              <Input
                value={createForm.title}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="例如：用户登录功能"
              />
            </div>

            <div className="space-y-2">
              <Label>需求内容</Label>
              <Textarea
                rows={8}
                value={createForm.content}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, content: event.target.value }))
                }
                placeholder="请输入完整需求描述"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

