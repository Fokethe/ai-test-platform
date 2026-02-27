/**
 * Workspace Detail Page - 工作空间详情
 * TDD 第2轮：最小实现（绿阶段）
 */

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Folder, Plus, ArrowLeft, Settings, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { toast } from 'sonner';
import { useApi } from '@/lib/hooks/use-api';

interface Project {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  _count: { systems: number };
}

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  projects: Project[];
  members: Array<{
    id: string;
    role: string;
    userId: string;
  }>;
}

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: workspace, isLoading, error, mutate } = useApi<Workspace>(`/api/workspaces/${id}`);

  const handleDelete = async () => {
    if (!confirm('确定要删除这个工作空间吗？此操作不可撤销。')) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/workspaces/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('工作空间已删除');
        router.push('/workspaces');
      } else {
        const result = await res.json();
        toast.error(result.message || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">加载失败</p>
        <Button variant="outline" className="mt-4" onClick={() => mutate()}>
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/workspaces">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{workspace.name}</h1>
          <p className="text-slate-500 mt-1">
            {workspace.projects.length} 个项目 · {workspace.members.length} 个成员
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/workspaces/${id}/settings`}>
              <Settings className="w-4 h-4 mr-2" />
              设置
            </Link>
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? '删除中...' : '删除'}
          </Button>
        </div>
      </div>

      {/* Description */}
      {workspace.description && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <p className="text-slate-600">{workspace.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">项目</h2>
          <Button asChild>
            <Link href={`/projects/new?workspaceId=${id}`}>
              <Plus className="w-4 h-4 mr-2" />
              新建项目
            </Link>
          </Button>
        </div>

        {workspace.projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Folder className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">还没有项目</p>
              <p className="text-sm text-slate-400 mt-1">创建您的第一个项目</p>
              <Button className="mt-4" asChild>
                <Link href={`/projects/new?workspaceId=${id}`}>
                  <Plus className="w-4 h-4 mr-2" />
                  新建项目
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workspace.projects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    <Link
                      href={`/projects/${project.id}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {project.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>{project._count.systems} 个系统</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {project.description || '暂无描述'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Members Section */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">成员</h2>
          <Button variant="outline">
            <Users className="w-4 h-4 mr-2" />
            邀请成员
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {workspace.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium">
                      {member.userId.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm">{member.userId}</span>
                  </div>
                  <Badge variant={member.role === 'OWNER' ? 'default' : 'secondary'}>
                    {member.role === 'OWNER' ? '所有者' : '成员'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
