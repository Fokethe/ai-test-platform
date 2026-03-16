/**
 * Asset Library Content - 资产库内容组件
 * 被 Suspense 边界包裹
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
  FileIcon,
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
import { safeJsonParse } from '@/lib/utils/json';

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

// SWR 配置 - 30分钟定时刷新
const swrOptions = {
  revalidateOnFocus: true,       // 窗口聚焦时重新验证
  revalidateOnReconnect: true,   // 重新连接时重新验证
  dedupingInterval: 2000,        // 2秒内相同请求去重
  refreshInterval: 30 * 60 * 1000, // 30分钟定时刷新
};

export default function AssetLibraryContent() {
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

  const assets: Asset[] = Array.isArray(data?.data?.list) ? data.data.list : [];
  const meta: PaginationMeta = data?.data?.pagination || { total: 0, page: 1, pageSize: 20, totalPages: 0 };

  // 调试日志
  console.log('Asset list data:', { url: buildApiUrl(), data, error, isLoading, assetsCount: assets.length });

  const tabs = [
    { id: 'doc', label: '文档', icon: FileText },
    { id: 'page', label: '页面', icon: Globe },
    { id: 'snippet', label: '片段', icon: Code },
    { id: 'file', label: '文件', icon: File },
  ];

  // 文件列表单独使用 /api/files/list
  const { data: fileData, error: fileError, isLoading: fileLoading, mutate: mutateFiles } = useSWR(
    activeTab === 'file' ? '/api/files/list' : null,
    fetcher,
    swrOptions
  );

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

      {/* Search & Refresh */}
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
        <Button 
          variant="outline" 
          size="icon"
          onClick={async () => {
            console.log('手动刷新触发');
            await mutate(undefined, { revalidate: true });
          }}
          disabled={isLoading}
          title="刷新"
        >
          <RefreshCw className={"w-4 h-4 " + (isLoading ? 'animate-spin' : '')} />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v);
        setPage(1);
      }}>
        <TabsList className="grid w-full max-w-md grid-cols-4">
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

        <TabsContent value="file" className="mt-6">
          <FileList
            files={fileData?.data?.files || []}
            isLoading={fileLoading}
            error={fileError}
            onRefresh={() => mutateFiles()}
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
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此资产吗？')) return;
    
    setDeletingId(id);
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      } else {
        alert('删除失败');
      }
    } catch {
      alert('删除失败');
    } finally {
      setDeletingId(null);
    }
  };
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
        <AssetCard 
          key={asset.id} 
          asset={asset} 
          onDelete={() => handleDelete(asset.id)}
          isDeleting={deletingId === asset.id}
        />
      ))}
    </div>
  );
}

// 资产卡片
function AssetCard({ asset, onDelete, isDeleting }: { asset: Asset; onDelete: () => void; isDeleting: boolean }) {
  // 使用安全解析
  const tags = safeJsonParse<string[]>(asset.tags, []);

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
  if (type.includes('image')) return <FileIcon className="w-5 h-5 text-purple-500" />;
  return <File className="w-5 h-5 text-slate-500" />;
}

// 文件列表组件
function FileList({
  files,
  isLoading,
  error,
  onRefresh,
}: {
  files: FileItem[];
  isLoading: boolean;
  error: any;
  onRefresh: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 文件上传
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
        onRefresh();
      } else {
        alert('上传失败');
      }
    } catch {
      alert('上传失败');
    } finally {
      setUploading(false);
    }
  };

  // 文件下载
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
        alert('下载失败');
      }
    } catch {
      alert('下载失败');
    }
  };

  // 文件删除
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此文件吗？')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      } else {
        alert('删除失败');
      }
    } catch {
      alert('删除失败');
    } finally {
      setDeletingId(null);
    }
  };

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
        <div className="border rounded-lg p-12 text-center">
          <File className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">暂无文件</p>
          <label htmlFor="file-upload">
            <Button variant="outline" className="mt-4">
              <Upload className="w-4 h-4 mr-2" />
              上传第一个文件
            </Button>
          </label>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">文件名</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">大小</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">状态</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">上传时间</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id} className="border-b last:border-b-0 hover:bg-slate-50">
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
        </div>
      )}
    </div>
  );
}
