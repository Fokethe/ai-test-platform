/**
 * Asset Detail Page - 资产详情
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  Globe,
  Code,
  ExternalLink,
  Loader2,
  Tag,
  Calendar,
  Clock,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface AssetDetail {
  id: string;
  title: string;
  description?: string;
  type: 'DOC' | 'PAGE' | 'SNIPPET' | 'FILE';
  content?: string;
  url?: string;
  selector?: string;
  tags: string[];
  selectors?: Array<{ name: string; selector: string; type: string }>;
  project?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/assets/${id}` : null,
    fetcher
  );

  const asset: AssetDetail = data?.data;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/assets');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyContent = () => {
    if (asset?.content) {
      navigator.clipboard.writeText(asset.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500">加载失败</p>
        <Button variant="outline" className="mt-4" onClick={() => mutate()}>
          重试
        </Button>
      </div>
    );
  }

  const getIcon = () => {
    switch (asset.type) {
      case 'DOC':
        return <FileText className="w-6 h-6 text-blue-600" />;
      case 'PAGE':
        return <Globe className="w-6 h-6 text-green-600" />;
      case 'SNIPPET':
        return <Code className="w-6 h-6 text-purple-600" />;
      default:
        return <BookOpen className="w-6 h-6 text-slate-600" />;
    }
  };

  const getTypeLabel = () => {
    switch (asset.type) {
      case 'DOC':
        return '文档';
      case 'PAGE':
        return '页面';
      case 'SNIPPET':
        return '代码片段';
      default:
        return '文件';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/assets">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">{getIcon()}</div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{asset.title}</h1>
                <Badge variant="secondary">{getTypeLabel()}</Badge>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {asset.project?.name} · 更新于 {new Date(asset.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/assets/${id}/edit`}>
              <Edit className="w-4 h-4 mr-2" />
              编辑
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除?</AlertDialogTitle>
                <AlertDialogDescription>
                  此操作将删除该资产，可在回收站恢复。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? '删除中...' : '确认删除'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Tags */}
      {asset.tags?.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="w-4 h-4 text-slate-400" />
          {asset.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Content based on type */}
      <Tabs defaultValue={asset.type === 'PAGE' ? 'preview' : 'content'}>
        <TabsList>
          {asset.type === 'PAGE' && <TabsTrigger value="preview">页面预览</TabsTrigger>}
          <TabsTrigger value="content">内容</TabsTrigger>
          {asset.selectors && asset.selectors.length > 0 && (
            <TabsTrigger value="selectors">元素选择器 ({asset.selectors.length})</TabsTrigger>
          )}
          <TabsTrigger value="info">信息</TabsTrigger>
        </TabsList>

        {asset.type === 'PAGE' && (
          <TabsContent value="preview" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>页面预览</span>
                  {asset.url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={asset.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        访问页面
                      </a>
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {asset.url ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                      <Globe className="w-4 h-4 text-slate-400" />
                      <code className="text-sm flex-1">{asset.url}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(asset.url || '');
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="border rounded-lg overflow-hidden bg-slate-50 aspect-video flex items-center justify-center">
                      <div className="text-center text-slate-400">
                        <Globe className="w-12 h-12 mx-auto mb-2" />
                        <p>页面预览需要配置浏览器引擎</p>
                        <Button variant="outline" className="mt-4" asChild>
                          <a href={asset.url} target="_blank" rel="noopener noreferrer">
                            在新窗口打开
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">未配置页面 URL</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="content" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>内容</CardTitle>
              {asset.content && (
                <Button variant="outline" size="sm" onClick={handleCopyContent}>
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      复制
                    </>
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {asset.content ? (
                <ScrollArea className="h-[400px]">
                  <pre className="text-sm bg-slate-50 p-4 rounded-lg overflow-auto">
                    <code>
                      {asset.type === 'PAGE' || asset.type === 'SNIPPET'
                        ? (() => {
                            try {
                              const parsed = JSON.parse(asset.content);
                              return JSON.stringify(parsed, null, 2);
                            } catch {
                              return asset.content;
                            }
                          })()
                        : asset.content}
                    </code>
                  </pre>
                </ScrollArea>
              ) : (
                <p className="text-slate-500 text-center py-8">暂无内容</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {asset.selectors && asset.selectors.length > 0 && (
          <TabsContent value="selectors" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>元素选择器</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {asset.selectors.map((sel, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                      <span className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-sm font-medium">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{sel.name}</p>
                        <code className="text-xs bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block">
                          {sel.selector}
                        </code>
                      </div>
                      <Badge variant="outline">{sel.type}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(sel.selector);
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="info" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {asset.description && (
                <div>
                  <label className="text-sm font-medium text-slate-500">描述</label>
                  <p className="mt-1">{asset.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">类型</label>
                  <p className="mt-1">{getTypeLabel()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">项目</label>
                  <p className="mt-1">{asset.project?.name || '-'}</p>
                </div>
              </div>
              {asset.selector && (
                <div>
                  <label className="text-sm font-medium text-slate-500">主选择器</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-slate-100 px-2 py-1 rounded flex-1">{asset.selector}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(asset.selector || '');
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">创建时间</label>
                  <p className="mt-1 flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {new Date(asset.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">更新时间</label>
                  <p className="mt-1 flex items-center gap-1">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {new Date(asset.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
