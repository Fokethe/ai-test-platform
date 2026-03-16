/**
 * 知识库页面
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function KnowledgePage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          departmentId: 'default',
        }),
      });
      
      const data = await response.json();
      setResult(data.data?.answer || '暂无结果');
    } catch (error) {
      setResult('搜索失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">知识库</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>智能搜索</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="请输入您的问题..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
              disabled={isLoading}
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? '搜索中...' : '搜索'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>搜索结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap">{result}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
