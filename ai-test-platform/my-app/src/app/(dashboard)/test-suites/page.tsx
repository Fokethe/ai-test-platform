'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Plus,
  Play,
  Edit2,
  Trash2,
  FolderKanban,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state';

interface TestSuite {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    testSuiteCases: number;
  };
}

interface Project {
  id: string;
  name: string;
  workspace: {
    id: string;
    name: string;
  };
}

export default function TestSuitesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get('projectId');

  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newSuite, setNewSuite] = useState({ name: '', description: '', projectId: '' });
  
  // 删除相关状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSuite, setDeletingSuite] = useState<TestSuite | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // 项目选择相关状态
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  // 用于页面项目选择的状态（独立于创建对话框）
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // 如果有URL中的projectId，使用它；否则让用户选择
  const effectiveProjectId = urlProjectId || selectedProjectId || newSuite.projectId;

  useEffect(() => {
    if (urlProjectId) {
      setNewSuite(prev => ({ ...prev, projectId: urlProjectId }));
      setSelectedProjectId(urlProjectId);
      fetchSuites(urlProjectId);
    } else {
      // 如果没有URL projectId，加载项目列表供用户选择
      fetchProjects();
      setLoading(false);
    }
  }, [urlProjectId]);

  // 当用户选择项目时，加载对应的测试套件
  useEffect(() => {
    if (!urlProjectId && selectedProjectId) {
      fetchSuites(selectedProjectId);
    }
  }, [selectedProjectId, urlProjectId]);

  const fetchProjects = async () => {
    setProjectsLoading(true);
    try {
      // 获取所有工作空间
      const wsRes = await fetch('/api/workspaces');
      const wsData = await wsRes.json();
      
      if (!wsData || wsData.code !== 0) {
        toast.error('获取工作空间失败');
        return;
      }

      const allProjects: Project[] = [];
      const workspaces = wsData.data?.list || [];
      
      for (const workspace of workspaces) {
        try {
          const projRes = await fetch(`/api/projects?workspaceId=${workspace.id}`);
          const projData = await projRes.json();
          
          if (projData && projData.code === 0) {
            const projectsList = projData.data?.list || [];
            if (projectsList.length > 0) {
              allProjects.push(...projectsList.map((p: any) => ({
                ...p,
                workspace: {
                  id: workspace.id,
                  name: workspace.name,
                },
              })));
            }
          }
        } catch (err) {
          console.error(`获取工作空间 ${workspace.id} 的项目失败:`, err);
        }
      }
      
      setProjects(allProjects);
    } catch (error) {
      console.error('获取项目列表失败:', error);
      toast.error('获取项目列表失败');
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchSuites = async (pid: string) => {
    if (!pid) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/test-suites?projectId=${pid}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || '获取失败');
      }
      const data = await res.json();
      // API 返回 { code: 0, data: { list: [...] } }
      if (data.code === 0 && data.data?.list) {
        setSuites(data.data.list);
      } else {
        setSuites([]);
      }
    } catch (error) {
      console.error('获取测试套件失败:', error);
      toast.error('获取测试套件失败');
      setSuites([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const projectIdToUse = urlProjectId || newSuite.projectId;
    
    if (!projectIdToUse) {
      toast.error('请选择所属项目');
      return;
    }

    try {
      const res = await fetch('/api/test-suites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSuite.name,
          description: newSuite.description,
          projectId: projectIdToUse,
          testCaseIds: [],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || '创建失败');
      }

      toast.success('测试套件创建成功');
      setCreateOpen(false);
      setNewSuite({ name: '', description: '', projectId: urlProjectId || '' });
      
      // 刷新列表
      fetchSuites(projectIdToUse);
      
      // 如果当前没有选择项目，更新选择
      if (!urlProjectId && !selectedProjectId) {
        setSelectedProjectId(projectIdToUse);
      }
    } catch (error: any) {
      console.error('创建测试套件失败:', error);
      toast.error(error.message || '创建测试套件失败');
    }
  };

  const handleDelete = async () => {
    if (!deletingSuite) return;
    
    setDeleting(true);

    try {
      const res = await fetch(`/api/test-suites/${deletingSuite.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || '删除失败');
      }

      toast.success('测试套件已删除');
      setDeleteDialogOpen(false);
      setDeletingSuite(null);
      if (effectiveProjectId) {
        fetchSuites(effectiveProjectId);
      }
    } catch (error: any) {
      console.error('删除测试套件失败:', error);
      toast.error(error.message || '删除测试套件失败');
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (suite: TestSuite, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingSuite(suite);
    setDeleteDialogOpen(true);
  };

  const handleExecute = async (id: string) => {
    try {
      const res = await fetch(`/api/test-suites/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headless: true }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || '执行失败');
      }

      const data = await res.json();
      toast.success('测试套件开始执行');
      router.push(`/executions?suiteExecutionId=${data.executionId}`);
    } catch (error: any) {
      console.error('执行测试套件失败:', error);
      toast.error(error.message || '执行测试套件失败');
    }
  };

  const filteredSuites = suites.filter((suite) =>
    suite.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedProject = projects.find(p => p.id === (urlProjectId || selectedProjectId));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">测试套件</h1>
          <p className="text-slate-600 mt-1">管理测试用例集合，支持批量执行</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={!urlProjectId && projects.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              新建套件
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建测试套件</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* 项目选择下拉框 */}
              <div>
                <label className="text-sm font-medium mb-2 block">所属项目 *</label>
                {urlProjectId ? (
                  <Input value={selectedProject ? `${selectedProject.workspace.name} / ${selectedProject.name}` : '当前项目'} disabled />
                ) : (
                  <Select
                    value={newSuite.projectId}
                    onValueChange={(value) => setNewSuite({ ...newSuite, projectId: value })}
                    disabled={projectsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={projectsLoading ? '加载中...' : '选择项目'} />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.workspace.name} / {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {projects.length === 0 && !projectsLoading && !urlProjectId && (
                  <p className="text-sm text-amber-600 mt-1">
                    还没有项目，请先创建工作空间 → 项目
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">套件名称 *</label>
                <Input
                  value={newSuite.name}
                  onChange={(e) =>
                    setNewSuite({ ...newSuite, name: e.target.value })
                  }
                  placeholder="例如：回归测试套件"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">描述</label>
                <Input
                  value={newSuite.description}
                  onChange={(e) =>
                    setNewSuite({ ...newSuite, description: e.target.value })
                  }
                  placeholder="描述这个测试套件的用途"
                />
              </div>
              <Button 
                onClick={handleCreate} 
                className="w-full"
                disabled={!(urlProjectId || newSuite.projectId) || !newSuite.name.trim()}
              >
                创建
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 项目选择（当URL中没有projectId时显示） */}
      {!urlProjectId && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">选择项目</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedProjectId}
              onValueChange={(value) => {
                setSelectedProjectId(value);
                fetchSuites(value);
              }}
              disabled={projectsLoading}
            >
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder={projectsLoading ? '加载中...' : '选择要查看的项目'} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.workspace.name} / {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {projects.length === 0 && !projectsLoading && (
              <p className="text-sm text-amber-600 mt-2">
                还没有项目，请先<Button variant="link" className="p-0 h-auto" onClick={() => router.push('/workspaces')}>创建工作空间</Button>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="搜索测试套件..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Content */}
      {!effectiveProjectId ? (
        <EmptyState
          icon={FolderKanban}
          title="请选择项目"
          description="请先选择一个项目来查看或创建测试套件"
        />
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSuites.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="暂无测试套件"
          description={
            search
              ? '没有找到匹配的测试套件'
              : '点击"新建套件"创建你的第一个测试套件'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuites.map((suite) => (
            <Card
              key={suite.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/test-suites/${suite.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg truncate" title={suite.name}>{suite.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExecute(suite.id);
                      }}
                    >
                      <Play className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={(e) => openDeleteDialog(suite, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                  {suite.description || '暂无描述'}
                </p>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <FolderKanban className="h-4 w-4" />
                      {suite._count?.testSuiteCases || 0} 个用例
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(suite.updatedAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              您确定要删除测试套件 <strong>{deletingSuite?.name}</strong> 吗？
              <br />
              此操作不可撤销，该测试套件与所有测试用例的关联都将被删除。
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
    </div>
  );
}
