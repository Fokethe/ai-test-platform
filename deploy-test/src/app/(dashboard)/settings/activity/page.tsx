/**
 * Activity Log Page
 * 活动日志页面 (原 /admin/logs)
 * TDD Batch 5.2: 实现导出和清空功能
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, Filter, Download, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface Log {
  id: string;
  action: string;
  user: string;
  target: string;
  time: string;
  type: string;
}

const typeColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  EXECUTE: 'bg-purple-100 text-purple-800',
  LOGIN: 'bg-slate-100 text-slate-800',
};

export default function ActivityPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

  // 加载日志数据
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (filter !== 'ALL') params.set('type', filter);
      
      const response = await fetch(`/api/logs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      } else {
        toast.error('加载日志失败');
      }
    } catch (error) {
      toast.error('加载日志失败');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // 导出日志
  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/logs/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: exportFormat }),
      });

      if (!response.ok) {
        throw new Error('导出失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `activity-logs-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('导出成功');
      setIsExportDialogOpen(false);
    } catch (error) {
      toast.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  // 清空日志
  const handleClear = async () => {
    setClearing(true);
    try {
      const response = await fetch('/api/logs/clear', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('清空失败');
      }

      toast.success('日志已清空');
      setIsClearDialogOpen(false);
      loadLogs(); // 刷新日志列表
    } catch (error) {
      toast.error('清空失败');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            活动日志
          </h1>
          <p className="text-slate-500 mt-1">查看系统操作记录</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsClearDialogOpen(true)}
            disabled={logs.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            清空日志
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsExportDialogOpen(true)}
            disabled={logs.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            导出日志
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Input
                placeholder="搜索操作或目标..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {['ALL', 'CREATE', 'UPDATE', 'DELETE'].map((type) => (
                <Button
                  key={type}
                  variant={filter === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(type)}
                >
                  {type === 'ALL' ? '全部' : type}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log List */}
      <Card>
        <CardHeader>
          <CardTitle>最近活动 {loading && <Loader2 className="inline h-4 w-4 animate-spin ml-2" />}</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <Badge className={typeColors[log.type] || 'bg-slate-100'}>
                      {log.type}
                    </Badge>
                    <div>
                      <p className="font-medium">{log.action}</p>
                      <p className="text-sm text-slate-500">
                        目标: {log.target} | 用户: {log.user}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-slate-400">{log.time}</span>
                </div>
              ))}
              {logs.length === 0 && !loading && (
                <div className="text-center py-8 text-slate-500">
                  没有找到匹配的日志
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 导出对话框 */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导出日志</DialogTitle>
            <DialogDescription>
              选择导出格式，导出当前筛选的日志记录
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex gap-4">
              <Button
                variant={exportFormat === 'csv' ? 'default' : 'outline'}
                onClick={() => setExportFormat('csv')}
                className="flex-1"
              >
                CSV 格式
              </Button>
              <Button
                variant={exportFormat === 'json' ? 'default' : 'outline'}
                onClick={() => setExportFormat('json')}
                className="flex-1"
              >
                JSON 格式
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  导出中...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  确认导出
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 清空确认对话框 */}
      <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认清空</DialogTitle>
            <DialogDescription>
              确定要清空所有日志吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClearDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleClear} disabled={clearing}>
              {clearing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  清空中...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  确认清空
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
