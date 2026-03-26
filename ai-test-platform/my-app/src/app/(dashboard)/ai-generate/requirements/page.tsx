'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ChevronRight, FileText, Plus, Search, Sparkles, Upload } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { safeFetcher } from '@/lib/utils/fetcher';

type RequirementListItem = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  isConfirmed: boolean;
  testPointCount: number;
};

export default function AiRequirementsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const url = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('pageSize', '100');
    if (search.trim()) {
      params.set('search', search.trim());
    }
    return `/api/requirements?${params.toString()}`;
  }, [search]);

  const { data, isLoading } = useSWR(url, safeFetcher, {
    revalidateOnFocus: false,
  });

  const requirements: RequirementListItem[] = Array.isArray(data?.data?.list) ? data.data.list : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI 需求管理</h1>
          <p className="text-slate-500 mt-1">上传/管理需求，并生成测试点与测试用例</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/requirements')}>
            <FileText className="w-4 h-4 mr-2" />
            需求总览
          </Button>
          <Button onClick={() => router.push('/ai-generate/requirements/upload')}>
            <Upload className="w-4 h-4 mr-2" />
            上传需求
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <Input
          className="pl-10"
          placeholder="搜索需求标题或内容"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">加载中...</CardContent>
        </Card>
      ) : requirements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">暂无需求</p>
            <Button className="mt-4" onClick={() => router.push('/ai-generate/requirements/upload')}>
              <Plus className="w-4 h-4 mr-2" />
              上传第一个需求
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requirements.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold truncate">{item.title}</h3>
                      <Badge variant={item.isConfirmed ? 'default' : 'secondary'}>
                        {item.isConfirmed ? '已确认' : '待确认'}
                      </Badge>
                      <Badge variant="outline">{item.testPointCount} 个测试点</Badge>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-2">{item.content || '暂无内容'}</p>
                    <p className="text-xs text-slate-400">
                      创建时间：{new Date(item.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/ai-generate/requirements/${item.id}`)}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      打开
                    </Button>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

