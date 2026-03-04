/**
 * AI Settings Page
 * TDD Round 4.4 & 4.5: AI配置设置
 * 
 * 功能：
 * 1. API密钥配置 - 添加密钥输入区域
 * 2. 参数调整 - 温度、最大token等参数调节
 * 3. 功能开关
 */

'use client';

import { useState, useEffect } from 'react';
import { Bot, Save, Sparkles, Key, Thermometer, Hash, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

// 默认配置
const DEFAULT_SETTINGS = {
  enableAI: true,
  autoGenerate: false,
  smartAnalysis: true,
  model: 'gpt-4o',
  // API密钥（加密存储）
  apiKey: '',
  // 参数设置
  temperature: 0.7,
  maxTokens: 2000,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

export default function AISettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings/ai');
        if (response.ok) {
          const result = await response.json();
          if (result.data) {
            setSettings(prev => ({ ...prev, ...result.data }));
          }
        }
      } catch (error) {
        console.error('加载设置失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // 监听设置变化
  useEffect(() => {
    setHasChanges(true);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings/ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('保存失败');
      }

      toast.success('AI 设置已保存');
      setHasChanges(false);
    } catch (error) {
      toast.error('保存失败', {
        description: error instanceof Error ? error.message : '请重试',
      });
    } finally {
      setSaving(false);
    }
  };

  // 测试API密钥
  const testApiKey = async () => {
    if (!settings.apiKey) {
      toast.error('请先输入 API 密钥');
      return;
    }

    try {
      const response = await fetch('/api/settings/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: settings.apiKey }),
      });

      if (response.ok) {
        toast.success('API 密钥有效');
      } else {
        throw new Error('API 密钥无效');
      }
    } catch (error) {
      toast.error('API 密钥测试失败', {
        description: error instanceof Error ? error.message : '请检查密钥',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            AI 设置
          </h1>
          <p className="text-slate-500 mt-1">配置 AI 助手功能和模型参数</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving || !hasChanges}
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? '保存中...' : '保存设置'}
        </Button>
      </div>

      {/* 未保存提示 */}
      {hasChanges && (
        <Alert>
          <AlertDescription>
            设置已修改，请记得保存更改
          </AlertDescription>
        </Alert>
      )}

      {/* API密钥配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API 密钥配置
          </CardTitle>
          <CardDescription>
            配置 AI 服务的 API 密钥，支持 OpenAI、Azure 等
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API 密钥</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={settings.apiKey}
                  onChange={(e) => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button variant="outline" onClick={testApiKey}>
                测试
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              密钥将被加密存储，仅用于 AI 请求
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI功能开关 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            AI 功能开关
          </CardTitle>
          <CardDescription>启用或禁用 AI 相关功能</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>启用 AI 助手</Label>
              <p className="text-sm text-slate-500">在测试用例生成中使用 AI 辅助</p>
            </div>
            <Switch
              checked={settings.enableAI}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableAI: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>自动生成用例</Label>
              <p className="text-sm text-slate-500">根据需求自动生成测试用例</p>
            </div>
            <Switch
              checked={settings.autoGenerate}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoGenerate: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>智能分析</Label>
              <p className="text-sm text-slate-500">对执行结果进行智能分析</p>
            </div>
            <Switch
              checked={settings.smartAnalysis}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, smartAnalysis: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* 模型设置 */}
      <Card>
        <CardHeader>
          <CardTitle>模型配置</CardTitle>
          <CardDescription>选择使用的 AI 模型</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {['gpt-4o', 'gpt-4o-mini', 'claude-3'].map((model) => (
              <button
                key={model}
                onClick={() => setSettings(prev => ({ ...prev, model }))}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  settings.model === model
                    ? 'border-blue-500 bg-blue-50'
                    : 'hover:border-slate-300'
                }`}
              >
                <div className="font-medium">{model}</div>
                <div className="text-sm text-slate-500 mt-1">
                  {model === 'gpt-4o' && '推荐 - 平衡性能与质量'}
                  {model === 'gpt-4o-mini' && '快速 - 适合简单任务'}
                  {model === 'claude-3' && '高质量 - 适合复杂分析'}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 参数调整 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            参数调整
          </CardTitle>
          <CardDescription>
            调整 AI 生成参数以获得不同风格的输出
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Temperature */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label htmlFor="temperature">Temperature（随机性）</Label>
              <span className="text-sm text-slate-500">{settings.temperature}</span>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={2}
              step={0.1}
              value={[settings.temperature]}
              onValueChange={([value]) => setSettings(prev => ({ ...prev, temperature: value }))}
            />
            <p className="text-xs text-slate-500">
              较低值使输出更确定，较高值使输出更多样化
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label htmlFor="maxTokens" className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                Max Tokens（最大长度）
              </Label>
              <span className="text-sm text-slate-500">{settings.maxTokens}</span>
            </div>
            <Slider
              id="maxTokens"
              min={100}
              max={4000}
              step={100}
              value={[settings.maxTokens]}
              onValueChange={([value]) => setSettings(prev => ({ ...prev, maxTokens: value }))}
            />
            <p className="text-xs text-slate-500">
              控制生成文本的最大长度
            </p>
          </div>

          {/* Top P */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label htmlFor="topP">Top P（多样性）</Label>
              <span className="text-sm text-slate-500">{settings.topP}</span>
            </div>
            <Slider
              id="topP"
              min={0}
              max={1}
              step={0.1}
              value={[settings.topP]}
              onValueChange={([value]) => setSettings(prev => ({ ...prev, topP: value }))}
            />
          </div>

          {/* Frequency Penalty */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label htmlFor="frequencyPenalty">Frequency Penalty（重复惩罚）</Label>
              <span className="text-sm text-slate-500">{settings.frequencyPenalty}</span>
            </div>
            <Slider
              id="frequencyPenalty"
              min={-2}
              max={2}
              step={0.1}
              value={[settings.frequencyPenalty]}
              onValueChange={([value]) => setSettings(prev => ({ ...prev, frequencyPenalty: value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* 使用提示 */}
      <div className="bg-blue-50 rounded-xl p-6">
        <h3 className="font-semibold text-slate-900 mb-2">💡 参数建议</h3>
        <ul className="text-sm text-slate-600 space-y-1">
          <li>• <strong>测试用例生成</strong>：Temperature 0.3-0.5，确保输出稳定</li>
          <li>• <strong>需求分析</strong>：Temperature 0.5-0.7，平衡创造性和准确性</li>
          <li>• <strong>问题诊断</strong>：Temperature 0.1-0.3，确保输出准确</li>
          <li>• Max Tokens 根据用例复杂度调整，通常 1000-2000 足够</li>
        </ul>
      </div>
    </div>
  );
}
