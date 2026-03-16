/**
 * 编辑资产页面
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FileText, Globe, Code, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Link from 'next/link';
import useSWR from 'swr';
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

export default function EditAssetPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    url: '',
    selector: '',
    tags: '',
  });

  const { data, error, isLoading } = useSWR(
    id ? `/api/assets/${id}` : null,
    fetcher
  );

  const asset: Asset = data?.data;

  useEffect(() => {
    if (asset) {
      const tags = safeJsonParse<string[]>(asset.tags, []);
      setFormData({
        title: asset.title || '',
        description: asset.description || '',
        content: asset.content || '',
        url: asset.url || '',
        selector: asset.selector || '',
        tags: tags.join(', '),
      });
    }
  }, [asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('请输入标题');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          content: formData.content,
          url: formData.url,
          selector: formData.selector,
          tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });

      const result = await response.json();

      if (result.code !== 0) {
        toast.error(result.message || '更新失败');
        return;
      }

      toast.success('更新成功');
      window.location.href = `/assets/${id}`;
    } catch (error) {
      toast.error('更新失败，请稍后重试');
    } finally {
      setLoading(false);
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
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          重试
        </Button>
      </div>
    );
  }

  const getIcon = () => {
    switch (asset.type) {
      case 'DOC':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'PAGE':
        return <Globe className="w-5 h-5 text-green-600" />;
      case 'SNIPPET':
        return <Code className="w-5 h-5 text-purple-600" />;
      default:
        return <FileText className="w-5 h-5 text-slate-600" />;
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
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/assets/${id}`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回详情
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {getIcon()}
            <CardTitle>编辑{getTypeLabel()}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">标题 *</Label>
              <Input
                id="title"
                placeholder="请输入标题"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                placeholder="简短描述"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            {asset.type === 'PAGE' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="url">页面 URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://example.com/page"
                    value={formData.url}
                    onChange={(e) =>
                      setFormData({ ...formData, url: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selector">默认选择器</Label>
                  <Input
                    id="selector"
                    placeholder="如：#main-content"
                    value={formData.selector}
                    onChange={(e) =>
                      setFormData({ ...formData, selector: e.target.value })
                    }
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="content">
                {asset.type === 'SNIPPET' ? '代码内容' : '内容'}
              </Label>
              <Textarea
                id="content"
                placeholder={
                  asset.type === 'SNIPPET'
                    ? '粘贴代码...'
                    : '支持 Markdown 格式'
                }
                rows={15}
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">标签</Label>
              <Input
                id="tags"
                placeholder="用逗号分隔，如：需求,设计,API"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
              />
              <p className="text-xs text-slate-500">多个标签用逗号分隔</p>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <Button type="submit" disabled={loading} className="min-w-[100px]">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '保存'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                取消
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
