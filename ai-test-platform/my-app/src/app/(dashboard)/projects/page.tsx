'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Edit2,
  ExternalLink,
  FolderOpen,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
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

type ProjectStatus = 'ACTIVE' | 'ARCHIVED';

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: string;
  systemCount?: number;
  testCount?: number;
  memberCount?: number;
  workspaceId: string;
};

type WorkspaceOption = {
  id: string;
  name: string;
};

type ProjectForm = {
  id?: string;
  name: string;
  description: string;
  workspaceId: string;
  status: ProjectStatus;
};

const STATUS_STYLE: Record<ProjectStatus, { label: string; className: string }> = {
  ACTIVE: {
    label: '运行中',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  ARCHIVED: {
    label: '已归档',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

function emptyForm(workspaceId = ''): ProjectForm {
  return {
    name: '',
    description: '',
    workspaceId,
    status: 'ACTIVE',
  };
}

function getErrorMessage(payload: any, fallback: string) {
  return payload?.error?.message || payload?.message || payload?.error || fallback;
}

function toDateText(value: string) {
  try {
    return new Date(value).toLocaleDateString('zh-CN');
  } catch {
    return value;
  }
}

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceIdFromUrl = searchParams.get('workspaceId') || '';

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState<ProjectForm>(emptyForm(workspaceIdFromUrl));
  const [deletingId, setDeletingId] = useState('');
  const [batchDeleting, setBatchDeleting] = useState(false);

  const selectedCount = selectedIds.size;

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('pageSize', '200');
      if (workspaceIdFromUrl) {
        params.set('workspaceId', workspaceIdFromUrl);
      }
      const response = await fetch(`/api/projects?${params.toString()}`, {
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok || payload?.code !== 0) {
        throw new Error(getErrorMessage(payload, '获取项目列表失败'));
      }
      const list: Project[] = Array.isArray(payload?.data?.list) ? payload.data.list : [];
      setProjects(list);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const response = await fetch('/api/workspaces?page=1&pageSize=200', {
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok || payload?.code !== 0) {
        return;
      }
      const list = Array.isArray(payload?.data?.list) ? payload.data.list : [];
      setWorkspaces(
        list.map((item: { id: string; name: string }) => ({
          id: item.id,
          name: item.name,
        }))
      );
    } catch {
      // Ignore workspace loading errors in list page.
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchWorkspaces();
  }, [workspaceIdFromUrl]);

  useEffect(() => {
    if (!form.workspaceId) {
      if (workspaceIdFromUrl) {
        setForm((prev) => ({ ...prev, workspaceId: workspaceIdFromUrl }));
      } else if (workspaces.length === 1) {
        setForm((prev) => ({ ...prev, workspaceId: workspaces[0].id }));
      }
    }
  }, [form.workspaceId, workspaceIdFromUrl, workspaces]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return projects;
    }
    return projects.filter((project) => {
      const title = project.name.toLowerCase();
      const desc = (project.description || '').toLowerCase();
      return title.includes(keyword) || desc.includes(keyword);
    });
  }, [projects, search]);

  const openCreate = () => {
    setForm(emptyForm(workspaceIdFromUrl || workspaces[0]?.id || ''));
    setFormOpen(true);
  };

  const openEdit = (project: Project) => {
    setForm({
      id: project.id,
      name: project.name,
      description: project.description || '',
      workspaceId: project.workspaceId,
      status: project.status,
    });
    setFormOpen(true);
  };

  const submitForm = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error('请输入项目名称');
      return;
    }
    if (!form.workspaceId) {
      toast.error('请选择工作空间');
      return;
    }

    setFormLoading(true);
    try {
      const method = form.id ? 'PUT' : 'POST';
      const endpoint = form.id ? `/api/projects/${form.id}` : '/api/projects';
      const body = form.id
        ? {
            name,
            description: form.description.trim() || null,
            status: form.status,
          }
        : {
            name,
            description: form.description.trim(),
            workspaceId: form.workspaceId,
            status: form.status,
          };

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok || payload?.code !== 0) {
        throw new Error(getErrorMessage(payload, form.id ? '编辑失败' : '创建失败'));
      }

      toast.success(form.id ? '项目已更新' : '项目已创建');
      const createdId = payload?.data?.id;
      setFormOpen(false);
      await fetchProjects();

      if (!form.id && createdId) {
        router.push(`/projects/${createdId}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : form.id ? '编辑失败' : '创建失败');
    } finally {
      setFormLoading(false);
    }
  };

  const deleteOne = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || payload?.code !== 0) {
        throw new Error(getErrorMessage(payload, '删除失败'));
      }
      toast.success('项目已删除');
      setDeletingId('');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
      await fetchProjects();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  const batchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      return;
    }

    setBatchDeleting(true);
    let successCount = 0;
    const failedNames: string[] = [];

    for (const id of ids) {
      try {
        const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        const payload = await response.json();
        if (!response.ok || payload?.code !== 0) {
          const projectName = projects.find((project) => project.id === id)?.name || id;
          failedNames.push(projectName);
          continue;
        }
        successCount += 1;
      } catch {
        const projectName = projects.find((project) => project.id === id)?.name || id;
        failedNames.push(projectName);
      }
    }

    if (successCount > 0) {
      toast.success(`已删除 ${successCount} 个项目`);
    }
    if (failedNames.length > 0) {
      toast.error(`删除失败 ${failedNames.length} 个: ${failedNames.join(', ')}`);
    }

    setBatchDeleting(false);
    setSelectedIds(new Set());
    await fetchProjects();
  };

  const toggleSelection = (id: string, checked: boolean) => {
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

  return (
    <div className="space-y-6 p-6">
      <BentoHeader
        title="项目管理"
        description="集中管理项目信息，支持快捷查看、编辑和删除"
        count={projects.length}
        countLabel="个项目"
        actionLabel="新建项目"
        onAction={openCreate}
        onRefresh={fetchProjects}
        isRefreshing={loading}
        secondaryActions={
          selectedCount > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">已选 {selectedCount} 个</span>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                disabled={batchDeleting}
                onClick={batchDelete}
              >
                {batchDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-1" />
                )}
                批量删除
              </Button>
            </div>
          ) : null
        }
      />

      <BentoSearch
        value={search}
        onChange={setSearch}
        onSearch={() => null}
        placeholder="搜索项目名称或描述"
      />

      {loading ? (
        <BentoCard className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
        </BentoCard>
      ) : filtered.length === 0 ? (
        <BentoCard className="p-12 text-center">
          <FolderOpen className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">暂无项目</p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            创建第一个项目
          </Button>
        </BentoCard>
      ) : (
        <BentoGrid cols={3}>
          {filtered.map((project) => (
            <BentoCard key={project.id} variant="bordered" className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <Checkbox
                    checked={selectedIds.has(project.id)}
                    onCheckedChange={(value) => toggleSelection(project.id, Boolean(value))}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-lg truncate">{project.name}</p>
                    <div className="mt-2">
                      <Badge variant="outline" className={STATUS_STYLE[project.status].className}>
                        {STATUS_STYLE[project.status].label}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-3 line-clamp-2 min-h-10">
                      {project.description || '暂无描述'}
                    </p>
                    <div className="mt-4 text-xs text-slate-500 space-y-1">
                      <p>系统: {project.systemCount || 0}</p>
                      <p>用例: {project.testCount || 0}</p>
                      <p>成员: {project.memberCount || 0}</p>
                      <p>创建于: {toDateText(project.createdAt)}</p>
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
                    <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}`)}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      查看详情
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEdit(project)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => setDeletingId(project.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-4 pt-4 border-t flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <FolderOpen className="w-4 h-4 mr-1" />
                  详情
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(project)}>
                  <Edit2 className="w-4 h-4 mr-1" />
                  编辑
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setDeletingId(project.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  删除
                </Button>
              </div>
            </BentoCard>
          ))}
        </BentoGrid>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? '编辑项目' : '新建项目'}</DialogTitle>
            <DialogDescription>
              {form.id ? '更新项目名称、描述和状态。' : '填写项目信息并立即创建。'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="project-name">项目名称</Label>
              <Input
                id="project-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="请输入项目名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspace-select">工作空间</Label>
              <Select
                value={form.workspaceId || 'none'}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, workspaceId: value === 'none' ? '' : value }))
                }
                disabled={Boolean(form.id)}
              >
                <SelectTrigger id="workspace-select">
                  <SelectValue placeholder="请选择工作空间" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">请选择</SelectItem>
                  {workspaces.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-status">状态</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, status: value as ProjectStatus }))
                }
              >
                <SelectTrigger id="project-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">运行中</SelectItem>
                  <SelectItem value="ARCHIVED">已归档</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">描述</Label>
              <Textarea
                id="project-description"
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="请输入项目描述（可选）"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              取消
            </Button>
            <Button onClick={submitForm} disabled={formLoading}>
              {formLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  提交中...
                </>
              ) : form.id ? (
                '保存修改'
              ) : (
                '创建项目'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingId)} onOpenChange={(open) => (open ? null : setDeletingId(''))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除项目</DialogTitle>
            <DialogDescription>删除后不可恢复，确认继续吗？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId('')}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => deleteOne(deletingId)}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
