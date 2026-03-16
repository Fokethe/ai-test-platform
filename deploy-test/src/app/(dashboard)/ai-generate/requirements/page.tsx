/**
 * AI Generate Requirements List Page
 * 需求列表页面 - 展示所有需求并支持AI生成测试用例
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Plus, Search, FileText, Wand2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function RequirementsListPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  // 获取需求列表
  const { data: requirementsData, isLoading } = useSWR('/api/requirements', fetcher);
  const requirements = Array.isArray(requirementsData?.data) ? requirementsData.data : [];

  // 过滤需求
  const filteredRequirements = requirements.filter((req: any) =>
    req.title?.toLowerCase().includes(search.toLowerCase()) ||
    req.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleGenerateTestCases = (requirementId: string) => {
    router.push(`/ai-generate/requirements/${requirementId}`);
  };

  const handleUploadRequirement = () => {
    router.push('/ai-generate/requirements/upload');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">需求管理</h1>
          <p className="text-slate-500">管理需求并使用AI生成测试用例</p>
        </div>
        <Button onClick={handleUploadRequirement}>
          <Plus className="w-4 h-4 mr-2" />
          上传需求文档
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <Input
          placeholder="搜索需求..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Requirements List */}
      <div className="grid gap-4">
        {filteredRequirements.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500">暂无需求</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={handleUploadRequirement}
              >
                上传第一个需求
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredRequirements.map((req: any) => (
            <Card key={req.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{req.title}</h3>
                      <Badge variant={req.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {req.status === 'ACTIVE' ? '活跃' : '草稿'}
                      </Badge>
                    </div>
                    <p className="text-slate-500 text-sm mb-2 line-clamp-2">
                      {req.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>创建于: {new Date(req.createdAt).toLocaleDateString('zh-CN')}</span>
                      {req.testCases?.length > 0 && (
                        <span>已生成 {req.testCases.length} 个测试用例</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateTestCases(req.id)}
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      AI生成
                    </Button>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}