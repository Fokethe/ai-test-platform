'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Filter,
  Trash2,
  Edit2,
  Settings,
  FolderOpen,
  Users,
  FileText,
  ChevronDown,
  CheckSquare,
  Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'ARCHIVED' | 'SUSPENDED';
  createdAt: string;
  _count: {
    systems: number;
    testCases: number;
    members: number;
  };
}

const STATUS_CONFIG = {
  ACTIVE: { label: '运行中', color: 'bg-green-100 text-green-700 border-green-200' },
  ARCHIVED: { label: '已归档', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  SUSPENDED: { label: '已暂停', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
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

  useEffect(() => {
    fetchProjects();
  }, []);

  // 筛选项目
  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredProjects.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // 选择单个项目
  const handleSelect = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  // 创建项目
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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

  // 批量删除
  const handleBatchDelete = async () => {
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个项目吗？`)) return;
    
    toast.success(`已删除 ${selectedIds.size} 个项目`);
    setSelectedIds(new Set());
    fetchProjects();
  };

  const isAllSelected = filteredProjects.length > 0 && selectedIds.size === filteredProjects.length;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">项目管理</h1>
            <p className="text-slate-500 mt-1">共 {projects.length} 个项目</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            创建项目
          </Button>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="搜索项目名称或描述..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          
          {/* 批量操作 */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">已选 {selectedIds.size} 项</span>
              <Button variant="outline" size="sm" onClick={handleBatchDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                批量删除
              </Button>
            </div>
          )}
        </div>

        {/* 数据表格 */}
        <div className="border rounded-lg overflow-hidden bg-white">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="w-12 py-3 px-4">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">项目名称</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">状态</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-700">系统数</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-700">用例数</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-700">成员数</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">创建时间</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-6 w-6 border-2 border-slate-300 border-t-slate-600 rounded-full" />
                    </div>
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="text-6xl mb-4">📁</div>
                    <h3 className="text-lg font-semibold mb-2">还没有项目</h3>
                    <p className="text-slate-600 mb-6">创建您的第一个项目开始测试</p>
                    <Button onClick={() => setDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      创建项目
                    </Button>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr
                    key={project.id}
                    className="border-b last:border-b-0 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Checkbox
                        checked={selectedIds.has(project.id)}
                        onCheckedChange={(checked) =>
                          handleSelect(project.id, checked as boolean)
                        }
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div
                        className="cursor-pointer"
                        onClick={() => router.push(`/projects/${project.id}`)}
                      >
                        <div className="font-medium hover:text-blue-600 transition-colors">
                          {project.name}
                        </div>
                        {project.description && (
                          <div className="text-sm text-slate-500 line-clamp-1 mt-0.5">
                            {project.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={STATUS_CONFIG[project.status].color}
                      >
                        {STATUS_CONFIG[project.status].label}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center text-sm">
                      <div className="flex items-center justify-center gap-1 text-slate-600">
                        <FolderOpen className="h-3.5 w-3.5" />
                        {project._count.systems}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-sm">
                      <div className="flex items-center justify-center gap-1 text-slate-600">
                        <FileText className="h-3.5 w-3.5" />
                        {project._count.testCases || 0}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-sm">
                      <div className="flex items-center justify-center gap-1 text-slate-600">
                        <Users className="h-3.5 w-3.5" />
                        {project._count.members || 0}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {format(new Date(project.createdAt), 'yyyy-MM-dd', { locale: zhCN })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/projects/${project.id}`);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}`)}>
                              <FolderOpen className="mr-2 h-4 w-4" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit2 className="mr-2 h-4 w-4" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-slate-600">
            显示 {filteredProjects.length} 条，共 {projects.length} 条
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              上一页
            </Button>
            <Button variant="outline" size="sm" disabled>
              下一页
            </Button>
          </div>
        </div>
      </div>

      {/* 创建项目对话框 */}
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
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? '创建中...' : '创建'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
