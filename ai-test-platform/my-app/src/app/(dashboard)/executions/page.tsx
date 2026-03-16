/**
 * Executions Page - 测试执行中心（飞书+Bento融合风格）
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Play, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MoreHorizontal,
  Calendar,
  BarChart3,
  RotateCcw,
  ChevronRight,
  Filter,
  Search,
  Zap,
  Timer,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { BentoCard, BentoGrid, BentoHeader } from '@/components/bento';
import Link from 'next/link';

// ==================== 类型定义 ====================

interface Execution {
  id: string;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  type: 'MANUAL' | 'SCHEDULED' | 'WEBHOOK' | 'API';
  totalCount: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  duration?: number; // milliseconds
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  createdBy?: string;
}

// ==================== 状态配置 ====================

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; bgColor: string }> = {
  PENDING: { 
    label: '等待中', 
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    icon: Clock
  },
  RUNNING: { 
    label: '执行中', 
    color: 'text-[var(--electric)]',
    bgColor: 'bg-[var(--electric)]/10',
    icon: Play
  },
  COMPLETED: { 
    label: '已完成', 
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: CheckCircle2
  },
  FAILED: { 
    label: '失败', 
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    icon: XCircle
  },
  CANCELLED: { 
    label: '已取消', 
    color: 'text-slate-500',
    bgColor: 'bg-slate-100',
    icon: AlertCircle
  }
};

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  MANUAL: { label: '手动', color: 'bg-blue-100 text-blue-700' },
  SCHEDULED: { label: '定时', color: 'bg-purple-100 text-purple-700' },
  WEBHOOK: { label: 'Webhook', color: 'bg-orange-100 text-orange-700' },
  API: { label: 'API', color: 'bg-slate-100 text-slate-700' }
};

// ==================== 组件 ====================

// 统计卡片
function StatCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon,
  color = 'blue'
}: { 
  title: string; 
  value: string; 
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-[var(--electric)]/10 text-[var(--electric)]',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <BentoCard className="p-5">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-[#646a73]">{title}</p>
        <p className="text-2xl font-bold text-[#1f2329] mt-1">{value}</p>
        {subtitle && <p className="text-xs text-[#8f959e] mt-1">{subtitle}</p>}
      </div>
    </BentoCard>
  );
}

// 进度条
function ProgressBar({ 
  total, 
  passed, 
  failed, 
  skipped 
}: { 
  total: number; 
  passed: number; 
  failed: number; 
  skipped: number;
}) {
  if (total === 0) return null;
  
  const passedPercent = (passed / total) * 100;
  const failedPercent = (failed / total) * 100;
  const skippedPercent = (skipped / total) * 100;
  
  return (
    <div className="w-full">
      <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
        <div 
          className="bg-green-500 transition-all duration-500"
          style={{ width: `${passedPercent}%` }}
        />
        <div 
          className="bg-red-500 transition-all duration-500"
          style={{ width: `${failedPercent}%` }}
        />
        <div 
          className="bg-amber-400 transition-all duration-500"
          style={{ width: `${skippedPercent}%` }}
        />
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs">
        <span className="text-green-600">通过 {passed}</span>
        <span className="text-red-600">失败 {failed}</span>
        <span className="text-amber-600">跳过 {skipped}</span>
        <span className="text-slate-400 ml-auto">总计 {total}</span>
      </div>
    </div>
  );
}

// 执行列表项
function ExecutionItem({ execution }: { execution: Execution }) {
  const router = useRouter();
  const StatusIcon = STATUS_CONFIG[execution.status].icon;
  const passRate = execution.totalCount > 0 
    ? Math.round((execution.passedCount / execution.totalCount) * 100) 
    : 0;

  return (
    <div className="group relative p-5 hover:bg-slate-50/50 transition-colors cursor-pointer"
         onClick={() => router.push(`/executions/${execution.id}`)}>
      <div className="flex items-start gap-4">
        {/* 状态图标 */}
        <div className={`w-12 h-12 rounded-xl ${STATUS_CONFIG[execution.status].bgColor} flex items-center justify-center flex-shrink-0`}>
          <StatusIcon className={`w-6 h-6 ${STATUS_CONFIG[execution.status].color}`} />
        </div>

        {/* 内容区 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-[#1f2329] group-hover:text-[var(--electric)] transition-colors">
                {execution.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={TYPE_CONFIG[execution.type].color}>
                  {TYPE_CONFIG[execution.type].label}
                </Badge>
                <Badge className={`${STATUS_CONFIG[execution.status].bgColor} ${STATUS_CONFIG[execution.status].color}`}>
                  {STATUS_CONFIG[execution.status].label}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {execution.status === 'COMPLETED' && (
                <div className={`text-2xl font-bold ${passRate >= 90 ? 'text-green-600' : passRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                  {passRate}%
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>查看详情</DropdownMenuItem>
                  <DropdownMenuItem>查看报告</DropdownMenuItem>
                  {execution.status === 'COMPLETED' && (
                    <DropdownMenuItem>重新执行</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* 进度条 */}
          {execution.status !== 'PENDING' && execution.status !== 'CANCELLED' && (
            <div className="mt-3">
              <ProgressBar 
                total={execution.totalCount}
                passed={execution.passedCount}
                failed={execution.failedCount}
                skipped={execution.skippedCount}
              />
            </div>
          )}

          {/* 元信息 */}
          <div className="flex items-center gap-4 mt-3 text-sm text-[#8f959e]">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(execution.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
            </div>
            {execution.duration && (
              <div className="flex items-center gap-1">
                <Timer className="w-4 h-4" />
                {Math.round(execution.duration / 1000)}s
              </div>
            )}
            <div className="ml-auto flex items-center gap-1 text-[var(--electric)]">
              查看详情
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 主页面 ====================

export default function ExecutionsPage() {
  const router = useRouter();
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // 模拟数据加载
  useEffect(() => {
    const mockData: Execution[] = [
      {
        id: '1',
        name: '用户登录功能回归测试',
        status: 'COMPLETED',
        type: 'MANUAL',
        totalCount: 24,
        passedCount: 23,
        failedCount: 1,
        skippedCount: 0,
        duration: 125000,
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date(Date.now() - 3500000).toISOString(),
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        createdBy: '张三'
      },
      {
        id: '2',
        name: '订单流程定时执行',
        status: 'RUNNING',
        type: 'SCHEDULED',
        totalCount: 18,
        passedCount: 12,
        failedCount: 0,
        skippedCount: 0,
        startedAt: new Date(Date.now() - 300000).toISOString(),
        createdAt: new Date(Date.now() - 300000).toISOString(),
        createdBy: '系统'
      },
      {
        id: '3',
        name: '支付功能冒烟测试',
        status: 'FAILED',
        type: 'API',
        totalCount: 8,
        passedCount: 5,
        failedCount: 3,
        skippedCount: 0,
        duration: 45000,
        startedAt: new Date(Date.now() - 7200000).toISOString(),
        completedAt: new Date(Date.now() - 7150000).toISOString(),
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        createdBy: '李四'
      },
      {
        id: '4',
        name: '全量回归测试套件',
        status: 'PENDING',
        type: 'MANUAL',
        totalCount: 156,
        passedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        createdBy: '王五'
      },
      {
        id: '5',
        name: 'GitLab Webhook 触发测试',
        status: 'COMPLETED',
        type: 'WEBHOOK',
        totalCount: 32,
        passedCount: 32,
        failedCount: 0,
        skippedCount: 0,
        duration: 89000,
        startedAt: new Date(Date.now() - 86400000).toISOString(),
        completedAt: new Date(Date.now() - 86300000).toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        createdBy: 'Webhook'
      }
    ];
    
    setTimeout(() => {
      setExecutions(mockData);
      setLoading(false);
    }, 500);
  }, []);

  const filteredExecutions = executions.filter((exec) => {
    const matchesSearch = exec.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || exec.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 统计
  const stats = {
    total: executions.length,
    running: executions.filter(e => e.status === 'RUNNING').length,
    completed: executions.filter(e => e.status === 'COMPLETED').length,
    failed: executions.filter(e => e.status === 'FAILED').length,
  };

  return (
    <div className="p-6 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-6">
        <BentoHeader
          title="测试执行"
          description="管理和监控测试执行状态"
          count={executions.length}
          countLabel="次执行"
          actionLabel="新建执行"
          onAction={() => toast.info('新建执行功能开发中')}
          onRefresh={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 500);
          }}
          isRefreshing={loading}
        />

        {/* 统计概览 */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="总执行次数"
              value={stats.total.toString()}
              subtitle="本月累计"
              icon={Zap}
              color="blue"
            />
            <StatCard
              title="执行中"
              value={stats.running.toString()}
              subtitle="正在进行"
              icon={Play}
              color="purple"
            />
            <StatCard
              title="已完成"
              value={stats.completed.toString()}
              subtitle="成功完成"
              icon={CheckCircle2}
              color="green"
            />
            <StatCard
              title="失败"
              value={stats.failed.toString()}
              subtitle="需要关注"
              icon={XCircle}
              color="red"
            />
          </div>
        </section>

        {/* 筛选栏 */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Input
              placeholder="搜索执行名称..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8f959e]" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#8f959e]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[#e4e6e8] bg-white text-sm"
            >
              <option value="ALL">全部状态</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 执行列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-[var(--electric)] border-t-transparent rounded-full" />
          </div>
        ) : filteredExecutions.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">▶️</div>
            <h3 className="text-lg font-semibold mb-2">还没有执行记录</h3>
            <p className="text-slate-600 mb-6">开始执行您的第一个测试</p>
            <Button className="bg-[var(--electric)] hover:bg-[var(--electric)]/90">
              <Play className="mr-2 h-4 w-4" />开始执行
            </Button>
          </div>
        ) : (
          <BentoCard variant="bordered" className="divide-y divide-[#e4e6e8]">
            {filteredExecutions.map((execution) => (
              <ExecutionItem key={execution.id} execution={execution} />
            ))}
          </BentoCard>
        )}
      </div>
    </div>
  );
}
