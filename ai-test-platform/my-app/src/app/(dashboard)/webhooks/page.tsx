'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Plus,
  Webhook,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Power,
  PowerOff,
  ChevronRight,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  Github,
  Gitlab,
  Server,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ListSkeleton } from '@/components/ui/skeleton-list';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface Webhook {
  id: string;
  name: string;
  provider: 'github' | 'gitlab' | 'jenkins';
  url: string;
  isActive: boolean;
  lastTriggered: string | null;
  createdAt: string;
  project: { id: string; name: string };
  _count: { deliveries: number };
}

interface WebhookDelivery {
  id: string;
  event: string;
  status: string;
  createdAt: string;
  payload: any;
}

const providerIcons: Record<string, React.ReactNode> = {
  github: <Github className="h-5 w-5" />,
  gitlab: <Gitlab className="h-5 w-5" />,
  jenkins: <Server className="h-5 w-5" />,
};

const providerLabels: Record<string, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  jenkins: 'Jenkins',
};

export default function WebhooksPage() {
  const { data: session, status } = useSession();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [secretDialogOpen, setSecretDialogOpen] = useState(false);
  const [newWebhook, setNewWebhook] = useState<any>(null);
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    provider: 'github',
    projectId: '',
    testCaseIds: [] as string[],
  });

  useEffect(() => {
    if (status === 'authenticated') {
      fetchWebhooks();
    }
  }, [status]);

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/webhooks');
      if (!res.ok) throw new Error('Failed to fetch webhooks');
      const data = await res.json();
      setWebhooks(data.data);
    } catch (error) {
      toast.error('获取 Webhook 列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveries = async (webhookId: string) => {
    setLoadingDeliveries(true);
    try {
      const res = await fetch(`/api/webhooks/${webhookId}/deliveries`);
      if (!res.ok) throw new Error('Failed to fetch deliveries');
      const data = await res.json();
      setDeliveries(data.data);
    } catch (error) {
      toast.error('获取投递记录失败');
    } finally {
      setLoadingDeliveries(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          provider: formData.provider,
          projectId: formData.projectId,
          config: { testCaseIds: formData.testCaseIds }
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create webhook');
      }

      const data = await res.json();
      setNewWebhook(data.data);
      setDialogOpen(false);
      setSecretDialogOpen(true);
      resetForm();
      fetchWebhooks();
    } catch (error: any) {
      toast.error(error.message || '创建失败');
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!res.ok) throw new Error('Failed to toggle webhook');

      toast.success(isActive ? 'Webhook 已禁用' : 'Webhook 已启用');
      fetchWebhooks();
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个 Webhook 吗？')) return;

    try {
      const res = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete webhook');

      toast.success('Webhook 已删除');
      fetchWebhooks();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedWebhook === id) {
      setExpandedWebhook(null);
    } else {
      setExpandedWebhook(id);
      fetchDeliveries(id);
    }
  };

  const copyWebhookUrl = (url: string) => {
    const fullUrl = `${window.location.origin}/api/hooks/${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Webhook URL 已复制');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      provider: 'github',
      projectId: '',
      testCaseIds: [],
    });
  };

  if (status === 'loading') {
    return <ListSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CI/CD Webhook</h1>
          <p className="text-muted-foreground mt-1">
            配置 CI/CD 系统集成，实现自动化测试触发
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchWebhooks}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新建 Webhook
          </Button>
        </div>
      </div>

      {/* 说明卡片 */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <h3 className="font-medium mb-2">使用说明</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>1. 创建 Webhook 后，系统会生成唯一的 URL 和密钥</li>
            <li>2. 在 CI/CD 系统（Jenkins/GitLab/GitHub）中配置 Webhook URL</li>
            <li>3. 配置签名密钥以确保请求安全</li>
            <li>4. 代码提交或合并时会自动触发测试</li>
          </ul>
        </CardContent>
      </Card>

      {/* Webhook 列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Webhook 列表</span>
            <span className="text-sm font-normal text-muted-foreground">
              共 {webhooks.length} 个
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ListSkeleton />
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 hover:bg-accent cursor-pointer"
                    onClick={() => toggleExpand(webhook.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        {providerIcons[webhook.provider]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{webhook.name}</h3>
                          {webhook.isActive ? (
                            <Badge className="bg-green-500">启用</Badge>
                          ) : (
                            <Badge variant="secondary">禁用</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {providerLabels[webhook.provider]} · {webhook.project.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm text-muted-foreground">
                        <p>投递 {webhook._count.deliveries} 次</p>
                        {webhook.lastTriggered && (
                          <p>上次: {new Date(webhook.lastTriggered).toLocaleString('zh-CN')}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyWebhookUrl(webhook.url);
                          }}
                          title="复制 URL"
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggle(webhook.id, webhook.isActive);
                          }}
                          title={webhook.isActive ? '禁用' : '启用'}
                        >
                          {webhook.isActive ? (
                            <Power className="h-4 w-4 text-green-500" />
                          ) : (
                            <PowerOff className="h-4 w-4 text-slate-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(webhook.id);
                          }}
                          className="text-red-600"
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {expandedWebhook === webhook.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 投递记录 */}
                  {expandedWebhook === webhook.id && (
                    <div className="border-t bg-muted/30 p-4">
                      <h4 className="text-sm font-medium mb-3">最近投递记录</h4>
                      {loadingDeliveries ? (
                        <ListSkeleton />
                      ) : deliveries.length === 0 ? (
                        <p className="text-sm text-muted-foreground">暂无投递记录</p>
                      ) : (
                        <div className="space-y-2">
                          {deliveries.slice(0, 5).map((delivery) => (
                            <div
                              key={delivery.id}
                              className="flex items-center justify-between p-2 bg-background rounded text-sm"
                            >
                              <div className="flex items-center gap-2">
                                {delivery.status === 'success' ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : delivery.status === 'failed' ? (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                ) : (
                                  <Clock className="h-4 w-4 text-yellow-500" />
                                )}
                                <span>{delivery.event}</span>
                                <span className="text-muted-foreground">
                                  {delivery.payload?.branch}
                                </span>
                              </div>
                              <span className="text-muted-foreground">
                                {new Date(delivery.createdAt).toLocaleString('zh-CN')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {webhooks.length === 0 && (
                <div className="text-center py-12">
                  <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">暂无 Webhook</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    创建第一个 Webhook
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 新建 Webhook 对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新建 Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>名称</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：GitHub Main 分支"
              />
            </div>
            <div className="space-y-2">
              <Label>提供商</Label>
              <Select
                value={formData.provider}
                onValueChange={(value) => setFormData({ ...formData, provider: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="github">GitHub</SelectItem>
                  <SelectItem value="gitlab">GitLab</SelectItem>
                  <SelectItem value="jenkins">Jenkins</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>项目 ID</Label>
              <Input
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                placeholder="关联的项目 ID"
              />
            </div>
            <div className="space-y-2">
              <Label>测试用例 ID（用逗号分隔）</Label>
              <Input
                value={formData.testCaseIds.join(', ')}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    testCaseIds: e.target.value
                      .split(',')
                      .map((id) => id.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="例如：abc123, def456"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 显示 Secret 对话框 */}
      <Dialog open={secretDialogOpen} onOpenChange={setSecretDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Webhook 创建成功</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted p-3 rounded">
              <Label className="text-xs text-muted-foreground">Webhook URL</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 text-sm break-all">
                  {typeof window !== 'undefined' && newWebhook
                    ? `${window.location.origin}/api/hooks/${newWebhook.url}`
                    : ''}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => newWebhook && copyWebhookUrl(newWebhook.url)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
              <Label className="text-xs text-yellow-700 dark:text-yellow-400">Secret Key（请妥善保存，只显示一次）</Label>
              <code className="block mt-1 text-sm break-all font-mono">
                {newWebhook?.secret}
              </code>
            </div>
            <p className="text-sm text-muted-foreground">
              请在 CI/CD 系统中配置上述 URL 和 Secret，以确保安全触发。
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setSecretDialogOpen(false)}>我知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
