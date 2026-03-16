/**
 * Requirement Detail Page - 需求详情（飞书+Bento融合风格）
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft,
  Edit2,
  Trash2,
  Beaker,
  Sparkles,
  FileText,
  Upload,
  Link as LinkIcon,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Play,
  Calendar,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { BentoCard, BentoGrid } from '@/components/bento';
import Link from 'next/link';

// ==================== 类型定义 ====================

interface Requirement {
  id: string;
  title: string;
  description: string | null;
  sourceType: 'UPLOAD' | 'PASTE' | 'JIRA' | 'NOTION' | 'FEISHU' | 'AI';
  status: 'DRAFT' | 'REVIEWING' | 'APPROVED' | 'IMPLEMENTED' | 'TESTED' | 'REJECTED';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  page?: {
    name: string;
    system?: {
      name: string;
    };
  };
}

interface TestCase {
  id: string;
  name: string;
  status: 'ACTIVE' | 'DRAFT';
  priority: string;
  createdAt: string;
}

// ==================== 状态配置 ====================

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  DRAFT: { 
    label: '草稿', 
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    icon: FileText
  },
  REVIEWING: { 
    label: '评审中', 
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: Clock
  },
  APPROVED: { 
    label: '已批准', 
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: CheckCircle2
  },
  IMPLEMENTED: { 
    label: '已实现', 
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    icon: CheckCircle2
  },
  TESTED: { 
    label: '已测试', 
    color: 'text-[var(--electric)]',
    bgColor: 'bg-[var(--electric)]/10',
    icon: Beaker
  },
  REJECTED: { 
    label: '已拒绝', 
    color: 'text-red-600',
    bgColor: 'bg-red-50',
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

// 状态流转条
function StatusFlow({ currentStatus }: { currentStatus: string }) {
  const statuses = ['DRAFT', 'REVIEWING', 'APPROVED', 'IMPLEMENTED', 'TESTED'];
  const currentIndex = statuses.indexOf(currentStatus);
  
  return (
    <div className="flex items-center gap-2">
      {statuses.map((status, index) => {
        const config = STATUS_CONFIG[status];
        const isActive = index <= currentIndex;
        const isCurrent = status === currentStatus;
        
        return (
          <div key={status} className="flex items-center">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isCurrent 
                ? `${config.bgColor} ${config.color} ring-2 ring-offset-1 ring-current`
                : isActive 
                  ? `${config.bgColor} ${config.color}`
                  : 'bg-slate-100 text-slate-400'
            }`}>
              <config.icon className="w-4 h-4" />
              {config.label}
            </div>
            {index < statuses.length - 1 && (
              <ChevronRight className={`w-4 h-4 mx-1 ${isActive ? 'text-[var(--electric)]' : 'text-slate-300'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// 测试用例卡片
function TestCaseCard({ testCase }: { testCase: TestCase }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-[var(--electric)]/10 flex items-center justify-center flex-shrink-0">
        <Beaker className="w-5 h-5 text-[var(--electric)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{testCase.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {testCase.status === 'ACTIVE' ? '激活' : '草稿'}
          </Badge>
          <span className="text-xs text-slate-400">
            {format(new Date(testCase.createdAt), 'yyyy-MM-dd')}
          </span>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ==================== 主页面 ====================

export default function RequirementDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);

  // 模拟数据加载
  useEffect(() => {
    const mockRequirement: Requirement = {
      id: params.id as string,
      title: '用户登录功能',
      description: '支持手机号+验证码登录，密码登录，第三方OAuth登录。需要验证手机号格式、验证码有效期、密码强度等。\n\n主要功能点：\n1. 手机号登录\n2. 验证码校验\n3. 密码登录\n4. 忘记密码\n5. 第三方OAuth登录（微信、QQ、GitHub）\n6. 登录状态保持\n7. 多端登录互斥',
      sourceType: 'AI',
      status: 'APPROVED',
      priority: 'P0',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      createdBy: '张三',
      page: { name: '登录页', system: { name: '用户中心' } }
    };

    const mockTestCases: TestCase[] = [
      { id: '1', name: '正常手机号登录', status: 'ACTIVE', priority: 'HIGH', createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: '2', name: '验证码过期校验', status: 'ACTIVE', priority: 'HIGH', createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: '3', name: '密码强度验证', status: 'ACTIVE', priority: 'MEDIUM', createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: '4', name: '第三方OAuth登录', status: 'DRAFT', priority: 'MEDIUM', createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: '5', name: '多端登录互斥', status: 'DRAFT', priority: 'LOW', createdAt: new Date(Date.now() - 86400000).toISOString() },
    ];
    
    setTimeout(() => {
      setRequirement(mockRequirement);
      setTestCases(mockTestCases);
      setLoading(false);
    }, 500);
  }, [params.id]);

  if (loading || !requirement) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-2 border-[var(--electric)] border-t-transparent rounded-full" />
      </div>
    );
  }

  const StatusIcon = STATUS_CONFIG[requirement.status].icon;
  const SourceIcon = SOURCE_CONFIG[requirement.sourceType].icon;

  return (
    <div className="p-6 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 返回按钮 */}
        <Button variant="ghost" className="pl-0" onClick={() => router.push('/requirements')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回需求列表
        </Button>

        {/* 头部信息 */}
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#1f2329]">{requirement.title}</h1>
              <Badge className={PRIORITY_CONFIG[requirement.priority].color}>
                {PRIORITY_CONFIG[requirement.priority].label}
              </Badge>
            </div>
            
            {/* 状态流转 */}
            <StatusFlow currentStatus={requirement.status} />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => toast.info('编辑功能开发中')}>
              <Edit2 className="w-4 h-4 mr-2" />
              编辑
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => toast.info('更新状态')}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  更新状态
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={() => toast.info('删除需求')}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：需求详情 */}
          <div className="lg:col-span-2 space-y-6">
            <BentoCard className="p-6">
              <Tabs defaultValue="details">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                  <TabsTrigger value="details">需求详情</TabsTrigger>
                  <TabsTrigger value="testcases">
                    测试用例
                    <Badge variant="secondary" className="ml-2 text-xs">{testCases.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="history">变更历史</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-[#646a73] mb-2">需求描述</h3>
                      <div className="prose prose-slate max-w-none">
                        <p className="text-[#1f2329] whitespace-pre-line">{requirement.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <h4 className="text-sm text-[#646a73] mb-1">所属系统</h4>
                        <p className="font-medium">{requirement.page?.system?.name || '-'}</p>
                      </div>
                      <div>
                        <h4 className="text-sm text-[#646a73] mb-1">所属页面</h4>
                        <p className="font-medium">{requirement.page?.name || '-'}</p>
                      </div>
                      <div>
                        <h4 className="text-sm text-[#646a73] mb-1">创建人</h4>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[var(--electric)]/10 flex items-center justify-center">
                            <User className="w-3 h-3 text-[var(--electric)]" />
                          </div>
                          <span className="font-medium">{requirement.createdBy}</span>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm text-[#646a73] mb-1">创建时间</h4>
                        <p className="font-medium">{format(new Date(requirement.createdAt), 'yyyy-MM-dd HH:mm')}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="testcases" className="mt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">关联测试用例</h3>
                      <Button size="sm" className="bg-[var(--electric)] hover:bg-[var(--electric)]/90">
                        <Plus className="w-4 h-4 mr-2" />
                        添加用例
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {testCases.map((testCase) => (
                        <TestCaseCard key={testCase.id} testCase={testCase} />
                      ))}
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => toast.info('AI生成用例')}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI生成更多用例
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="mt-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">状态变更为「已批准」</p>
                        <p className="text-xs text-[#8f959e]">{format(new Date(requirement.updatedAt), 'yyyy-MM-dd HH:mm')}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">创建需求</p>
                        <p className="text-xs text-[#8f959e]">{format(new Date(requirement.createdAt), 'yyyy-MM-dd HH:mm')}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </BentoCard>
          </div>

          {/* 右侧：快捷操作 */}
          <div className="space-y-6">
            {/* 快捷操作 */}
            <BentoCard className="p-5">
              <h3 className="font-medium mb-4">快捷操作</h3>
              <div className="space-y-2">
                <Button className="w-full justify-start" variant="outline">
                  <Sparkles className="w-4 h-4 mr-2 text-[var(--electric)]" />
                  AI生成用例
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  手动添加用例
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Play className="w-4 h-4 mr-2" />
                  执行测试
                </Button>
              </div>
            </BentoCard>

            {/* 元信息 */}
            <BentoCard className="p-5">
              <h3 className="font-medium mb-4">信息</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#646a73]">来源</span>
                  <div className="flex items-center gap-1">
                    <SourceIcon className={`w-4 h-4 ${SOURCE_CONFIG[requirement.sourceType].color}`} />
                    <span className="text-sm">{SOURCE_CONFIG[requirement.sourceType].label}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#646a73]">状态</span>
                  <Badge className={`${STATUS_CONFIG[requirement.status].bgColor} ${STATUS_CONFIG[requirement.status].color}`}>
                    {STATUS_CONFIG[requirement.status].label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#646a73]">优先级</span>
                  <Badge className={PRIORITY_CONFIG[requirement.priority].color}>
                    {PRIORITY_CONFIG[requirement.priority].label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#646a73]">用例数</span>
                  <span className="font-medium">{testCases.length}</span>
                </div>
              </div>
            </BentoCard>

            {/* 统计 */}
            <BentoCard className="p-5">
              <h3 className="font-medium mb-4">测试统计</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#646a73]">总用例</span>
                  <span className="font-medium">{testCases.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#646a73]">已激活</span>
                  <span className="font-medium text-green-600">{testCases.filter(t => t.status === 'ACTIVE').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#646a73]">草稿</span>
                  <span className="font-medium text-slate-500">{testCases.filter(t => t.status === 'DRAFT').length}</span>
                </div>
              </div>
            </BentoCard>
          </div>
        </div>
      </div>
    </div>
  );
}
