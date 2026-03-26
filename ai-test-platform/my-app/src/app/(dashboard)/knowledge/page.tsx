'use client';

import { ChangeEvent, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import {
  BookOpen,
  Database,
  Edit2,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { BentoCard, BentoGrid, BentoHeader } from '@/components/bento';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { safeFetcher } from '@/lib/utils/fetcher';

type ProjectOption = {
  id: string;
  name: string;
};

type KnowledgeItem = {
  id: string;
  title: string;
  content: string;
  category?: string | null;
  tags?: string | null;
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
};

type KnowledgeForm = {
  id?: string;
  title: string;
  content: string;
  category: string;
  tags: string;
  projectId: string;
};

function getErrorMessage(payload: any, fallback: string) {
  return payload?.error?.message || payload?.message || payload?.error || fallback;
}

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === 'string');
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      return raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function toDateText(value: string) {
  try {
    return new Date(value).toLocaleString('zh-CN');
  } catch {
    return value;
  }
}

function emptyForm(): KnowledgeForm {
  return {
    title: '',
    content: '',
    category: '',
    tags: '',
    projectId: '',
  };
}

export default function KnowledgePage() {
  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState('');
  const [viewing, setViewing] = useState<KnowledgeItem | null>(null);
  const [editingOpen, setEditingOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<KnowledgeForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('pageSize', '100');
    if (search.trim()) {
      params.set('search', search.trim());
    }
    if (projectId) {
      params.set('projectId', projectId);
    }
    return `/api/knowledge?${params.toString()}`;
  }, [search, projectId]);

  const { data, isLoading, mutate, isValidating } = useSWR(query, safeFetcher, {
    revalidateOnFocus: false,
  });
  const { data: projectData } = useSWR('/api/projects?page=1&pageSize=200', safeFetcher, {
    revalidateOnFocus: false,
  });

  const list: KnowledgeItem[] = Array.isArray(data?.data) ? data.data : [];
  const projects: ProjectOption[] = Array.isArray(projectData?.data?.list)
    ? projectData.data.list.map((item: { id: string; name: string }) => ({
        id: item.id,
        name: item.name,
      }))
    : [];

  const stats = {
    total: list.length,
    documents: list.length,
    categories: new Set(list.map((item) => item.category || '未分类')).size,
  };

  const openCreate = () => {
    setEditingForm((prev) => ({
      ...emptyForm(),
      projectId: prev.projectId || projectId || projects[0]?.id || '',
    }));
    setEditingOpen(true);
  };

  const openEdit = (item: KnowledgeItem) => {
    setEditingForm({
      id: item.id,
      title: item.title || '',
      content: item.content || '',
      category: item.category || '',
      tags: parseTags(item.tags).join(', '),
      projectId: item.projectId || item.project?.id || projectId || projects[0]?.id || '',
    });
    setEditingOpen(true);
  };

  const submitForm = async () => {
    const title = editingForm.title.trim();
    const content = editingForm.content.trim();
    const selectedProjectId = editingForm.projectId || projectId || projects[0]?.id || '';
    if (!title) {
      toast.error('请输入标题');
      return;
    }
    if (!content) {
      toast.error('请输入内容');
      return;
    }
    if (!selectedProjectId) {
      toast.error('请选择项目');
      return;
    }

    setSaving(true);
    try {
      const tags = editingForm.tags
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      const body = {
        title,
        content,
        category: editingForm.category.trim() || undefined,
        tags,
        projectId: selectedProjectId,
      };

      const response = await fetch(
        editingForm.id ? `/api/knowledge/${editingForm.id}` : '/api/knowledge',
        {
          method: editingForm.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, '保存失败'));
      }

      toast.success(editingForm.id ? '知识条目已更新' : '知识条目已创建');
      setEditingOpen(false);
      setEditingForm(emptyForm());
      await mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) {
      return;
    }
    try {
      const response = await fetch(`/api/knowledge/${deletingId}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, '删除失败'));
      }
      toast.success('知识条目已删除');
      setDeletingId('');
      await mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowed = new Set(['txt', 'md', 'json', 'csv', 'yaml', 'yml', 'html', 'htm']);
    if (!allowed.has(ext)) {
      toast.error('仅支持 txt/md/json/csv/yaml/html 文件');
      return;
    }

    const targetProjectId = projectId || projects[0]?.id || '';
    if (!targetProjectId) {
      toast.error('请先选择一个项目后再上传');
      return;
    }

    try {
      const content = (await file.text()).trim();
      if (!content) {
        toast.error('文件内容为空');
        return;
      }

      const response = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: file.name,
          content: content.slice(0, 50000),
          category: '上传文档',
          tags: ['upload', ext],
          projectId: targetProjectId,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, '上传失败'));
      }

      toast.success('上传成功并已创建知识条目');
      await mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '上传失败');
    }
  };

  return (
    <div className="space-y-6">
      <BentoHeader
        title="知识库"
        description="管理项目知识条目，支持新建、查看、编辑、删除和文档上传"
        count={stats.total}
        countLabel="条记录"
        actionLabel="新建知识条目"
        onAction={openCreate}
        onRefresh={() => mutate()}
        isRefreshing={isValidating}
        secondaryActions={
          <Button
            variant="outline"
            onClick={() => uploadInputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            上传文档
          </Button>
        }
      />

      <input
        ref={uploadInputRef}
        type="file"
        accept=".txt,.md,.json,.csv,.yaml,.yml,.html,.htm"
        className="hidden"
        onChange={handleFileUpload}
      />

      <BentoGrid cols={3}>
        <BentoCard variant="bordered" className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--electric)]/10">
              <Database className="h-5 w-5 text-[var(--electric)]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-slate-500">知识条目</p>
            </div>
          </div>
        </BentoCard>
        <BentoCard variant="bordered" className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.documents}</p>
              <p className="text-sm text-slate-500">文档总数</p>
            </div>
          </div>
        </BentoCard>
        <BentoCard variant="bordered" className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50">
              <BookOpen className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.categories}</p>
              <p className="text-sm text-slate-500">分类数</p>
            </div>
          </div>
        </BentoCard>
      </BentoGrid>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <Input
            className="pl-10"
            placeholder="搜索标题或内容"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select value={projectId || 'all'} onValueChange={(value) => setProjectId(value === 'all' ? '' : value)}>
          <SelectTrigger>
            <SelectValue placeholder="按项目筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部项目</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--electric)]" />
        </div>
      ) : list.length === 0 ? (
        <BentoCard className="p-12 text-center">
          <Database className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">暂无知识条目</p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            立即新建
          </Button>
        </BentoCard>
      ) : (
        <BentoGrid cols={2}>
          {list.map((item) => {
            const tags = parseTags(item.tags);
            return (
              <BentoCard key={item.id} variant="bordered" className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-base truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">{item.category || '未分类'}</Badge>
                      <Badge variant="outline">{item.project?.name || item.projectId || '-'}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-3 line-clamp-3">{item.content}</p>
                    {tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {tags.slice(0, 4).map((tag) => (
                          <Badge key={`${item.id}-${tag}`} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                        {tags.length > 4 ? <Badge variant="outline">+{tags.length - 4}</Badge> : null}
                      </div>
                    ) : null}
                    <p className="text-xs text-slate-400 mt-3">更新于 {toDateText(item.updatedAt)}</p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewing(item)}>
                        <Eye className="w-4 h-4 mr-2" />
                        查看
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(item)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        编辑
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600" onClick={() => setDeletingId(item.id)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </BentoCard>
            );
          })}
        </BentoGrid>
      )}

      <Dialog open={editingOpen} onOpenChange={setEditingOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingForm.id ? '编辑知识条目' : '新建知识条目'}</DialogTitle>
            <DialogDescription>创建后可在本页查看、继续编辑或删除。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>标题</Label>
                <Input
                  value={editingForm.title}
                  onChange={(event) =>
                    setEditingForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="请输入标题"
                />
              </div>
              <div className="space-y-2">
                <Label>项目</Label>
                <Select
                  value={editingForm.projectId || 'none'}
                  onValueChange={(value) =>
                    setEditingForm((prev) => ({ ...prev, projectId: value === 'none' ? '' : value }))
                  }
                  disabled={Boolean(editingForm.id)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择项目" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">请选择</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>分类</Label>
                <Input
                  value={editingForm.category}
                  onChange={(event) =>
                    setEditingForm((prev) => ({ ...prev, category: event.target.value }))
                  }
                  placeholder="例如：接口文档"
                />
              </div>
              <div className="space-y-2">
                <Label>标签（逗号分隔）</Label>
                <Input
                  value={editingForm.tags}
                  onChange={(event) =>
                    setEditingForm((prev) => ({ ...prev, tags: event.target.value }))
                  }
                  placeholder="api, regression"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>内容</Label>
              <Textarea
                rows={12}
                value={editingForm.content}
                onChange={(event) =>
                  setEditingForm((prev) => ({ ...prev, content: event.target.value }))
                }
                placeholder="请输入知识内容"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingOpen(false)}>
              取消
            </Button>
            <Button onClick={submitForm} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => (open ? null : setViewing(null))}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewing?.title}</DialogTitle>
            <DialogDescription>
              {viewing?.project?.name || viewing?.projectId || '-'} | 更新于{' '}
              {viewing ? toDateText(viewing.updatedAt) : '-'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{viewing?.category || '未分类'}</Badge>
              {parseTags(viewing?.tags).map((tag) => (
                <Badge key={`view-${tag}`} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="max-h-[60vh] overflow-auto rounded-md border bg-slate-50 p-4">
              <pre className="whitespace-pre-wrap text-sm leading-6">{viewing?.content}</pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>
              关闭
            </Button>
            {viewing ? (
              <Button
                onClick={() => {
                  setViewing(null);
                  openEdit(viewing);
                }}
              >
                编辑
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingId)} onOpenChange={(open) => (open ? null : setDeletingId(''))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除知识条目</DialogTitle>
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
