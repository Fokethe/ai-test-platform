/**
 * AI 智能生成入口页面 - Bento Grid风格
 */

'use client'

import Link from 'next/link'
import { BentoCard, BentoGrid } from '@/components/bento'
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
  Shield,
  Zap,
} from 'lucide-react'

export default function AIGeneratePage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 居中Header带AI图标和渐变标题 */}
      <div className="text-center space-y-4 py-8">
        <div className="flex items-center justify-center gap-3">
          <div className="relative">
            <Sparkles className="h-10 w-10 text-[var(--neon)]" />
            <div className="absolute inset-0 blur-lg bg-gradient-to-r from-[var(--electric)] to-purple-500 opacity-50" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--electric)] via-purple-500 to-[var(--neon)] bg-clip-text text-transparent">
            AI 智能生成
          </h1>
        </div>
        <p className="text-slate-500 max-w-2xl mx-auto">
          利用 AI 技术快速生成测试需求和测试用例，提升测试效率
        </p>
      </div>

      {/* BentoGrid 2列展示功能卡片 */}
      <BentoGrid cols={2} className="max-w-4xl mx-auto">
        {/* 需求生成卡片 */}
        <BentoCard
          variant="featured"
          className="group relative overflow-hidden cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
          <Link href="/ai-generate/requirements" className="block p-8 relative">
            <div className="flex items-start justify-between mb-6">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[var(--electric)] to-blue-600 shadow-lg shadow-blue-500/30">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                <Zap className="h-3 w-3 mr-1" />
                推荐
              </Badge>
            </div>
            <h3 className="text-2xl font-bold mb-3 group-hover:text-[var(--electric)] transition-colors">
              需求生成
            </h3>
            <p className="text-slate-500 mb-6">
              从需求文档或描述自动生成结构化需求
            </p>
            <ul className="space-y-3 text-sm text-slate-600 mb-6">
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
            <Button className="w-full bg-[var(--electric)] hover:bg-[var(--electric)]/90">
              开始生成
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </BentoCard>

        {/* 用例生成卡片 */}
        <BentoCard
          variant="bordered"
          className="group relative overflow-hidden cursor-pointer hover:border-purple-500/50 transition-colors"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Link href="/ai-generate/testcases" className="block p-8 relative">
            <div className="flex items-start justify-between mb-6">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30">
                <Beaker className="h-8 w-8 text-white" />
              </div>
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                热门
              </Badge>
            </div>
            <h3 className="text-2xl font-bold mb-3 group-hover:text-purple-500 transition-colors">
              用例生成
            </h3>
            <p className="text-slate-500 mb-6">
              基于需求自动生成测试用例
            </p>
            <ul className="space-y-3 text-sm text-slate-600 mb-6">
              <li className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                基于需求生成
              </li>
              <li className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-green-500" />
                多场景覆盖
              </li>
              <li className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-500" />
                支持边界值和异常
              </li>
            </ul>
            <Button variant="outline" className="w-full border-purple-200 hover:bg-purple-50 hover:text-purple-700">
              开始生成
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </BentoCard>
      </BentoGrid>

      {/* 最近生成历史 */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-semibold">最近生成</h2>
          </div>
          <Link
            href="/tests?tab=ai"
            className="text-sm text-[var(--electric)] hover:text-[var(--electric)]/80 flex items-center gap-1"
          >
            查看全部
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <BentoCard className="p-12 text-center border-dashed">
          <History className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">暂无最近生成记录</p>
          <p className="text-sm text-slate-400 mt-1">
            使用上方功能开始您的第一次 AI 生成
          </p>
        </BentoCard>
      </div>

      {/* 使用提示 */}
      <div className="max-w-4xl mx-auto">
        <BentoCard className="p-6 bg-gradient-to-r from-[var(--electric)]/5 via-purple-500/5 to-[var(--neon)]/5 border-[var(--electric)]/20">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            使用提示
          </h3>
          <ul className="text-sm text-slate-600 space-y-2">
            <li>• 需求生成：支持上传文档或直接输入需求描述</li>
            <li>• 用例生成：选择已创建的需求，AI 将自动生成完整测试用例</li>
            <li>• 生成的内容可以直接保存到测试库中</li>
          </ul>
        </BentoCard>
      </div>
    </div>
  )
}
