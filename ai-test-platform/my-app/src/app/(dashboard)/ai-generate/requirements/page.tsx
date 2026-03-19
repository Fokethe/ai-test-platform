'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ChevronRight, FileText, Plus, Search, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type RequirementListItem = {
  id: string;
  title: string;
  status?: string;
  description?: string | null;
  createdAt: string;
  testPointCount?: number;
  isConfirmed?: boolean;
};

type RequirementListResponse = {
  code: number;
  data?: {
    list?: RequirementListItem[];
  };
};

const fetcher = async (url: string): Promise<RequirementListResponse> => {
  const response = await fetch(url);
  return response.json();
};

export default function RequirementsListPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useSWR('/api/requirements?page=1&pageSize=50', fetcher, {
    revalidateOnFocus: false,
  });

  const requirements = useMemo(
    () => (Array.isArray(data?.data?.list) ? data!.data!.list! : []),
    [data]
  );

  const filteredRequirements = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return requirements;
    }

    return requirements.filter(
      (item) =>
        item.title?.toLowerCase().includes(keyword) ||
        (item.description || '').toLowerCase().includes(keyword)
    );
  }, [requirements, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Requirements</h1>
          <p className="text-slate-500">Review requirements and generate test assets with AI.</p>
        </div>
        <Button onClick={() => router.push('/ai-generate/requirements/upload')}>
          <Plus className="mr-2 h-4 w-4" />
          Upload Requirement
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search requirements"
          className="pl-10"
        />
      </div>

      <div className="grid gap-4">
        {filteredRequirements.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <p className="text-slate-500">No requirements found.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push('/ai-generate/requirements/upload')}
              >
                Upload your first requirement
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredRequirements.map((item) => (
            <Card key={item.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      <Badge variant={item.isConfirmed ? 'default' : 'secondary'}>
                        {item.isConfirmed ? 'Confirmed' : 'Draft'}
                      </Badge>
                      {typeof item.testPointCount === 'number' ? (
                        <Badge variant="outline">{item.testPointCount} test points</Badge>
                      ) : null}
                    </div>
                    <p className="mb-2 line-clamp-2 text-sm text-slate-500">
                      {item.description || 'No description'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Created at {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/ai-generate/requirements/${item.id}`)}
                    >
                      <Wand2 className="mr-2 h-4 w-4" />
                      Open
                    </Button>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
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
