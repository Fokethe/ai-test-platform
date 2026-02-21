'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Zap,
  Plus,
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { PrefetchLink } from '@/components/ui/prefetch-link';

interface DashboardData {
  stats: {
    totalTestCases: number;
    todayExecutions: number;
    passRate: number;
    failedCount: number;
    totalExecutions: number;
    testSuites: number;
    activeSuites: number;
  };
  trend: Array<{
    date: string;
    passed: number;
    failed: number;
  }>;
  recentExecutions: Array<{
    id: string;
    testCaseTitle: string;
    status: string;
    startedAt: string | null;
    duration: number | null;
  }>;
}

// 统计卡片组件
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color,
  suffix = ''
}: { 
  title: string; 
  value: number | string; 
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  suffix?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-3xl font-bold mt-1">
              {value}{suffix}
            </p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 趋势图表组件（简化版）
function TrendChart({ data, days }: { data: DashboardData['trend']; days: number }) {
  const maxValue = Math.max(...data.map(d => d.passed + d.failed), 1);
  
  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>执行趋势</CardTitle>
            <CardDescription>最近{days}天测试执行情况</CardDescription>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map(d => (
              <Button
                key={d}
                variant={days === d ? 'default' : 'outline'}
                size="sm"
                onClick={() => {}}
              >
                {d}天
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48 flex items-end gap-2">
          {data.map((item, index) => {
            const total = item.passed + item.failed;
            const height = total > 0 ? (total / maxValue) * 100 : 0;
            const passHeight = total > 0 ? (item.passed / total) * 100 : 0;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full relative bg-slate-100 rounded-t" style={{ height: `${height}%` }}>
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-green-500 rounded-t"
                    style={{ height: `${passHeight}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400">
                  {item.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span className="text-sm text-slate-600">通过</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span className="text-sm text-slate-600">失败</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 最近执行记录组件
function RecentExecutions({ executions }: { executions: DashboardData['recentExecutions'] }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASSED':
        return <Badge className="bg-green-100 text-green-700">通过</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-700">失败</Badge>;
      case 'RUNNING':
        return <Badge className="bg-blue-100 text-blue-700">执行中</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>最近执行</CardTitle>
        <CardDescription>最近10条测试执行记录</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {executions.length === 0 ? (
            <p className="text-center text-slate-400 py-8">暂无执行记录</p>
          ) : (
            executions.map(exec => (
              <div key={exec.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{exec.testCaseTitle}</p>
                  <p className="text-sm text-slate-500">
                    {exec.startedAt ? new Date(exec.startedAt).toLocaleString('zh-CN') : '-'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {exec.duration && (
                    <span className="text-sm text-slate-500">
                      {Math.round(exec.duration / 1000)}s
                    </span>
                  )}
                  {getStatusBadge(exec.status)}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 快捷操作组件
function QuickActions() {
  const actions = [
    { icon: Plus, label: '新建用例', href: '/testcases/new', color: 'bg-blue-500' },
    { icon: Layers, label: '创建套件', href: '/test-suites/new', color: 'bg-purple-500' },
    { icon: Sparkles, label: 'AI生成', href: '/ai-generate', color: 'bg-amber-500' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>快捷操作</CardTitle>
        <CardDescription>快速访问常用功能</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {actions.map(action => (
            <PrefetchLink
              key={action.href}
              href={action.href}
              className="flex flex-col items-center p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className={`p-2 rounded-full ${action.color} mb-2`}>
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </PrefetchLink>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// 主页面
export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    fetchDashboardData();
  }, [days]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`/api/dashboard?days=${days}`);
      const result = await response.json();
      
      if (result.code === 0) {
        setData(result.data);
      } else {
        toast.error(result.message || '获取数据失败');
      }
    } catch (error) {
      toast.error('获取仪表盘数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">加载失败，请刷新重试</p>
      </div>
    );
  }

  const { stats, trend, recentExecutions } = data;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">仪表盘</h1>
        <p className="text-slate-600 mt-1">查看测试执行概况和核心指标</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="总用例数"
          value={stats.totalTestCases}
          icon={FileText}
          color="bg-blue-500"
        />
        <StatCard
          title="今日执行"
          value={stats.todayExecutions}
          icon={Clock}
          color="bg-purple-500"
        />
        <StatCard
          title="通过率"
          value={stats.passRate}
          suffix="%"
          icon={CheckCircle}
          color="bg-green-500"
        />
        <StatCard
          title="失败数(7天)"
          value={stats.failedCount}
          icon={XCircle}
          color="bg-red-500"
        />
      </div>

      {/* 图表和列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <TrendChart data={trend} days={days} />
        <RecentExecutions executions={recentExecutions} />
      </div>

      {/* 快捷操作 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickActions />
        
        <Card>
          <CardHeader>
            <CardTitle>测试套件</CardTitle>
            <CardDescription>套件概览</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-600">总套件数</span>
              <span className="text-2xl font-bold">{stats.testSuites}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">有效套件</span>
              <span className="text-2xl font-bold text-green-600">{stats.activeSuites}</span>
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => router.push('/test-suites')}
            >
              查看全部 <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>快速链接</CardTitle>
            <CardDescription>常用页面导航</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: '工作空间', href: '/workspaces' },
              { label: '用例库', href: '/testcases' },
              { label: '执行历史', href: '/executions' },
              { label: '报告中心', href: '/reports' },
            ].map(link => (
              <PrefetchLink
                key={link.href}
                href={link.href}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <span>{link.label}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </PrefetchLink>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
