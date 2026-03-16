/**
 * 知识库页面
 * 提供RAG检索增强的知识库查询功能
 */

'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, BookOpen, Sparkles, Quote, Clock, Database } from 'lucide-react';

interface SearchResult {
  answer: string;
  sources: Array<{
    id: string;
    content: string;
    score: number;
    metadata?: Record<string, unknown>;
  }>;
  citations: string[];
  context: {
    query: string;
    rewrittenQuery?: string;
    retrievalTime: number;
    totalTime: number;
    cacheHit: boolean;
  };
}

export default function KnowledgePage() {
  const { data: session } = useSession();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState({
    enableHyDE: true,
    enableQueryRewrite: true,
    enableSelfRAG: false,
    topK: 10,
  });

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          departmentId: 'default', // 实际应从用户上下文获取
          options,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '搜索失败');
      }

      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          知识库
        </h1>
        <p className="text-muted-foreground mt-2">
          基于RAG技术的智能知识检索系统，支持混合检索、查询重写、HyDE增强等高级功能
        </p>
      </div>

      {/* 搜索区域 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            智能搜索
          </CardTitle>
          <CardDescription>
            输入您的问题，系统将使用RAG技术从知识库中检索相关信息并生成回答
          </CardDescription>
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
            <Button 
              onClick={handleSearch} 
              disabled={isLoading || !query.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  搜索中
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  搜索
                </>
              )}
            </Button>
          </div>

          {/* 搜索选项 */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.enableHyDE}
                onChange={(e) => setOptions({ ...options, enableHyDE: e.target.checked })}
                className="rounded"
              />
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                HyDE增强
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.enableQueryRewrite}
                onChange={(e) => setOptions({ ...options, enableQueryRewrite: e.target.checked })}
                className="rounded"
              />
              <span>查询重写</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.enableSelfRAG}
                onChange={(e) => setOptions({ ...options, enableSelfRAG: e.target.checked })}
                className="rounded"
              />
              <span>Self-RAG验证</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* 搜索结果 */}
      {result && (
        <div className="space-y-6">
          {/* 回答卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                AI回答
              </CardTitle>
              {result.context.rewrittenQuery && (
                <CardDescription>
                  查询重写: "{result.context.rewrittenQuery}"
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-800">
                  {result.answer}
                </div>
              </div>

              {/* 引用 */}
              {result.citations.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1">
                    <Quote className="h-3 w-3" />
                    引用
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.citations.map((citation, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {citation}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 统计信息 */}
              <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  检索耗时: {result.context.retrievalTime}ms
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  总耗时: {result.context.totalTime}ms
                </span>
                {result.context.cacheHit && (
                  <Badge variant="outline" className="text-xs">缓存命中</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 来源卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" />
                参考来源
              </CardTitle>
              <CardDescription>
                共找到 {result.sources.length} 个相关来源
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {result.sources.map((source, index) => (
                    <div key={source.id}>
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-1">
                          #{index + 1}
                        </Badge>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-500">ID: {source.id}</span>
                            <Badge 
                              variant={source.score > 0.8 ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              相关度: {(source.score * 100).toFixed(1)}%
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-4">
                            {source.content}
                          </p>
                        </div>
                      </div>
                      {index < result.sources.length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 功能说明 */}
      {!result && !isLoading && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>RAG功能特性</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  混合检索 (Dense + BM25)
                </h4>
                <p className="text-sm text-gray-600">
                  同时使用向量语义检索和关键词检索，通过RRF融合获得最佳结果
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  HyDE增强检索
                </h4>
                <p className="text-sm text-gray-600">
                  生成假设性文档进行扩展检索，提升复杂查询的召回率
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-green-500" />
                  Cross-Encoder重排序
                </h4>
                <p className="text-sm text-gray-600">
                  使用bge-reranker模型对初步结果进行精确重排序
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  语义缓存
                </h4>
                <p className="text-sm text-gray-600">
                  基于向量相似度的查询缓存，提升响应速度
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
