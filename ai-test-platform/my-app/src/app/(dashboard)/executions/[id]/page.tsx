'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Clock, Play, Download, Image as ImageIcon, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

interface StepDetail {
  step: number;
  description: string;
  status: 'passed' | 'failed' | 'running';
  duration: number;
  screenshot?: string;
  error?: string;
}

interface ExecutionDetail {
  id: string;
  status: string;
  duration: number | null;
  logs: string | null;
  screenshots: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  testCase: {
    id: string;
    title: string;
    steps: string;
    expectation: string;
    page: {
      name: string;
      path: string;
      system: {
        name: string;
        baseUrl: string;
      };
    };
  };
  run: {
    browser: string;
    headless: boolean;
  };
}

export default function ExecutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const executionId = params.id as string;
  
  const [execution, setExecution] = useState<ExecutionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  useEffect(() => {
    fetchExecution();
  }, [executionId]);

  const fetchExecution = async () => {
    try {
      console.log('[ExecutionDetail] 开始获取执行详情:', executionId);
      
      if (!executionId) {
        toast.error('执行ID不能为空');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/executions/${executionId}`);
      console.log('[ExecutionDetail] API响应状态:', response.status);
      
      const data = await response.json();
      console.log('[ExecutionDetail] API响应数据:', data);
      
      if (data.code === 0) {
        setExecution(data.data);
        toast.success('获取执行详情成功');
      } else {
        console.error('[ExecutionDetail] 获取执行详情失败:', data.message);
        toast.error(data.message || '获取执行详情失败');
      }
    } catch (error) {
      console.error('[ExecutionDetail] 获取执行详情异常:', error);
      toast.error('获取执行详情失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASSED':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-8 w-8 text-red-500" />;
      case 'RUNNING':
        return <Clock className="h-8 w-8 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="h-8 w-8 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASSED':
        return <Badge className="bg-green-100 text-green-700 text-sm px-3 py-1">通过</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-700 text-sm px-3 py-1">失败</Badge>;
      case 'RUNNING':
        return <Badge className="bg-blue-100 text-blue-700 text-sm px-3 py-1">执行中</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-600 text-sm px-3 py-1">待执行</Badge>;
    }
  };

  const parseSteps = (): StepDetail[] => {
    if (!execution?.logs) return [];
    try {
      return JSON.parse(execution.logs);
    } catch {
      return [];
    }
  };

  const handleRerun = async () => {
    if (!execution) return;
    
    try {
      const response = await fetch('/api/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCaseId: execution.testCase.id,
          config: {
            browser: execution.run.browser,
            headless: execution.run.headless,
          },
        }),
      });

      const data = await response.json();
      if (data.code === 0) {
        toast.success('重新执行已开始');
        router.push(`/executions/${data.data.executionId}`);
      } else {
        toast.error(data.message || '重新执行失败');
      }
    } catch (error) {
      toast.error('重新执行失败');
    }
  };

  const handleCancel = async () => {
    if (!execution) return;
    
    console.log('[ExecutionDetail] 开始取消执行:', executionId);
    
    // 乐观更新：立即更新本地状态
    const previousStatus = execution.status;
    setExecution({ ...execution, status: 'FAILED' });
    
    try {
      const response = await fetch(`/api/executions/${executionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'FAILED', 
          errorMessage: '用户取消执行',
          completedAt: new Date().toISOString(),
        }),
      });

      console.log('[ExecutionDetail] 取消执行API响应状态:', response.status);

      const data = await response.json();
      console.log('[ExecutionDetail] 取消执行API响应数据:', data);
      
      if (response.ok && data.code === 0) {
        toast.success('已取消执行');
        // 刷新执行详情
        await fetchExecution();
      } else {
        const errorMsg = data.message || '取消执行失败';
        console.error('[ExecutionDetail] 取消执行失败:', errorMsg);
        toast.error(errorMsg);
        // 恢复本地状态
        setExecution({ ...execution, status: previousStatus });
      }
    } catch (error) {
      console.error('[ExecutionDetail] 取消执行异常:', error);
      toast.error('取消执行失败，请检查网络连接');
      // 恢复本地状态
      setExecution({ ...execution, status: previousStatus });
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/4"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto text-center py-16">
          <h2 className="text-xl font-semibold mb-4">执行记录不存在</h2>
          <Button asChild>
            <Link href="/executions">返回执行历史</Link>
          </Button>
        </div>
      </div>
    );
  }

  const steps = parseSteps();
  const passedSteps = steps.filter(s => s.status === 'passed').length;
  const failedSteps = steps.filter(s => s.status === 'failed').length;
  const progress = steps.length > 0 ? ((passedSteps + failedSteps) / steps.length) * 100 : 0;

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="mb-8">
          <Link href="/executions" className="text-slate-600 hover:text-slate-900 flex items-center gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            返回执行历史
          </Link>
          
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {getStatusIcon(execution.status)}
              <div>
                <h1 className="text-2xl font-bold">{execution.testCase.title}</h1>
                <p className="text-slate-600 mt-1">
                  {execution.testCase.page.system.name} / {execution.testCase.page.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {getStatusBadge(execution.status)}
              {execution.status === 'RUNNING' && (
                <Button variant="destructive" onClick={handleCancel}>
                  <Square className="mr-2 h-4 w-4" />
                  取消执行
                </Button>
              )}
              <Button onClick={handleRerun}>
                <Play className="mr-2 h-4 w-4" />
                重新执行
              </Button>
            </div>
          </div>
        </div>

        {/* 执行信息卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-600">执行时长</p>
              <p className="text-2xl font-bold">
                {execution.duration ? `${(execution.duration / 1000).toFixed(1)}s` : '-'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-600">浏览器</p>
              <p className="text-2xl font-bold capitalize">{execution.run.browser}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-600">开始时间</p>
              <p className="text-lg font-medium">
                {execution.startedAt ? formatDate(execution.startedAt) : '-'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-600">步骤进度</p>
              <p className="text-2xl font-bold">
                {passedSteps + failedSteps} / {steps.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 进度条 */}
        {execution.status === 'RUNNING' && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-slate-600 mt-2 text-center">
                执行中... {Math.round(progress)}%
              </p>
            </CardContent>
          </Card>
        )}

        {/* 错误信息 */}
        {execution.errorMessage && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-700 text-base">错误信息</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">{execution.errorMessage}</p>
            </CardContent>
          </Card>
        )}

        {/* 步骤执行详情 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>执行步骤</CardTitle>
            </CardHeader>
            <CardContent>
              {steps.length === 0 ? (
                <p className="text-slate-500 text-center py-8">暂无步骤记录</p>
              ) : (
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedStep === index
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                      onClick={() => setSelectedStep(index)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-500 w-6">
                          {step.step}.
                        </span>
                        {step.status === 'passed' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : step.status === 'failed' ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-blue-500 animate-pulse" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm">{step.description}</p>
                          <p className="text-xs text-slate-500">
                            {step.duration}ms
                          </p>
                        </div>
                        {step.screenshot && (
                          <ImageIcon className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      {step.error && (
                        <p className="text-xs text-red-600 mt-2 ml-9">
                          {step.error}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 截图预览 */}
          <Card>
            <CardHeader>
              <CardTitle>步骤截图</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedStep !== null && steps[selectedStep]?.screenshot ? (
                <div className="space-y-4">
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={`data:image/png;base64,${steps[selectedStep].screenshot}`}
                      alt={`步骤 ${selectedStep + 1} 截图`}
                      className="w-full"
                    />
                  </div>
                  <p className="text-sm text-slate-600">
                    步骤 {selectedStep + 1}: {steps[selectedStep].description}
                  </p>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4" />
                  <p>点击左侧步骤查看截图</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 测试用例信息 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>测试用例信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-600 mb-1">目标页面</p>
              <p className="font-medium">{execution.testCase.page.path}</p>
              <p className="text-sm text-slate-500">{execution.testCase.page.system.baseUrl}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">预期结果</p>
              <p className="text-slate-700">{execution.testCase.expectation}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
