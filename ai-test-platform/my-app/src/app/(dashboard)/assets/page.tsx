/**
 * Asset Library - 合并知识库 + 页面管理
 */

'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookOpen, FileText, Globe, Plus, Search, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export default function AssetLibraryPage() {
  const searchParams = useSearchParams();
  const defaultType = searchParams.get('type') || 'doc';
  const [activeTab, setActiveTab] = useState(defaultType);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">资产库</h1>
          <p className="text-slate-500">管理文档、页面和代码片段</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          新建
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
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="doc">
            <FileText className="w-4 h-4 mr-2" />
            文档
          </TabsTrigger>
          <TabsTrigger value="page">
            <Globe className="w-4 h-4 mr-2" />
            页面
          </TabsTrigger>
          <TabsTrigger value="snippet">
            <BookOpen className="w-4 h-4 mr-2" />
            片段
          </TabsTrigger>
        </TabsList>

        <TabsContent value="doc" className="mt-6">
          <DocsPanel searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="page" className="mt-6">
          <PagesPanel searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="snippet" className="mt-6">
          <SnippetsPanel searchQuery={searchQuery} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 文档面板
function DocsPanel({ searchQuery }: { searchQuery: string }) {
  const docs = [
    { id: 1, title: 'API 接口文档', tags: ['api', '后端'], updatedAt: '2天前' },
    { id: 2, title: '测试用例编写规范', tags: ['规范', '测试'], updatedAt: '1周前' },
    { id: 3, title: '部署手册', tags: ['运维', '部署'], updatedAt: '3天前' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">文档列表</h2>
        <span className="text-sm text-slate-500">共 {docs.length} 个文档</span>
      </div>

      <div className="grid gap-4">
        {docs.map((doc) => (
          <AssetCard
            key={doc.id}
            icon={FileText}
            title={doc.title}
            tags={doc.tags}
            meta={doc.updatedAt}
          />
        ))}
      </div>
    </div>
  );
}

// 页面面板
function PagesPanel({ searchQuery }: { searchQuery: string }) {
  const pages = [
    { id: 1, title: '登录页面', url: '/login', selector: '#login-form' },
    { id: 2, title: '用户中心', url: '/user/profile', selector: '.profile-container' },
    { id: 3, title: '商品列表', url: '/products', selector: '.product-list' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">页面列表</h2>
        <span className="text-sm text-slate-500">共 {pages.length} 个页面</span>
      </div>

      <div className="grid gap-4">
        {pages.map((page) => (
          <div
            key={page.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Globe className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">{page.title}</h3>
                <p className="text-sm text-slate-500">{page.url}</p>
              </div>
            </div>
            <code className="text-xs bg-slate-100 px-2 py-1 rounded">
              {page.selector}
            </code>
          </div>
        ))}
      </div>
    </div>
  );
}

// 代码片段面板
function SnippetsPanel({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">代码片段</h2>
        <span className="text-sm text-slate-500">共 0 个片段</span>
      </div>

      <div className="border rounded-lg p-8 text-center text-slate-500">
        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>暂无代码片段</p>
        <Button variant="outline" className="mt-4">
          <Plus className="w-4 h-4 mr-2" />
          添加片段
        </Button>
      </div>
    </div>
  );
}

// 通用资产卡片
function AssetCard({
  icon: Icon,
  title,
  tags,
  meta,
}: {
  icon: any;
  title: string;
  tags: string[];
  meta: string;
}) {
  return (
    <div className="flex items-start justify-between p-4 border rounded-lg hover:border-blue-300 transition-colors cursor-pointer">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-slate-50 rounded-lg">
          <Icon className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <div className="flex items-center gap-2 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      <span className="text-sm text-slate-500">{meta}</span>
    </div>
  );
}
