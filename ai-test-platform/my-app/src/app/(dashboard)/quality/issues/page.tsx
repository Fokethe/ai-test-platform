/**
 * Issues List Page - 问题列表
 * 取代 Bug 列表
 */

'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import {
  Bug,
  Plus,
  Search,
  Loader2,
  MoreHorizontal,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pagination } from '@/components/ui/pagination';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Issue {
  id: string;
  title: string;
  description?: string;
  type: 'BUG' | 'TASK' | 'IMPROVEMENT' | 'QUESTION';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: string;
  reporter: { id: string; name: string };
  assignee?: { id: string; name: string };
  test?: { id: string; name: string };
  createdAt: string;
}

const swrOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
};

export default function IssuesPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 构建 API URL
  const buildApiUrl = () => {
    const params = new URLSearchParams();
    if (activeTab !== 'all') {
      params.set('status', activeTab.toUpperCase());
    }
    if (searchQuery) params.set('search', searchQuery);
    params.set('page', page.toString());
    params.set('pageSize', pageSize.toString());
    return `/api/issues?${params.toString()}`;
  };

  const { data, error, isLoading, mutate } = useSWR(
    buildApiUrl(),
    fetcher,
    swrOptions
  );

  const issues: Issue[] = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, pageSize: 20, totalPages: 0 };

  const tabs = [
    { id: 'all', label: '全部' },
    { id: 'open', label: '待处理' },
    { id: 'in_progress', label: '进行中' },
    { id: 'resolved', label: '已解决' },
  ];

  const handleSearch = () => {
    setPage(1);
    mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">问题管理</h1>
          <p className="text-slate-500">
            共 {meta?.total || 0} 个问题
          </p>
        </div>
        <Button asChild>
          <Link href="/quality/issues/new">
            <Plus className="w-4 h-4 mr-2" />
            新建问题
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索问题..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button variant="outline" onClick={handleSearch}>
          <Filter className="w-4 h-4 mr-2" />
          筛选
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
        <TabsList className="grid w-full max-w-md grid-cols-4">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <IssueList
            issues={issues}
            isLoading={isLoading}
            error={error}
            onRefresh={() => mutate()}
          />
          <Pagination
            currentPage={page}
            totalPages={meta.totalPages}
            totalItems={meta.total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IssueList({
  issues,
  isLoading,
  error,
  onRefresh,
}: {
  issues: Issue[];
  isLoading: boolean;
  error: any;
  onRefresh: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">加载失败</p>
        <Button variant="outline" className="mt-4" onClick={onRefresh}>
          重试
        </Button>
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <Bug className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p className="text-slate-500">暂无问题</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/quality/issues/new">创建第一个</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg divide-y">
      {issues.map((issue) => (
        <IssueItem key={issue.id} issue={issue} />
      ))}
    </div>
  );
}

function IssueItem({ issue }: { issue: Issue }) {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Bug className={`w-4 h-4 ${getSeverityColor(issue.severity)}`} />
          <Link
            href={`/quality/issues/${issue.id}`}
            className="font-medium hover:text-blue-600 truncate"
          >
            {issue.title}
          </Link>
          <SeverityBadge severity={issue.severity} />
          <StatusBadge status={issue.status} />
        </div>
        {issue.description && (
          <p className="text-sm text-slate-500 mt-1 truncate">{issue.description}</p>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
          <span>报告人: {issue.reporter?.name || '-'}</span>
          {issue.assignee && <span>负责人: {issue.assignee.name}</span>}
          {issue.test && <span>关联用例: {issue.test.name}</span>}
          <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/quality/issues/${issue.id}`}>查看</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/quality/issues/${issue.id}/edit`}>编辑</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function getSeverityColor(severity: string) {
  const colors: Record<string, string> = {
    CRITICAL: 'text-red-600',
    HIGH: 'text-orange-600',
    MEDIUM: 'text-yellow-600',
    LOW: 'text-slate-400',
  };
  return colors[severity] || colors.MEDIUM;
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700',
    HIGH: 'bg-orange-100 text-orange-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    LOW: 'bg-slate-100 text-slate-700',
  };
  const labels: Record<string, string> = {
    CRITICAL: '严重',
    HIGH: '高',
    MEDIUM: '中',
    LOW: '低',
  };
  return (
    <Badge className={colors[severity] || colors.MEDIUM} variant="secondary">
      {labels[severity] || severity}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    OPEN: 'bg-red-100 text-red-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    RESOLVED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-slate-100 text-slate-700',
  };
  const labels: Record<string, string> = {
    OPEN: '待处理',
    IN_PROGRESS: '进行中',
    RESOLVED: '已解决',
    CLOSED: '已关闭',
  };
  return (
    <Badge className={colors[status] || colors.OPEN} variant="outline">
      {labels[status] || status}
    </Badge>
  );
}
