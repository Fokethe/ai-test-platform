'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

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
  model: 'gpt-4o',
  apiKey: '',
  temperature: 0.7,
  maxTokens: 2000,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

const MODEL_OPTIONS = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    family: 'GPT',
    description: '主力模型，适合多数测试场景',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    family: 'GPT',
    description: '成本更低，适合批量生成',
  },
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet',
    family: 'Sonnet',
    description: '适合复杂文本分析与推理',
  },
  {
    id: 'kimi-k2.5',
    name: 'Kimi K2.5',
    family: 'K2.5',
    description: '长文本和中文场景表现稳定',
  },
];

function toNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeSettings(payload: any): AiSettings {
  const data = payload?.data || {};
  return {
    enableAI: typeof data.enableAI === 'boolean' ? data.enableAI : DEFAULT_SETTINGS.enableAI,
    autoGenerate:
      typeof data.autoGenerate === 'boolean' ? data.autoGenerate : DEFAULT_SETTINGS.autoGenerate,
    smartAnalysis:
      typeof data.smartAnalysis === 'boolean' ? data.smartAnalysis : DEFAULT_SETTINGS.smartAnalysis,
    model: typeof data.model === 'string' ? data.model : DEFAULT_SETTINGS.model,
    apiKey: typeof data.apiKey === 'string' ? data.apiKey : DEFAULT_SETTINGS.apiKey,
    temperature: toNumber(data.temperature, DEFAULT_SETTINGS.temperature),
    maxTokens: Math.floor(toNumber(data.maxTokens, DEFAULT_SETTINGS.maxTokens)),
    topP: toNumber(data.topP, DEFAULT_SETTINGS.topP),
    frequencyPenalty: toNumber(data.frequencyPenalty, DEFAULT_SETTINGS.frequencyPenalty),
    presencePenalty: toNumber(data.presencePenalty, DEFAULT_SETTINGS.presencePenalty),
  };
}

function formatCompactNumber(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return String(value);
}

function getErrorMessage(payload: any, fallback: string) {
  return payload?.error?.message || payload?.message || payload?.error || fallback;
}

export default function AiSettingsPage() {
  const [tab, setTab] = useState<'model' | 'observability'>('model');
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_SETTINGS);
  const [snapshot, setSnapshot] = useState(JSON.stringify(DEFAULT_SETTINGS));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const [days, setDays] = useState('7');
  const [obsLoading, setObsLoading] = useState(false);
  const [obsData, setObsData] = useState<ObservabilityData | null>(null);

  const hasChanges = useMemo(
    () => JSON.stringify(settings) !== snapshot,
    [settings, snapshot]
  );

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
    loadSettings();
  }, []);

  useEffect(() => {
    if (tab === 'observability') {
      loadObservability();
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
        throw new Error(getErrorMessage(payload, '保存失败'));
      }

      const normalized = normalizeSettings(payload);
      setSettings(normalized);
      setSnapshot(JSON.stringify(normalized));
      toast.success('AI 设置已保存');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const testApiKey = async () => {
    if (!settings.apiKey.trim()) {
      toast.error('请先输入 API Key');
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
        throw new Error(getErrorMessage(payload, 'API Key 验证失败'));
      }
      toast.success('API Key 验证通过');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'API Key 验证失败');
    } finally {
      setTestingKey(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="w-6 h-6" />
            AI 设置
          </h1>
          <p className="text-slate-500 mt-1">配置模型参数、密钥验证与观测数据</p>
        </div>
        {tab === 'model' ? (
          <Button onClick={saveSettings} disabled={saving || !hasChanges}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                保存设置
              </>
            )}
          </Button>
        ) : null}
      </div>

      {tab === 'model' && hasChanges ? (
        <Alert>
          <AlertDescription>当前有未保存改动，刷新页面前请先保存。</AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={tab} onValueChange={(value) => setTab(value as 'model' | 'observability')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="model">模型配置</TabsTrigger>
          <TabsTrigger value="observability">可观测</TabsTrigger>
        </TabsList>

        <TabsContent value="model" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Key
              </CardTitle>
              <CardDescription>保存到用户级配置（加密存储），刷新后仍保持生效。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="api-key">API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="api-key"
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
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <Button type="button" variant="outline" disabled={testingKey} onClick={testApiKey}>
                  {testingKey ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      验证中...
                    </>
                  ) : (
                    '验证'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                功能开关
              </CardTitle>
              <CardDescription>控制 AI 能力在系统中的启用状态。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label>启用 AI</Label>
                  <p className="text-sm text-slate-500">控制 AI 相关功能总开关</p>
                </div>
                <Switch
                  checked={settings.enableAI}
                  onCheckedChange={(value) => setSettings((prev) => ({ ...prev, enableAI: value }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>自动生成</Label>
                  <p className="text-sm text-slate-500">允许需求后自动生成用例</p>
                </div>
                <Switch
                  checked={settings.autoGenerate}
                  onCheckedChange={(value) =>
                    setSettings((prev) => ({ ...prev, autoGenerate: value }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>智能分析</Label>
                  <p className="text-sm text-slate-500">执行结果启用 AI 诊断建议</p>
                </div>
                <Switch
                  checked={settings.smartAnalysis}
                  onCheckedChange={(value) =>
                    setSettings((prev) => ({ ...prev, smartAnalysis: value }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>模型选择（GPT / Sonnet / K2.5）</CardTitle>
              <CardDescription>按成本、速度和效果选择模型。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {MODEL_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() => setSettings((prev) => ({ ...prev, model: option.id }))}
                    className={`border rounded-lg p-4 text-left transition-colors ${
                      settings.model === option.id
                        ? 'border-[var(--electric)] bg-[var(--electric)]/5'
                        : 'hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{option.name}</p>
                      <span className="text-xs text-slate-500">{option.family}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{option.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>生成参数</CardTitle>
              <CardDescription>保存后会作为默认生成参数使用。</CardDescription>
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
                  onValueChange={([value]) =>
                    setSettings((prev) => ({ ...prev, temperature: value }))
                  }
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
                  onValueChange={([value]) =>
                    setSettings((prev) => ({ ...prev, maxTokens: value }))
                  }
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

        <TabsContent value="observability" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5" />
              AI 可观测数据
            </h2>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 天</SelectItem>
                <SelectItem value="30">30 天</SelectItem>
                <SelectItem value="90">90 天</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {obsLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-28" />
              ))}
            </div>
          ) : !obsData ? (
            <Card>
              <CardContent className="py-10 text-center text-slate-500">
                <AlertCircle className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                未获取到可观测数据
                <div>
                  <Button variant="outline" className="mt-4" onClick={loadObservability}>
                    重试
                  </Button>
                </div>
              </CardContent>
            </Card>
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
                      <div className="p-2 rounded-full bg-blue-100">
                        <Database className="w-5 h-5 text-blue-600" />
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
                      <div className="p-2 rounded-full bg-purple-100">
                        <BarChart3 className="w-5 h-5 text-purple-600" />
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
                      <div className="p-2 rounded-full bg-emerald-100">
                        <Clock className="w-5 h-5 text-emerald-600" />
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
                      <div className="p-2 rounded-full bg-amber-100">
                        <TrendingUp className="w-5 h-5 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>模型成本明细</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
