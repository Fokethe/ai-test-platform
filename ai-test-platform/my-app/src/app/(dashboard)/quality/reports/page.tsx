/**
 * Quality Reports Page - 质量报告
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  FileText,
  Download,
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const swrOptions = {
  revalidateOnFocus: false,
  dedupingInterval: 30000,
};

export default function QualityReportsPage() {
  const [reportType, setReportType] = useState('summary');

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

  const passRate = stats.totalRuns > 0 
    ? Math.round((stats.passedRuns / stats.totalRuns) * 100) 
    : 0;

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
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            选择日期
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            导出报告
          </Button>
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
          value={stats.totalIssues > 0 
            ? `${Math.round((stats.resolvedIssues / stats.totalIssues) * 100)}%` 
            : '100%'}
          trend={`${stats.resolvedIssues}/${stats.totalIssues} 已解决`}
          icon={PieChart}
          color="bg-purple-500"
        />
      </div>

      {/* Report Tabs */}
      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="summary">概览</TabsTrigger>
          <TabsTrigger value="issues">问题分析</TabsTrigger>
          <TabsTrigger value="trends">趋势</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>问题分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <DistributionBar 
                    label="严重" 
                    count={issues.filter((i: any) => i.severity === 'CRITICAL').length}
                    total={stats.totalIssues}
                    color="bg-red-500"
                  />
                  <DistributionBar 
                    label="高" 
                    count={issues.filter((i: any) => i.severity === 'HIGH').length}
                    total={stats.totalIssues}
                    color="bg-orange-500"
                  />
                  <DistributionBar 
                    label="中" 
                    count={issues.filter((i: any) => i.severity === 'MEDIUM').length}
                    total={stats.totalIssues}
                    color="bg-yellow-500"
                  />
                  <DistributionBar 
                    label="低" 
                    count={issues.filter((i: any) => i.severity === 'LOW').length}
                    total={stats.totalIssues}
                    color="bg-slate-400"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>执行统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>总执行次数</span>
                    <Badge variant="secondary">{stats.totalRuns}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>成功</span>
                    <Badge className="bg-green-100 text-green-700">{stats.passedRuns}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>失败</span>
                    <Badge className="bg-red-100 text-red-700">{stats.failedRuns}</Badge>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span>成功率</span>
                      <span className={`text-lg font-bold ${passRate >= 80 ? 'text-green-600' : passRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {passRate}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="issues" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>问题详情</CardTitle>
            </CardHeader>
            <CardContent>
              {issues.length === 0 ? (
                <p className="text-slate-500 text-center py-8">暂无问题数据</p>
              ) : (
                <div className="divide-y">
                  {issues.slice(0, 10).map((issue: any) => (
                    <div key={issue.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">{issue.title}</p>
                        <p className="text-sm text-slate-500">
                          {issue.reporter?.name} · {new Date(issue.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={issue.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>
                          {issue.severity}
                        </Badge>
                        <Badge variant="outline">{issue.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>质量趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>趋势图表功能开发中...</p>
                </div>
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
  color 
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
  color 
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
        <span>{count} ({Math.round(percentage)}%)</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
