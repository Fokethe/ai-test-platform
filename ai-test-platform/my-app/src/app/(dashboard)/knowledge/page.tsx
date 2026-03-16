/**
 * Knowledge Base Page - Bento Grid风格
 * RAG知识库管理
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  BookOpen,
  Plus,
  Search,
  Loader2,
  FileText,
  Database,
  Upload,
  Trash2,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { toast } from 'sonner';
import { BentoCard, BentoGrid } from '@/components/bento';
import { BentoHeader } from '@/components/bento';
import { BentoSearch } from '@/components/bento';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  documentCount: number;
  vectorCount: number;
  status: 'ACTIVE' | 'SYNCING' | 'ERROR';
  lastSyncAt?: string;
  createdAt: string;
}

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data, error, isLoading, mutate } = useSWR(
    '/api/knowledge/bases',
    fetcher,
    { refreshInterval: 30000 }
  );

  const bases: KnowledgeBase[] = data?.data || [];

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此知识库吗？')) return;
    try {
      const res = await fetch(`/api/knowledge/bases/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('删除成功');
        mutate();
      } else {
        toast.error('删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  const stats = {
    total: bases.length,
    documents: bases.reduce((acc, b) => acc + b.documentCount, 0),
    vectors: bases.reduce((acc, b) => acc + b.vectorCount, 0),
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <BentoHeader
        title="知识库"
        description="管理RAG知识库和文档"
        count={stats.total}
        countLabel="个知识库"
        actionLabel="新建知识库"
        actionHref="/knowledge/new"
        onRefresh={() => mutate()}
        isRefreshing={isLoading}
      />

      {/* Stats */}
      <BentoGrid cols={3}>
        <BentoCard variant="bordered" className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--electric)]/10">
              <Database className="h-5 w-5 text-[var(--electric)]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-slate-500">知识库</p>
            </div>
          </div>
        </BentoCard>
        <BentoCard variant="bordered" className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.documents}</p>
              <p className="text-sm text-slate-500">文档</p>
            </div>
          </div>
        </BentoCard>
        <BentoCard variant="bordered" className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50">
              <BookOpen className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.vectors.toLocaleString()}</p>
              <p className="text-sm text-slate-500">向量</p>
            </div>
          </div>
        </BentoCard>
      </BentoGrid>

      {/* Search */}
      <BentoSearch
        value={searchQuery}
        onChange={setSearchQuery}
        onSearch={() => {}}
        placeholder="搜索知识库..."
      />

      {/* Knowledge Base List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--electric)]" />
        </div>
      ) : bases.length === 0 ? (
        <BentoCard className="p-12 text-center">
          <Database className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">暂无知识库</p>
          <Button className="mt-4 bg-[var(--electric)] hover:bg-[var(--electric)]/90" asChild>
            <Link href="/knowledge/new">创建第一个</Link>
          </Button>
        </BentoCard>
      ) : (
        <BentoGrid cols={2}>
          {bases.map((base) => (
            <KnowledgeBaseCard
              key={base.id}
              base={base}
              onDelete={() => handleDelete(base.id)}
            />
          ))}
        </BentoGrid>
      )}
    </div>
  );
}

function KnowledgeBaseCard({
  base,
  onDelete,
}: {
  base: KnowledgeBase;
  onDelete: () => void;
}) {
  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700 border-green-200',
    SYNCING: 'bg-blue-100 text-blue-700 border-blue-200',
    ERROR: 'bg-red-100 text-red-700 border-red-200',
  };

  const statusLabels: Record<string, string> = {
    ACTIVE: '正常',
    SYNCING: '同步中',
    ERROR: '错误',
  };

  return (
    <BentoCard
      variant="bordered"
      className="group p-5 hover:border-[var(--electric)] transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[var(--electric)]/10">
            <Database className="h-6 w-6 text-[var(--electric)]" />
          </div>
          <div>
            <Link
              href={`/knowledge/${base.id}`}
              className="font-semibold text-lg hover:text-[var(--electric)] transition-colors"
            >
              {base.name}
            </Link>
            <Badge className={`ml-2 ${statusColors[base.status]} border`} variant="outline">
              {statusLabels[base.status]}
            </Badge>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/knowledge/${base.id}`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                查看
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/knowledge/${base.id}/upload`}>
                <Upload className="mr-2 h-4 w-4" />
                上传文档
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {base.description && (
        <p className="mt-3 text-sm text-slate-500 line-clamp-2">
          {base.description}
        </p>
      )}

      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">文档</span>
          <span className="font-medium">{base.documentCount}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-slate-500">向量</span>
          <span className="font-medium">{base.vectorCount.toLocaleString()}</span>
        </div>
        {base.lastSyncAt && (
          <p className="mt-3 text-xs text-slate-400">
            上次同步: {new Date(base.lastSyncAt).toLocaleString()}
          </p>
        )}
      </div>
    </BentoCard>
  );
}
