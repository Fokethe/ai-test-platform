/**
 * Workspaces Page - 工作空间列表 (Bento风格)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Folder, MoreHorizontal, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import Link from 'next/link';
import { useApi } from '@/lib/hooks/use-api';
import { BentoCard, BentoGrid, BentoHeader } from '@/components/bento';
import { Skeleton } from '@/components/ui/skeleton';

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  projectCount: number;
}

export default function WorkspacesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const { data, isLoading, error, mutate } = useApi<{
    list: Workspace[];
    pagination: { total: number; page: number; pageSize: number; totalPages: number };
  }>('/api/workspaces');

  const workspaces = data?.list || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (result.code === 0) {
        toast.success('工作空间创建成功');
        setDialogOpen(false);
        setFormData({ name: '', description: '' });
        mutate();
        router.push(`/workspaces/${result.data.id}`);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('创建失败');
    } finally {
      setCreating(false);
    }
  };

  const filteredWorkspaces = workspaces.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.description && w.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
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

  if (error) {
    return (
      <div className="p-6">
        <BentoCard className="p-12 text-center">
          <p className="text-red-500">加载失败</p>
          <Button variant="outline" className="mt-4" onClick={() => mutate()}>
            重试
          </Button>
        </BentoCard>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <BentoHeader
          title="工作空间"
          description="管理您的测试团队和项目"
        />
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[var(--electric)] hover:bg-[var(--electric)]/90">
              <Plus className="w-4 h-4 mr-2" />
              创建工作空间
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建工作空间</DialogTitle>
              <DialogDescription>创建一个新的工作空间来组织您的项目</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>名称 *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="我的工作空间"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>描述</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="描述这个工作空间的用途..."
                    rows={3}
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="搜索工作空间..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Workspace List */}
      {filteredWorkspaces.length === 0 ? (
        <BentoCard className="p-12 text-center border-dashed">
          <Folder className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">还没有工作空间</p>
          <p className="text-sm text-slate-400 mt-1">创建您的第一个工作空间开始测试之旅</p>
          <Button className="mt-4 bg-[var(--electric)] hover:bg-[var(--electric)]/90" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            创建工作空间
          </Button>
        </BentoCard>
      ) : (
        <BentoGrid cols={3}>
          {filteredWorkspaces.map((workspace) => (
            <BentoCard
              key={workspace.id}
              variant="bordered"
              className="p-5 cursor-pointer group hover:border-[var(--electric)] transition-all duration-300"
              onClick={() => router.push(`/workspaces/${workspace.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate group-hover:text-[var(--electric)] transition-colors">
                    {workspace.name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {workspace.projectCount} 个项目
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/workspaces/${workspace.id}`)}>
                      查看详情
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/workspaces/${workspace.id}/settings`)}>
                      设置
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-sm text-slate-500 line-clamp-2 mt-3">
                {workspace.description || '暂无描述'}
              </p>
              <div className="flex items-center mt-4 text-sm text-slate-400">
                <ChevronRight className="h-4 w-4 ml-auto group-hover:text-[var(--electric)] group-hover:translate-x-1 transition-all" />
              </div>
            </BentoCard>
          ))}
        </BentoGrid>
      )}
    </div>
  );
}
