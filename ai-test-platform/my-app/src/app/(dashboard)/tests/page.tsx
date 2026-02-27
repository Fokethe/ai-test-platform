/**
 * TestCenter Page - 合并用例/套件/AI生成
 * 连接真实 API，支持分页和性能优化
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import {
  Beaker,
  Plus,
  Folder,
  Sparkles,
  Search,
  Loader2,
  MoreHorizontal,
  FolderOpen,
  ChevronDown,
  ChevronUp,
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
import { InfiniteScroll } from '@/components/ui/virtual-list';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Test {
  id: string;
  name: string;
  description?: string;
  type: 'CASE' | 'SUITE' | 'FOLDER';
  status: string;
  priority: string;
  tags?: string;
  createdAt: string;
  _count?: { executions: number };
}

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 使用 useMemo 缓存 fetcher 配置
const swrOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
};

export default function TestCenterPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'cases';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // 无限滚动状态（用于大数据场景）
  const [infiniteItems, setInfiniteItems] = useState<Test[]>([]);
  const [infinitePage, setInfinitePage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [useInfiniteScroll, setUseInfiniteScroll] = useState(false);

  // 根据当前 tab 确定 type 参数
  const getTypeParam = () => {
    switch (activeTab) {
      case 'cases':
        return 'CASE';
      case 'suites':
        return 'SUITE';
      default:
        return '';
    }
  };

  // 构建 API URL
  const buildApiUrl = useCallback(() => {
    const params = new URLSearchParams();
    const type = getTypeParam();
    if (type) params.set('type', type);
    if (searchQuery) params.set('search', searchQuery);
    params.set('page', page.toString());
    params.set('pageSize', pageSize.toString());
    return `/api/tests?${params.toString()}`;
  }, [activeTab, searchQuery, page, pageSize]);

  // 获取数据
  const { data, error, isLoading, mutate } = useSWR(
    activeTab !== 'ai' ? buildApiUrl() : null,
    fetcher,
    swrOptions
  );

  const tests: Test[] = data?.data?.list || [];
  const meta: PaginationMeta = data?.data?.pagination || { total: 0, page: 1, pageSize: 20, totalPages: 0 };

  // 处理搜索
  const handleSearch = () => {
    setPage(1);
    setInfinitePage(1);
    setInfiniteItems([]);
    mutate();
  };

  // 加载更多（无限滚动）
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    
    const nextPage = infinitePage + 1;
    const params = new URLSearchParams();
    const type = getTypeParam();
    if (type) params.set('type', type);
    if (searchQuery) params.set('search', searchQuery);
    params.set('page', nextPage.toString());
    params.set('pageSize', '20');
    
    try {
      const res = await fetch(`/api/tests?${params.toString()}`);
      const result = await res.json();
      
      if (result.data?.list?.length > 0) {
        setInfiniteItems(prev => [...prev, ...result.data.list]);
        setInfinitePage(nextPage);
        setHasMore(result.data.length === 20);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error('Load more failed:', e);
    }
  }, [hasMore, isLoading, infinitePage, searchQuery, activeTab]);

  // 切换分页模式
  const togglePaginationMode = () => {
    setUseInfiniteScroll(!useInfiniteScroll);
    setInfiniteItems(tests);
    setInfinitePage(page);
    setHasMore(meta.page < meta.totalPages);
  };

  const tabs = [
    { id: 'cases', label: '用例', icon: Beaker },
    { id: 'suites', label: '套件', icon: Folder },
    { id: 'ai', label: 'AI生成', icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">测试中心</h1>
          <p className="text-slate-500">
            共 {meta?.total || 0} 个{activeTab === 'cases' ? '用例' : activeTab === 'suites' ? '套件' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab !== 'ai' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePaginationMode}
              className="text-slate-500"
            >
              {useInfiniteScroll ? '分页模式' : '无限滚动'}
            </Button>
          )}
          <Button asChild>
            <Link href={`/tests/new?type=${getTypeParam()}`}>
              <Plus className="w-4 h-4 mr-2" />
              新建{activeTab === 'cases' ? '用例' : activeTab === 'suites' ? '套件' : ''}
            </Link>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索测试用例、套件..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button variant="outline" onClick={handleSearch}>
          搜索
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v);
        setPage(1);
        setInfinitePage(1);
        setInfiniteItems([]);
      }}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="cases" className="mt-6">
          {useInfiniteScroll ? (
            <InfiniteTestList
              tests={infiniteItems.length > 0 ? infiniteItems : tests}
              hasMore={hasMore}
              isLoading={isLoading}
              onLoadMore={loadMore}
            />
          ) : (
            <>
              <TestList
                tests={tests}
                isLoading={isLoading}
                error={error}
                emptyText="暂无测试用例"
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
            </>
          )}
        </TabsContent>

        <TabsContent value="suites" className="mt-6">
          {useInfiniteScroll ? (
            <InfiniteTestList
              tests={infiniteItems.length > 0 ? infiniteItems : tests}
              hasMore={hasMore}
              isLoading={isLoading}
              onLoadMore={loadMore}
            />
          ) : (
            <>
              <TestList
                tests={tests}
                isLoading={isLoading}
                error={error}
                emptyText="暂无测试套件"
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
            </>
          )}
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <AIGeneratePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 无限滚动测试列表
function InfiniteTestList({
  tests,
  hasMore,
  isLoading,
  onLoadMore,
}: {
  tests: Test[];
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}) {
  if (tests.length === 0 && !isLoading) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <Beaker className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p className="text-slate-500">暂无测试用例</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/tests/new">创建第一个</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg divide-y">
      <InfiniteScroll
        items={tests}
        hasMore={hasMore}
        isLoading={isLoading}
        onLoadMore={onLoadMore}
        renderItem={(test) => <TestItem test={test} />}
      />
    </div>
  );
}

// 测试列表组件
function TestList({
  tests,
  isLoading,
  error,
  emptyText,
  onRefresh,
}: {
  tests: Test[];
  isLoading: boolean;
  error: any;
  emptyText: string;
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

  if (tests.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <Beaker className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p className="text-slate-500">{emptyText}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/tests/new">创建第一个</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg divide-y">
      {tests.map((test) => (
        <TestItem key={test.id} test={test} />
      ))}
    </div>
  );
}

// 单个测试项 - 使用 React.memo 优化渲染
const TestItem = React.memo(function TestItem({ test }: { test: Test }) {
  const tags = test.tags ? JSON.parse(test.tags) : [];

  return (
    <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/tests/${test.id}`}
            className="font-medium hover:text-blue-600 truncate"
          >
            {test.name}
          </Link>
          <PriorityBadge priority={test.priority} />
        </div>
        {test.description && (
          <p className="text-sm text-slate-500 mt-1 truncate">{test.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          {tags.slice(0, 5).map((tag: string) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {tags.length > 5 && (
            <Badge variant="outline" className="text-xs">+{tags.length - 5}</Badge>
          )}
          <span className="text-xs text-slate-400">
            执行 {test._count?.executions || 0} 次
          </span>
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
            <Link href={`/tests/${test.id}`}>查看</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/tests/${test.id}/edit`}>编辑</Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-red-600">删除</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

// 优先级标签
function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700',
    HIGH: 'bg-orange-100 text-orange-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    LOW: 'bg-slate-100 text-slate-700',
  };

  return (
    <Badge className={colors[priority] || colors.MEDIUM} variant="secondary">
      {priority === 'CRITICAL' ? '紧急' : priority === 'HIGH' ? '高' : priority === 'MEDIUM' ? '中' : '低'}
    </Badge>
  );
}

// AI 生成面板
function AIGeneratePanel() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="border rounded-lg p-6 hover:border-blue-300 transition-colors">
          <Sparkles className="w-8 h-8 mb-4 text-blue-500" />
          <h3 className="font-medium mb-2">从需求生成</h3>
          <p className="text-sm text-slate-500 mb-4">
            输入功能需求，AI 自动生成测试用例
          </p>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/ai-generate">开始生成</Link>
          </Button>
        </div>
        
        <div className="border rounded-lg p-6 hover:border-blue-300 transition-colors">
          <FolderOpen className="w-8 h-8 mb-4 text-green-500" />
          <h3 className="font-medium mb-2">从页面生成</h3>
          <p className="text-sm text-slate-500 mb-4">
            选择页面，AI 自动识别元素并生成用例
          </p>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/assets?type=page">选择页面</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
