/**
 * Dashboard Page - 工作台（飞书+Bento融合风格）
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles,
  Plus,
  FileText,
  Beaker,
  Play,
  BarChart3,
  ChevronRight,
  Clock,
  TrendingUp,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';

// ==================== 组件 ====================

// 智能对话输入框
function SmartInput() {
  const [input, setInput] = useState('');
  const router = useRouter();

  const handleSubmit = () => {
    if (!input.trim()) return;
    
    // 简单的意图识别
    const query = input.toLowerCase();
    if (query.includes('生成') && query.includes('用例')) {
      toast.success('正在生成测试用例...');
      router.push('/tests?tab=ai');
    } else if (query.includes('执行') || query.includes('运行')) {
      toast.success('跳转到执行中心');
      router.push('/executions');
    } else if (query.includes('需求')) {
      toast.success('跳转到需求管理');
      router.push('/requirements');
    } else {
      toast.info('正在处理您的请求...');
    }
    setInput('');
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="relative bg-white rounded-2xl border border-[#e4e6e8] shadow-lg hover:shadow-xl transition-shadow">
        <div className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--electric)] to-[var(--neon)] flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="试试输入：生成登录功能的测试用例"
            className="flex-1 text-base text-[#1f2329] placeholder:text-[#8f959e] bg-transparent outline-none"
          />
          <Button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="rounded-xl bg-[var(--electric)] hover:bg-[var(--electric)]/90 px-6"
          >
            发送
          </Button>
        </div>
        <div className="px-4 pb-3 flex items-center gap-2 text-sm text-[#8f959e]">
          <span>快速指令:</span>
          <button 
            onClick={() => setInput('生成登录功能测试用例')}
            className="px-2 py-0.5 rounded-full bg-[#f5f6f7] hover:bg-[#e4e6e8] transition-colors"
          >
            生成用例
          </button>
          <button 
            onClick={() => setInput('查询最近执行结果')}
            className="px-2 py-0.5 rounded-full bg-[#f5f6f7] hover:bg-[#e4e6e8] transition-colors"
          >
            查询结果
          </button>
          <button 
            onClick={() => setInput('分析测试覆盖率')}
            className="px-2 py-0.5 rounded-full bg-[#f5f6f7] hover:bg-[#e4e6e8] transition-colors"
          >
            分析覆盖
          </button>
        </div>
      </div>
    </div>
  );
}

// 快速开始卡片
function QuickStartCard({ 
  title, 
  description, 
  icon: Icon, 
  href,
  color = 'blue'
}: { 
  title: string; 
  description: string; 
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color?: 'blue' | 'purple' | 'green' | 'amber';
}) {
  const colorClasses = {
    blue: 'from-[var(--electric)] to-blue-600',
    purple: 'from-purple-500 to-pink-500',
    green: 'from-green-500 to-emerald-500',
    amber: 'from-amber-500 to-orange-500',
  };

  return (
    <Link href={href} className="block group">
      <div className="bento-card h-full hover:border-[var(--electric)]/50 transition-all duration-300">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <h3 className="font-semibold text-[#1f2329] mb-2 group-hover:text-[var(--electric)] transition-colors">
          {title}
        </h3>
        <p className="text-sm text-[#646a73] mb-4">{description}</p>
        <div className="flex items-center text-sm text-[var(--electric)] opacity-0 group-hover:opacity-100 transition-opacity">
          开始使用
          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

// 统计卡片
function StatCard({ 
  title, 
  value, 
  trend,
  icon: Icon,
  color = 'blue'
}: { 
  title: string; 
  value: string; 
  trend?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'green' | 'amber' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bento-card p-5">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-sm text-green-600">
            <TrendingUp className="w-4 h-4" />
            <span>{trend}</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-[#646a73]">{title}</p>
        <p className="text-2xl font-bold text-[#1f2329] mt-1">{value}</p>
      </div>
    </div>
  );
}

// 最近动态
function RecentActivity() {
  const activities = [
    { id: 1, title: '执行了 "用户登录" 测试套件', time: '5分钟前', type: 'execution' },
    { id: 2, title: '创建了新的测试需求 "订单管理"', time: '1小时前', type: 'create' },
    { id: 3, title: 'AI生成了12个测试用例', time: '2小时前', type: 'ai' },
    { id: 4, title: '发现3个新的缺陷', time: '3小时前', type: 'bug' },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'execution': return Play;
      case 'create': return Plus;
      case 'ai': return Sparkles;
      case 'bug': return Beaker;
      default: return Clock;
    }
  };

  return (
    <div className="bento-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#1f2329]">最近动态</h3>
        <Link href="#" className="text-sm text-[var(--electric)] hover:underline">
          查看全部
        </Link>
      </div>
      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = getIcon(activity.type);
          return (
            <div key={activity.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#f5f6f7] transition-colors">
              <div className="w-8 h-8 rounded-lg bg-[#f5f6f7] flex items-center justify-center">
                <Icon className="w-4 h-4 text-[#646a73]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1f2329] truncate">{activity.title}</p>
                <p className="text-xs text-[#8f959e]">{activity.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== 主页面 ====================

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--electric)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 欢迎区域 */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-3xl font-bold text-[#1f2329]">
          欢迎使用 AI 测试平台
        </h1>
        <p className="text-[#646a73] max-w-xl mx-auto">
          通过智能对话快速创建测试用例、执行测试任务、分析测试报告
        </p>
      </div>

      {/* 智能对话入口 */}
      <SmartInput />

      {/* 快速开始 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1f2329]">快速开始</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickStartCard
            title="新建需求"
            description="从需求文档开始，AI自动生成测试要点"
            icon={FileText}
            href="/requirements/new"
            color="blue"
          />
          <QuickStartCard
            title="生成用例"
            description="基于需求智能生成完整测试用例"
            icon={Beaker}
            href="/tests?tab=ai"
            color="purple"
          />
          <QuickStartCard
            title="执行测试"
            description="一键执行测试套件，实时查看进度"
            icon={Play}
            href="/executions"
            color="green"
          />
          <QuickStartCard
            title="查看报告"
            description="多维度分析测试结果和质量趋势"
            icon={BarChart3}
            href="/reports"
            color="amber"
          />
        </div>
      </section>

      {/* 统计概览 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1f2329]">数据概览</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="总用例数"
            value="128"
            trend="+12%"
            icon={Beaker}
            color="blue"
          />
          <StatCard
            title="今日执行"
            value="24"
            trend="+5"
            icon={Play}
            color="green"
          />
          <StatCard
            title="通过率"
            value="96.5%"
            trend="+2.3%"
            icon={TrendingUp}
            color="blue"
          />
          <StatCard
            title="待处理缺陷"
            value="3"
            icon={Zap}
            color="amber"
          />
        </div>
      </section>

      {/* 最近动态 + 其他内容 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <div>
          <div className="bento-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#1f2329]">快捷链接</h3>
            </div>
            <div className="space-y-2">
              <Link 
                href="/projects" 
                className="flex items-center justify-between p-3 rounded-xl hover:bg-[#f5f6f7] transition-colors"
              >
                <span className="text-sm text-[#1f2329]">项目管理</span>
                <ChevronRight className="w-4 h-4 text-[#8f959e]" />
              </Link>
              <Link 
                href="/knowledge" 
                className="flex items-center justify-between p-3 rounded-xl hover:bg-[#f5f6f7] transition-colors"
              >
                <span className="text-sm text-[#1f2329]">知识库</span>
                <ChevronRight className="w-4 h-4 text-[#8f959e]" />
              </Link>
              <Link 
                href="/issues" 
                className="flex items-center justify-between p-3 rounded-xl hover:bg-[#f5f6f7] transition-colors"
              >
                <span className="text-sm text-[#1f2329]">缺陷管理</span>
                <ChevronRight className="w-4 h-4 text-[#8f959e]" />
              </Link>
              <Link 
                href="/settings" 
                className="flex items-center justify-between p-3 rounded-xl hover:bg-[#f5f6f7] transition-colors"
              >
                <span className="text-sm text-[#1f2329]">系统设置</span>
                <ChevronRight className="w-4 h-4 text-[#8f959e]" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
