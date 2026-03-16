'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MoreHorizontal, Trash2, Edit2, FolderOpen, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { BentoCard, BentoGrid, BentoHeader, BentoSearch } from '@/components/bento';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'ARCHIVED' | 'SUSPENDED';
  createdAt: string;
  _count: { systems: number; testCases: number; members: number; };
}

const STATUS_CONFIG = {
  ACTIVE: { label: '运行中', color: 'bg-[var(--electric)]/10 text-[var(--electric)] border-[var(--electric)]/30' },
  ARCHIVED: { label: '已归档', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  SUSPENDED: { label: '已暂停', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' }
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      if (data.code === 0) {
        setProjects(data.data.list);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('获取项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelect = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) { newSet.add(id); } else { newSet.delete(id); }
    setSelectedIds(newSet);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.code === 0) {
        toast.success('项目创建成功');
        setDialogOpen(false);
        setFormData({ name: '', description: '' });
        fetchProjects();
        router.push(`/projects/${data.data.id}`);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleBatchDelete = async () => {
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个项目吗？`)) return;
    toast.success(`已删除 ${selectedIds.size} 个项目`);
    setSelectedIds(new Set());
    fetchProjects();
  };

  return (
    <div className="p-6 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-6">
        <BentoHeader
          title="项目管理"
          count={projects.length}
          countLabel="个项目"
          actionLabel="创建项目"
          onAction={() => setDialogOpen(true)}
          onRefresh={fetchProjects}
          isRefreshing={loading}
          secondaryActions={selectedIds.size > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">已选 {selectedIds.size} 项</span>
              <Button variant="outline" size="sm" onClick={handleBatchDelete} className="border-red-200 text-red-600 hover:bg-red-50">
                <Trash2 className="mr-2 h-4 w-4" />批量删除
              </Button>
            </div>
          ) : null}
        />
        <BentoSearch
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={() => {}}
          placeholder="搜索项目名称或描述..."
        />
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-[var(--electric)] border-t-transparent rounded-full" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-lg font-semibold mb-2">还没有项目</h3>
            <p className="text-slate-600 mb-6">创建您的第一个项目开始测试</p>
            <Button onClick={() => setDialogOpen(true)} className="bg-[var(--electric)] hover:bg-[var(--electric)]/90">
              <Plus className="mr-2 h-4 w-4" />创建项目
            </Button>
          </div>
        ) : (
          <BentoGrid cols={3}>
            {filteredProjects.map((project) => (
              <BentoCard
                key={project.id}
                variant="bordered"
                className="group relative p-5 transition-all duration-300 hover:border-[var(--electric)] hover:shadow-lg hover:shadow-[var(--electric)]/10"
              >
                <div className="absolute top-4 left-4 z-10">
                  <Checkbox
                    checked={selectedIds.has(project.id)}
                    onCheckedChange={(checked) => handleSelect(project.id, checked as boolean)}
                    className="border-slate-300 data-[state=checked]:bg-[var(--electric)] data-[state=checked]:border-[var(--electric)]"
                  />
                </div>
                <div className="absolute top-4 right-4 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}`)}>
                        <FolderOpen className="mr-2 h-4 w-4" />查看详情
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit2 className="mr-2 h-4 w-4" />编辑
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="cursor-pointer pt-8" onClick={() => router.push(`/projects/${project.id}`)}>
                  <h3 className="font-semibold text-lg text-slate-900 group-hover:text-[var(--electric)] transition-colors line-clamp-1">
                    {project.name}
                  </h3>
                  <div className="mt-2">
                    <Badge variant="outline" className={STATUS_CONFIG[project.status].color}>
                      {STATUS_CONFIG[project.status].label}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-slate-500 line-clamp-2 min-h-[40px]">
                    {project.description || '暂无描述'}
                  </p>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <div className="p-1.5 rounded-md bg-[var(--electric)]/10">
                          <FolderOpen className="h-3.5 w-3.5 text-[var(--electric)]" />
                        </div>
                        <span className="font-medium">{project._count.systems}</span>
                        <span className="text-slate-400">系统</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <div className="p-1.5 rounded-md bg-blue-50">
                          <FileText className="h-3.5 w-3.5 text-blue-500" />
                        </div>
                        <span className="font-medium">{project._count.testCases || 0}</span>
                        <span className="text-slate-400">用例</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <div className="p-1.5 rounded-md bg-purple-50">
                          <Users className="h-3.5 w-3.5 text-purple-500" />
                        </div>
                        <span className="font-medium">{project._count.members || 0}</span>
                        <span className="text-slate-400">成员</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-400">
                    创建于 {format(new Date(project.createdAt), 'yyyy-MM-dd', { locale: zhCN })}
                  </div>
                </div>
              </BentoCard>
            ))}
          </BentoGrid>
        )}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建项目</DialogTitle>
            <DialogDescription>创建一个新的测试项目</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">项目名称 *</Label>
                <Input
                  id="name"
                  placeholder="输入项目名称"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">项目描述</Label>
                <Textarea
                  id="description"
                  placeholder="描述这个项目的用途（可选）"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button type="submit" disabled={creating} className="bg-[var(--electric)] hover:bg-[var(--electric)]/90">
                {creating ? '创建中...' : '创建'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
