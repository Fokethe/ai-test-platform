/**
 * Run Report Page - 执行报告
 * TDD Round 4.6: 查看报告功能
 * 
 * 功能：
 * 1. 展示执行统计概览
 * 2. 展示测试用例执行详情
 * 3. 支持导出报告
 */

'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import {
  ArrowLeft,
  Download,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  FileText,
  Calendar,
  User,
  CheckSquare,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

import { swrFetcher as fetcher } from '@/lib/utils/fetcher';

interface Execution {
  id: string;
  status: string;
  test: { id: string; name: string; type: string };
  logs?: string;
  screenshot?: string;
  duration?: number;
  createdAt: string;
  error?: string;
}

interface RunReport {
  id: string;
  name: string;
  type: 'MANUAL' | 'SCHEDULED' | 'WEBHOOK' | 'API';
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
  project: { id: string; name: string };
  duration?: number;
  createdAt: string;
  completedAt?: string;
  executedBy?: { id: string; name: string };
  executions: Execution[];
  stats: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  passRate: number;
}

export default function RunReportPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const { data, error, isLoading } = useSWR(
    id ? `/api/runs/${id}` : null,
    fetcher
  );

  const run: RunReport = data?.data;

  // 导出PDF
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      // 调用打印功能（可以替换为实际的PDF生成）
      window.print();
      toast.success('报告已导出');
    } finally {
      setExporting(false);
    }
  };

  // 打印报告
  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500">加载失败</p>
        <Button variant="outline" className="mt-4" onClick={() => router.refresh()}>
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/runs/${id}`}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">执行报告</h1>
            <p className="text-sm text-slate-500">{run.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            打印
          </Button>
          <Button onClick={handleExportPDF} disabled={exporting}>
            <Download className="w-4 h-4 mr-2" />
            {exporting ? '导出中...' : '导出 PDF'}
          </Button>
        </div>
      </div>

      {/* 报告内容 */}
      <div ref={reportRef} className="space-y-6 print:space-y-4">
        {/* 报告头部（打印时显示）*/}
        <div className="hidden print:block text-center border-b pb-4">
          <h1 className="text-2xl font-bold">测试执行报告</h1>
          <p className="text-slate-500 mt-1">{run.name}</p>
        </div>

        {/* 概览卡片 */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="print:border print:shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg print:bg-slate-100">
                  <CheckSquare className="w-5 h-5 text-blue-600 print:text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">总用例数</p>
                  <p className="text-2xl font-bold">{run.stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="print:border print:shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg print:bg-slate-100">
                  <CheckCircle className="w-5 h-5 text-green-600 print:text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">通过</p>
                  <p className="text-2xl font-bold text-green-600">{run.stats.passed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="print:border print:shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg print:bg-slate-100">
                  <XCircle className="w-5 h-5 text-red-600 print:text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">失败</p>
                  <p className="text-2xl font-bold text-red-600">{run.stats.failed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="print:border print:shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg print:bg-slate-100">
                  <BarChart3 className="w-5 h-5 text-yellow-600 print:text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">通过率</p>
                  <p className={`text-2xl font-bold ${
                    run.passRate >= 80 ? 'text-green-600' : 
                    run.passRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {run.passRate}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 通过率进度条 */}
        <Card className="print:border print:shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">通过率</span>
              <span className="text-sm text-slate-500">{run.passRate}%</span>
            </div>
            <Progress 
              value={run.passRate} 
              className="h-3 print:h-2"
            />
            <div className="flex justify-between mt-2 text-sm text-slate-500">
              <span>通过: {run.stats.passed}</span>
              <span>失败: {run.stats.failed}</span>
              <span>跳过: {run.stats.skipped}</span>
            </div>
          </CardContent>
        </Card>

        {/* 执行信息 */}
        <Card className="print:border print:shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">执行信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-slate-500">项目</p>
                <p className="font-medium">{run.project?.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">执行方式</p>
                <p className="font-medium">
                  {run.type === 'MANUAL' ? '手动执行' : 
                   run.type === 'SCHEDULED' ? '定时任务' : 
                   run.type === 'WEBHOOK' ? 'Webhook' : 'API'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">执行时间</p>
                <p className="font-medium">{new Date(run.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">执行耗时</p>
                <p className="font-medium">
                  {run.duration ? `${Math.round(run.duration / 1000)} 秒` : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 执行详情列表 */}
        <Card className="print:border print:shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">执行详情</CardTitle>
            <CardDescription>
              共 {run.executions?.length || 0} 个测试用例
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="print:hidden">
                <TabsTrigger value="all">
                  全部 ({run.executions?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="passed">
                  <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                  通过 ({run.stats.passed})
                </TabsTrigger>
                <TabsTrigger value="failed">
                  <XCircle className="w-3 h-3 mr-1 text-red-600" />
                  失败 ({run.stats.failed})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <ExecutionList executions={run.executions || []} />
              </TabsContent>
              <TabsContent value="passed" className="mt-4">
                <ExecutionList 
                  executions={run.executions?.filter(e => e.status === 'PASSED') || []} 
                />
              </TabsContent>
              <TabsContent value="failed" className="mt-4">
                <ExecutionList 
                  executions={run.executions?.filter(e => e.status === 'FAILED') || []} 
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 报告底部（打印时显示）*/}
        <div className="hidden print:block text-center text-sm text-slate-500 pt-4 border-t">
          <p>生成时间: {new Date().toLocaleString()}</p>
          <p>AI 测试平台 - 自动化测试报告</p>
        </div>
      </div>
    </div>
  );
}

// 执行列表组件
function ExecutionList({ executions }: { executions: Execution[] }) {
  if (executions.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        暂无执行记录
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {executions.map((exec, index) => (
        <div 
          key={exec.id} 
          className="flex items-center gap-4 p-3 border rounded-lg print:border-slate-300 print:break-inside-avoid"
        >
          <span className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded text-xs font-medium print:bg-slate-200">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{exec.test.name}</p>
              <ExecutionStatusBadge status={exec.status} />
            </div>
            {exec.duration && (
              <p className="text-sm text-slate-500 mt-1">
                耗时: {Math.round(exec.duration / 1000)}s
              </p>
            )}
            {exec.error && (
              <p className="text-sm text-red-600 mt-1 truncate">
                错误: {exec.error}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// 执行状态标签
function ExecutionStatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    PASSED: { color: 'bg-green-100 text-green-700', label: '通过' },
    FAILED: { color: 'bg-red-100 text-red-700', label: '失败' },
    PENDING: { color: 'bg-yellow-100 text-yellow-700', label: '等待' },
    RUNNING: { color: 'bg-blue-100 text-blue-700', label: '运行中' },
    SKIPPED: { color: 'bg-slate-100 text-slate-700', label: '跳过' },
  };
  const c = config[status] || config.PENDING;
  return (
    <Badge className={c.color} variant="secondary">
      {c.label}
    </Badge>
  );
}
