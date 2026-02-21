'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface ReportStats {
  totalExecutions: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
  avgDuration: number;
  executionsByDay: { date: string; count: number; passed: number; failed: number }[];
  executionsByProject: { name: string; count: number }[];
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6366f1'];

export default function ReportsPage() {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    fetchStats();
  }, [timeRange]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/reports/stats?range=${timeRange}`);
      if (!res.ok) throw new Error('获取失败');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      toast.error('获取统计数据失败');
      // 使用模拟数据
      setStats({
        totalExecutions: 156,
        passedCount: 142,
        failedCount: 14,
        passRate: 91,
        avgDuration: 2450,
        executionsByDay: [
          { date: '周一', count: 20, passed: 18, failed: 2 },
          { date: '周二', count: 25, passed: 23, failed: 2 },
          { date: '周三', count: 18, passed: 16, failed: 2 },
          { date: '周四', count: 30, passed: 28, failed: 2 },
          { date: '周五', count: 35, passed: 32, failed: 3 },
          { date: '周六', count: 15, passed: 14, failed: 1 },
          { date: '周日', count: 13, passed: 11, failed: 2 },
        ],
        executionsByProject: [
          { name: '电商系统', count: 80 },
          { name: 'SaaS后台', count: 45 },
          { name: '移动端APP', count: 31 },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    toast.success(`报告导出功能开发中 (${format})`);
  };

  const pieData = stats
    ? [
        { name: '通过', value: stats.passedCount, color: '#10b981' },
        { name: '失败', value: stats.failedCount, color: '#ef4444' },
      ]
    : [];

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">报告中心</h1>
            <p className="text-slate-600 mt-1">查看测试执行统计和趋势分析</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleExport('excel')}>
              <Download className="mr-2 h-4 w-4" />
              导出 Excel
            </Button>
            <Button variant="outline" onClick={() => handleExport('pdf')}>
              <FileText className="mr-2 h-4 w-4" />
              导出 PDF
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">总执行次数</p>
                  <p className="text-2xl font-bold">{stats?.totalExecutions || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">通过次数</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats?.passedCount || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">失败次数</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats?.failedCount || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">通过率</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats?.passRate || 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Execution Trend */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>执行趋势</CardTitle>
                  <CardDescription>最近7天测试执行情况</CardDescription>
                </div>
                <div className="flex gap-1">
                  {(['7d', '30d', '90d'] as const).map((range) => (
                    <Button
                      key={range}
                      variant={timeRange === range ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTimeRange(range)}
                    >
                      {range === '7d' ? '7天' : range === '30d' ? '30天' : '90天'}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.executionsByDay || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="passed"
                      name="通过"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="failed"
                      name="失败"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Pass Rate Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>执行结果分布</CardTitle>
              <CardDescription>通过 vs 失败比例</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${((percent || 0) * 100).toFixed(0)}%`
                      }
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Distribution */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>项目执行统计</CardTitle>
            <CardDescription>各项目测试执行次数对比</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats?.executionsByProject || []}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    name="执行次数"
                    fill="#6366f1"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle>最近报告</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={FileText}
              title="详细报告功能开发中"
              description="未来将支持生成详细的测试报告，包含执行日志、截图、视频等"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
