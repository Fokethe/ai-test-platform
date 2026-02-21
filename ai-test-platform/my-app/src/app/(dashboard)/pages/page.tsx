'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText, MoreVertical, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

interface Page {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  system: {
    name: string;
    project: {
      name: string;
    };
  };
  _count: {
    testCases: number;
    requirements: number;
  };
}

export default function PagesPage() {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', path: '', systemId: '' });
  const [systems, setSystems] = useState<{id: string, name: string, project: {name: string}}[]>([]);

  const fetchPages = async () => {
    try {
      const response = await fetch('/api/pages');
      const data = await response.json();
      if (data.code === 0) {
        setPages(data.data.list);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('获取页面列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystems = async () => {
    try {
      const response = await fetch('/api/systems');
      const data = await response.json();
      if (data.code === 0) {
        setSystems(data.data.list);
        if (data.data.list.length > 0) {
          setFormData(prev => ({ ...prev, systemId: data.data.list[0].id }));
        }
      }
    } catch (error) {
      console.error('获取系统失败');
    }
  };

  useEffect(() => {
    fetchPages();
    fetchSystems();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.code === 0) {
        toast.success('页面创建成功');
        setDialogOpen(false);
        setFormData({ name: '', path: '', systemId: systems[0]?.id || '' });
        fetchPages();
        // 跳转到新页面
        router.push(`/pages/${data.data.id}`);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('创建失败');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">页面</h1>
            <p className="text-slate-600 mt-1">管理您的测试页面</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/ai-generate')}>
              <Sparkles className="mr-2 h-4 w-4" />
              AI 生成
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  创建页面
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>创建页面</DialogTitle>
                  <DialogDescription>
                    创建一个新的测试页面
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="system">所属系统</Label>
                      <select
                        id="system"
                        className="w-full border rounded-md px-3 py-2"
                        value={formData.systemId}
                        onChange={(e) => setFormData({ ...formData, systemId: e.target.value })}
                        required
                      >
                        {systems.map((s) => (
                          <option key={s.id} value={s.id}>{s.project.name} / {s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">页面名称</Label>
                      <Input
                        id="name"
                        placeholder="如：订单列表页"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="path">页面路径</Label>
                      <Input
                        id="path"
                        placeholder="/orders"
                        value={formData.path}
                        onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      取消
                    </Button>
                    <Button type="submit" disabled={creating || systems.length === 0}>
                      {creating ? '创建中...' : '创建'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-full mt-2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : pages.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-lg font-semibold mb-2">还没有页面</h3>
              <p className="text-slate-600 mb-6">创建您的第一个页面来添加测试用例</p>
              <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={() => router.push('/ai-generate')}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI 生成
                </Button>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  创建页面
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pages.map((page) => (
              <Card
                key={page.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/pages/${page.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg truncate" title={page.name}>{page.name}</CardTitle>
                      <CardDescription className="mt-1 truncate">
                        {page.path}
                      </CardDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>{page._count.testCases} 个用例</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {page.system.project.name} / {page.system.name}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
