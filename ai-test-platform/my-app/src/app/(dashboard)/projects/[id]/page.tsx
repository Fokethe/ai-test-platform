'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Server, 
  MoreVertical, 
  Edit, 
  Trash2,
  FolderKanban,
  Clock,
  Activity,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { toast } from 'sonner';
import { BentoCard, BentoGrid, BentoHeader } from '@/components/bento';
import { Skeleton } from '@/components/ui/skeleton';

interface System {
  id: string;
  name: string;
  baseUrl: string;
  createdAt: string;
  _count: {
    pages: number;
  };
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count?: {
    requirements: number;
    testCases: number;
  };
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [systems, setSystems] = useState<System[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', baseUrl: '' });

  const fetchData = async () => {
    try {
      const [projRes, sysRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/systems?projectId=${projectId}`)
      ]);
      
      const projData = await projRes.json();
      const sysData = await sysRes.json();
      
      if (projData.code === 0) setProject(projData.data);
      if (sysData.code === 0) setSystems(sysData.data?.list || []);
    } catch (error) {
      toast.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch('/api/systems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, projectId }),
      });

      const data = await response.json();

      if (data.code === 0) {
        toast.success('系统创建成功');
        setDialogOpen(false);
        setFormData({ name: '', baseUrl: '' });
        fetchData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('创建失败');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <BentoHeader
            title={project?.name || '项目详情'}
            description={project?.description || '管理系统和测试资源'}
          />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[var(--electric)] hover:bg-[var(--electric)]/90">
              <Plus className="mr-2 h-4 w-4" />
              创建系统
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建系统</DialogTitle>
              <DialogDescription>
                在 <span className="truncate max-w-[200px] inline-block align-bottom font-medium">{project?.name}</span> 中创建一个新系统
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">系统名称</Label>
                  <Input
                    id="name"
                    placeholder="如：订单管理系统"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baseUrl">基础 URL</Label>
                  <Input
                    id="baseUrl"
                    placeholder="https://example.com"
                    value={formData.baseUrl}
                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={creating} className="bg-[var(--electric)] hover:bg-[var(--electric)]/90">
                  {creating ? '创建中...' : '创建'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <BentoGrid cols={3}>
        <BentoCard variant="bordered" className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[var(--electric)]/10 rounded-xl">
              <FolderKanban className="h-6 w-6 text-[var(--electric)]" />
            </div>
            <div>
              <p className="text-sm text-slate-500">需求数量</p>
              <p className="text-2xl font-bold text-slate-900">{project?._count?.requirements || 0}</p>
            </div>
          </div>
        </BentoCard>

        <BentoCard variant="bordered" className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <Activity className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">测试用例</p>
              <p className="text-2xl font-bold text-slate-900">{project?._count?.testCases || 0}</p>
            </div>
          </div>
        </BentoCard>

        <BentoCard variant="bordered" className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <Server className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">系统数量</p>
              <p className="text-2xl font-bold text-slate-900">{systems.length}</p>
            </div>
          </div>
        </BentoCard>
      </BentoGrid>

      {/* Systems List */}
      <div>
        <h2 className="text-lg font-semibold mb-4">系统列表</h2>
        {systems.length === 0 ? (
          <BentoCard className="p-12 text-center border-dashed">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Server className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">还没有系统</h3>
            <p className="text-sm text-slate-500 mb-6">创建您的第一个系统来组织测试页面</p>
            <Button onClick={() => setDialogOpen(true)} className="bg-[var(--electric)] hover:bg-[var(--electric)]/90">
              <Plus className="mr-2 h-4 w-4" />
              创建系统
            </Button>
          </BentoCard>
        ) : (
          <BentoGrid cols={3}>
            {systems.map((system) => (
              <SystemCard key={system.id} system={system} onUpdate={fetchData} />
            ))}
          </BentoGrid>
        )}
      </div>
    </div>
  );
}

// 系统卡片组件
function SystemCard({ system, onUpdate }: { system: System; onUpdate: () => void }) {
  const router = useRouter();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: system.name,
    baseUrl: system.baseUrl,
  });

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditing(true);

    try {
      const response = await fetch(`/api/systems/${system.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      const data = await response.json();

      if (data.code === 0) {
        toast.success('系统更新成功');
        setEditDialogOpen(false);
        onUpdate();
      } else {
        toast.error(data.message || '更新失败');
      }
    } catch (error) {
      toast.error('更新失败');
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);

    try {
      const response = await fetch(`/api/systems/${system.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.code === 0) {
        toast.success('系统已删除');
        setDeleteDialogOpen(false);
        onUpdate();
      } else {
        toast.error(data.message || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <BentoCard
        variant="bordered"
        className="p-5 cursor-pointer group hover:border-[var(--electric)] transition-all duration-300"
        onClick={() => router.push(`/systems/${system.id}`)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 truncate group-hover:text-[var(--electric)] transition-colors" title={system.name}>
              {system.name}
            </h3>
            <p className="text-sm text-slate-500 mt-1 truncate" title={system.baseUrl}>
              {system.baseUrl}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                setEditDialogOpen(true);
              }}>
                <Edit className="mr-2 h-4 w-4" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteDialogOpen(true);
                }}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-2 mt-4 text-sm text-slate-500">
          <Server className="h-4 w-4" />
          <span>{system._count?.pages || 0} 个页面</span>
          <ChevronRight className="h-4 w-4 ml-auto text-slate-300 group-hover:text-[var(--electric)] group-hover:translate-x-1 transition-all" />
        </div>
      </BentoCard>

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑系统</DialogTitle>
            <DialogDescription>修改系统的名称和基础URL</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">系统名称</Label>
                <Input
                  id="edit-name"
                  placeholder="如：订单管理系统"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-baseUrl">基础 URL</Label>
                <Input
                  id="edit-baseUrl"
                  placeholder="https://example.com"
                  value={editFormData.baseUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, baseUrl: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={editing} className="bg-[var(--electric)] hover:bg-[var(--electric)]/90">
                {editing ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              您确定要删除系统 <strong>{system.name}</strong> 吗？
              <br />
              此操作不可撤销，该系统下的所有页面和测试用例都将被删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
