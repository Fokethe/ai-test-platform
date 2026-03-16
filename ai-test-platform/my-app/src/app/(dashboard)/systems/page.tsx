'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Server, MoreVertical, Globe, ChevronRight } from 'lucide-react';
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
  project: {
    name: string;
  };
  _count: {
    pages: number;
  };
}

export default function SystemsPage() {
  const router = useRouter();
  const [systems, setSystems] = useState<System[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', baseUrl: '', projectId: '' });
  const [projects, setProjects] = useState<{id: string, name: string}[]>([]);

  const fetchSystems = async () => {
    try {
      const response = await fetch('/api/systems');
      const data = await response.json();
      if (data.code === 0) {
        setSystems(data.data.list);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('获取系统列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      if (data.code === 0) {
        setProjects(data.data.list);
        if (data.data.list.length > 0) {
          setFormData(prev => ({ ...prev, projectId: data.data.list[0].id }));
        }
      }
    } catch (error) {
      console.error('获取项目失败');
    }
  };

  useEffect(() => {
    fetchSystems();
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch('/api/systems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.code === 0) {
        toast.success('系统创建成功');
        setDialogOpen(false);
        setFormData({ name: '', baseUrl: '', projectId: projects[0]?.id || '' });
        fetchSystems();
        router.push(`/systems/${data.data.id}`);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <BentoHeader
          title="系统管理"
          description="管理您的测试系统和页面"
        />
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
                创建一个新的系统来组织测试页面
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="project">所属项目</Label>
                  <select
                    id="project"
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--electric)] focus:border-[var(--electric)] outline-none"
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    required
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
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
                <Button type="submit" disabled={creating || projects.length === 0} className="bg-[var(--electric)] hover:bg-[var(--electric)]/90">
                  {creating ? '创建中...' : '创建'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Systems List */}
      {systems.length === 0 ? (
        <BentoCard className="p-12 text-center border-dashed">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Server className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">还没有系统</h3>
          <p className="text-slate-500 mb-6">创建您的第一个系统来组织测试页面</p>
          <Button onClick={() => setDialogOpen(true)} className="bg-[var(--electric)] hover:bg-[var(--electric)]/90">
            <Plus className="mr-2 h-4 w-4" />
            创建系统
          </Button>
        </BentoCard>
      ) : (
        <BentoGrid cols={3}>
          {systems.map((system) => (
            <BentoCard
              key={system.id}
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
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
                <div className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  <span>{system._count.pages} 个页面</span>
                </div>
                <span className="text-xs text-slate-400">{system.project.name}</span>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[var(--electric)] group-hover:translate-x-1 transition-all" />
              </div>
            </BentoCard>
          ))}
        </BentoGrid>
      )}
    </div>
  );
}
