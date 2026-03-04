/**
 * Quality Reports Page - 质量报告
 * TDD Batch 6A: 趋势分析图表 + 更多报表类型 + PDF导出
 */

'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import {
  FileText,
  Download,
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
} from 'recharts';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const swrOptions = {
  revalidateOnFocus: false,
  dedupingInterval: 30000,
};

// 时间范围选项
type TimeRange = '7d' | '30d' | '90d';

// 报告类型
const REPORT_TYPES = [
  { id: 'summary', name: '质量概览', icon: PieChart },
  { id: 'regression', name: '回归测试', icon: BarChart3 },
  { id: 'smoke', name: '冒烟测试', icon: TrendingUp },
  { id: 'comprehensive', name: '综合报告', icon: FileText },
];

// 聚合趋势数据
function aggregateTrendData(
  issues: any[],
  runs: any[],
  days: number
): Array<{
  date: string;
  created: number;
  resolved: number;
  passRate: number;
  totalRuns: number;
}> {
  const result = [];
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const displayDate = `${date.getMonth() + 1}/${date.getDate()}`;

    // 统计当天创建的问题
    const created = issues.filter((issue) => {
      const issueDate = new Date(issue.createdAt).toISOString().split('T')[0];
      return issueDate === dateStr;
    }).length;

    // 统计当天解决的问题
    const resolved = issues.filter((issue) => {
      if (!issue.resolvedAt) return false;
      const resolvedDate = new Date(issue.resolvedAt).toISOString().split('T')[0];
      return resolvedDate === dateStr;
    }).length;

    // 统计当天的执行记录
    const dayRuns = runs.filter((run) => {
      const runDate = new Date(run.createdAt).toISOString().split('T')[0];
      return runDate === dateStr;
    });

    const totalRuns = dayRuns.length;
    const passedRuns = dayRuns.filter((r) => r.status === 'COMPLETED').length;
    const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 0;

    result.push({
      date: displayDate,
      created,
      resolved,
      passRate,
      totalRuns,
    });
  }

  return result;
}

// 获取周统计数据
function getWeeklyStats(issues: any[], runs: any[]) {
  const weeks = [];
  const now = new Date();

  for (let i = 3; i >= 0; i--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    const weekIssues = issues.filter((issue) => {
      const date = new Date(issue.createdAt);
      return date >= weekStart && date <= weekEnd;
    });

    const weekRuns = runs.filter((run) => {
      const date = new Date(run.createdAt);
      return date >= weekStart && date <= weekEnd;
    });

    const passedRuns = weekRuns.filter((r) => r.status === 'COMPLETED').length;
    const passRate = weekRuns.length > 0 ? Math.round((passedRuns / weekRuns.length) * 100) : 0;

    weeks.push({
      week: `第${4 - i}周`,
      issues: weekIssues.length,
      runs: weekRuns.length,
      passRate,
    });
  }

  return weeks;
}

export default function QualityReportsPage() {
  const [reportType, setReportType] = useState('summary');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [exporting, setExporting] = useState(false);

  // 获取质量数据
  const { data: issuesData, isLoading: issuesLoading } = useSWR(
    '/api/issues?pageSize=100',
    fetcher,
    swrOptions
  );
  const { data: runsData, isLoading: runsLoading } = useSWR(
    '/api/runs?pageSize=100',
    fetcher,
    swrOptions
  );

  const issues = issuesData?.data || [];
  const runs = runsData?.data || [];
  const isLoading = issuesLoading || runsLoading;

  // 计算趋势数据
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const trendData = useMemo(
    () => aggregateTrendData(issues, runs, days),
    [issues, runs, days]
  );

  const weeklyStats = useMemo(() => getWeeklyStats(issues, runs), [issues, runs]);

  // 统计数据
  const stats = {
    totalIssues: issues.length,
    openIssues: issues.filter((i: any) => i.status === 'OPEN').length,
    resolvedIssues: issues.filter((i: any) => i.status === 'RESOLVED').length,
    criticalIssues: issues.filter((i: any) => i.severity === 'CRITICAL').length,
    totalRuns: runs.length,
    passedRuns: runs.filter((r: any) => r.status === 'COMPLETED').length,
    failedRuns: runs.filter((r: any) => r.status === 'FAILED').length,
  };

  const passRate = stats.totalRuns > 0 ? Math.round((stats.passedRuns / stats.totalRuns) * 100) : 0;

  // 导出PDF
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/reports/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: reportType,
          timeRange,
          data: { stats, trendData },
        }),
      });

      if (!response.ok) throw new Error('导出失败');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `质量报告-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('PDF导出成功');
    } catch (error) {
      toast.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  // 导出Excel
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/reports/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: reportType,
          timeRange,
          data: { stats, trendData },
        }),
      });

      if (!response.ok) throw new Error('导出失败');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `质量报告-${reportType}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Excel导出成功');
    } catch (error) {
      toast.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">质量报告</h1>
          <p className="text-slate-500">查看测试质量统计和趋势分析</p>
        </div>
        <div className="flex gap-2">
          {/* 报告类型选择 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                {REPORT_TYPES.find((t) => t.id === reportType)?.name}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {REPORT_TYPES.map((type) => (
                <DropdownMenuItem key={type.id} onClick={() => setReportType(type.id)}>
                  <type.icon className="w-4 h-4 mr-2" />
                  {type.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 时间范围选择 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                {timeRange === '7d' ? '最近7天' : timeRange === '30d' ? '最近30天' : '最近90天'}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTimeRange('7d')}>最近7天</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeRange('30d')}>最近30天</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeRange('90d')}>最近90天</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 导出菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={exporting}>
                <Download className="w-4 h-4 mr-2" />
                {exporting ? '导出中...' : '导出报告'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPDF}>导出为 PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel}>导出为 Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="总问题数"
          value={stats.totalIssues}
          trend={stats.openIssues > 0 ? `${stats.openIssues} 待处理` : '全部解决'}
          icon={FileText}
          color="bg-blue-500"
        />
        <StatCard
          title="严重问题"
          value={stats.criticalIssues}
          trend={stats.criticalIssues > 0 ? '需立即处理' : '无严重问题'}
          icon={BarChart3}
          color="bg-red-500"
        />
        <StatCard
          title="执行通过率"
          value={`${passRate}%`}
          trend={`${stats.passedRuns}/${stats.totalRuns} 通过`}
          icon={TrendingUp}
          color="bg-green-500"
        />
        <StatCard
          title="问题解决率"
          value={
            stats.totalIssues > 0
              ? `${Math.round((stats.resolvedIssues / stats.totalIssues) * 100)}%`
              : '100%'
          }
          trend={`${stats.resolvedIssues}/${stats.totalIssues} 已解决`}
          icon={PieChart}
          color="bg-purple-500"
        />
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="trends">趋势分析</TabsTrigger>
          <TabsTrigger value="distribution">问题分布</TabsTrigger>
          <TabsTrigger value="weekly">周统计</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>质量趋势 ({timeRange === '7d' ? '7天' : timeRange === '30d' ? '30天' : '90天'})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="created" name="新建问题" fill="#ef4444" />
                    <Bar yAxisId="left" dataKey="resolved" name="已解决问题" fill="#22c55e" />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="passRate"
                      name="通过率(%)"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>问题分布（按严重程度）</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: '紧急', count: issues.filter((i: any) => i.severity === 'CRITICAL').length },
                        { name: '高', count: issues.filter((i: any) => i.severity === 'HIGH').length },
                        { name: '中', count: issues.filter((i: any) => i.severity === 'MEDIUM').length },
                        { name: '低', count: issues.filter((i: any) => i.severity === 'LOW').length },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>执行统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <DistributionBar
                    label="成功"
                    count={stats.passedRuns}
                    total={stats.totalRuns}
                    color="bg-green-500"
                  />
                  <DistributionBar
                    label="失败"
                    count={stats.failedRuns}
                    total={stats.totalRuns}
                    color="bg-red-500"
                  />
                  <DistributionBar
                    label="其他"
                    count={stats.totalRuns - stats.passedRuns - stats.failedRuns}
                    total={stats.totalRuns}
                    color="bg-slate-400"
                  />
                </div>
                <div className="mt-6 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">总执行次数</span>
                    <Badge variant="secondary">{stats.totalRuns}</Badge>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-medium">整体通过率</span>
                    <span
                      className={`text-lg font-bold ${
                        passRate >= 80 ? 'text-green-600' : passRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}
                    >
                      {passRate}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="weekly" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>近4周统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weeklyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="issues" name="问题数" fill="#f97316" />
                    <Bar yAxisId="left" dataKey="runs" name="执行次数" fill="#8b5cf6" />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="passRate"
                      name="通过率(%)"
                      stroke="#10b981"
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  title,
  value,
  trend,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  trend: string;
  icon: any;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            <p className="text-xs text-slate-400 mt-1">{trend}</p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DistributionBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span>
          {count} ({Math.round(percentage)}%)
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
