'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  workspace: {
    id: string;
    name: string;
  };
}

interface TestCase {
  id: string;
  title: string;
  priority: string;
  page: {
    id: string;
    name: string;
    system: {
      id: string;
      name: string;
      project?: {
        id: string;
        name: string;
      };
    };
  };
}

function NewTestSuiteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get('projectId');
  
  const [loading, setLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [testCasesLoading, setTestCasesLoading] = useState(false);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectId: urlProjectId || '',
    selectedTestCaseIds: [] as string[],
  });

  // 加载项目列表
  useEffect(() => {
    console.log('[TestSuitesNew] Component mounted, fetching projects...');
    fetchProjects();
  }, []);

  // 当项目改变时加载测试用例
  useEffect(() => {
    console.log('[TestSuitesNew] Project changed:', formData.projectId);
    if (formData.projectId) {
      fetchTestCases(formData.projectId);
    } else {
      console.log('[TestSuitesNew] No project selected, clearing test cases');
      setTestCases([]);
    }
  }, [formData.projectId]);

  const fetchProjects = async () => {
    setProjectsLoading(true);
    try {
      console.log('[TestSuitesNew] Fetching workspaces...');
      const wsRes = await fetch('/api/workspaces');
      const wsData = await wsRes.json();
      
      console.log('[TestSuitesNew] Workspaces response:', wsData);
      
      if (!wsData || wsData.code !== 0) {
        toast.error('获取工作空间失败');
        return;
      }

      const allProjects: Project[] = [];
      const workspaces = wsData.data?.list || [];
      
      console.log(`[TestSuitesNew] Found ${workspaces.length} workspaces`);
      
      for (const workspace of workspaces) {
        try {
          console.log(`[TestSuitesNew] Fetching projects for workspace: ${workspace.id}`);
          const projRes = await fetch(`/api/projects?workspaceId=${workspace.id}`);
          const projData = await projRes.json();
          
          console.log(`[TestSuitesNew] Projects for workspace ${workspace.id}:`, projData);
          
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
          console.error(`[TestSuitesNew] 获取工作空间 ${workspace.id} 的项目失败:`, err);
        }
      }
      
      console.log(`[TestSuitesNew] Total projects found: ${allProjects.length}`, allProjects);
      setProjects(allProjects);
      
      // 如果URL中有projectId，验证它是否有效
      if (urlProjectId && !allProjects.find(p => p.id === urlProjectId)) {
        console.warn(`[TestSuitesNew] URL projectId ${urlProjectId} not found in available projects`);
        toast.warning('指定的项目不存在或您没有权限访问');
      }
    } catch (error) {
      console.error('[TestSuitesNew] 获取项目列表失败:', error);
      toast.error('获取项目列表失败');
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchTestCases = async (projectId: string) => {
    if (!projectId) return;
    console.log(`[TestSuitesNew] Fetching test cases for project: ${projectId}`);
    setTestCasesLoading(true);
    try {
      const url = `/api/testcases?projectId=${projectId}`;
      console.log(`[TestSuitesNew] API URL: ${url}`);
      
      const res = await fetch(url);
      console.log(`[TestSuitesNew] API response status: ${res.status}`);
      
      const data = await res.json();
      console.log(`[TestSuitesNew] API response data:`, data);
      
      if (data && data.code === 0) {
        const testCasesList = data.data?.list || [];
        console.log(`[TestSuitesNew] Found ${testCasesList.length} test cases`);
        
        if (testCasesList.length > 0) {
          console.log(`[TestSuitesNew] Sample test case:`, testCasesList[0]);
        }
        
        // 适配数据结构
        const formattedTestCases: TestCase[] = testCasesList.map((tc: any) => {
          const formatted = {
            ...tc,
            page: tc.page || {
              id: '',
              name: '未知页面',
              system: {
                id: '',
                name: '未知系统',
              }
            }
          };
          // 确保 system 存在
          if (!formatted.page.system) {
            formatted.page.system = {
              id: '',
              name: '未知系统',
            };
          }
          return formatted;
        });
        
        console.log(`[TestSuitesNew] Formatted test cases:`, formattedTestCases);
        setTestCases(formattedTestCases);
      } else {
        console.warn(`[TestSuitesNew] API returned error code: ${data?.code}, message: ${data?.message}`);
        setTestCases([]);
      }
    } catch (error) {
      console.error('[TestSuitesNew] 获取测试用例失败:', error);
      toast.error('获取测试用例失败');
      setTestCases([]);
    } finally {
      setTestCasesLoading(false);
      console.log(`[TestSuitesNew] Test cases loading finished`);
    }
  };

  const toggleTestCase = (testCaseId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTestCaseIds: prev.selectedTestCaseIds.includes(testCaseId)
        ? prev.selectedTestCaseIds.filter(id => id !== testCaseId)
        : [...prev.selectedTestCaseIds, testCaseId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.projectId) {
      toast.error('请选择所属项目');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('请输入套件名称');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/test-suites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          projectId: formData.projectId,
          testCaseIds: formData.selectedTestCaseIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '创建失败');
      }

      const data = await response.json();
      toast.success('测试套件创建成功');
      
      // 创建成功后跳转到测试套件列表，带上 projectId
      if (urlProjectId) {
        router.push(`/test-suites?projectId=${urlProjectId}`);
      } else if (formData.projectId) {
        router.push(`/test-suites?projectId=${formData.projectId}`);
      } else {
        router.push('/test-suites');
      }
    } catch (error: any) {
      console.error('创建测试套件失败:', error);
      toast.error(error.message || '创建失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const selectedProject = projects.find(p => p.id === formData.projectId);

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href={urlProjectId ? `/test-suites?projectId=${urlProjectId}` : "/test-suites"} className="text-slate-600 hover:text-slate-900 flex items-center gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            返回测试套件列表
          </Link>
          <h1 className="text-2xl font-bold">新建测试套件</h1>
          <p className="text-slate-600 mt-1">创建一个新的测试套件，用于组织相关测试用例</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 项目选择 */}
              <div className="space-y-2">
                <Label htmlFor="projectId">所属项目 *</Label>
                <Select
                  value={formData.projectId}
                  onValueChange={(value) => {
                    console.log(`[TestSuitesNew] Project selected: ${value}`);
                    setFormData({ 
                      ...formData, 
                      projectId: value,
                      selectedTestCaseIds: [], // 切换项目时清空已选择的用例
                    });
                  }}
                  disabled={projectsLoading || !!urlProjectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={projectsLoading ? '加载中...' : (selectedProject ? `${selectedProject.workspace.name} / ${selectedProject.name}` : '选择项目')} />
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
                  <p className="text-sm text-amber-600">
                    还没有项目，请先在工作台中创建工作空间 → 项目
                  </p>
                )}
              </div>

              {/* 套件名称 */}
              <div className="space-y-2">
                <Label htmlFor="name">套件名称 *</Label>
                <Input
                  id="name"
                  placeholder="例如：回归测试套件"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* 描述 */}
              <div className="space-y-2">
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  placeholder="描述这个测试套件的用途和范围"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 测试用例选择 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>选择测试用例</CardTitle>
            </CardHeader>
            <CardContent>
              {!formData.projectId ? (
                <p className="text-slate-500 text-center py-8">请先选择所属项目</p>
              ) : testCasesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : testCases.length === 0 ? (
                <div className="text-slate-500 text-center py-8">
                  <p className="mb-2">该项目下没有可用的测试用例</p>
                  <p className="text-sm text-slate-400 mb-4">
                    请先创建系统和页面，然后在页面下创建测试用例
                  </p>
                  <Link href="/testcases/new" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                    创建测试用例
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {testCases.map((testCase) => (
                    <div
                      key={testCase.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-slate-50 cursor-pointer"
                      onClick={() => toggleTestCase(testCase.id)}
                    >
                      <Checkbox
                        checked={formData.selectedTestCaseIds.includes(testCase.id)}
                        onCheckedChange={() => toggleTestCase(testCase.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{testCase.title}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {testCase.page?.system?.name || '未知系统'} / {testCase.page?.name || '未知页面'}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        testCase.priority === 'P0' ? 'bg-red-100 text-red-700' :
                        testCase.priority === 'P1' ? 'bg-orange-100 text-orange-700' :
                        testCase.priority === 'P2' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {testCase.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {formData.selectedTestCaseIds.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    已选择 {formData.selectedTestCaseIds.length} 个测试用例
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button 
              type="submit" 
              disabled={loading || !formData.projectId || !formData.name.trim()}
            >
              {loading ? '创建中...' : '创建套件'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push(urlProjectId ? `/test-suites?projectId=${urlProjectId}` : '/test-suites')}>
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
export default function NewTestSuitePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <NewTestSuiteForm />
    </Suspense>
  );
}
