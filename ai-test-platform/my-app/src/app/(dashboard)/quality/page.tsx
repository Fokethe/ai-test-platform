/**
 * Quality Dashboard - 合并 Bug + 报告
 * 连接真实 API
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Shield,
  Bug,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Issue {
  id: string;
  title: string;
  description?: string;
  type: 'BUG' | 'TASK' | 'IMPROVEMENT';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: string;
  reporter: { id: string; name: string; email: string };
  assignee?: { id: string; name: string; email: string };
  createdAt: string;
}

export default function QualityDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');

  // 获取问题列表
  const { data: issuesData, isLoading: issuesLoading } = useSWR(
    '/api/issues?pageSize=10',
    fetcher,
    { refreshInterval: 30000 }
  );

  const issues: Issue[] = issuesData?.data || [];

  // 统计数据
  const stats = {
    open: issues.filter((i) => i.status === 'OPEN').length,
    resolved: issues.filter((i) => i.status === 'RESOLVED').length,
    critical: issues.filter((i) => i.severity === 'CRITICAL').length,
    avgFixTime: '2.3天', // 模拟数据
  };

  // 计算质量分数
  const qualityScore = Math.round(
    ((stats.resolved + 1) / (issues.length + 1)) * 100
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">质量看板</h1>
          <p className="text-slate-500">跟踪问题、查看质量报告</p>
        </div>
        <Button asChild>
          <Link href="/quality/issues/new">
            <Plus className="w-4 h-4 mr-2" />
            上报问题
          </Link>
        </Button>
      </div>

      {/* Quality Score Card */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100">质量评分</p>
            <p className="text-4xl font-bold">{qualityScore}</p>
            <p className="text-sm text-blue-100 mt-1">
              基于 {issues.length} 个问题计算
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <span>+5%</span>
            </div>
            <p className="text-sm text-blue-100">较上周</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <QualityMetricCard
          title="开放问题"
          value={stats.open.toString()}
          icon={AlertTriangle}
          trend={`+${Math.max(0, stats.open - 5)}`}
          color="red"
        />
        <QualityMetricCard
          title="本周解决"
          value={stats.resolved.toString()}
          icon={CheckCircle}
          trend="+5"
          color="green"
        />
        <QualityMetricCard
          title="严重问题"
          value={stats.critical.toString()}
          icon={AlertTriangle}
          trend={stats.critical > 0 ? '需关注' : '正常'}
          color={stats.critical > 0 ? 'red' : 'green'}
        />
        <QualityMetricCard
          title="平均修复"
          value={stats.avgFixTime}
          icon={Clock}
          trend="-0.5天"
          color="blue"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="reports">报告</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Issues List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">最近问题</h2>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/quality/issues">查看全部</Link>
                </Button>
              </div>

              {issuesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : issues.length === 0 ? (
                <div className="border rounded-lg p-8 text-center">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500">暂无问题</p>
                  <p className="text-sm text-slate-400 mt-1">系统运行良好！</p>
                </div>
              ) : (
                <div className="border rounded-lg divide-y">
                  {issues.slice(0, 5).map((issue) => (
                    <IssueItem key={issue.id} issue={issue} />
                  ))}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">问题分布</h2>
              <IssueDistribution issues={issues} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <ReportsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QualityMetricCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
}: {
  title: string;
  value: string;
  icon: any;
  trend: string;
  color: 'red' | 'green' | 'blue';
}) {
  const colorClasses = {
    red: 'text-red-600 bg-red-50',
    green: 'text-green-600 bg-green-50',
    blue: 'text-blue-600 bg-blue-50',
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <Badge variant="outline">{trend}</Badge>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-slate-500">{title}</p>
      </div>
    </div>
  );
}

function IssueItem({ issue }: { issue: Issue }) {
  const severityColors: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700',
    HIGH: 'bg-orange-100 text-orange-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    LOW: 'bg-slate-100 text-slate-700',
  };

  const statusColors: Record<string, string> = {
    OPEN: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    RESOLVED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-slate-100 text-slate-700',
  };

  const statusLabels: Record<string, string> = {
    OPEN: '开放',
    IN_PROGRESS: '处理中',
    RESOLVED: '已解决',
    CLOSED: '已关闭',
  };

  return (
    <div className="p-4 hover:bg-slate-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className={severityColors[issue.severity] || ''} variant="secondary">
              {issue.severity === 'CRITICAL'
                ? '紧急'
                : issue.severity === 'HIGH'
                ? '高'
                : issue.severity === 'MEDIUM'
                ? '中'
                : '低'}
            </Badge>
            <Badge className={statusColors[issue.status] || ''} variant="secondary">
              {statusLabels[issue.status]}
            </Badge>
          </div>
          <Link
            href={`/quality/issues/${issue.id}`}
            className="font-medium hover:text-blue-600 block truncate"
          >
            {issue.title}
          </Link>
          <p className="text-sm text-slate-500 mt-1">
            负责人: {issue.assignee?.name || '未分配'} · 
            报告人: {issue.reporter?.name} · 
            {new Date(issue.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}

// 问题分布
function IssueDistribution({ issues }: { issues: Issue[] }) {
  const bySeverity = {
    CRITICAL: issues.filter((i) => i.severity === 'CRITICAL').length,
    HIGH: issues.filter((i) => i.severity === 'HIGH').length,
    MEDIUM: issues.filter((i) => i.severity === 'MEDIUM').length,
    LOW: issues.filter((i) => i.severity === 'LOW').length,
  };

  const byStatus = {
    OPEN: issues.filter((i) => i.status === 'OPEN').length,
    IN_PROGRESS: issues.filter((i) => i.status === 'IN_PROGRESS').length,
    RESOLVED: issues.filter((i) => i.status === 'RESOLVED').length,
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">按严重程度</h3>
        <div className="space-y-2">
          <DistributionBar label="紧急" count={bySeverity.CRITICAL} total={issues.length} color="bg-red-500" />
          <DistributionBar label="高" count={bySeverity.HIGH} total={issues.length} color="bg-orange-500" />
          <DistributionBar label="中" count={bySeverity.MEDIUM} total={issues.length} color="bg-yellow-500" />
          <DistributionBar label="低" count={bySeverity.LOW} total={issues.length} color="bg-slate-400" />
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">按状态</h3>
        <div className="space-y-2">
          <DistributionBar label="开放" count={byStatus.OPEN} total={issues.length} color="bg-blue-500" />
          <DistributionBar label="处理中" count={byStatus.IN_PROGRESS} total={issues.length} color="bg-yellow-500" />
          <DistributionBar label="已解决" count={byStatus.RESOLVED} total={issues.length} color="bg-green-500" />
        </div>
      </div>
    </div>
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
    <div className="flex items-center gap-3">
      <span className="text-sm w-12">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-sm text-slate-500 w-8 text-right">{count}</span>
    </div>
  );
}

// 报告面板
function ReportsPanel() {
  const reports = [
    { id: 1, title: '本周测试报告', date: '2026-02-25', passRate: 94, total: 156 },
    { id: 2, title: '月度质量总结', date: '2026-02-01', passRate: 91, total: 623 },
    { id: 3, title: '回归测试报告', date: '2026-02-20', passRate: 98, total: 89 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">质量报告</h2>
        <Button variant="outline" size="sm">
          <FileText className="w-4 h-4 mr-2" />
          生成报告
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <div
            key={report.id}
            className="border rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium">{report.title}</h3>
                <p className="text-sm text-slate-500">{report.date}</p>
              </div>
              <FileText className="w-5 h-5 text-slate-400" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">通过率</span>
                <span className="font-medium">{report.passRate}%</span>
              </div>
              <Progress value={report.passRate} className="h-2" />
              <p className="text-xs text-slate-500">共 {report.total} 个用例</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
