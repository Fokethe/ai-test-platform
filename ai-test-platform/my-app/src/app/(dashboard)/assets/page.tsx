/**
 * Asset Library - 合并知识库 + 页面管理
 * 连接真实 API，支持分页和性能优化
 */

'use client';

import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import {
  BookOpen,
  FileText,
  Globe,
  Plus,
  Search,
  Loader2,
  MoreHorizontal,
  Code,
  ExternalLink,
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

interface Asset {
  id: string;
  title: string;
  description?: string;
  type: 'DOC' | 'PAGE' | 'SNIPPET' | 'FILE';
  content?: string;
  url?: string;
  selector?: string;
  tags?: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const swrOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
};

export default function AssetLibraryPage() {
  const searchParams = useSearchParams();
  const defaultType = searchParams.get('type') || 'doc';
  const [activeTab, setActiveTab] = useState(defaultType);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 构建 API URL
  const buildApiUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'all') {
      params.set('type', activeTab.toUpperCase());
    }
    if (searchQuery) params.set('search', searchQuery);
    params.set('page', page.toString());
    params.set('pageSize', pageSize.toString());
    return `/api/assets?${params.toString()}`;
  }, [activeTab, searchQuery, page, pageSize]);

  // 获取数据
  const { data, error, isLoading, mutate } = useSWR(
    buildApiUrl(),
    fetcher,
    swrOptions
  );

  const assets: Asset[] = data?.data || [];
  const meta: PaginationMeta = data?.meta || { total: 0, page: 1, pageSize: 20, totalPages: 0 };

  const tabs = [
    { id: 'doc', label: '文档', icon: FileText },
    { id: 'page', label: '页面', icon: Globe },
    { id: 'snippet', label: '片段', icon: Code },
  ];

  const getCreateHref = () => {
    switch (activeTab) {
      case 'doc':
        return '/assets/docs/new';
      case 'page':
        return '/assets/pages/new';
      case 'snippet':
        return '/assets/snippets/new';
      default:
        return '/assets/new';
    }
  };

  const handleSearch = () => {
    setPage(1);
    mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">资产库</h1>
          <p className="text-slate-500">
            共 {meta?.total || 0} 个资产
          </p>
        </div>
        <Button asChild>
          <Link href={getCreateHref()}>
            <Plus className="w-4 h-4 mr-2" />
            新建
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索文档、页面..."
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
      }}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="doc" className="mt-6">
          <AssetList
            assets={assets.filter((a) => a.type === 'DOC')}
            isLoading={isLoading}
            error={error}
            emptyText="暂无文档"
            onRefresh={() => mutate()}
            type="doc"
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

        <TabsContent value="page" className="mt-6">
          <AssetList
            assets={assets.filter((a) => a.type === 'PAGE')}
            isLoading={isLoading}
            error={error}
            emptyText="暂无页面"
            onRefresh={() => mutate()}
            type="page"
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

        <TabsContent value="snippet" className="mt-6">
          <AssetList
            assets={assets.filter((a) => a.type === 'SNIPPET')}
            isLoading={isLoading}
            error={error}
            emptyText="暂无代码片段"
            onRefresh={() => mutate()}
            type="snippet"
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

// 资产列表组件
function AssetList({
  assets,
  isLoading,
  error,
  emptyText,
  onRefresh,
  type,
}: {
  assets: Asset[];
  isLoading: boolean;
  error: any;
  emptyText: string;
  onRefresh: () => void;
  type: 'doc' | 'page' | 'snippet';
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

  if (assets.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p className="text-slate-500">{emptyText}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href={`/assets/${type}s/new`}>创建第一个</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {assets.map((asset) => (
        <AssetCard key={asset.id} asset={asset} />
      ))}
    </div>
  );
}

// 资产卡片
function AssetCard({ asset }: { asset: Asset }) {
  const tags = asset.tags ? JSON.parse(asset.tags) : [];

  const getIcon = () => {
    switch (asset.type) {
      case 'DOC':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'PAGE':
        return <Globe className="w-5 h-5 text-green-600" />;
      case 'SNIPPET':
        return <Code className="w-5 h-5 text-purple-600" />;
      default:
        return <BookOpen className="w-5 h-5 text-slate-600" />;
    }
  };

  const getTypeLabel = () => {
    switch (asset.type) {
      case 'DOC':
        return '文档';
      case 'PAGE':
        return '页面';
      case 'SNIPPET':
        return '片段';
      default:
        return '文件';
    }
  };

  return (
    <div className="flex items-start justify-between p-4 border rounded-lg hover:border-blue-300 transition-colors">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="p-2 bg-slate-50 rounded-lg">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/assets/${asset.id}`}
              className="font-medium hover:text-blue-600 truncate"
            >
              {asset.title}
            </Link>
            <Badge variant="secondary" className="text-xs">
              {getTypeLabel()}
            </Badge>
          </div>
          
          {asset.description && (
            <p className="text-sm text-slate-500 mt-1 truncate">
              {asset.description}
            </p>
          )}

          {/* 页面特有信息 */}
          {asset.type === 'PAGE' && asset.url && (
            <div className="flex items-center gap-2 mt-2">
              <Globe className="w-3 h-3 text-slate-400" />
              <a
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                {asset.url}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* 选择器 */}
          {asset.selector && (
            <code className="text-xs bg-slate-100 px-2 py-0.5 rounded mt-2 inline-block">
              {asset.selector}
            </code>
          )}

          <div className="flex items-center gap-2 mt-2">
            {tags.slice(0, 5).map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 5 && (
              <Badge variant="outline" className="text-xs">+{tags.length - 5}</Badge>
            )}
            <span className="text-xs text-slate-400">
              更新于 {new Date(asset.updatedAt).toLocaleDateString()}
            </span>
          </div>
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
            <Link href={`/assets/${asset.id}`}>查看</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/assets/${asset.id}/edit`}>编辑</Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-red-600">删除</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
