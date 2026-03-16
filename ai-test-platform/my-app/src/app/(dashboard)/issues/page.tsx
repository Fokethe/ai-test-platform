/**
 * Issues Page - 缺陷管理（飞书+Bento融合风格）
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bug, 
  Plus, 
  MoreHorizontal, 
  Trash2, 
  Edit2, 
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  ChevronRight,
  Beaker,
  Play,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { BentoCard, BentoGrid, BentoHeader } from '@/components/bento';
import Link from 'next/link';

// ==================== 类型定义 ====================

interface Issue {
  id: string;
  title: string;
  description: string | null;
  type: 'BUG' | 'TASK' | 'IMPROVEMENT' | 'QUESTION';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  reporter: string;
  assignee?: string;
  testId?: string;
  runId?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== 状态配置 ====================

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  OPEN: { 
    label: '待处理', 
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  },
  IN_PROGRESS: { 
    label: '处理中', 
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  RESOLVED: { 
    label: '已解决', 
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  CLOSED: { 
    label: '已关闭', 
    color: 'text-slate-500',
    bgColor: 'bg-slate-100'
  }
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  CRITICAL: { label: '严重', color: 'bg-red-100 text-red-700' },
  HIGH: { label: '高', color: 'bg-orange-100 text-orange-700' },
  MEDIUM: { label: '中', color: 'bg-yellow-100 text-yellow-700' },
  LOW: { label: '低', color: 'bg-slate-100 text-slate-600' }
};

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  BUG: { label: '缺陷', icon: Bug, color: 'text-red-500' },
  TASK: { label: '任务', icon: CheckCircle2, color: 'text-blue-500' },
  IMPROVEMENT: { label: '改进', icon: AlertCircle, color: 'text-green-500' },
  QUESTION: { label: '问题', icon: AlertCircle, color: 'text-purple-500' }
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
  color?: 'blue' | 'red' | 'green' | 'amber';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
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

// ==================== 主页面 ====================

export default function IssuesPage() {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 模拟数据加载
  useEffect(() => {
    const mockData: Issue[] = [
      {
        id: '1',
        title: '登录页面在移动端显示异常',
        description: '在iPhone 14 Pro上，登录按钮被底部导航栏遮挡',
        type: 'BUG',
        severity: 'HIGH',
        status: 'OPEN',
        priority: 'HIGH',
        reporter: '张三',
        assignee: '李四',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: '2',
        title: '测试执行超时问题',
        description: '某些测试用例执行时间超过5分钟，需要优化',
        type: 'BUG',
        severity: 'CRITICAL',
        status: 'IN_PROGRESS',
        priority: 'CRITICAL',
        reporter: '王五',
        assignee: '赵六',
        testId: 'test-123',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: '3',
        title: '添加导出PDF功能',
        description: '用户希望能够导出测试报告为PDF格式',
        type: 'IMPROVEMENT',
        severity: 'MEDIUM',
        status: 'OPEN',
        priority: 'MEDIUM',
        reporter: '张三',
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        updatedAt: new Date(Date.now() - 259200000).toISOString()
      },
      {
        id: '4',
        title: 'API响应时间优化',
        description: '/api/tests 接口响应时间超过2秒',
        type: 'TASK',
        severity: 'HIGH',
        status: 'RESOLVED',
        priority: 'HIGH',
        reporter: '李四',
        assignee: '张三',
        createdAt: new Date(Date.now() - 432000000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: '5',
        title: '文档链接失效',
        description: '帮助文档中的API文档链接返回404',
        type: 'BUG',
        severity: 'LOW',
        status: 'CLOSED',
        priority: 'LOW',
        reporter: '王五',
        assignee: '李四',
        createdAt: new Date(Date.now() - 604800000).toISOString(),
        updatedAt: new Date(Date.now() - 518400000).toISOString()
      }
    ];
    
    setTimeout(() => {
      setIssues(mockData);
      setLoading(false);
    }, 500);
  }, []);

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch = issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (issue.description && issue.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || issue.status === statusFilter;
    const matchesSeverity = severityFilter === 'ALL' || issue.severity === severityFilter;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const handleSelect = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) { newSet.add(id); } else { newSet.delete(id); }
    setSelectedIds(newSet);
  };

  // 统计
  const stats = {
    total: issues.length,
    open: issues.filter(i => i.status === 'OPEN').length,
    inProgress: issues.filter(i => i.status === 'IN_PROGRESS').length,
    resolved: issues.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED').length,
    critical: issues.filter(i => i.severity === 'CRITICAL' && i.status !== 'CLOSED').length
  };

  return (
    <div className="p-6 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-6">
        <BentoHeader
          title="缺陷管理"
          description="跟踪和管理测试过程中发现的问题"
          count={issues.length}
          countLabel="个问题"
          actionLabel="新建问题"
          onAction={() => toast.info('新建问题功能开发中')}
          onRefresh={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 500);
          }}
          isRefreshing={loading}
          secondaryActions={selectedIds.size > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">已选 {selectedIds.size} 项</span>
              <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50">
                <Trash2 className="mr-2 h-4 w-4" />批量删除
              </Button>
            </div>
          ) : null}
        />

        {/* 统计概览 */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="总问题数"
              value={stats.total.toString()}
              subtitle="累计创建"
              icon={Bug}
              color="blue"
            />
            <StatCard
              title="待处理"
              value={stats.open.toString()}
              subtitle="需要关注"
              icon={AlertCircle}
              color="red"
            />
            <StatCard
              title="处理中"
              value={stats.inProgress.toString()}
              subtitle="正在进行"
              icon={Clock}
              color="amber"
            />
            <StatCard
              title="严重问题"
              value={stats.critical.toString()}
              subtitle="Critical级别"
              icon={Bug}
              color="red"
            />
          </div>
        </section>

        {/* 筛选栏 */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Input
              placeholder="搜索问题标题或描述..."
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
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[#e4e6e8] bg-white text-sm"
            >
              <option value="ALL">全部严重级别</option>
              {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 问题列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-[var(--electric)] border-t-transparent rounded-full" />
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🐛</div>
            <h3 className="text-lg font-semibold mb-2">还没有问题</h3>
            <p className="text-slate-600 mb-6">创建您的第一个问题记录</p>
            <Button className="bg-[var(--electric)] hover:bg-[var(--electric)]/90">
              <Plus className="mr-2 h-4 w-4" />新建问题
            </Button>
          </div>
        ) : (
          <BentoCard variant="bordered" className="divide-y divide-[#e4e6e8]">
            {filteredIssues.map((issue) => {
              const TypeIcon = TYPE_CONFIG[issue.type].icon;
              
              return (
                <div 
                  key={issue.id} 
                  className="group relative p-5 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* 选择框 */}
                    <div className="pt-1">
                      <Checkbox
                        checked={selectedIds.has(issue.id)}
                        onCheckedChange={(checked) => handleSelect(issue.id, checked as boolean)}
                        className="border-slate-300 data-[state=checked]:bg-[var(--electric)] data-[state=checked]:border-[var(--electric)]"
                      />
                    </div>

                    {/* 类型图标 */}
                    <div className={`w-10 h-10 rounded-lg ${STATUS_CONFIG[issue.status].bgColor} flex items-center justify-center flex-shrink-0`}>
                      <TypeIcon className={`w-5 h-5 ${TYPE_CONFIG[issue.type].color}`} />
                    </div>

                    {/* 内容区 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 
                            className="font-semibold text-[#1f2329] group-hover:text-[var(--electric)] transition-colors cursor-pointer"
                            onClick={() => router.push(`/issues/${issue.id}`)}
                          >
                            {issue.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={`${STATUS_CONFIG[issue.status].bgColor} ${STATUS_CONFIG[issue.status].color}`}>
                              {STATUS_CONFIG[issue.status].label}
                            </Badge>
                            <Badge className={SEVERITY_CONFIG[issue.severity].color}>
                              {SEVERITY_CONFIG[issue.severity].label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {TYPE_CONFIG[issue.type].label}
                            </Badge>
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/issues/${issue.id}`)}>
                              <Edit2 className="mr-2 h-4 w-4" />查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <CheckCircle2 className="mr-2 h-4 w-4" />标记解决
                            </DropdownMenuItem>
                            {issue.testId && (
                              <DropdownMenuItem onClick={() => router.push(`/tests/${issue.testId}`)}>
                                <Beaker className="mr-2 h-4 w-4" />查看关联用例
                              </DropdownMenuItem>
                            )}
                            {issue.runId && (
                              <DropdownMenuItem onClick={() => router.push(`/executions/${issue.runId}`)}>
                                <Play className="mr-2 h-4 w-4" />查看关联执行
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* 描述 */}
                      {issue.description && (
                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                          {issue.description}
                        </p>
                      )}

                      {/* 元信息 */}
                      <div className="flex items-center gap-4 mt-3 text-sm text-[#8f959e]">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          报告人: {issue.reporter}
                        </div>
                        {issue.assignee && (
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            指派给: {issue.assignee}
                          </div>
                        )}
                        <div className="ml-auto flex items-center gap-1">
                          创建于 {format(new Date(issue.createdAt), 'yyyy-MM-dd', { locale: zhCN })}
                          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--electric)]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </BentoCard>
        )}
      </div>
    </div>
  );
}
