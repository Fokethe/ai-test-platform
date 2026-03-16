/**
 * Requirements Page - 需求管理（飞书+Bento融合风格）
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  MoreHorizontal, 
  Trash2, 
  Edit2, 
  FileText, 
  Sparkles,
  Upload,
  Link as LinkIcon,
  CheckCircle2,
  Clock,
  XCircle,
  Beaker,
  ArrowRight,
  ChevronRight,
  Filter,
  Download
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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { BentoCard, BentoGrid, BentoHeader } from '@/components/bento';
import Link from 'next/link';

// ==================== 类型定义 ====================

interface Requirement {
  id: string;
  title: string;
  description: string | null;
  sourceType: 'UPLOAD' | 'PASTE' | 'JIRA' | 'NOTION' | 'FEISHU' | 'AI';
  status: 'DRAFT' | 'REVIEWING' | 'APPROVED' | 'IMPLEMENTED' | 'TESTED' | 'REJECTED';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  testCaseCount: number;
  createdAt: string;
  updatedAt: string;
  pageId?: string;
  page?: {
    name: string;
    system?: {
      name: string;
    };
  };
}

// ==================== 状态配置 ====================

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { 
    label: '草稿', 
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: FileText
  },
  REVIEWING: { 
    label: '评审中', 
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    icon: Clock
  },
  APPROVED: { 
    label: '已批准', 
    color: 'bg-green-50 text-green-600 border-green-200',
    icon: CheckCircle2
  },
  IMPLEMENTED: { 
    label: '已实现', 
    color: 'bg-purple-50 text-purple-600 border-purple-200',
    icon: CheckCircle2
  },
  TESTED: { 
    label: '已测试', 
    color: 'bg-[var(--electric)]/10 text-[var(--electric)] border-[var(--electric)]/30',
    icon: Beaker
  },
  REJECTED: { 
    label: '已拒绝', 
    color: 'bg-red-50 text-red-600 border-red-200',
    icon: XCircle
  }
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  P0: { label: 'P0-紧急', color: 'bg-red-100 text-red-700' },
  P1: { label: 'P1-高', color: 'bg-orange-100 text-orange-700' },
  P2: { label: 'P2-中', color: 'bg-yellow-100 text-yellow-700' },
  P3: { label: 'P3-低', color: 'bg-slate-100 text-slate-600' }
};

const SOURCE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  UPLOAD: { label: '上传文档', icon: Upload, color: 'text-blue-500' },
  PASTE: { label: '粘贴文本', icon: FileText, color: 'text-slate-500' },
  JIRA: { label: 'JIRA', icon: LinkIcon, color: 'text-blue-600' },
  NOTION: { label: 'Notion', icon: LinkIcon, color: 'text-slate-700' },
  FEISHU: { label: '飞书', icon: LinkIcon, color: 'text-blue-500' },
  AI: { label: 'AI生成', icon: Sparkles, color: 'text-[var(--electric)]' }
};

// ==================== 组件 ====================

// 快速操作卡片
function QuickActionCard({ 
  title, 
  description, 
  icon: Icon, 
  onClick,
  color = 'blue'
}: { 
  title: string; 
  description: string; 
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  color?: 'blue' | 'purple' | 'green' | 'amber';
}) {
  const colorClasses = {
    blue: 'from-[var(--electric)] to-blue-600',
    purple: 'from-purple-500 to-pink-500',
    green: 'from-green-500 to-emerald-500',
    amber: 'from-amber-500 to-orange-500',
  };

  return (
    <button onClick={onClick} className="block w-full text-left group">
      <div className="bento-card h-full hover:border-[var(--electric)]/50 transition-all duration-300">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <h3 className="font-semibold text-[#1f2329] mb-2 group-hover:text-[var(--electric)] transition-colors">
          {title}
        </h3>
        <p className="text-sm text-[#646a73] mb-4">{description}</p>
        <div className="flex items-center text-sm text-[var(--electric)] opacity-0 group-hover:opacity-100 transition-opacity">
          开始
          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </button>
  );
}

// AI生成对话框
function AIGenerateDialog({ open, onOpenChange, onSubmit }: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { prompt: string; projectId: string }) => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    // 模拟AI生成
    await new Promise(resolve => setTimeout(resolve, 2000));
    onSubmit({ prompt, projectId: 'default' });
    setGenerating(false);
    setPrompt('');
    onOpenChange(false);
    toast.success('AI已生成需求文档');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--electric)]" />
            AI生成需求
          </DialogTitle>
          <DialogDescription>
            输入功能描述，AI将自动分析并生成结构化的测试需求
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>功能描述 *</Label>
            <Textarea
              placeholder="例如：用户登录功能，支持手机号+验证码登录，需要验证手机号格式、验证码有效期等..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-[#8f959e]">
            <Sparkles className="w-4 h-4" />
            <span>AI将生成：功能点列表、业务规则、测试要点</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={generating || !prompt.trim()}
            className="bg-[var(--electric)] hover:bg-[var(--electric)]/90"
          >
            {generating ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                生成需求
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 创建需求对话框
function CreateDialog({ open, onOpenChange, onSubmit }: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { title: string; description: string; priority: string }) => void;
}) {
  const [formData, setFormData] = useState({ title: '', description: '', priority: 'P1' });
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    setCreating(true);
    await onSubmit(formData);
    setCreating(false);
    setFormData({ title: '', description: '', priority: 'P1' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建需求</DialogTitle>
          <DialogDescription>手动创建一个新的测试需求</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">需求标题 *</Label>
              <Input
                id="title"
                placeholder="例如：用户登录功能"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">需求描述</Label>
              <Textarea
                id="description"
                placeholder="详细描述功能需求..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>优先级</Label>
              <div className="flex gap-2">
                {(['P0', 'P1', 'P2', 'P3'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: p })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      formData.priority === p 
                        ? PRIORITY_CONFIG[p].color + ' ring-2 ring-offset-1 ring-current'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={creating} className="bg-[var(--electric)] hover:bg-[var(--electric)]/90">
              {creating ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 主页面 ====================

export default function RequirementsPage() {
  const router = useRouter();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  // 模拟数据加载
  useEffect(() => {
    // 模拟加载数据
    const mockData: Requirement[] = [
      {
        id: '1',
        title: '用户登录功能',
        description: '支持手机号+验证码登录，密码登录，第三方OAuth登录',
        sourceType: 'AI',
        status: 'APPROVED',
        priority: 'P0',
        testCaseCount: 12,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        page: { name: '登录页', system: { name: '用户中心' } }
      },
      {
        id: '2',
        title: '订单管理功能',
        description: '订单列表、订单详情、订单状态流转',
        sourceType: 'UPLOAD',
        status: 'REVIEWING',
        priority: 'P1',
        testCaseCount: 8,
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        page: { name: '订单页', system: { name: '交易系统' } }
      },
      {
        id: '3',
        title: '支付功能集成',
        description: '微信支付、支付宝支付集成，支付回调处理',
        sourceType: 'JIRA',
        status: 'DRAFT',
        priority: 'P0',
        testCaseCount: 0,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        page: { name: '支付页', system: { name: '交易系统' } }
      },
      {
        id: '4',
        title: '用户权限管理',
        description: 'RBAC权限模型，角色管理，权限分配',
        sourceType: 'NOTION',
        status: 'IMPLEMENTED',
        priority: 'P2',
        testCaseCount: 15,
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        page: { name: '权限页', system: { name: '管理后台' } }
      }
    ];
    
    setTimeout(() => {
      setRequirements(mockData);
      setLoading(false);
    }, 500);
  }, []);

  const filteredRequirements = requirements.filter((req) => {
    const matchesSearch = req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.description && req.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSelect = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) { newSet.add(id); } else { newSet.delete(id); }
    setSelectedIds(newSet);
  };

  const handleCreate = async (data: { title: string; description: string; priority: string }) => {
    const newReq: Requirement = {
      id: Date.now().toString(),
      title: data.title,
      description: data.description,
      sourceType: 'PASTE',
      status: 'DRAFT',
      priority: data.priority as any,
      testCaseCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setRequirements([newReq, ...requirements]);
    toast.success('需求创建成功');
  };

  const handleAIGenerate = async (data: { prompt: string; projectId: string }) => {
    const newReq: Requirement = {
      id: Date.now().toString(),
      title: data.prompt.slice(0, 30) + '...',
      description: data.prompt,
      sourceType: 'AI',
      status: 'DRAFT',
      priority: 'P1',
      testCaseCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setRequirements([newReq, ...requirements]);
  };

  const handleBatchDelete = async () => {
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个需求吗？`)) return;
    setRequirements(requirements.filter(r => !selectedIds.has(r.id)));
    toast.success(`已删除 ${selectedIds.size} 个需求`);
    setSelectedIds(new Set());
  };

  return (
    <div className="p-6 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-6">
        <BentoHeader
          title="需求管理"
          count={requirements.length}
          countLabel="个需求"
          actionLabel="创建需求"
          onAction={() => setCreateDialogOpen(true)}
          onRefresh={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 500);
          }}
          isRefreshing={loading}
          secondaryActions={selectedIds.size > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">已选 {selectedIds.size} 项</span>
              <Button variant="outline" size="sm" onClick={handleBatchDelete} className="border-red-200 text-red-600 hover:bg-red-50">
                <Trash2 className="mr-2 h-4 w-4" />批量删除
              </Button>
            </div>
          ) : null}
        />

        {/* 快速操作区 */}
        <section>
          <h2 className="text-sm font-medium text-[#646a73] mb-3">快速开始</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickActionCard
              title="AI生成需求"
              description="输入功能描述，AI自动生成结构化需求"
              icon={Sparkles}
              onClick={() => setAiDialogOpen(true)}
              color="purple"
            />
            <QuickActionCard
              title="手动创建"
              description="手动输入需求标题和描述"
              icon={Plus}
              onClick={() => setCreateDialogOpen(true)}
              color="blue"
            />
            <QuickActionCard
              title="上传文档"
              description="支持 PDF、Word、Markdown 格式"
              icon={Upload}
              onClick={() => toast.info('文档上传功能开发中')}
              color="green"
            />
            <QuickActionCard
              title="导入外部"
              description="从 JIRA、Notion、飞书导入"
              icon={LinkIcon}
              onClick={() => toast.info('导入功能开发中')}
              color="amber"
            />
          </div>
        </section>

        {/* 筛选栏 */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Input
              placeholder="搜索需求标题或描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8f959e]" />
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

        {/* 需求列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-[var(--electric)] border-t-transparent rounded-full" />
          </div>
        ) : filteredRequirements.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-semibold mb-2">还没有需求</h3>
            <p className="text-slate-600 mb-6">创建您的第一个测试需求</p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => setAiDialogOpen(true)} className="bg-[var(--electric)] hover:bg-[var(--electric)]/90">
                <Sparkles className="mr-2 h-4 w-4" />AI生成
              </Button>
              <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />手动创建
              </Button>
            </div>
          </div>
        ) : (
          <BentoGrid cols={2}>
            {filteredRequirements.map((req) => {
              const StatusIcon = STATUS_CONFIG[req.status].icon;
              const SourceIcon = SOURCE_CONFIG[req.sourceType].icon;
              
              return (
                <BentoCard
                  key={req.id}
                  variant="bordered"
                  className="group relative p-5 transition-all duration-300 hover:border-[var(--electric)] hover:shadow-lg hover:shadow-[var(--electric)]/10"
                >
                  <div className="absolute top-4 left-4 z-10">
                    <Checkbox
                      checked={selectedIds.has(req.id)}
                      onCheckedChange={(checked) => handleSelect(req.id, checked as boolean)}
                      className="border-slate-300 data-[state=checked]:bg-[var(--electric)] data-[state=checked]:border-[var(--electric)]"
                    />
                  </div>
                  <div className="absolute top-4 right-4 z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/requirements/${req.id}`)}>
                          <FileText className="mr-2 h-4 w-4" />查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit2 className="mr-2 h-4 w-4" />编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Beaker className="mr-2 h-4 w-4" />生成用例
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="cursor-pointer pt-8" onClick={() => router.push(`/requirements/${req.id}`)}>
                    {/* 标题和优先级 */}
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg text-slate-900 group-hover:text-[var(--electric)] transition-colors line-clamp-1 flex-1 mr-2">
                        {req.title}
                      </h3>
                      <Badge className={PRIORITY_CONFIG[req.priority].color}>
                        {PRIORITY_CONFIG[req.priority].label}
                      </Badge>
                    </div>

                    {/* 状态标签 */}
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className={STATUS_CONFIG[req.status].color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {STATUS_CONFIG[req.status].label}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-[#8f959e]">
                        <SourceIcon className={`w-3.5 h-3.5 ${SOURCE_CONFIG[req.sourceType].color}`} />
                        <span>{SOURCE_CONFIG[req.sourceType].label}</span>
                      </div>
                    </div>

                    {/* 描述 */}
                    <p className="text-sm text-slate-500 line-clamp-2 min-h-[40px] mb-4">
                      {req.description || '暂无描述'}
                    </p>

                    {/* 统计信息 */}
                    <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <div className="p-1.5 rounded-md bg-[var(--electric)]/10">
                          <Beaker className="h-3.5 w-3.5 text-[var(--electric)]" />
                        </div>
                        <span className="font-medium">{req.testCaseCount}</span>
                        <span className="text-slate-400">个用例</span>
                      </div>
                      {req.page && (
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <div className="p-1.5 rounded-md bg-blue-50">
                            <FileText className="h-3.5 w-3.5 text-blue-500" />
                          </div>
                          <span className="text-slate-500">{req.page.system?.name} / {req.page.name}</span>
                        </div>
                      )}
                    </div>

                    {/* 时间 */}
                    <div className="mt-3 text-xs text-slate-400 flex items-center justify-between">
                      <span>创建于 {format(new Date(req.createdAt), 'yyyy-MM-dd', { locale: zhCN })}</span>
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--electric)]" />
                    </div>
                  </div>
                </BentoCard>
              );
            })}
          </BentoGrid>
        )}
      </div>

      {/* 对话框 */}
      <CreateDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
      />
      <AIGenerateDialog 
        open={aiDialogOpen} 
        onOpenChange={setAiDialogOpen}
        onSubmit={handleAIGenerate}
      />
    </div>
  );
}
