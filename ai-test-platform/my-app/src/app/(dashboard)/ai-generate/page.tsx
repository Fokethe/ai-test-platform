/**
 * AI 智能生成入口页面
 * 提供需求生成和用例生成功能的入口
 */

'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Beaker,
  Sparkles,
  ArrowRight,
  History,
  Lightbulb,
  ListChecks,
  Zap,
  Shield,
} from 'lucide-react'

export default function AIGeneratePage() {
  const router = useRouter()

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-slate-900">AI 智能生成</h1>
        </div>
        <p className="text-slate-600 max-w-2xl mx-auto">
          利用 AI 技术快速生成测试需求和测试用例，提升测试效率
        </p>
      </div>

      {/* 功能卡片 */}
      <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
        {/* 需求生成卡片 */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-all hover:border-purple-300 group"
          onClick={() => router.push('/ai-generate/requirements')}
          data-testid="requirement-card"
        >
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                <Zap className="h-3 w-3 mr-1" />
                推荐
              </Badge>
            </div>
            <CardTitle className="text-xl mt-4">需求生成</CardTitle>
            <CardDescription>
              从需求文档或描述自动生成结构化需求
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                智能解析需求文档
              </li>
              <li className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-green-500" />
                自动提取测试要点
              </li>
              <li className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                生成结构化需求
              </li>
            </ul>
            <Button className="w-full" asChild>
              <Link href="/ai-generate/requirements" data-testid="requirement-button">
                开始生成
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* 用例生成卡片 */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-all hover:border-purple-300 group"
          onClick={() => router.push('/ai-generate/testcases')}
          data-testid="testcase-card"
        >
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                <Beaker className="h-8 w-8 text-purple-600" />
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                热门
              </Badge>
            </div>
            <CardTitle className="text-xl mt-4">用例生成</CardTitle>
            <CardDescription>
              基于需求自动生成测试用例
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                基于需求生成
              </li>
              <li className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-green-500" />
                多场景覆盖
              </li>
              <li className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                支持边界值和异常
              </li>
            </ul>
            <Button className="w-full" variant="secondary" asChild>
              <Link href="/ai-generate/testcases" data-testid="testcase-button">
                开始生成
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 最近生成历史 */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-semibold">最近生成</h2>
          </div>
          <Link
            href="/tests?tab=ai"
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            data-testid="history-link"
          >
            查看全部
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <Card className="bg-slate-50 border-dashed">
          <CardContent className="py-12 text-center">
            <History className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">暂无最近生成记录</p>
            <p className="text-sm text-slate-400 mt-1">
              使用上方功能开始您的第一次 AI 生成
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 使用提示 */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-2">💡 使用提示</h3>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>• 需求生成：支持上传文档或直接输入需求描述</li>
            <li>• 用例生成：选择已创建的需求，AI 将自动生成完整测试用例</li>
            <li>• 生成的内容可以直接保存到测试库中</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
