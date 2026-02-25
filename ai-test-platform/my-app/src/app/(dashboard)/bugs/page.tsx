'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Bug,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ListSkeleton } from '@/components/ui/skeleton-list';
import {
  Dialog,
  DialogContent,
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
import { Severity, BugStatus } from '@prisma/client';

interface BugItem {
  id: string;
  title: string;
  description: string | null;
  severity: Severity;
  status: BugStatus;
  createdAt: string;
  updatedAt: string;
  reporter: { id: string; name: string | null; email: string } | null;
  assignee: { id: string; name: string | null; email: string } | null;
  testCase: { id: string; title: string } | null;
}

const severityColors: Record<Severity, string> = {
  CRITICAL: 'bg-red-600',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-blue-500',
};

const statusColors: Record<BugStatus, string> = {
  NEW: 'bg-slate-500',
  IN_PROGRESS: 'bg-blue-500',
  FIXED: 'bg-green-500',
  VERIFIED: 'bg-teal-500',
  CLOSED: 'bg-gray-500',
};

const statusLabels: Record<BugStatus, string> = {
  NEW: '新建',
  IN_PROGRESS: '处理中',
  FIXED: '已修复',
  VERIFIED: '已验证',
  CLOSED: '已关闭',
};

const severityLabels: Record<Severity, string> = {
  CRITICAL: '致命',
  HIGH: '严重',
  MEDIUM: '一般',
  LOW: '轻微',
};

export default function BugsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bugs, setBugs] = useState<BugItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedBug, setSelectedBug] = useState<BugItem | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
  });

  useEffect(() => {
    if (status === 'authenticated') {
      fetchBugs();
    }
  }, [status, page, filters]);

  const fetchBugs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (filters.status) params.append('status', filters.status);
      if (filters.severity) params.append('severity', filters.severity);

      const res = await fetch(`/api/bugs?${params}`);
      if (!res.ok) throw new Error('Failed to fetch bugs');
      const data = await res.json();
      setBugs(data.data);
      setTotal(data.pagination.total);
    } catch (error) {
      toast.error('获取 Bug 列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (bugId: string, newStatus: BugStatus) => {
    try {
      const res = await fetch(`/api/bugs/${bugId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update status');
      }

      toast.success('状态已更新');
      fetchBugs();
    } catch (error: any) {
      toast.error(error.message || '更新失败');
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
          <h1 className="text-3xl font-bold tracking-tight">Bug 管理</h1>
          <p className="text-muted-foreground mt-1">
            追踪和管理测试过程中发现的缺陷
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchBugs}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
          <Button onClick={() => router.push('/bugs/new')}>
            <Plus className="mr-2 h-4 w-4" />
            新建 Bug
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {(['NEW', 'IN_PROGRESS', 'FIXED', 'VERIFIED', 'CLOSED'] as BugStatus[]).map((s) => (
          <Card key={s} className={filters.status === s ? 'ring-2 ring-primary' : ''}>
            <CardContent className="p-4 cursor-pointer" onClick={() => setFilters({ ...filters, status: filters.status === s ? '' : s })}>
              <div className="text-2xl font-bold">{bugs.filter(b => b.status === s).length}</div>
              <div className="text-sm text-muted-foreground">{statusLabels[s]}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 筛选条件 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-40">
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部状态</SelectItem>
                  <SelectItem value="NEW">新建</SelectItem>
                  <SelectItem value="IN_PROGRESS">处理中</SelectItem>
                  <SelectItem value="FIXED">已修复</SelectItem>
                  <SelectItem value="VERIFIED">已验证</SelectItem>
                  <SelectItem value="CLOSED">已关闭</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Select
                value={filters.severity}
                onValueChange={(value) => setFilters({ ...filters, severity: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="严重程度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部级别</SelectItem>
                  <SelectItem value="CRITICAL">致命</SelectItem>
                  <SelectItem value="HIGH">严重</SelectItem>
                  <SelectItem value="MEDIUM">一般</SelectItem>
                  <SelectItem value="LOW">轻微</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => setFilters({ status: '', severity: '' })}>
              清除筛选
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bug 列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Bug 列表</span>
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
              {bugs.map((bug) => (
                <div
                  key={bug.id}
                  className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => setSelectedBug(bug)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={severityColors[bug.severity]}>
                          {severityLabels[bug.severity]}
                        </Badge>
                        <Badge className={statusColors[bug.status]}>
                          {statusLabels[bug.status]}
                        </Badge>
                        {bug.testCase && (
                          <Badge variant="outline">关联用例</Badge>
                        )}
                      </div>
                      <h3 className="font-medium">{bug.title}</h3>
                      {bug.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {bug.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          报告: {bug.reporter?.name || bug.reporter?.email}
                        </span>
                        {bug.assignee && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            指派: {bug.assignee.name || bug.assignee.email}
                          </span>
                        )}
                        <span>{new Date(bug.createdAt).toLocaleString('zh-CN')}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <Select
                        value={bug.status}
                        onValueChange={(value) => handleStatusChange(bug.id, value as BugStatus)}
                      >
                        <SelectTrigger className="w-32">
                          <ArrowRightLeft className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NEW">新建</SelectItem>
                          <SelectItem value="IN_PROGRESS">处理中</SelectItem>
                          <SelectItem value="FIXED">已修复</SelectItem>
                          <SelectItem value="VERIFIED">已验证</SelectItem>
                          <SelectItem value="CLOSED">已关闭</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}

              {bugs.length === 0 && (
                <div className="text-center py-12">
                  <Bug className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">暂无 Bug 记录</p>
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

      {/* Bug 详情对话框 */}
      <Dialog open={!!selectedBug} onOpenChange={() => setSelectedBug(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bug 详情</DialogTitle>
          </DialogHeader>
          {selectedBug && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={severityColors[selectedBug.severity]}>
                  {severityLabels[selectedBug.severity]}
                </Badge>
                <Badge className={statusColors[selectedBug.status]}>
                  {statusLabels[selectedBug.status]}
                </Badge>
              </div>
              <h3 className="font-medium text-lg">{selectedBug.title}</h3>
              {selectedBug.description && (
                <div className="bg-muted p-3 rounded">
                  <p className="text-sm whitespace-pre-wrap">{selectedBug.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-muted-foreground">报告人</label>
                  <p>{selectedBug.reporter?.name || selectedBug.reporter?.email}</p>
                </div>
                <div>
                  <label className="text-muted-foreground">处理人</label>
                  <p>{selectedBug.assignee?.name || selectedBug.assignee?.email || '未指派'}</p>
                </div>
                <div>
                  <label className="text-muted-foreground">创建时间</label>
                  <p>{new Date(selectedBug.createdAt).toLocaleString('zh-CN')}</p>
                </div>
                <div>
                  <label className="text-muted-foreground">更新时间</label>
                  <p>{new Date(selectedBug.updatedAt).toLocaleString('zh-CN')}</p>
                </div>
                {selectedBug.testCase && (
                  <div className="col-span-2">
                    <label className="text-muted-foreground">关联测试用例</label>
                    <p>{selectedBug.testCase.title}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
