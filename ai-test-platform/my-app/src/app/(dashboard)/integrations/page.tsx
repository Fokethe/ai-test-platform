/**
 * Integrations Page - 取代 Webhook
 * 连接真实 API
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Plug,
  Plus,
  Github,
  Gitlab,
  MessageSquare,
  Webhook,
  CheckCircle,
  XCircle,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Integration {
  id: string;
  name: string;
  type: 'GITHUB' | 'GITLAB' | 'JENKINS' | 'SLACK' | 'DINGTALK' | 'CUSTOM';
  provider: string;
  url: string;
  isActive: boolean;
  events: string;
  _count?: { deliveries: number };
}

export default function IntegrationsPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data, error, isLoading, mutate } = useSWR('/api/integrations', fetcher, {
    refreshInterval: 30000,
  });

  const integrations: Integration[] = data?.data || [];

  const stats = {
    total: integrations.length,
    active: integrations.filter((i) => i.isActive).length,
    failed: 0, // 简化
    deliveries: integrations.reduce((acc, i) => acc + (i._count?.deliveries || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">集成</h1>
          <p className="text-slate-500">管理 CI/CD、通知等第三方集成</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              添加集成
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>添加新集成</DialogTitle>
            </DialogHeader>
            <AddIntegrationForm onSuccess={() => {
              setShowAddDialog(false);
              mutate();
            }} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="总集成" value={stats.total} icon={Plug} />
        <StatCard label="运行中" value={stats.active} icon={CheckCircle} color="green" />
        <StatCard label="异常" value={stats.failed} icon={XCircle} color={stats.failed > 0 ? 'red' : 'slate'} />
        <StatCard label="总投递" value={stats.deliveries} icon={Send} />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : integrations.length === 0 ? (
        <EmptyState onAdd={() => setShowAddDialog(true)} />
      ) : (
        <div className="grid gap-4">
          {integrations.map((integration) => (
            <IntegrationCard key={integration.id} integration={integration} onRefresh={() => mutate()} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color = 'slate' }: any) {
  const colorClasses: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="border rounded-lg p-4">
      <div className={`p-2 rounded-lg w-fit ${colorClasses[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="border rounded-lg p-12 text-center">
      <Plug className="w-12 h-12 mx-auto mb-4 text-slate-300" />
      <p className="text-slate-500">暂无集成</p>
      <p className="text-sm text-slate-400 mt-1">添加 GitHub、GitLab、Slack 等集成</p>
      <Button className="mt-4" onClick={onAdd}>
        <Plus className="w-4 h-4 mr-2" />
        添加第一个集成
      </Button>
    </div>
  );
}

function IntegrationCard({ integration, onRefresh }: { integration: Integration; onRefresh: () => void }) {
  const Icon = getIntegrationIcon(integration.type);
  const events = JSON.parse(integration.events || '[]');

  return (
    <div className="flex items-start justify-between p-4 border rounded-lg hover:border-blue-300 transition-colors">
      <div className="flex items-start gap-4 flex-1">
        <div className="p-3 bg-slate-50 rounded-lg">
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{integration.name}</h3>
            <Badge className={integration.isActive ? 'bg-green-100 text-green-700' : ''} variant="secondary">
              {integration.isActive ? '运行中' : '已停用'}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1 truncate max-w-md">{integration.url}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-slate-400">投递: {integration._count?.deliveries || 0} 次</span>
            {events.slice(0, 3).map((event: string) => (
              <Badge key={event} variant="secondary" className="text-xs">{event}</Badge>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onRefresh} title="刷新">
          <RefreshCw className="w-4 h-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>查看日志</DropdownMenuItem>
            <DropdownMenuItem>编辑</DropdownMenuItem>
            <DropdownMenuItem onClick={async () => {
              await fetch(`/api/integrations/${integration.id}/toggle`, { method: 'POST' });
              onRefresh();
            }}>
              {integration.isActive ? '停用' : '启用'}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">删除</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function getIntegrationIcon(type: string) {
  switch (type) {
    case 'GITHUB': return Github;
    case 'GITLAB': return Gitlab;
    case 'SLACK':
    case 'DINGTALK': return MessageSquare;
    default: return Webhook;
  }
}

function AddIntegrationForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      type: formData.get('type'),
      url: formData.get('url'),
      secret: formData.get('secret'),
      events: JSON.stringify(['push', 'test.completed']),
      projectId: 'default',
    };

    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">名称</label>
        <Input name="name" placeholder="例如: GitHub Webhook" required />
      </div>
      <div>
        <label className="text-sm font-medium">类型</label>
        <select name="type" className="w-full h-10 px-3 rounded-md border border-input bg-background" required>
          <option value="GITHUB">GitHub</option>
          <option value="GITLAB">GitLab</option>
          <option value="JENKINS">Jenkins</option>
          <option value="SLACK">Slack</option>
          <option value="DINGTALK">钉钉</option>
          <option value="CUSTOM">自定义</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">Webhook URL</label>
        <Input name="url" placeholder="https://..." required />
      </div>
      <div>
        <label className="text-sm font-medium">Secret (可选)</label>
        <Input name="secret" type="password" placeholder="签名密钥" />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />创建中...</> : '创建集成'}
      </Button>
    </form>
  );
}
