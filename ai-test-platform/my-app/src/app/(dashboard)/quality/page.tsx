/**
 * Quality Dashboard - 合并 Bug + 报告
 */

'use client';

import { Shield, Bug, FileText, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

export default function QualityDashboardPage() {
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
            <Bug className="w-4 h-4 mr-2" />
            上报问题
          </Link>
        </Button>
      </div>

      {/* Quality Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <QualityMetricCard
          title="开放问题"
          value="12"
          icon={AlertTriangle}
          trend="+2"
          color="red"
        />
        <QualityMetricCard
          title="本周解决"
          value="28"
          icon={CheckCircle}
          trend="+5"
          color="green"
        />
        <QualityMetricCard
          title="平均修复时间"
          value="2.3天"
          icon={TrendingUp}
          trend="-0.5天"
          color="blue"
        />
        <QualityMetricCard
          title="测试通过率"
          value="94%"
          icon={Shield}
          trend="+1%"
          color="green"
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Issues List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">问题列表</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/quality/issues">查看全部</Link>
            </Button>
          </div>

          <div className="border rounded-lg divide-y">
            <IssueItem
              title="登录页面加载缓慢"
              severity="HIGH"
              status="IN_PROGRESS"
              assignee="张三"
              createdAt="2天前"
            />
            <IssueItem
              title="API 返回 500 错误"
              severity="CRITICAL"
              status="OPEN"
              assignee="未分配"
              createdAt="5小时前"
            />
            <IssueItem
              title="移动端样式错乱"
              severity="MEDIUM"
              status="RESOLVED"
              assignee="李四"
              createdAt="1周前"
            />
          </div>
        </div>

        {/* Reports */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">质量报告</h2>
          
          <div className="space-y-3">
            <ReportCard
              title="本周测试报告"
              date="2026-02-25"
              stats={{ total: 156, passed: 142, failed: 14 }}
            />
            <ReportCard
              title="月度质量总结"
              date="2026-02-01"
              stats={{ total: 623, passed: 589, failed: 34 }}
            />
            <ReportCard
              title="回归测试报告"
              date="2026-02-20"
              stats={{ total: 89, passed: 87, failed: 2 }}
            />
          </div>

          <Button variant="outline" className="w-full" asChild>
            <Link href="/quality/reports">
              <FileText className="w-4 h-4 mr-2" />
              查看全部报告
            </Link>
          </Button>
        </div>
      </div>
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

function IssueItem({
  title,
  severity,
  status,
  assignee,
  createdAt,
}: {
  title: string;
  severity: string;
  status: string;
  assignee: string;
  createdAt: string;
}) {
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

  return (
    <div className="p-4 hover:bg-slate-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={severityColors[severity] || ''} variant="secondary">
              {severity}
            </Badge>
            <Badge className={statusColors[status] || ''} variant="secondary">
              {status}
            </Badge>
          </div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-slate-500 mt-1">
            负责人: {assignee} · {createdAt}
          </p>
        </div>
      </div>
    </div>
  );
}

function ReportCard({
  title,
  date,
  stats,
}: {
  title: string;
  date: string;
  stats: { total: number; passed: number; failed: number };
}) {
  const passRate = Math.round((stats.passed / stats.total) * 100);

  return (
    <div className="border rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-slate-500">{date}</p>
        </div>
        <FileText className="w-5 h-5 text-slate-400" />
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">通过率</span>
          <span className="font-medium">{passRate}%</span>
        </div>
        <Progress value={passRate} className="h-2" />
        <div className="flex justify-between text-xs text-slate-500">
          <span>通过: {stats.passed}</span>
          <span>失败: {stats.failed}</span>
        </div>
      </div>
    </div>
  );
}
