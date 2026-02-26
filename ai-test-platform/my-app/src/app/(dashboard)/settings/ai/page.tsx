/**
 * AI Settings Page
 * AI 配置设置
 */

'use client';

import { useState } from 'react';
import { Bot, Save, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function AISettingsPage() {
  const [settings, setSettings] = useState({
    enableAI: true,
    autoGenerate: false,
    smartAnalysis: true,
    model: 'gpt-4o',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // 模拟保存
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success('AI 设置已保存');
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            AI 设置
          </h1>
          <p className="text-slate-500 mt-1">配置 AI 助手功能和模型参数</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? '保存中...' : '保存设置'}
        </Button>
      </div>

      {/* AI Features */}
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

      {/* Model Settings */}
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
    </div>
  );
}
