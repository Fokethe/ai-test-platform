/**
 * Asset Library Content - Bento Grid风格重构版
 */

'use client';

import { useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  RefreshCw,
  File,
  Upload,
  Download,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pagination } from '@/components/ui/pagination';
import Link from 'next/link';
import { toast } from 'sonner';
import { safeJsonParse } from '@/lib/utils/json';
import { BentoCard, BentoGrid, BentoItem } from '@/components/bento';
import { BentoHeader } from '@/components/bento';
import { BentoSearch } from '@/components/bento';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 2000,
  refreshInterval: 30 * 60 * 1000,
};

export function AssetLibraryContent() {
  const searchParams = useSearchParams();
  const defaultType = searchParams.get('type') || 'doc';
  const [activeTab, setActiveTab] = useState(defaultType);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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

  const { data, error, isLoading, mutate } = useSWR(
    buildApiUrl(),
    fetcher,
    swrOptions
  );

  const assets: Asset[] = Array.isArray(data?.data?.list) ? data.data.list : [];
  const meta: PaginationMeta = data?.data?.pagination || { total: 0, page: 1, pageSize: 20, totalPages: 0 };

  const tabs = [
    { id: 'doc', label: '文档', icon: FileText },
    { id: 'page', label: '页面', icon: Globe },
    { id: 'snippet', label: '片段', icon: Code },
    { id: 'file', label: '文件', icon: File },
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
    <>
      {/* Header */}
      <BentoHeader
        title="资产库"
        description="管理文档、页面、代码片段和文件"
        count={meta?.total || 0}
        countLabel="个资产"
        actionLabel="新建"
        actionHref={getCreateHref()}
        onRefresh={() => mutate(undefined, { revalidate: true })}
        isRefreshing={isLoading}
      />

      {/* Search */}
      <BentoSearch
        value={searchQuery}
        onChange={setSearchQuery}
        onSearch={handleSearch}
        placeholder="搜索文档、页面、代码片段..."
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v);
        setPage(1);
      }}>
        <TabsList className="grid w-full max-w-md grid-cols-4 bg-slate-100 dark:bg-slate-800">
          {tabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
            >
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
          <div className="mt-4">
            <Pagination
              currentPage={page}
              totalPages={meta.totalPages}
              totalItems={meta.total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
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
          <div className="mt-4">
            <Pagination
              currentPage={page}
              totalPages={meta.totalPages}
              totalItems={meta.total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
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
          <div className="mt-4">
            <Pagination
              currentPage={page}
              totalPages={meta.totalPages}
              totalItems={meta.total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </TabsContent>

        <TabsContent value="file" className="mt-6">
          <FileList onRefresh={() => mutate()} />
        </TabsContent>
      </Tabs>
    </>
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
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此资产吗？')) return;
    
    setDeletingId(id);
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('删除成功');
        onRefresh();
      } else {
        toast.error('删除失败');
      }
    } catch {
      toast.error('删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--electric)]" />
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
      <BentoCard className="p-12 text-center">
        <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p className="text-slate-500">{emptyText}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href={`/assets/${type}s/new`}>创建第一个</Link>
        </Button>
      </BentoCard>
    );
  }

  return (
    <BentoGrid cols={1} className="gap-3">
      {assets.map((asset) => (
        <AssetCard 
          key={asset.id} 
          asset={asset} 
          onDelete={() => handleDelete(asset.id)}
          isDeleting={deletingId === asset.id}
        />
      ))}
    </BentoGrid>
  );
}

// 资产卡片
function AssetCard({ asset, onDelete, isDeleting }: { asset: Asset; onDelete: () => void; isDeleting: boolean }) {
  const tags = safeJsonParse<string[]>(asset.tags, []);

  const getIcon = () => {
    switch (asset.type) {
      case 'DOC':
        return <FileText className="w-5 h-5 text-[var(--electric)]" />;
      case 'PAGE':
        return <Globe className="w-5 h-5 text-green-500" />;
      case 'SNIPPET':
        return <Code className="w-5 h-5 text-purple-500" />;
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

  const getTypeColor = () => {
    switch (asset.type) {
      case 'DOC':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'PAGE':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'SNIPPET':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <BentoCard variant="bordered" className="p-4 hover:border-[var(--electric)] transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg shrink-0">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/assets/${asset.id}`}
                className="font-medium hover:text-[var(--electric)] truncate"
              >
                {asset.title}
              </Link>
              <Badge className={`${getTypeColor()} border`} variant="outline">
                {getTypeLabel()}
              </Badge>
            </div>
            
            {asset.description && (
              <p className="text-sm text-slate-500 mt-1 truncate">
                {asset.description}
              </p>
            )}

            {asset.type === 'PAGE' && asset.url && (
              <div className="flex items-center gap-2 mt-2">
                <Globe className="w-3 h-3 text-slate-400" />
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--electric)] hover:underline flex items-center gap-1"
                >
                  {asset.url}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {asset.selector && (
              <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded mt-2 inline-block">
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
            <DropdownMenuItem 
              className="text-red-600" 
              onClick={onDelete}
              disabled={isDeleting}
            >
              {isDeleting ? '删除中...' : '删除'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </BentoCard>
  );
}

// 文件接口
interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  createdAt: string;
  status: 'uploaded' | 'parsed' | 'pending';
  url?: string;
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 获取文件图标
function getFileIcon(type: string) {
  if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
  if (type.includes('word') || type.includes('doc')) return <FileText className="w-5 h-5 text-blue-500" />;
  if (type.includes('excel') || type.includes('sheet') || type.includes('csv')) return <FileText className="w-5 h-5 text-green-500" />;
  if (type.includes('image')) return <File className="w-5 h-5 text-purple-500" />;
  return <File className="w-5 h-5 text-slate-500" />;
}

// 文件列表组件
function FileList({ onRefresh }: { onRefresh: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: fileData, isLoading, error, mutate } = useSWR(
    '/api/files/list',
    fetcher,
    swrOptions
  );

  const files: FileItem[] = fileData?.data?.files || [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        toast.success('上传成功');
        mutate();
        onRefresh();
      } else {
        toast.error('上传失败');
      }
    } catch {
      toast.error('上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const res = await fetch(`/api/files/${file.id}/download`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        toast.error('下载失败');
      }
    } catch {
      toast.error('下载失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此文件吗？')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('删除成功');
        mutate();
        onRefresh();
      } else {
        toast.error('删除失败');
      }
    } catch {
      toast.error('删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--electric)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 上传区域 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          共 {files.length} 个文件
        </p>
        <div>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <label htmlFor="file-upload">
            <Button variant="outline" disabled={uploading} asChild>
              <span>
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                上传文件
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* 文件列表 */}
      {files.length === 0 ? (
        <BentoCard className="p-12 text-center">
          <File className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">暂无文件</p>
          <label htmlFor="file-upload">
            <Button variant="outline" className="mt-4">
              <Upload className="w-4 h-4 mr-2" />
              上传第一个文件
            </Button>
          </label>
        </BentoCard>
      ) : (
        <BentoCard variant="bordered" className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">文件名</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">大小</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">状态</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">上传时间</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">操作</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id} className="border-b last:border-b-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.type)}
                      <span className="font-medium">{file.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {formatFileSize(file.size)}
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={file.status === 'parsed' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {file.status === 'parsed' ? '已解析' : file.status === 'pending' ? '处理中' : '已上传'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {new Date(file.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(file)}
                        title="下载"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(file.id)}
                        disabled={deletingId === file.id}
                        title="删除"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deletingId === file.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </BentoCard>
      )}
    </div>
  );
}
