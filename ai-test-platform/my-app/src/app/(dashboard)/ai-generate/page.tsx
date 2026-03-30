'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Beaker,
  FileText,
  History,
  Lightbulb,
  ListChecks,
  Shield,
  Sparkles,
  Upload,
  Zap,
} from 'lucide-react';
import { BentoCard, BentoGrid } from '@/components/bento';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const WORKFLOWS = [
  {
    title: '需求生成',
    summary: '上传需求文档或直接粘贴描述，先把需求整理成可追踪的测试输入。',
    icon: FileText,
    badge: '推荐',
    badgeTone: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50',
    href: '/ai-generate/requirements/upload',
    secondaryHref: '/ai-generate/requirements',
    primaryLabel: '上传并开始',
    secondaryLabel: '查看需求列表',
    highlights: ['智能解析需求文档', '自动提取测试点', '保留确认与编辑能力'],
  },
  {
    title: '用例生成',
    summary: '现在可以直接在生成页里选择需求和测试点，不用先绕去详情页再回来。',
    icon: Beaker,
    badge: '少跳页',
    badgeTone: 'bg-blue-50 text-blue-700 hover:bg-blue-50',
    href: '/ai-generate/testcases',
    secondaryHref: '/tests?tab=ai',
    primaryLabel: '直接开始生成',
    secondaryLabel: '在测试中心打开',
    highlights: ['同页选择需求与测试点', '支持一次生成多个测试点', '生成后直接筛选并保存'],
  },
];

const QUICK_STEPS = [
  '1. 整理需求或上传新文档',
  '2. 直接选择测试点并生成',
  '3. 在结果区筛选后保存到测试中心',
];

export default function AIGeneratePage() {
  return (
    <div className="space-y-8">
      <BentoCard
        variant="featured"
        className="overflow-hidden border-blue-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_42%),linear-gradient(135deg,rgba(239,246,255,0.96),rgba(255,255,255,0.98))] p-8"
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr),minmax(320px,0.8fr)]">
          <div className="space-y-5">
            <Badge className="w-fit bg-white/80 text-blue-700 shadow-sm hover:bg-white/80">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              AI 智能生成
            </Badge>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950">AI 智能生成</h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                这次把常用路径压成了两步：先整理需求，再直接进入用例生成工作台。少跳页，少回退，少重复生成。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/ai-generate/testcases">
                  直接去用例生成
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/ai-generate/requirements/upload">
                  <Upload className="mr-2 h-4 w-4" />
                  上传新需求
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-700">
              <Zap className="h-4 w-4 text-[var(--electric)]" />
              当前推荐路径
            </div>
            <div className="space-y-3">
              {QUICK_STEPS.map((step) => (
                <div key={step} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      </BentoCard>

      <BentoGrid cols={2} className="max-w-6xl">
        {WORKFLOWS.map((workflow, index) => {
          const Icon = workflow.icon;

          return (
            <BentoCard
              key={workflow.title}
              variant={index === 0 ? 'featured' : 'bordered'}
              className="group flex h-full flex-col justify-between p-8"
            >
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-3xl bg-gradient-to-br from-[var(--electric)] to-cyan-500 p-4 shadow-lg shadow-blue-500/20">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <Badge className={workflow.badgeTone}>{workflow.badge}</Badge>
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{workflow.title}</h2>
                  <p className="text-sm leading-7 text-slate-600">{workflow.summary}</p>
                </div>
                <div className="space-y-3">
                  {workflow.highlights.map((item, itemIndex) => (
                    <div key={item} className="flex items-center gap-3 text-sm text-slate-700">
                      {itemIndex === 0 ? (
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                      ) : itemIndex === 1 ? (
                        <ListChecks className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Shield className="h-4 w-4 text-blue-500" />
                      )}
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={workflow.href}>
                    {workflow.primaryLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={workflow.secondaryHref}>{workflow.secondaryLabel}</Link>
                </Button>
              </div>
            </BentoCard>
          );
        })}
      </BentoGrid>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr),minmax(280px,0.8fr)]">
        <BentoCard className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <History className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-semibold">最近生成</h2>
          </div>
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
            <p className="text-sm text-slate-500">当前没有最近记录时，也可以直接从上面的两个入口开始。</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/ai-generate/testcases">继续生成</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/tests?tab=ai">去测试中心查看</Link>
              </Button>
            </div>
          </div>
        </BentoCard>

        <BentoCard className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold text-slate-900">使用提示</h3>
          </div>
          <div className="space-y-3 text-sm leading-6 text-slate-600">
            <p>需求生成适合上传文档、补测试点、做确认。</p>
            <p>用例生成已经支持直接选需求和多测试点，一般不需要再绕去详情页。</p>
            <p>生成结果页里可以先删减，再按勾选项保存或导出。</p>
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
