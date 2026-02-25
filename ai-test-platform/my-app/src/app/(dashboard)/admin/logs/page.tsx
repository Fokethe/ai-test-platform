'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Download,
  Filter,
  RefreshCw,
  FileText,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  User,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ListSkeleton } from '@/components/ui/skeleton-list';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LogType, LogLevel } from '@prisma/client';

interface Log {
  id: string;
  type: LogType;
  level: LogLevel;
  userId: string | null;
  action: string;
  target: string;
  message: string;
  details: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

const levelColors: Record<LogLevel, string> = {
  DEBUG: 'bg-slate-500',
  INFO: 'bg-blue-500',
  WARN: 'bg-yellow-500',
  ERROR: 'bg-red-500',
};

const levelIcons: Record<LogLevel, React.ReactNode> = {
  DEBUG: <FileText className="h-4 w-4" />,
  INFO: <Info className="h-4 w-4" />,
  WARN: <AlertTriangle className="h-4 w-4" />,
  ERROR: <XCircle className="h-4 w-4" />,
};

const typeLabels: Record<LogType, string> = {
  OPERATION: '操作日志',
  SYSTEM: '系统日志',
  EXECUTION: '执行日志',
};

export default function LogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  
  // 筛选条件
  const [filters, setFilters] = useState({
    type: '',
    level: '',
    action: '',
    startDate: '',
    endDate: '',
  });

  // 检查权限
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      toast.error('您没有权限访问此页面');
      router.push('/dashboard');
    }
  }, [session, status, router]);

  // 获取日志列表
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (filters.type) params.append('type', filters.type);
      if (filters.level) params.append('level', filters.level);
      if (filters.action) params.append('action', filters.action);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const res = await fetch(`/api/logs?${params}`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(data.data);
      setTotal(data.pagination.total);
    } catch (error) {
      toast.error('获取日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      fetchLogs();
    }
  }, [page, filters.type, filters.level, status]);

  // 导出日志
  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      if (filters.type) params.append('type', filters.type);
      if (filters.level) params.append('level', filters.level);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const res = await fetch(`/api/logs/export?${params}`);
      if (!res.ok) throw new Error('Failed to export logs');

      if (format === 'csv') {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
      toast.success('导出成功');
    } catch (error) {
      toast.error('导出失败');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  if (status === 'loading') {
    return <ListSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">日志管理</h1>
          <p className="text-muted-foreground mt-1">
            查看系统操作日志、执行日志和系统事件
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('json')}>
            <Download className="mr-2 h-4 w-4" />
            导出 JSON
          </Button>
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="mr-2 h-4 w-4" />
            导出 CSV
          </Button>
          <Button onClick={fetchLogs} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
        </div>
      </div>

      {/* 筛选条件 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-40">
              <Select
                value={filters.type}
                onValueChange={(value) => setFilters({ ...filters, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="日志类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部类型</SelectItem>
                  <SelectItem value="OPERATION">操作日志</SelectItem>
                  <SelectItem value="SYSTEM">系统日志</SelectItem>
                  <SelectItem value="EXECUTION">执行日志</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Select
                value={filters.level}
                onValueChange={(value) => setFilters({ ...filters, level: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="日志级别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部级别</SelectItem>
                  <SelectItem value="DEBUG">DEBUG</SelectItem>
                  <SelectItem value="INFO">INFO</SelectItem>
                  <SelectItem value="WARN">WARN</SelectItem>
                  <SelectItem value="ERROR">ERROR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Input
                placeholder="操作类型"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              />
            </div>
            <div className="w-40">
              <Input
                type="date"
                placeholder="开始日期"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="w-40">
              <Input
                type="date"
                placeholder="结束日期"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <Button onClick={fetchLogs}>
              <Filter className="mr-2 h-4 w-4" />
              筛选
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 日志列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>日志列表</span>
            <span className="text-sm font-normal text-muted-foreground">
              共 {total} 条记录
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ListSkeleton />
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => setSelectedLog(log)}
                >
                  {/* 级别图标 */}
                  <div className={`p-2 rounded-full text-white ${levelColors[log.level]}`}>
                    {levelIcons[log.level]}
                  </div>
                  
                  {/* 日志内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{typeLabels[log.type]}</Badge>
                      <Badge className={levelColors[log.level]}>{log.level}</Badge>
                      <span className="text-sm font-medium">{log.action}</span>
                      <span className="text-sm text-muted-foreground">{log.target}</span>
                    </div>
                    <p className="text-sm text-foreground">{log.message}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {log.user && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.user.name || log.user.email}
                        </span>
                      )}
                      {log.ip && (
                        <span>IP: {log.ip}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(log.createdAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {logs.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">暂无日志记录</p>
                </div>
              )}
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {page} / {totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 日志详情对话框 */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>日志详情</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">日志ID</label>
                  <p className="text-sm font-mono">{selectedLog.id}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">时间</label>
                  <p className="text-sm">{new Date(selectedLog.createdAt).toLocaleString('zh-CN')}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">类型</label>
                  <p className="text-sm">{typeLabels[selectedLog.type]}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">级别</label>
                  <Badge className={levelColors[selectedLog.level]}>{selectedLog.level}</Badge>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">操作</label>
                  <p className="text-sm">{selectedLog.action}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">目标</label>
                  <p className="text-sm">{selectedLog.target}</p>
                </div>
                {selectedLog.user && (
                  <div>
                    <label className="text-sm text-muted-foreground">用户</label>
                    <p className="text-sm">{selectedLog.user.name || selectedLog.user.email}</p>
                  </div>
                )}
                {selectedLog.ip && (
                  <div>
                    <label className="text-sm text-muted-foreground">IP地址</label>
                    <p className="text-sm">{selectedLog.ip}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground">消息</label>
                <p className="text-sm mt-1 p-3 bg-muted rounded">{selectedLog.message}</p>
              </div>
              {selectedLog.details && (
                <div>
                  <label className="text-sm text-muted-foreground">详情</label>
                  <pre className="text-xs mt-1 p-3 bg-muted rounded overflow-auto max-h-48">
                    {JSON.stringify(JSON.parse(selectedLog.details), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
