'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Filter, Download, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ListSkeleton } from '@/components/ui/skeleton-list';
import { PrefetchLink } from '@/components/ui/prefetch-link';

interface Log {
  id: string;
  type: string;
  level: string;
  action: string;
  target: string;
  message: string;
  createdAt: string;
  user?: {
    name: string | null;
    email: string;
  } | null;
}

export default function LogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: '', level: '' });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, filter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        ...(filter.type && { type: filter.type }),
        ...(filter.level && { level: filter.level }),
      });

      const res = await fetch(`/api/logs?${params}`);
      const data = await res.json();

      if (data.code === 0) {
        setLogs(data.data.list);
        setPagination(prev => ({ ...prev, ...data.data.pagination }));
      } else if (res.status === 403) {
        toast.error('权限不足');
        router.push('/dashboard');
      } else {
        toast.error(data.message || '获取日志失败');
      }
    } catch (error) {
      toast.error('获取日志失败');
    } finally {
      setLoading(false);
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'ERROR':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'WARN':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'bg-red-100 text-red-700';
      case 'WARN':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      OPERATION: '操作',
      SYSTEM: '系统',
      EXECUTION: '执行',
    };
    return labels[type] || type;
  };

  if (loading && logs.length === 0) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <ListSkeleton count={10} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <PrefetchLink href="/admin/users" className="text-slate-600 hover:text-slate-900 flex items-center gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" />
          返回
        </PrefetchLink>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">系统日志</h1>
            <p className="text-slate-600 mt-1">查看系统操作日志和事件</p>
          </div>
          <Button variant="outline" onClick={() => toast.info('导出功能开发中')}>
            <Download className="h-4 w-4 mr-2" />
            导出
          </Button>
        </div>
      </div>

      {/* 筛选 */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">筛选:</span>
            </div>
            <select
              className="px-3 py-1.5 border rounded-md text-sm"
              value={filter.type}
              onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
            >
              <option value="">所有类型</option>
              <option value="OPERATION">操作</option>
              <option value="SYSTEM">系统</option>
              <option value="EXECUTION">执行</option>
            </select>
            <select
              className="px-3 py-1.5 border rounded-md text-sm"
              value={filter.level}
              onChange={(e) => setFilter(prev => ({ ...prev, level: e.target.value }))}
            >
              <option value="">所有级别</option>
              <option value="INFO">信息</option>
              <option value="WARN">警告</option>
              <option value="ERROR">错误</option>
            </select>
            <Button variant="ghost" size="sm" onClick={() => setFilter({ type: '', level: '' })}>
              清除筛选
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 日志列表 */}
      <Card>
        <CardHeader>
          <CardTitle>日志记录 ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-center text-slate-400 py-8">暂无日志记录</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {getLevelIcon(log.level)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {getTypeLabel(log.type)}
                      </Badge>
                      <Badge className={`text-xs ${getLevelColor(log.level)}`}>
                        {log.level}
                      </Badge>
                      <span className="text-sm font-medium">{log.action}</span>
                      <span className="text-sm text-slate-500">{log.target}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{log.message}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                      <span>{new Date(log.createdAt).toLocaleString('zh-CN')}</span>
                      {log.user && (
                        <span>{log.user.name || log.user.email}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 分页 */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-slate-600">
                第 {pagination.page} / {pagination.totalPages} 页
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
