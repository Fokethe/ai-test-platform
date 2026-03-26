'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Download,
  Filter,
  Loader2,
  PieChart as PieIcon,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BentoCard, BentoGrid, BentoHeader } from '@/components/bento';
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
  Legend,
} from 'recharts';

type TimeRange = '7d' | '30d' | '90d';
type ReportType = 'executions' | 'testcases' | 'bugs';
type ExportFormat = 'xlsx' | 'csv' | 'html' | 'json';

type ReportStats = {
  totalExecutions: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
  avgDuration: number;
  executionsByDay: Array<{ date: string; count: number; passed: number; failed: number }>;
  executionsByProject: Array<{ name: string; count: number }>;
};

const PIE_COLORS = ['#0066ff', '#ef4444'];

function formatDuration(ms: number) {
  if (!ms || ms <= 0) {
    return '-';
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

function parseExportFilename(contentDisposition: string | null, fallback: string) {
  if (!contentDisposition) {
    return fallback;
  }
  const match = contentDisposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
}

async function parseErrorMessage(response: Response, fallback: string) {
  try {
    const payload = await response.json();
    return payload?.error?.message || payload?.message || payload?.error || fallback;
  } catch {
    return `${fallback} (HTTP ${response.status})`;
  }
}

export default function ReportsPage() {
  const [range, setRange] = useState<TimeRange>('7d');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<ReportType>('executions');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('xlsx');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/stats?range=${range}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        const message = await parseErrorMessage(response, '获取统计数据失败');
        throw new Error(message);
      }
      const payload = (await response.json()) as ReportStats;
      setStats(payload);
    } catch (error) {
      setStats(null);
      toast.error(error instanceof Error ? error.message : '获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [range]);

  const pieData = useMemo(
    () => [
      { name: '通过', value: stats?.passedCount || 0 },
      { name: '失败', value: stats?.failedCount || 0 },
    ],
    [stats?.failedCount, stats?.passedCount]
  );

  const exportReport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('type', exportType);
      params.set('format', exportFormat);
      if (startDate) {
        params.set('startDate', startDate);
      }
      if (endDate) {
        params.set('endDate', endDate);
      }

      const response = await fetch(`/api/reports/export?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        const message = await parseErrorMessage(response, '导出失败');
        throw new Error(message);
      }

      const blob = await response.blob();
      const ext = exportFormat;
      const defaultName = `report-${exportType}.${ext}`;
      const filename = parseExportFilename(
        response.headers.get('content-disposition'),
        defaultName
      );

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast.success(`导出成功: ${filename}`);
      setExportOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <BentoHeader title="报告中心" description="查看执行统计、趋势并导出报告" />
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(value) => setRange(value as TimeRange)}>
            <SelectTrigger className="w-36">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">最近 7 天</SelectItem>
              <SelectItem value="30d">最近 30 天</SelectItem>
              <SelectItem value="90d">最近 90 天</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setExportOpen(true)}>
            <Download className="w-4 h-4 mr-2" />
            导出报告
          </Button>
        </div>
      </div>

      {!stats ? (
        <BentoCard className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400 mb-3" />
          <p className="text-slate-500">统计数据暂不可用，请稍后重试</p>
          <Button variant="outline" className="mt-4" onClick={loadStats}>
            重新加载
          </Button>
        </BentoCard>
      ) : (
        <>
          <BentoGrid cols={4}>
            <BentoCard variant="bordered" className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[var(--electric)]/10 rounded-xl">
                  <BarChart3 className="h-5 w-5 text-[var(--electric)]" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">总执行数</p>
                  <p className="text-2xl font-bold">{stats.totalExecutions}</p>
                </div>
              </div>
            </BentoCard>
            <BentoCard variant="bordered" className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 rounded-xl">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">通过数</p>
                  <p className="text-2xl font-bold text-emerald-500">{stats.passedCount}</p>
                </div>
              </div>
            </BentoCard>
            <BentoCard variant="bordered" className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/10 rounded-xl">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">失败数</p>
                  <p className="text-2xl font-bold text-red-500">{stats.failedCount}</p>
                </div>
              </div>
            </BentoCard>
            <BentoCard variant="bordered" className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/10 rounded-xl">
                  <TrendingUp className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">通过率 / 平均耗时</p>
                  <p className="text-2xl font-bold text-amber-500">{stats.passRate}%</p>
                  <p className="text-xs text-slate-500 mt-1">{formatDuration(stats.avgDuration)}</p>
                </div>
              </div>
            </BentoCard>
          </BentoGrid>

          <BentoGrid cols={2}>
            <BentoCard variant="bordered" className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-[var(--electric)]" />
                <h3 className="font-semibold">每日执行趋势</h3>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={stats.executionsByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="passed" name="通过" fill="#0066ff" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failed" name="失败" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </BentoCard>

            <BentoCard variant="bordered" className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <PieIcon className="w-5 h-5 text-[var(--electric)]" />
                <h3 className="font-semibold">执行结果分布</h3>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </BentoCard>
          </BentoGrid>
        </>
      )}

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>导出报告</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>报告类型</Label>
                <Select value={exportType} onValueChange={(value) => setExportType(value as ReportType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="executions">执行记录</SelectItem>
                    <SelectItem value="testcases">测试用例</SelectItem>
                    <SelectItem value="bugs">缺陷</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>导出格式</Label>
                <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                    <SelectItem value="csv">CSV (.csv)</SelectItem>
                    <SelectItem value="html">HTML (.html)</SelectItem>
                    <SelectItem value="json">JSON (.json)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>开始日期</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>结束日期</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>
              取消
            </Button>
            <Button onClick={exportReport} disabled={exporting}>
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  导出中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  确认导出
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
