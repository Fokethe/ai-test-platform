'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bot,
  Clock,
  Database,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Save,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { AiKeyManagementPanel } from '@/components/settings/ai-key-management-panel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type SettingsTab = 'model' | 'operations';

type AiSettings = {
  enableAI: boolean;
  autoGenerate: boolean;
  smartAnalysis: boolean;
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
};

type ObservabilityData = {
  totalTokens: number;
  totalCalls: number;
  avgLatency: number;
  errorRate: number;
  totalCost: number;
  costByModel: Array<{
    model: string;
    tokens: number;
    cost: number;
    calls: number;
  }>;
  dailyStats: Array<{
    date: string;
    tokens: number;
    cost: number;
    calls: number;
  }>;
};

const DEFAULT_SETTINGS: AiSettings = {
  enableAI: true,
  autoGenerate: false,
  smartAnalysis: true,
  model: 'gpt-5.4',
  apiKey: '',
  temperature: 0.7,
  maxTokens: 2000,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

const MODEL_OPTIONS = [
  {
    id: 'gpt-5.3',
    name: 'GPT-5.3',
    family: 'GPT',
    description: '适合主流程问答与常规测试生成，均衡速度与质量。',
  },
  {
    id: 'gpt-5.4',
    name: 'GPT-5.4',
    family: 'GPT',
    description: '优先用于复杂推理、长答案生成和多源证据综合。',
  },
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet',
    family: 'Sonnet',
    description: '适合长文本整理、说明性输出和细节润色。',
  },
  {
    id: 'kimi-k2.5',
    name: 'Kimi K2.5',
    family: 'K2.5',
    description: '适合中文场景、长上下文理解和资料整合。',
  },
];

function toNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeSettings(payload: unknown): AiSettings {
  const raw = (payload as { data?: Partial<AiSettings> } | null)?.data || {};
  return {
    enableAI: typeof raw.enableAI === 'boolean' ? raw.enableAI : DEFAULT_SETTINGS.enableAI,
    autoGenerate:
      typeof raw.autoGenerate === 'boolean' ? raw.autoGenerate : DEFAULT_SETTINGS.autoGenerate,
    smartAnalysis:
      typeof raw.smartAnalysis === 'boolean' ? raw.smartAnalysis : DEFAULT_SETTINGS.smartAnalysis,
    model: typeof raw.model === 'string' ? raw.model : DEFAULT_SETTINGS.model,
    apiKey: typeof raw.apiKey === 'string' ? raw.apiKey : DEFAULT_SETTINGS.apiKey,
    temperature: toNumber(raw.temperature, DEFAULT_SETTINGS.temperature),
    maxTokens: Math.floor(toNumber(raw.maxTokens, DEFAULT_SETTINGS.maxTokens)),
    topP: toNumber(raw.topP, DEFAULT_SETTINGS.topP),
    frequencyPenalty: toNumber(raw.frequencyPenalty, DEFAULT_SETTINGS.frequencyPenalty),
    presencePenalty: toNumber(raw.presencePenalty, DEFAULT_SETTINGS.presencePenalty),
  };
}

function formatCompactNumber(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return String(value);
}

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

export default function AiSettingsPage() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab');

  const [tab, setTab] = useState<SettingsTab>(requestedTab === 'ops' ? 'operations' : 'model');
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_SETTINGS);
  const [snapshot, setSnapshot] = useState(JSON.stringify(DEFAULT_SETTINGS));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const [days, setDays] = useState('7');
  const [obsLoading, setObsLoading] = useState(false);
  const [obsData, setObsData] = useState<ObservabilityData | null>(null);

  useEffect(() => {
    setTab(requestedTab === 'ops' ? 'operations' : 'model');
  }, [requestedTab]);

  const hasChanges = useMemo(
    () => JSON.stringify(settings) !== snapshot,
    [settings, snapshot]
  );
  const selectedModelOption = useMemo(
    () => MODEL_OPTIONS.find((item) => item.id === settings.model) || MODEL_OPTIONS[0],
    [settings.model]
  );
  const hasFallbackKey = settings.apiKey.trim().length > 0;

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/ai', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, '加载 AI 设置失败'));
      }
      const normalized = normalizeSettings(payload);
      setSettings(normalized);
      setSnapshot(JSON.stringify(normalized));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载 AI 设置失败');
    } finally {
      setLoading(false);
    }
  };

  const loadObservability = async () => {
    setObsLoading(true);
    try {
      const response = await fetch(`/api/observability/cost?days=${days}`, {
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok || payload?.code !== 0) {
        throw new Error(getErrorMessage(payload, '加载可观测数据失败'));
      }
      setObsData(payload.data as ObservabilityData);
    } catch (error) {
      setObsData(null);
      toast.error(error instanceof Error ? error.message : '加载可观测数据失败');
    } finally {
      setObsLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  useEffect(() => {
    if (tab === 'operations') {
      void loadObservability();
    }
  }, [tab, days]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings/ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const payload = await response.json();
      if (!response.ok || payload?.code !== 0) {
        throw new Error(getErrorMessage(payload, '保存设置失败'));
      }

      const normalized = normalizeSettings(payload);
      setSettings(normalized);
      setSnapshot(JSON.stringify(normalized));
      toast.success('AI 设置已保存');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存设置失败');
    } finally {
      setSaving(false);
    }
  };

  const testApiKey = async () => {
    if (!settings.apiKey.trim()) {
      toast.error('请先输入默认兼容密钥');
      return;
    }

    setTestingKey(true);
    try {
      const response = await fetch('/api/settings/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: settings.apiKey }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.code !== 0) {
        throw new Error(getErrorMessage(payload, '默认兼容密钥验证失败'));
      }
      toast.success('默认兼容密钥验证通过');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '默认兼容密钥验证失败');
    } finally {
      setTestingKey(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bot className="h-6 w-6" />
            AI 设置
          </h1>
          <p className="mt-1 text-slate-500">统一管理模型参数、密钥策略和调用可观测数据。</p>
        </div>
        <Button onClick={saveSettings} disabled={saving || !hasChanges}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              保存设置
            </>
          )}
        </Button>
      </div>

      {hasChanges ? (
        <Alert>
          <AlertDescription>当前有未保存的改动，刷新页面前建议先保存。</AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={tab} onValueChange={(value) => setTab(value as SettingsTab)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="model">模型配置</TabsTrigger>
          <TabsTrigger value="operations">密钥与可观测</TabsTrigger>
        </TabsList>

        <TabsContent value="model" className="mt-6 space-y-6">
          <Card className="border-slate-200/80 bg-slate-50/70">
            <CardContent className="grid gap-4 p-5 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">当前默认模型</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{selectedModelOption.name}</p>
                <p className="mt-1 text-sm text-slate-500">{selectedModelOption.description}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">生成风格</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  Temperature {settings.temperature.toFixed(1)}
                </p>
                <p className="mt-1 text-sm text-slate-500">Top P {settings.topP.toFixed(1)}，适合当前默认输出节奏。</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">输出预算</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{settings.maxTokens} tokens</p>
                <p className="mt-1 text-sm text-slate-500">
                  Frequency {settings.frequencyPenalty.toFixed(1)}，Presence {settings.presencePenalty.toFixed(1)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                功能开关
              </CardTitle>
              <CardDescription>控制 AI 能力在系统中的启用状态。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label>启用 AI</Label>
                  <p className="text-sm text-slate-500">控制 AI 相关功能总开关。</p>
                </div>
                <Switch
                  checked={settings.enableAI}
                  onCheckedChange={(value) => setSettings((prev) => ({ ...prev, enableAI: value }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>自动生成</Label>
                  <p className="text-sm text-slate-500">允许需求创建后自动生成用例。</p>
                </div>
                <Switch
                  checked={settings.autoGenerate}
                  onCheckedChange={(value) => setSettings((prev) => ({ ...prev, autoGenerate: value }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>智能分析</Label>
                  <p className="text-sm text-slate-500">执行结果启用 AI 诊断与建议。</p>
                </div>
                <Switch
                  checked={settings.smartAnalysis}
                  onCheckedChange={(value) => setSettings((prev) => ({ ...prev, smartAnalysis: value }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>模型选择</CardTitle>
              <CardDescription>按任务复杂度、成本和响应速度选择默认模型。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {MODEL_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSettings((prev) => ({ ...prev, model: option.id }))}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      settings.model === option.id
                        ? 'border-[var(--electric)] bg-[var(--electric)]/5'
                        : 'hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{option.name}</p>
                      <span className="text-xs text-slate-500">{option.family}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{option.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>生成参数</CardTitle>
              <CardDescription>这些参数会作为默认生成配置长期保存。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Temperature</Label>
                  <span className="text-sm text-slate-500">{settings.temperature.toFixed(1)}</span>
                </div>
                <Slider
                  min={0}
                  max={2}
                  step={0.1}
                  value={[settings.temperature]}
                  onValueChange={([value]) => setSettings((prev) => ({ ...prev, temperature: value }))}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Max Tokens</Label>
                  <span className="text-sm text-slate-500">{settings.maxTokens}</span>
                </div>
                <Slider
                  min={100}
                  max={32000}
                  step={100}
                  value={[settings.maxTokens]}
                  onValueChange={([value]) => setSettings((prev) => ({ ...prev, maxTokens: value }))}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Top P</Label>
                  <span className="text-sm text-slate-500">{settings.topP.toFixed(1)}</span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={[settings.topP]}
                  onValueChange={([value]) => setSettings((prev) => ({ ...prev, topP: value }))}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Frequency Penalty</Label>
                  <span className="text-sm text-slate-500">{settings.frequencyPenalty.toFixed(1)}</span>
                </div>
                <Slider
                  min={-2}
                  max={2}
                  step={0.1}
                  value={[settings.frequencyPenalty]}
                  onValueChange={([value]) =>
                    setSettings((prev) => ({ ...prev, frequencyPenalty: value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Presence Penalty</Label>
                  <span className="text-sm text-slate-500">{settings.presencePenalty.toFixed(1)}</span>
                </div>
                <Slider
                  min={-2}
                  max={2}
                  step={0.1}
                  value={[settings.presencePenalty]}
                  onValueChange={([value]) =>
                    setSettings((prev) => ({ ...prev, presencePenalty: value }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="mt-6 space-y-6">
          <Card className="border-slate-200/80 bg-slate-50/70">
            <CardContent className="grid gap-4 p-5 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">默认兼容密钥</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {hasFallbackKey ? '已配置' : '未配置'}
                </p>
                <p className="mt-1 text-sm text-slate-500">未绑定专用密钥的模型会优先回退到这里。</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">密钥池</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">统一管理</p>
                <p className="mt-1 text-sm text-slate-500">在同页完成多密钥维护、启停、测试和模型绑定。</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">调用可观测</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">实时查看</p>
                <p className="mt-1 text-sm text-slate-500">聚合展示成本、调用量和延迟，不再拆分到单独页面。</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                默认兼容密钥
              </CardTitle>
              <CardDescription>
                当某个模型没有绑定专用密钥时，会回退使用这里的兼容密钥。保存后长期生效。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="fallback-api-key">默认兼容密钥</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="fallback-api-key"
                    type={showApiKey ? 'text' : 'password'}
                    value={settings.apiKey}
                    placeholder="sk-..."
                    onChange={(event) =>
                      setSettings((prev) => ({ ...prev, apiKey: event.target.value }))
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowApiKey((prev) => !prev)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button type="button" variant="outline" disabled={testingKey} onClick={testApiKey}>
                  {testingKey ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      验证中...
                    </>
                  ) : (
                    '验证'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <AiKeyManagementPanel />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  调用可观测
                </CardTitle>
                <CardDescription>查看不同模型的调用量、耗时与成本趋势。</CardDescription>
              </div>
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">近 7 天</SelectItem>
                  <SelectItem value="30">近 30 天</SelectItem>
                  <SelectItem value="90">近 90 天</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="space-y-6">
              {obsLoading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-28" />
                  ))}
                </div>
              ) : !obsData ? (
                <div className="py-10 text-center text-slate-500">
                  <AlertCircle className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  未获取到可观测数据
                  <div>
                    <Button variant="outline" className="mt-4" onClick={() => void loadObservability()}>
                      重试
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-500">Token 消耗</p>
                            <p className="text-2xl font-bold">{formatCompactNumber(obsData.totalTokens)}</p>
                          </div>
                          <div className="rounded-full bg-blue-100 p-2">
                            <Database className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-500">调用次数</p>
                            <p className="text-2xl font-bold">{obsData.totalCalls}</p>
                          </div>
                          <div className="rounded-full bg-purple-100 p-2">
                            <BarChart3 className="h-5 w-5 text-purple-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-500">平均延迟</p>
                            <p className="text-2xl font-bold">
                              {obsData.avgLatency > 0 ? `${(obsData.avgLatency / 1000).toFixed(2)}s` : '-'}
                            </p>
                          </div>
                          <div className="rounded-full bg-emerald-100 p-2">
                            <Clock className="h-5 w-5 text-emerald-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-500">累计成本</p>
                            <p className="text-2xl font-bold">${obsData.totalCost.toFixed(4)}</p>
                          </div>
                          <div className="rounded-full bg-amber-100 p-2">
                            <TrendingUp className="h-5 w-5 text-amber-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>模型</TableHead>
                        <TableHead>调用次数</TableHead>
                        <TableHead>Token</TableHead>
                        <TableHead>成本</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(obsData.costByModel || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-slate-500">
                            暂无模型调用数据
                          </TableCell>
                        </TableRow>
                      ) : (
                        obsData.costByModel.map((item) => (
                          <TableRow key={item.model}>
                            <TableCell className="font-medium">{item.model}</TableCell>
                            <TableCell>{item.calls}</TableCell>
                            <TableCell>{formatCompactNumber(item.tokens)}</TableCell>
                            <TableCell>${item.cost.toFixed(6)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
