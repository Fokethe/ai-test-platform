'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Page {
  id: string;
  name: string;
  path: string;
  system: {
    id: string;
    name: string;
    project: {
      id: string;
      name: string;
      workspace: {
        id: string;
        name: string;
      };
    };
  };
}

function NewTestCaseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPageId = searchParams.get('pageId');
  
  const [loading, setLoading] = useState(false);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [pages, setPages] = useState<Page[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    preCondition: '',
    steps: [''],
    expectation: '',
    priority: 'P1',
    pageId: urlPageId || '',
  });

  useEffect(() => {
    fetchPages();
  }, []);

  // 当URL参数变化时更新表单
  useEffect(() => {
    if (urlPageId) {
      setFormData(prev => ({ ...prev, pageId: urlPageId }));
    }
  }, [urlPageId]);

  const fetchPages = async () => {
    try {
      // 获取所有工作空间，然后获取所有页面
      const wsRes = await fetch('/api/workspaces');
      const wsData = await wsRes.json();
      
      if (wsData.code !== 0) {
        setPagesLoading(false);
        return;
      }

      const allPages: Page[] = [];
      
      for (const workspace of wsData.data.list) {
        // 获取项目
        const projRes = await fetch(`/api/projects?workspaceId=${workspace.id}`);
        const projData = await projRes.json();
        
        if (projData.code !== 0) continue;
        
        for (const project of projData.data.list) {
          // 获取系统
          const sysRes = await fetch(`/api/systems?projectId=${project.id}`);
          const sysData = await sysRes.json();
          
          if (sysData.code !== 0) continue;
          
          for (const system of sysData.data.list) {
            // 获取页面
            const pageRes = await fetch(`/api/pages?systemId=${system.id}`);
            const pageData = await pageRes.json();
            
            if (pageData.code === 0 && pageData.data.list.length > 0) {
              allPages.push(...pageData.data.list.map((p: Page) => ({
                ...p,
                system: {
                  ...system,
                  project: {
                    ...project,
                    workspace,
                  },
                },
              })));
            }
          }
        }
      }
      
      setPages(allPages);
      
      // 如果URL中有pageId，验证它是否存在
      if (urlPageId && !allPages.find(p => p.id === urlPageId)) {
        toast.warning('指定的页面不存在或您没有权限访问');
      }
    } catch (error) {
      console.error('Fetch pages error:', error);
      toast.error('加载页面列表失败');
    } finally {
      setPagesLoading(false);
    }
  };

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, ''],
    });
  };

  const removeStep = (index: number) => {
    const newSteps = formData.steps.filter((_, i) => i !== index);
    setFormData({ ...formData, steps: newSteps });
  };

  const updateStep = (index: number, value: string) => {
    const newSteps = [...formData.steps];
    newSteps[index] = value;
    setFormData({ ...formData, steps: newSteps });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.pageId) {
      toast.error('请选择所属页面');
      return;
    }

    if (formData.steps.length === 0 || formData.steps.some(s => !s.trim())) {
      toast.error('请至少填写一个步骤');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/testcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          steps: formData.steps.filter(s => s.trim()),
        }),
      });

      const data = await response.json();

      if (data.code === 0) {
        toast.success('测试用例创建成功');
        // 创建成功后跳转到用例列表
        router.push('/testcases');
      } else {
        toast.error(data.message || '创建失败');
      }
    } catch (error) {
      toast.error('创建失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const selectedPage = pages.find(p => p.id === formData.pageId);

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/testcases" className="text-slate-600 hover:text-slate-900 flex items-center gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            返回用例库
          </Link>
          <h1 className="text-2xl font-bold">新建测试用例</h1>
          <p className="text-slate-600 mt-1">创建一个新的测试用例</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">用例标题 *</Label>
                <Input
                  id="title"
                  placeholder="输入测试用例标题"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pageId">所属页面 *</Label>
                <Select
                  value={formData.pageId}
                  onValueChange={(value) => setFormData({ ...formData, pageId: value })}
                  disabled={pagesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={pagesLoading ? '加载中...' : (selectedPage ? `${selectedPage.system.project.workspace.name} / ${selectedPage.system.project.name} / ${selectedPage.system.name} / ${selectedPage.name}` : '选择页面')} />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {page.system.project.workspace.name} / {page.system.project.name} / {page.system.name} / {page.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {pages.length === 0 && !pagesLoading && (
                  <p className="text-sm text-amber-600">
                    还没有页面，请先在工作台中创建工作空间 → 项目 → 系统 → 页面
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">优先级</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P0">P0 - 核心流程</SelectItem>
                    <SelectItem value="P1">P1 - 重要功能</SelectItem>
                    <SelectItem value="P2">P2 - 一般功能</SelectItem>
                    <SelectItem value="P3">P3 - 边缘场景</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preCondition">前置条件</Label>
                <Textarea
                  id="preCondition"
                  placeholder="执行测试前的准备条件"
                  value={formData.preCondition}
                  onChange={(e) => setFormData({ ...formData, preCondition: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>测试步骤 *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.steps.map((step, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-shrink-0 w-8 h-10 flex items-center justify-center text-sm text-slate-500">
                    {index + 1}.
                  </div>
                  <Input
                    placeholder={`步骤 ${index + 1}`}
                    value={step}
                    onChange={(e) => updateStep(index, e.target.value)}
                    required
                  />
                  {formData.steps.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addStep} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                添加步骤
              </Button>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>预期结果 *</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="描述执行步骤后应该看到的结果"
                value={formData.expectation}
                onChange={(e) => setFormData({ ...formData, expectation: e.target.value })}
                rows={4}
                required
              />
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading || pages.length === 0}>
              {loading ? '创建中...' : '创建用例'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/testcases')}>
              取消
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 加载状态组件
function LoadingState() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

// 主页面组件
export default function NewTestCasePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <NewTestCaseForm />
    </Suspense>
  );
}
