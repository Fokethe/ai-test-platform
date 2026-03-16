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
  FileSpreadsheet,
  Code,
  Table,
  PieChart as PieIcon,
  Activity,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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

const COLORS = ['#0066ff', '#ef4444', '#f59e0b', '#6366f1'];

export default function ReportsPage() {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    type: 'executions',
    format: 'xlsx',
    startDate: '',
    endDate: '',
  });

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

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append('type', exportConfig.type);
      params.append('format', exportConfig.format);
      if (exportConfig.startDate) params.append('startDate', exportConfig.startDate);
      if (exportConfig.endDate) params.append('endDate', exportConfig.endDate);

      const res = await fetch(`/api/reports/export?${params}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const filename = `报告-${exportConfig.type}-${new Date().toISOString().split('T')[0]}`;
      const ext = exportConfig.format === 'xlsx' ? 'xlsx' : 
                  exportConfig.format === 'csv' ? 'csv' : 
                  exportConfig.format === 'html' ? 'html' : 'json';
      a.download = `${filename}.${ext}`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('报告导出成功');
      setExportDialogOpen(false);
    } catch (error) {
      toast.error('导出失败');
    }
  };

  const pieData = stats
    ? [
        { name: '通过', value: stats.passedCount, color: '#0066ff' },
        { name: '失败', value: stats.failedCount, color: '#ef4444' },
      ]
    : [];

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <BentoHeader
          title="报告中心"
          description="查看测试执行统计和趋势分析"
        />
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as '7d' | '30d' | '90d')}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">最近7天</SelectItem>
              <SelectItem value="30d">最近30天</SelectItem>
              <SelectItem value="90d">最近90天</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setExportDialogOpen(true)} className="bg-[var(--electric)] hover:bg-[var(--electric)]/90">
            <Download className="mr-2 h-4 w-4" />
            导出报告
          </Button>
        </div>
      </div>

      {/* Stats Cards - Bento风格 */}
      <BentoGrid cols={4}>
        <BentoCard variant="bordered" className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[var(--electric)]/10 rounded-xl">
              <BarChart3 className="h-6 w-6 text-[var(--electric)]" />
            </div>
            <div>
              <p className="text-sm text-slate-500">总执行次数</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.totalExecutions || 0}</p>
            </div>
          </div>
        </BentoCard>

        <BentoCard variant="bordered" className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">通过次数</p>
              <p className="text-2xl font-bold text-emerald-500">
                {stats?.passedCount || 0}
              </p>
            </div>
          </div>
        </BentoCard>

        <BentoCard variant="bordered" className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/10 rounded-xl">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">失败次数</p>
              <p className="text-2xl font-bold text-red-500">
                {stats?.failedCount || 0}
              </p>
            </div>
          </div>
        </BentoCard>

        <BentoCard variant="bordered" className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <TrendingUp className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">通过率</p>
              <p className="text-2xl font-bold text-amber-500">
                {stats?.passRate || 0}%
              </p>
            </div>
          </div>
        </BentoCard>
      </BentoGrid>

      {/* Charts - Bento风格 */}
      <BentoGrid cols={2}>
        {/* Trend Chart */}
        <BentoCard variant="bordered" className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="h-5 w-5 text-[var(--electric)]" />
            <h3 className="font-semibold text-slate-900">执行趋势（最近7天）</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats?.executionsByDay || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e6e8" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e4e6e8',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }} 
              />
              <Legend />
              <Bar dataKey="passed" name="通过" fill="#0066ff" radius={[4, 4, 0, 0]} />
              <Bar dataKey="failed" name="失败" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </BentoCard>

        {/* Pie Chart */}
        <BentoCard variant="bordered" className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieIcon className="h-5 w-5 text-[var(--electric)]" />
            <h3 className="font-semibold text-slate-900">执行结果分布</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e4e6e8',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }} 
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </BentoCard>
      </BentoGrid>

      {/* 导出对话框 */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>导出报告</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>报告类型</Label>
              <Select
                value={exportConfig.type}
                onValueChange={(value) => setExportConfig({ ...exportConfig, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="testcases">测试用例报告</SelectItem>
                  <SelectItem value="executions">执行记录报告</SelectItem>
                  <SelectItem value="bugs">Bug 报告</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>导出格式</Label>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  type="button"
                  variant={exportConfig.format === 'xlsx' ? 'default' : 'outline'}
                  onClick={() => setExportConfig({ ...exportConfig, format: 'xlsx' })}
                  className={`flex flex-col items-center gap-1 h-auto py-3 ${exportConfig.format === 'xlsx' ? 'bg-[var(--electric)] hover:bg-[var(--electric)]/90' : ''}`}
                >
                  <FileSpreadsheet className="h-5 w-5" />
                  <span className="text-xs">Excel</span>
                </Button>
                <Button
                  type="button"
                  variant={exportConfig.format === 'csv' ? 'default' : 'outline'}
                  onClick={() => setExportConfig({ ...exportConfig, format: 'csv' })}
                  className={`flex flex-col items-center gap-1 h-auto py-3 ${exportConfig.format === 'csv' ? 'bg-[var(--electric)] hover:bg-[var(--electric)]/90' : ''}`}
                >
                  <Table className="h-5 w-5" />
                  <span className="text-xs">CSV</span>
                </Button>
                <Button
                  type="button"
                  variant={exportConfig.format === 'html' ? 'default' : 'outline'}
                  onClick={() => setExportConfig({ ...exportConfig, format: 'html' })}
                  className={`flex flex-col items-center gap-1 h-auto py-3 ${exportConfig.format === 'html' ? 'bg-[var(--electric)] hover:bg-[var(--electric)]/90' : ''}`}
                >
                  <Code className="h-5 w-5" />
                  <span className="text-xs">HTML</span>
                </Button>
                <Button
                  type="button"
                  variant={exportConfig.format === 'json' ? 'default' : 'outline'}
                  onClick={() => setExportConfig({ ...exportConfig, format: 'json' })}
                  className={`flex flex-col items-center gap-1 h-auto py-3 ${exportConfig.format === 'json' ? 'bg-[var(--electric)] hover:bg-[var(--electric)]/90' : ''}`}
                >
                  <FileText className="h-5 w-5" />
                  <span className="text-xs">JSON</span>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>开始日期</Label>
                <Input
                  type="date"
                  value={exportConfig.startDate}
                  onChange={(e) => setExportConfig({ ...exportConfig, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>结束日期</Label>
                <Input
                  type="date"
                  value={exportConfig.endDate}
                  onChange={(e) => setExportConfig({ ...exportConfig, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleExport} className="bg-[var(--electric)] hover:bg-[var(--electric)]/90">
              <Download className="mr-2 h-4 w-4" />
              导出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
