'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Plus, Check, Loader2, FolderOpen, ChevronDown, Globe, Smartphone, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWorkspaces } from '@/lib/hooks/use-api';
import { Separator } from '@/components/ui/separator';

type TestCaseType = 'web' | 'app' | 'api';
type AppPlatform = 'ios' | 'android' | 'both';
type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface GeneratedTestCase {
  id?: string;
  title: string;
  preCondition: string;
  steps: string[];
  expectation: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  type: 'positive' | 'negative' | 'boundary';
  selected?: boolean;
}

function AIGenerateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageId = searchParams.get('pageId');

  const [requirement, setRequirement] = useState('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedCases, setGeneratedCases] = useState<GeneratedTestCase[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isMockData, setIsMockData] = useState(false);
  
  // 用例类型相关状态
  const [testCaseType, setTestCaseType] = useState<TestCaseType>('web');
  const [appPlatform, setAppPlatform] = useState<AppPlatform>('both');
  const [apiMethod, setApiMethod] = useState<ApiMethod>('GET');
  const [apiEndpoint, setApiEndpoint] = useState('');
  
  const [options, setOptions] = useState({
    includePositive: true,
    includeNegative: true,
    includeBoundary: true,
  });

  // 模拟进度条
  useEffect(() => {
    if (generating) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [generating]);

  const getTypePlaceholder = () => {
    switch (testCaseType) {
      case 'web':
        return `描述您要测试的 Web 功能需求，例如：

用户登录功能：
- 支持邮箱和密码登录
- 密码需要6-20位
- 连续5次错误锁定账号30分钟
- 支持记住密码7天`;
      case 'app':
        return `描述您要测试的 APP 功能需求，例如：

移动端登录功能：
- 支持手机号验证码登录
- 支持第三方账号登录（微信、QQ）
- 支持指纹/面容识别登录
- 登录状态保持30天`;
      case 'api':
        return `描述您要测试的 API 功能需求，例如：

用户注册接口：
- 校验手机号格式
- 校验密码强度（至少8位，包含字母和数字）
- 发送验证码
- 返回用户ID和token`;
      default:
        return '';
    }
  };

  const handleGenerate = async () => {
    if (!requirement.trim() || requirement.length < 5) {
      toast.error('需求描述至少需要5个字符');
      return;
    }

    if (!options.includePositive && !options.includeNegative && !options.includeBoundary) {
      toast.error('请至少选择一种用例类型');
      return;
    }

    // API 类型需要验证端点
    if (testCaseType === 'api' && !apiEndpoint.trim()) {
      toast.error('请输入 API 端点');
      return;
    }

    setGenerating(true);
    setProgress(10);

    try {
      // 从本地存储获取AI设置
      const aiSettings = localStorage.getItem('ai-settings');
      let temperature = 0.3;
      let apiKey = '';
      if (aiSettings) {
        try {
          const settings = JSON.parse(aiSettings);
          temperature = settings.temperature ?? 0.3;
          apiKey = settings.apiKey ?? '';
        } catch {}
      }

      const response = await fetch('/api/ai/generate-testcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementText: requirement,
          temperature,
          apiKey,  // 传递API Key
          options: {
            ...options,
            testCaseType,
            appPlatform: testCaseType === 'app' ? appPlatform : undefined,
            apiMethod: testCaseType === 'api' ? apiMethod : undefined,
            apiEndpoint: testCaseType === 'api' ? apiEndpoint : undefined,
          },
        }),
      });

      const data = await response.json();

      if (data.code === 0) {
        const cases = data.data.testCases.map((tc: GeneratedTestCase, index: number) => ({
          ...tc,
          id: `temp-${index}`,
          selected: true,
        }));
        setGeneratedCases(cases);
        setSuggestions(data.data.suggestions || []);
        setIsMockData(data.data.isMock || false);
        toast.success(`成功生成 ${cases.length} 个测试用例`);
      } else {
        toast.error(data.message || '生成失败');
      }
    } catch (error) {
      toast.error('生成失败，请稍后重试');
    } finally {
      setGenerating(false);
      setProgress(100);
    }
  };

  const toggleSelect = (index: number) => {
    const newCases = [...generatedCases];
    newCases[index].selected = !newCases[index].selected;
    setGeneratedCases(newCases);
  };

  const selectAll = () => {
    setGeneratedCases(generatedCases.map(c => ({ ...c, selected: true })));
  };

  const deselectAll = () => {
    setGeneratedCases(generatedCases.map(c => ({ ...c, selected: false })));
  };

  const [selectPageDialogOpen, setSelectPageDialogOpen] = useState(false);
  const { data: workspacesData } = useWorkspaces();
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [systems, setSystems] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);

  // 获取工作空间的项目
  useEffect(() => {
    if (selectedWorkspace) {
      fetch(`/api/workspaces/${selectedWorkspace}/projects`)
        .then(res => res.json())
        .then(data => {
          if (data.code === 0) {
            setProjects(data.data.list || []);
          }
        });
      setSelectedProject(null);
      setSelectedSystem(null);
      setSelectedPage(null);
      setSystems([]);
      setPages([]);
    }
  }, [selectedWorkspace]);

  // 获取项目的系统
  useEffect(() => {
    if (selectedProject) {
      fetch(`/api/projects/${selectedProject}/systems`)
        .then(res => res.json())
        .then(data => {
          if (data.code === 0) {
            setSystems(data.data.list || []);
          }
        });
      setSelectedSystem(null);
      setSelectedPage(null);
      setPages([]);
    }
  }, [selectedProject]);

  // 获取系统的页面
  useEffect(() => {
    if (selectedSystem) {
      fetch(`/api/systems/${selectedSystem}/pages`)
        .then(res => res.json())
        .then(data => {
          if (data.code === 0) {
            setPages(data.data.list || []);
          }
        });
      setSelectedPage(null);
    }
  }, [selectedSystem]);

  const handleImport = async () => {
    const selectedCases = generatedCases.filter(c => c.selected);
    if (selectedCases.length === 0) {
      toast.error('请至少选择一个用例');
      return;
    }

    // 如果没有 pageId，打开选择页面对话框
    if (!pageId && !selectedPage) {
      setSelectPageDialogOpen(true);
      return;
    }

    const targetPageId = pageId || selectedPage;
    if (!targetPageId) {
      toast.error('请选择目标页面');
      return;
    }

    await importTestCases(targetPageId);
  };

  const importTestCases = async (targetPageId: string) => {
    const selectedCases = generatedCases.filter(c => c.selected);
    let successCount = 0;

    for (const testCase of selectedCases) {
      try {
        const response = await fetch('/api/testcases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: testCase.title,
            preCondition: testCase.preCondition,
            steps: testCase.steps,
            expectation: testCase.expectation,
            priority: testCase.priority,
            pageId: targetPageId,
            isAiGenerated: true,
            testCaseType: testCaseType,
          }),
        });

        if (response.ok) {
          successCount++;
        }
      } catch (error) {
        console.error('Import test case error:', error);
      }
    }

    if (successCount > 0) {
      toast.success(`成功导入 ${successCount} 个测试用例`);
      setSelectPageDialogOpen(false);
      router.push(`/pages/${targetPageId}`);
    } else {
      toast.error('导入失败');
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'positive': return '正向';
      case 'negative': return '反向';
      case 'boundary': return '边界';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'positive': return 'bg-green-100 text-green-700';
      case 'negative': return 'bg-red-100 text-red-700';
      case 'boundary': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P0': return 'bg-red-100 text-red-700';
      case 'P1': return 'bg-orange-100 text-orange-700';
      case 'P2': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getTestCaseTypeIcon = (type: TestCaseType) => {
    switch (type) {
      case 'web': return <Globe className="h-4 w-4" />;
      case 'app': return <Smartphone className="h-4 w-4" />;
      case 'api': return <Server className="h-4 w-4" />;
    }
  };

  const getTestCaseTypeLabel = (type: TestCaseType) => {
    switch (type) {
      case 'web': return 'Web 测试';
      case 'app': return 'APP 测试';
      case 'api': return 'API 测试';
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href={pageId ? `/pages/${pageId}` : '/workspaces'} className="text-slate-600 hover:text-slate-900 flex items-center gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            返回
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-amber-500" />
                AI 生成测试用例
              </h1>
              <p className="text-slate-600 mt-1">输入需求描述，AI 自动生成测试用例</p>
            </div>
          </div>
          
          {/* 页面选择提示 */}
          {!pageId && (
            <Card className="mt-4 bg-amber-50 border-amber-200">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-5 w-5 text-amber-600" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-800">
                      当前未选择目标页面，生成的用例需要先选择页面才能导入。
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      您可以先生成用例，导入时再选择目标页面
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectPageDialogOpen(true)}
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    选择页面
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：输入区 */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>需求描述</CardTitle>
                <CardDescription>选择用例类型并输入需求</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 用例类型选择 */}
                <div className="space-y-2">
                  <Label>用例类型</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['web', 'app', 'api'] as TestCaseType[]).map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant={testCaseType === type ? 'default' : 'outline'}
                        className="flex items-center gap-2"
                        onClick={() => setTestCaseType(type)}
                      >
                        {getTestCaseTypeIcon(type)}
                        {getTestCaseTypeLabel(type)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* APP 平台选择 */}
                {testCaseType === 'app' && (
                  <div className="space-y-2">
                    <Label>目标平台</Label>
                    <Select
                      value={appPlatform}
                      onValueChange={(value: AppPlatform) => setAppPlatform(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择平台" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ios">iOS</SelectItem>
                        <SelectItem value="android">Android</SelectItem>
                        <SelectItem value="both">iOS & Android</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* API 端点和方法 */}
                {testCaseType === 'api' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>请求方法</Label>
                      <Select
                        value={apiMethod}
                        onValueChange={(value: ApiMethod) => setApiMethod(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择方法" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                          <SelectItem value="PATCH">PATCH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>API 端点</Label>
                      <Input
                        placeholder="/api/v1/users/register"
                        value={apiEndpoint}
                        onChange={(e) => setApiEndpoint(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <Separator />

                <Textarea
                  placeholder={getTypePlaceholder()}
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                  rows={10}
                  disabled={generating}
                />

                <div className="space-y-2">
                  <Label>生成选项</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="positive"
                        checked={options.includePositive}
                        onCheckedChange={(checked) =>
                          setOptions({ ...options, includePositive: checked as boolean })
                        }
                        disabled={generating}
                      />
                      <label htmlFor="positive" className="text-sm">正向用例（正常流程）</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="negative"
                        checked={options.includeNegative}
                        onCheckedChange={(checked) =>
                          setOptions({ ...options, includeNegative: checked as boolean })
                        }
                        disabled={generating}
                      />
                      <label htmlFor="negative" className="text-sm">反向用例（异常处理）</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="boundary"
                        checked={options.includeBoundary}
                        onCheckedChange={(checked) =>
                          setOptions({ ...options, includeBoundary: checked as boolean })
                        }
                        disabled={generating}
                      />
                      <label htmlFor="boundary" className="text-sm">边界用例（极限值）</label>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={generating || requirement.length < 5}
                  className="w-full"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      生成测试用例
                    </>
                  )}
                </Button>

                {generating && (
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-slate-600 text-center">
                      AI 正在分析需求并生成用例，请稍候...
                    </p>
                  </div>
                )}

                {isMockData && (
                  <p className="text-xs text-amber-600 text-center">
                    当前使用模拟数据，
                    <Link href="/ai-settings" className="underline hover:text-amber-700">
                      前往 AI 设置配置 API Key
                    </Link>
                    获得更智能的生成效果
                  </p>
                )}
              </CardContent>
            </Card>

            {suggestions.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base">AI 建议</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                    {suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧：结果区 */}
          <div>
            {generatedCases.length === 0 ? (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <div className="text-6xl mb-4">🤖</div>
                  <h3 className="text-lg font-semibold mb-2">开始生成</h3>
                  <p className="text-slate-600">在左侧输入需求描述，点击生成按钮</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">
                    生成结果 ({generatedCases.filter(c => c.selected).length}/{generatedCases.length})
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAll}>
                      全选
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deselectAll}>
                      全不选
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {generatedCases.map((testCase, index) => (
                    <Card
                      key={testCase.id}
                      className={`cursor-pointer transition-all ${
                        testCase.selected ? 'ring-2 ring-blue-500' : 'opacity-60'
                      }`}
                      onClick={() => toggleSelect(index)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {testCase.selected ? (
                              <Check className="h-5 w-5 text-blue-500" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-slate-300" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{testCase.title}</span>
                              <Badge className={getTypeColor(testCase.type)}>
                                {getTypeLabel(testCase.type)}
                              </Badge>
                              <Badge className={getPriorityColor(testCase.priority)}>
                                {testCase.priority}
                              </Badge>
                            </div>
                            {testCase.preCondition && (
                              <p className="text-sm text-slate-600 mb-2">
                                <span className="font-medium">前置条件：</span>
                                {testCase.preCondition}
                              </p>
                            )}
                            <div className="text-sm text-slate-600 mb-2">
                              <span className="font-medium">测试步骤：</span>
                              <ol className="list-decimal list-inside ml-4">
                                {testCase.steps.map((step, i) => (
                                  <li key={i}>{step}</li>
                                ))}
                              </ol>
                            </div>
                            <p className="text-sm text-slate-600">
                              <span className="font-medium">预期结果：</span>
                              {testCase.expectation}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Button
                  onClick={handleImport}
                  disabled={generatedCases.filter(c => c.selected).length === 0}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  导入选中的用例 ({generatedCases.filter(c => c.selected).length})
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 选择页面对话框 */}
      <Dialog open={selectPageDialogOpen} onOpenChange={setSelectPageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>选择目标页面</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 工作空间选择 */}
            <div className="space-y-2">
              <Label>工作空间</Label>
              <select
                className="w-full p-2 border rounded-md"
                value={selectedWorkspace || ''}
                onChange={(e) => setSelectedWorkspace(e.target.value || null)}
              >
                <option value="">选择工作空间</option>
                {workspacesData?.list?.map((ws: any) => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </select>
            </div>

            {/* 项目选择 */}
            {selectedWorkspace && (
              <div className="space-y-2">
                <Label>项目</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={selectedProject || ''}
                  onChange={(e) => setSelectedProject(e.target.value || null)}
                >
                  <option value="">选择项目</option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 系统选择 */}
            {selectedProject && (
              <div className="space-y-2">
                <Label>系统</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={selectedSystem || ''}
                  onChange={(e) => setSelectedSystem(e.target.value || null)}
                >
                  <option value="">选择系统</option>
                  {systems.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 页面选择 */}
            {selectedSystem && (
              <div className="space-y-2">
                <Label>页面</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={selectedPage || ''}
                  onChange={(e) => setSelectedPage(e.target.value || null)}
                >
                  <option value="">选择页面</option>
                  {pages.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedPage && (
              <Button 
                className="w-full"
                onClick={() => importTestCases(selectedPage)}
              >
                确认导入到该页面
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 加载状态
function LoadingState() {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

// 主页面
export default function AIGeneratePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AIGenerateForm />
    </Suspense>
  );
}
