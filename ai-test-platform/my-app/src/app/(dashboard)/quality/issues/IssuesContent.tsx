/**
 * Issues Content - 问题列表内容
 */

'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  Bug,
  Plus,
  Search,
  Loader2,
  MoreHorizontal,
  Filter,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
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
import { swrFetcher as fetcher } from '@/lib/utils/fetcher';

type IssueSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type IssueTab = 'all' | 'open' | 'in_progress' | 'resolved';

interface Issue {
  id: string;
  title: string;
  description?: string;
  severity: IssueSeverity;
  status: IssueStatus;
  reporter: { id: string; name: string };
  assignee?: { id: string; name: string };
  test?: { id: string; name: string };
  createdAt: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface IssuesResponse {
  data?: {
    list?: Issue[];
    pagination?: PaginationMeta;
  };
}

const SWR_OPTIONS = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
  refreshInterval: 30 * 60 * 1000,
};

const ISSUE_TABS: Array<{ id: IssueTab; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'open', label: '待处理' },
  { id: 'in_progress', label: '进行中' },
  { id: 'resolved', label: '已解决' },
];

const DEFAULT_META: PaginationMeta = {
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
};

const SEVERITY_COLOR: Record<IssueSeverity, string> = {
  CRITICAL: 'text-red-600',
  HIGH: 'text-orange-600',
  MEDIUM: 'text-yellow-600',
  LOW: 'text-slate-400',
};

const SEVERITY_BADGE: Record<IssueSeverity, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-slate-100 text-slate-700',
};

const SEVERITY_LABEL: Record<IssueSeverity, string> = {
  CRITICAL: '严重',
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
};

const STATUS_BADGE: Record<IssueStatus, string> = {
  OPEN: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-700',
};

const STATUS_LABEL: Record<IssueStatus, string> = {
  OPEN: '待处理',
  IN_PROGRESS: '进行中',
  RESOLVED: '已解决',
  CLOSED: '已关闭',
};

function buildIssuesApiUrl(params: {
  activeTab: IssueTab;
  searchQuery: string;
  page: number;
  pageSize: number;
}) {
  const searchParams = new URLSearchParams();
  if (params.activeTab !== 'all') {
    searchParams.set('status', params.activeTab.toUpperCase());
  }
  const trimmedKeyword = params.searchQuery.trim();
  if (trimmedKeyword) {
    searchParams.set('search', trimmedKeyword);
  }
  searchParams.set('page', params.page.toString());
  searchParams.set('pageSize', params.pageSize.toString());
  return `/api/issues?${searchParams.toString()}`;
}

function toIssueList(data: IssuesResponse | undefined): Issue[] {
  if (!Array.isArray(data?.data?.list)) {
    return [];
  }
  return data.data.list;
}

function toPaginationMeta(data: IssuesResponse | undefined): PaginationMeta {
  return data?.data?.pagination ?? DEFAULT_META;
}

export default function IssuesContent() {
  const [activeTab, setActiveTab] = useState<IssueTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const apiUrl = buildIssuesApiUrl({ activeTab, searchQuery, page, pageSize });
  const { data, error, isLoading, mutate } = useSWR<IssuesResponse>(apiUrl, fetcher, SWR_OPTIONS);

  const issues = useMemo(() => toIssueList(data), [data]);
  const meta = useMemo(() => toPaginationMeta(data), [data]);

  const handleSearch = () => {
    setPage(1);
    void mutate();
  };

  const handleRefresh = () => {
    void mutate();
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as IssueTab);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">问题管理</h1>
          <p className="text-slate-500">共 {meta.total} 个问题</p>
        </div>
        <Button asChild>
          <Link href="/quality/issues/new">
            <Plus className="w-4 h-4 mr-2" />
            新建问题
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索问题..."
            className="pl-10"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button variant="outline" onClick={handleSearch}>
          <Filter className="w-4 h-4 mr-2" />
          筛选
        </Button>
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full max-w-md grid-cols-4">
          {ISSUE_TABS.map((tab) => (
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
            onRefresh={() => void mutate()}
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
  error: unknown;
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
          <Link href="/quality/issues/new">创建第一个问题</Link>
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
  const reporterName = issue.reporter?.name ?? '-';
  const assigneeName = issue.assignee?.name;
  const testName = issue.test?.name;

  return (
    <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Bug className={`w-4 h-4 ${SEVERITY_COLOR[issue.severity]}`} />
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
          <span>报告人: {reporterName}</span>
          {assigneeName && <span>负责人: {assigneeName}</span>}
          {testName && <span>关联用例: {testName}</span>}
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
            <Link href={`/quality/issues/${issue.id}`}>查看详情</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/quality/issues/${issue.id}`}>编辑</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: IssueSeverity }) {
  return (
    <Badge className={SEVERITY_BADGE[severity]} variant="secondary">
      {SEVERITY_LABEL[severity]}
    </Badge>
  );
}

function StatusBadge({ status }: { status: IssueStatus }) {
  return (
    <Badge className={STATUS_BADGE[status]} variant="outline">
      {STATUS_LABEL[status]}
    </Badge>
  );
}
