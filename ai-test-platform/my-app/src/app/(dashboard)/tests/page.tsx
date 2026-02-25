/**
 * TestCenter Page - 合并用例/套件/AI生成
 * 连接真实 API
 */

'use client';

import { useState, useEffect } from 'react';
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

export default function TestCenterPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'cases';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');

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
  const buildApiUrl = () => {
    const params = new URLSearchParams();
    const type = getTypeParam();
    if (type) params.set('type', type);
    if (searchQuery) params.set('search', searchQuery);
    params.set('pageSize', '20');
    return `/api/tests?${params.toString()}`;
  };

  // 获取数据
  const { data, error, isLoading, mutate } = useSWR(
    activeTab !== 'ai' ? buildApiUrl() : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const tests: Test[] = data?.data || [];
  const meta = data?.meta;

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
        <Button asChild>
          <Link href={`/tests/new?type=${getTypeParam()}`}>
            <Plus className="w-4 h-4 mr-2" />
            新建{activeTab === 'cases' ? '用例' : activeTab === 'suites' ? '套件' : ''}
          </Link>
        </Button>
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
            onKeyDown={(e) => e.key === 'Enter' && mutate()}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="cases" className="mt-6">
          <TestList
            tests={tests}
            isLoading={isLoading}
            error={error}
            emptyText="暂无测试用例"
            onRefresh={() => mutate()}
          />
        </TabsContent>

        <TabsContent value="suites" className="mt-6">
          <TestList
            tests={tests}
            isLoading={isLoading}
            error={error}
            emptyText="暂无测试套件"
            onRefresh={() => mutate()}
          />
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <AIGeneratePanel />
        </TabsContent>
      </Tabs>
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

// 单个测试项
function TestItem({ test }: { test: Test }) {
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
          {tags.map((tag: string) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
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
}

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
            <Link href="/tests/ai-generate">开始生成</Link>
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
