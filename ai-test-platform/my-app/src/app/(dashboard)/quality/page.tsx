/**
 * Quality Dashboard - Bento Grid风格重构版
 * 合并 Bug + 报告
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
import { BentoCard, BentoGrid, BentoItem } from '@/components/bento';
import { BentoHeader } from '@/components/bento';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API错误: ${res.status}`);
  }
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('API返回非JSON数据');
  }
  return res.json();
};

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

  const { data: issuesData, isLoading: issuesLoading } = useSWR(
    '/api/issues?pageSize=10',
    fetcher,
    { refreshInterval: 30000 }
  );

  const issues: Issue[] = issuesData?.data || [];

  const stats = {
    open: issues.filter((i) => i.status === 'OPEN').length,
    resolved: issues.filter((i) => i.status === 'RESOLVED').length,
    critical: issues.filter((i) => i.severity === 'CRITICAL').length,
    avgFixTime: '2.3天',
  };

  const qualityScore = Math.round(
    ((stats.resolved + 1) / (issues.length + 1)) * 100
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <BentoHeader
        title="质量看板"
        description="跟踪问题、查看质量报告"
        count={issues.length}
        countLabel="个问题"
        actionLabel="上报问题"
        actionHref="/quality/issues/new"
      />

      {/* Quality Score Card */}
      <BentoCard 
        variant="featured" 
        className="relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--electric)] to-purple-600" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-30" />
        <div className="relative p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">质量评分</p>
              <p className="text-5xl font-bold mt-1">{qualityScore}</p>
              <p className="text-sm text-blue-100 mt-2">
                基于 {issues.length} 个问题计算
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-2xl font-semibold">
                <TrendingUp className="w-6 h-6" />
                <span>+5%</span>
              </div>
              <p className="text-sm text-blue-100">较上周</p>
            </div>
          </div>
        </div>
      </BentoCard>

      {/* Stats */}
      <BentoGrid cols={4}>
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
      </BentoGrid>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-slate-100 dark:bg-slate-800">
          <TabsTrigger 
            value="overview"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
          >
            概览
          </TabsTrigger>
          <TabsTrigger 
            value="reports"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
          >
            报告
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <BentoGrid cols={12}>
            {/* Issues List */}
            <BentoItem colSpan={8}>
              <BentoCard variant="bordered" className="h-full">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">最近问题</h2>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/quality/issues">查看全部</Link>
                    </Button>
                  </div>
                </div>

                {issuesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin h-10 w-10 border-3 border-[var(--electric)]/20 border-t-[var(--electric)] rounded-full" />
                  </div>
                ) : issues.length === 0 ? (
                  <div className="p-12 text-center">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-500">暂无问题</p>
                    <p className="text-sm text-slate-400 mt-1">系统运行良好！</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {issues.slice(0, 5).map((issue) => (
                      <IssueItem key={issue.id} issue={issue} />
                    ))}
                  </div>
                )}
              </BentoCard>
            </BentoItem>

            {/* Issue Distribution */}
            <BentoItem colSpan={4}>
              <BentoCard variant="bordered" className="h-full p-4">
                <h2 className="text-lg font-semibold mb-4">问题分布</h2>
                <IssueDistribution issues={issues} />
              </BentoCard>
            </BentoItem>
          </BentoGrid>
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
    red: 'text-red-600 bg-red-50 border-red-200',
    green: 'text-green-600 bg-green-50 border-green-200',
    blue: 'text-[var(--electric)] bg-[var(--electric)]/10 border-[var(--electric)]/20',
  };

  return (
    <BentoCard variant="bordered" className="p-4">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg border ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <Badge variant="outline">{trend}</Badge>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-slate-500">{title}</p>
      </div>
    </BentoCard>
  );
}

function IssueItem({ issue }: { issue: Issue }) {
  const severityColors: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700 border-red-200',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
    MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    LOW: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const statusColors: Record<string, string> = {
    OPEN: 'bg-blue-100 text-blue-700 border-blue-200',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    RESOLVED: 'bg-green-100 text-green-700 border-green-200',
    CLOSED: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const statusLabels: Record<string, string> = {
    OPEN: '开放',
    IN_PROGRESS: '处理中',
    RESOLVED: '已解决',
    CLOSED: '已关闭',
  };

  return (
    <div className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className={`${severityColors[issue.severity] || ''} border`} variant="outline">
              {issue.severity === 'CRITICAL' ? '紧急' : issue.severity === 'HIGH' ? '高' : issue.severity === 'MEDIUM' ? '中' : '低'}
            </Badge>
            <Badge className={`${statusColors[issue.status] || ''} border`} variant="outline">
              {statusLabels[issue.status]}
            </Badge>
          </div>
          <Link
            href={`/quality/issues/${issue.id}`}
            className="font-medium hover:text-[var(--electric)] block truncate"
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
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">按严重程度</h3>
        <div className="space-y-2">
          <DistributionBar label="紧急" count={bySeverity.CRITICAL} total={issues.length} color="bg-red-500" />
          <DistributionBar label="高" count={bySeverity.HIGH} total={issues.length} color="bg-orange-500" />
          <DistributionBar label="中" count={bySeverity.MEDIUM} total={issues.length} color="bg-yellow-500" />
          <DistributionBar label="低" count={bySeverity.LOW} total={issues.length} color="bg-slate-400" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">按状态</h3>
        <div className="space-y-2">
          <DistributionBar label="开放" count={byStatus.OPEN} total={issues.length} color="bg-[var(--electric)]" />
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
      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-sm text-slate-500 w-8 text-right">{count}</span>
    </div>
  );
}

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
        <Button className="bg-[var(--electric)] hover:bg-[var(--electric)]/90">
          <FileText className="w-4 h-4 mr-2" />
          生成报告
        </Button>
      </div>

      <BentoGrid cols={3}>
        {reports.map((report) => (
          <BentoCard 
            key={report.id} 
            variant="bordered" 
            className="p-4 hover:border-[var(--electric)] transition-colors cursor-pointer"
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
          </BentoCard>
        ))}
      </BentoGrid>
    </div>
  );
}
