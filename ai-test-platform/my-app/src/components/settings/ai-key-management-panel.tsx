'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  KeyRound,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  ShieldAlert,
  Trash2,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

type KeyProvider = 'openai-compatible' | 'anthropic' | 'kimi' | 'custom';
type ChatModel = 'gpt-5.3' | 'gpt-5.4' | 'claude-3-7-sonnet' | 'kimi-k2.5';

type KeyItem = {
  id: string;
  name: string;
  provider: string;
  isActive: boolean;
  maskedKey: string;
  createdAt: string;
  usage: {
    calls: number;
    totalTokens: number;
    totalCost: number;
    lastUsedAt?: string;
  };
};

type Summary = {
  total: number;
  active: number;
  quotaLimited: number;
  attentionNeeded: number;
};

type BindingItem = {
  model: ChatModel;
  apiKeyId: string | null;
  apiKeyName?: string | null;
  provider?: string | null;
  isActive?: boolean | null;
};

type FormState = {
  name: string;
  provider: KeyProvider;
  key: string;
  isActive: boolean;
};

const MODELS: Array<{ id: ChatModel; label: string }> = [
  { id: 'gpt-5.3', label: 'GPT-5.3' },
  { id: 'gpt-5.4', label: 'GPT-5.4' },
  { id: 'claude-3-7-sonnet', label: 'Claude 3.7 Sonnet' },
  { id: 'kimi-k2.5', label: 'Kimi K2.5' },
];

const DEFAULT_FORM: FormState = {
  name: '',
  provider: 'openai-compatible',
  key: '',
  isActive: true,
};

function getErrorMessage(payload: unknown, fallback: string) {
  const raw = payload as
    | {
        message?: string;
        error?: string | { message?: string };
      }
    | null
    | undefined;
  return raw?.message || (typeof raw?.error === 'string' ? raw.error : raw?.error?.message) || fallback;
}

export function AiKeyManagementPanel() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingBindings, setSavingBindings] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<KeyItem[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    active: 0,
    quotaLimited: 0,
    attentionNeeded: 0,
  });
  const [bindings, setBindings] = useState<Record<ChatModel, string>>({
    'gpt-5.3': 'none',
    'gpt-5.4': 'none',
    'claude-3-7-sonnet': 'none',
    'kimi-k2.5': 'none',
  });
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KeyItem | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [testingId, setTestingId] = useState<string | null>(null);

  const providerOptions = useMemo(() => {
    const set = new Set(items.map((item) => item.provider));
    return ['all', ...Array.from(set)];
  }, [items]);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set('q', search.trim());
      }
      if (providerFilter !== 'all') {
        params.set('provider', providerFilter);
      }
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const [keysRes, bindingsRes] = await Promise.all([
        fetch(`/api/settings/ai/keys?${params.toString()}`, { cache: 'no-store' }),
        fetch('/api/settings/ai/key-bindings', { cache: 'no-store' }),
      ]);

      const keysPayload = await keysRes.json().catch(() => null);
      const bindingsPayload = await bindingsRes.json().catch(() => null);

      if (!keysRes.ok) {
        throw new Error(getErrorMessage(keysPayload, '加载密钥列表失败'));
      }
      if (!bindingsRes.ok) {
        throw new Error(getErrorMessage(bindingsPayload, '加载模型绑定失败'));
      }

      const list = ((keysPayload as { data?: { list?: KeyItem[] } })?.data?.list || []) as KeyItem[];
      const nextSummary = ((keysPayload as { data?: { summary?: Summary } })?.data?.summary || {
        total: list.length,
        active: list.filter((item) => item.isActive).length,
        quotaLimited: 0,
        attentionNeeded: 0,
      }) as Summary;

      setItems(list);
      setSummary(nextSummary);

      const nextBindings: Record<ChatModel, string> = {
        'gpt-5.3': 'none',
        'gpt-5.4': 'none',
        'claude-3-7-sonnet': 'none',
        'kimi-k2.5': 'none',
      };

      const rows = ((bindingsPayload as { data?: { bindings?: BindingItem[] } })?.data?.bindings ||
        []) as BindingItem[];

      rows.forEach((row) => {
        if (row.model in nextBindings) {
          nextBindings[row.model] = row.apiKeyId || 'none';
        }
      });

      setBindings(nextBindings);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载密钥数据失败');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreate = () => {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const onEdit = (item: KeyItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      provider: (item.provider as KeyProvider) || 'custom',
      key: '',
      isActive: item.isActive,
    });
    setDialogOpen(true);
  };

  const submitForm = async () => {
    if (!form.name.trim()) {
      toast.error('请输入密钥名称');
      return;
    }
    if (!editing && !form.key.trim()) {
      toast.error('请输入密钥内容');
      return;
    }

    setSubmitting(true);
    try {
      const isEdit = Boolean(editing);
      const url = isEdit ? `/api/settings/ai/keys/${editing!.id}` : '/api/settings/ai/keys';
      const method = isEdit ? 'PATCH' : 'POST';
      const payload = isEdit
        ? {
            name: form.name.trim(),
            provider: form.provider,
            isActive: form.isActive,
            ...(form.key.trim() ? { key: form.key.trim() } : {}),
          }
        : {
            name: form.name.trim(),
            provider: form.provider,
            key: form.key.trim(),
            isActive: form.isActive,
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(getErrorMessage(result, isEdit ? '更新密钥失败' : '创建密钥失败'));
      }

      toast.success(isEdit ? '密钥已更新' : '密钥已创建');
      setDialogOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存密钥失败');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteKey = async (item: KeyItem) => {
    const confirmed = window.confirm(`确认删除密钥“${item.name}”吗？`);
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/ai/keys/${item.id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, '删除密钥失败'));
      }
      toast.success('密钥已删除');
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除密钥失败');
    }
  };

  const toggleActive = async (item: KeyItem, next: boolean) => {
    try {
      const response = await fetch(`/api/settings/ai/keys/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: next }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, '更新状态失败'));
      }

      setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, isActive: next } : row)));
      toast.success(next ? '密钥已启用' : '密钥已停用');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新状态失败');
    }
  };

  const testKey = async (item: KeyItem) => {
    setTestingId(item.id);
    try {
      const response = await fetch(`/api/settings/ai/keys/${item.id}/test`, { method: 'POST' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, '密钥测试失败'));
      }
      const data = (payload as { data?: { valid?: boolean; status?: number } })?.data;
      toast.success(data?.valid ? `测试通过 (${data?.status || 200})` : `测试失败 (${data?.status || 0})`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '密钥测试失败');
    } finally {
      setTestingId(null);
    }
  };

  const saveBindings = async () => {
    setSavingBindings(true);
    try {
      const payload: Record<string, string | null> = {};
      (Object.keys(bindings) as ChatModel[]).forEach((model) => {
        payload[model] = bindings[model] === 'none' ? null : bindings[model];
      });

      const response = await fetch('/api/settings/ai/key-bindings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bindings: payload }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(getErrorMessage(result, '保存模型绑定失败'));
      }

      toast.success('模型绑定已保存');
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存模型绑定失败');
    } finally {
      setSavingBindings(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[240px] items-center justify-center text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        正在加载密钥管理...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">密钥总数</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">已启用</p>
              <p className="text-2xl font-bold">{summary.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-xl bg-amber-100 p-3 text-amber-600">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">限额受限</p>
              <p className="text-2xl font-bold">{summary.quotaLimited}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-xl bg-rose-100 p-3 text-rose-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">需关注</p>
              <p className="text-2xl font-bold">{summary.attentionNeeded}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="space-y-1">
            <CardTitle>密钥池与模型绑定</CardTitle>
            <p className="text-sm text-slate-500">
              在同一个页面里管理密钥、测试连通性，并为不同模型绑定不同密钥。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="搜索名称或提供商"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="全部提供商" />
              </SelectTrigger>
              <SelectContent>
                {providerOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item === 'all' ? '全部提供商' : item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">启用</SelectItem>
                <SelectItem value="inactive">停用</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={() => void loadData()} disabled={refreshing}>
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            </Button>
            <Button type="button" onClick={onCreate}>
              <Plus className="h-4 w-4" />
              新建密钥
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {MODELS.map((model) => (
              <div key={model.id} className="rounded-lg border border-slate-200 p-3">
                <Label className="mb-2 block text-sm">{model.label}</Label>
                <Select
                  value={bindings[model.id]}
                  onValueChange={(value) => setBindings((prev) => ({ ...prev, [model.id]: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择密钥" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不绑定，回退到默认兼容密钥</SelectItem>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} · {item.provider}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" onClick={saveBindings} disabled={savingBindings}>
            {savingBindings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            保存模型绑定
          </Button>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">名称</th>
                  <th className="px-4 py-3">密钥</th>
                  <th className="px-4 py-3">提供商</th>
                  <th className="px-4 py-3">使用情况</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-400" colSpan={6}>
                      暂无密钥
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.id.slice(0, 8)}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{item.maskedKey}</td>
                      <td className="px-4 py-3">{item.provider}</td>
                      <td className="px-4 py-3">
                        <p>调用 {item.usage.calls}</p>
                        <p className="text-xs text-slate-400">成本 ${item.usage.totalCost.toFixed(4)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={item.isActive}
                            onCheckedChange={(value) => {
                              void toggleActive(item, Boolean(value));
                            }}
                          />
                          <span>{item.isActive ? '启用' : '停用'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void testKey(item)}
                            disabled={testingId === item.id}
                          >
                            {testingId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Clock3 className="h-3.5 w-3.5" />
                            )}
                            测试
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => onEdit(item)}>
                            编辑
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => void deleteKey(item)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '编辑密钥' : '新建密钥'}</DialogTitle>
            <DialogDescription>
              {editing ? '你可以修改名称、状态，或替换实际密钥内容。' : '新建后会自动加密存储，页面只展示脱敏结果。'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>名称</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="例如：团队通用 GPT Key"
              />
            </div>
            <div className="space-y-2">
              <Label>提供商</Label>
              <Select
                value={form.provider}
                onValueChange={(value) => setForm((prev) => ({ ...prev, provider: value as KeyProvider }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai-compatible">openai-compatible</SelectItem>
                  <SelectItem value="anthropic">anthropic</SelectItem>
                  <SelectItem value="kimi">kimi</SelectItem>
                  <SelectItem value="custom">custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{editing ? '密钥（留空表示不替换）' : '密钥'}</Label>
              <Input
                value={form.key}
                onChange={(event) => setForm((prev) => ({ ...prev, key: event.target.value }))}
                placeholder="sk-..."
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <Label>启用状态</Label>
              <Switch
                checked={form.isActive}
                onCheckedChange={(value) => setForm((prev) => ({ ...prev, isActive: Boolean(value) }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={() => void submitForm()} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
