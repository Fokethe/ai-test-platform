'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Beaker,
  Play,
  Shield,
  BookOpen,
  Plug,
  Bell,
  Settings,
  Search,
  FolderKanban,
  Layers,
  Clock,
  Bug,
  FileText,
  Brain,
  Activity,
  Users,
  User,
  Zap,
  Sparkles,
  Command,
  X,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchItem {
  id: string;
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
  category: string;
}

const searchItems: SearchItem[] = [
  // 主要功能
  { id: 'dashboard', title: '仪表盘', href: '/dashboard', icon: LayoutDashboard, keywords: ['首页', 'home', 'overview'], category: '主要功能' },
  { id: 'tests', title: '测试中心', href: '/tests', icon: Beaker, keywords: ['test', 'case', '用例'], category: '主要功能' },
  { id: 'testcases', title: '用例库', href: '/tests?tab=cases', icon: FolderKanban, keywords: ['test case', '用例'], category: '主要功能' },
  { id: 'suites', title: '测试套件', href: '/tests?tab=suites', icon: Layers, keywords: ['suite', '套件'], category: '主要功能' },
  { id: 'ai-generate', title: 'AI生成', href: '/tests?tab=ai', icon: Brain, keywords: ['ai', '生成', 'generate', '智能'], category: 'AI功能' },
  { id: 'runs', title: '执行中心', href: '/runs', icon: Play, keywords: ['run', '执行', 'history'], category: '主要功能' },
  { id: 'history', title: '执行历史', href: '/runs', icon: Clock, keywords: ['history', '历史'], category: '主要功能' },
  { id: 'scheduled', title: '定时任务', href: '/runs?tab=scheduled', icon: Zap, keywords: ['schedule', '定时', 'cron'], category: '主要功能' },
  
  // 质量与资产
  { id: 'quality', title: '质量看板', href: '/quality', icon: Shield, keywords: ['quality', '质量'], category: '主要功能' },
  { id: 'issues', title: '问题列表', href: '/quality/issues', icon: Bug, keywords: ['bug', 'issue', '问题', '缺陷'], category: '主要功能' },
  { id: 'reports', title: '质量报告', href: '/quality/reports', icon: FileText, keywords: ['report', '报告'], category: '主要功能' },
  { id: 'assets', title: '资产库', href: '/assets', icon: BookOpen, keywords: ['asset', '知识库', '文档'], category: '主要功能' },
  { id: 'docs', title: '文档', href: '/assets?type=doc', icon: FileText, keywords: ['document', '文档'], category: '资产' },
  { id: 'pages', title: '页面', href: '/assets?type=page', icon: LayoutDashboard, keywords: ['page', '页面'], category: '资产' },
  
  // 集成与设置
  { id: 'integrations', title: '集成', href: '/integrations', icon: Plug, keywords: ['integration', 'webhook', '集成'], category: '主要功能' },
  { id: 'notifications', title: '通知', href: '/notifications', icon: Bell, keywords: ['notification', '通知', 'inbox'], category: '主要功能' },
  { id: 'workspaces', title: '工作空间', href: '/workspaces', icon: FolderKanban, keywords: ['workspace', '项目', 'project'], category: '主要功能' },
  
  // 设置
  { id: 'settings', title: '设置', href: '/settings', icon: Settings, keywords: ['setting', '设置', '配置'], category: '设置' },
  { id: 'profile', title: '个人设置', href: '/settings/profile', icon: User, keywords: ['profile', '个人', '账户'], category: '设置' },
  { id: 'ai-settings', title: 'AI设置', href: '/settings/ai', icon: Sparkles, keywords: ['ai setting', '模型', 'model'], category: '设置' },
  { id: 'users', title: '用户管理', href: '/settings/users', icon: Users, keywords: ['user', '用户'], category: '设置' },
  { id: 'activity', title: '活动日志', href: '/settings/activity', icon: Activity, keywords: ['log', '日志', 'activity'], category: '设置' },
  { id: 'system', title: '系统配置', href: '/settings/system', icon: Command, keywords: ['system', '系统', 'config'], category: '设置' },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  // 监听 Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const filteredItems = query
    ? searchItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.keywords.some((k) => k.toLowerCase().includes(query.toLowerCase()))
      )
    : searchItems.slice(0, 10);

  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, SearchItem[]>);

  const handleSelect = useCallback((href: string) => {
    setOpen(false);
    setQuery('');
    router.push(href);
  }, [router]);

  return (
    <>
      {/* 搜索按钮 */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm text-muted-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">搜索...</span>
        <kbd className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-background border text-xs font-mono">
          ⌘K
        </kbd>
      </button>

      {/* 搜索对话框 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          <DialogTitle className="sr-only">全局搜索</DialogTitle>
          
          {/* 搜索输入 */}
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="搜索功能、页面、设置..."
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-base"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded hover:bg-muted"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* 搜索结果 */}
          <div className="max-h-[400px] overflow-y-auto py-2">
            {filteredItems.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>未找到结果</p>
              </div>
            ) : (
              Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="px-2 py-1">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {category}
                  </div>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.href)}
                        className={cn(
                          'w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors',
                          'hover:bg-muted focus:bg-muted focus:outline-none'
                        )}
                      >
                        <item.icon className={cn(
                          'h-4 w-4',
                          item.id.includes('ai') ? 'text-neon' : 'text-muted-foreground'
                        )} />
                        <span className="flex-1 text-sm">{item.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 底部提示 */}
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/50 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 rounded bg-background border">↑↓</kbd>
              <span>导航</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 rounded bg-background border">↵</kbd>
              <span>选择</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 rounded bg-background border">Esc</kbd>
              <span>关闭</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
