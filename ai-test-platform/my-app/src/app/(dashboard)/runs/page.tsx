/**
 * RunCenter Page - 合并执行历史 + 定时任务
 */

'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Play, Clock, Calendar, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export default function RunCenterPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'history';
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">执行中心</h1>
          <p className="text-slate-500">管理测试执行和定时任务</p>
        </div>
        <Button>
          <Play className="w-4 h-4 mr-2" />
          立即执行
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="今日执行" value="12" trend="+3" />
        <StatCard label="成功率" value="87%" trend="+2%" />
        <StatCard label="平均耗时" value="4.5m" trend="-30s" />
        <StatCard label="定时任务" value="5" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="history">
            <Play className="w-4 h-4 mr-2" />
            执行历史
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            <Calendar className="w-4 h-4 mr-2" />
            定时任务
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-6">
          <RunHistoryPanel />
        </TabsContent>

        <TabsContent value="scheduled" className="mt-6">
          <ScheduledTasksPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, trend }: { label: string; value: string; trend?: string }) {
  return (
    <div className="border rounded-lg p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-2xl font-bold">{value}</span>
        {trend && (
          <Badge variant={trend.startsWith('+') ? 'default' : 'secondary'} className="text-xs">
            {trend}
          </Badge>
        )}
      </div>
    </div>
  );
}

// 执行历史面板
function RunHistoryPanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="搜索执行记录..." className="pl-10" />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      <div className="border rounded-lg">
        <div className="p-8 text-center text-slate-500">
          <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>执行历史将在这里显示</p>
          <p className="text-sm mt-1">包含测试运行的详细结果</p>
        </div>
      </div>
    </div>
  );
}

// 定时任务面板
function ScheduledTasksPanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">定时任务</h2>
        <Button variant="outline" size="sm">
          <Clock className="w-4 h-4 mr-2" />
          新建任务
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* 示例任务卡片 */}
        <ScheduledTaskCard
          name="每日冒烟测试"
          cron="0 9 * * *"
          status="active"
          lastRun="2小时前"
          nextRun="明天 09:00"
        />
        <ScheduledTaskCard
          name="每周回归测试"
          cron="0 0 * * 1"
          status="active"
          lastRun="3天前"
          nextRun="下周一 00:00"
        />
        <ScheduledTaskCard
          name="API 健康检查"
          cron="*/30 * * * *"
          status="paused"
          lastRun="1天前"
          nextRun="已暂停"
        />
      </div>
    </div>
  );
}

function ScheduledTaskCard({
  name,
  cron,
  status,
  lastRun,
  nextRun,
}: {
  name: string;
  cron: string;
  status: 'active' | 'paused';
  lastRun: string;
  nextRun: string;
}) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-medium">{name}</h3>
        <Badge variant={status === 'active' ? 'default' : 'secondary'}>
          {status === 'active' ? '运行中' : '已暂停'}
        </Badge>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center text-slate-500">
          <Clock className="w-4 h-4 mr-2" />
          <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">{cron}</code>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>上次: {lastRun}</span>
          <span>下次: {nextRun}</span>
        </div>
      </div>
    </div>
  );
}
