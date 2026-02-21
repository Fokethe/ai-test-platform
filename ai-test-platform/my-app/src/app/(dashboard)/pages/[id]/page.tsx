'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, FileText, Play, Edit, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface TestCase {
  id: string;
  title: string;
  priority: string;
  status: string;
  isAiGenerated: boolean;
  createdAt: string;
  pageId?: string;
}

interface PageDetail {
  id: string;
  name: string;
  path: string;
  system: {
    name: string;
    project: {
      name: string;
    };
  };
  requirements: {
    id: string;
    title: string;
  }[];
}

export default function PageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pageId = params.id as string;
  
  const [page, setPage] = useState<PageDetail | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // 获取页面详情
      const pageRes = await fetch(`/api/pages/${pageId}`);
      const pageData = await pageRes.json();
      if (pageData.code === 0) {
        setPage(pageData.data);
      } else {
        toast.error(pageData.message || '获取页面失败');
      }

      // 获取测试用例列表
      const tcRes = await fetch(`/api/testcases?pageId=${pageId}`);
      const tcData = await tcRes.json();
      if (tcData.code === 0) {
        setTestCases(tcData.data?.list || []);
      }
    } catch (error) {
      toast.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pageId]);

  const handleRun = async (testCaseId: string) => {
    setRunningId(testCaseId);
    try {
      const response = await fetch('/api/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCaseId,
          config: {
            browser: 'chromium',
            headless: true,
          },
        }),
      });

      const data = await response.json();
      if (data.code === 0) {
        toast.success('测试已开始执行');
        router.push(`/executions/${data.data.executionId}`);
      } else {
        toast.error(data.message || '执行失败');
      }
    } catch (error) {
      toast.error('执行失败，请稍后重试');
    } finally {
      setRunningId(null);
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Safely access nested properties
  const projectName = page?.system?.project?.name || '未知项目';
  const systemName = page?.system?.name || '未知系统';
  const breadcrumbPath = `${projectName} / ${systemName} / ${page?.path || ''}`;

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button onClick={() => router.back()} className="text-slate-600 hover:text-slate-900 flex items-center gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            返回
          </button>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold truncate" title={page?.name}>
                {page?.name || '加载中...'}
              </h1>
              <p className="text-slate-600 mt-1 truncate" title={breadcrumbPath}>
                {breadcrumbPath}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" asChild>
                <Link href={`/ai-generate?pageId=${pageId}`}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI 生成用例
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/testcases/new?pageId=${pageId}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  新建用例
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* 需求列表 */}
        {page?.requirements && page.requirements.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">关联需求</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {page.requirements.map((req) => (
                  <Badge key={req.id} variant="secondary" className="truncate max-w-[300px]">
                    <FileText className="mr-1 h-3 w-3 shrink-0" />
                    <span className="truncate">{req.title}</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 测试用例列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">测试用例</CardTitle>
            <CardDescription>共 {testCases.length} 个用例</CardDescription>
          </CardHeader>
          <CardContent>
            {testCases.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-lg font-semibold mb-2">还没有测试用例</h3>
                <p className="text-slate-600 mb-6">创建您的第一个测试用例</p>
                <div className="flex gap-4 justify-center">
                  <Button variant="outline" asChild>
                    <Link href={`/ai-generate?pageId=${pageId}`}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      AI 生成用例
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href={`/testcases/new?pageId=${pageId}`}>
                      <Plus className="mr-2 h-4 w-4" />
                      手动创建
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {testCases.map((testCase) => (
                  <div
                    key={testCase.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium truncate max-w-[300px] sm:max-w-[400px] lg:max-w-[500px]" title={testCase.title}>
                          {testCase.title}
                        </span>
                        {testCase.isAiGenerated && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            <Sparkles className="mr-1 h-3 w-3" />
                            AI
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">
                        创建于 {testCase.createdAt ? new Date(testCase.createdAt).toLocaleDateString() : '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <Badge className={getPriorityColor(testCase.priority)}>
                        {testCase.priority}
                      </Badge>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRun(testCase.id)}
                          disabled={runningId === testCase.id}
                        >
                          {runningId === testCase.id ? (
                            <span className="animate-spin">⏳</span>
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
