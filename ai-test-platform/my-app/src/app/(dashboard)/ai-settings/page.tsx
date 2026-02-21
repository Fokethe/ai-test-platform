'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Brain, Save, RotateCcw, Key, Eye, EyeOff, ExternalLink, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface AISettings {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  apiKey: string;
}

const DEFAULT_SETTINGS: AISettings = {
  model: 'moonshot-v1-8k',
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.9,
  apiKey: '',
};

const MODEL_OPTIONS = [
  { value: 'moonshot-v1-8k', label: 'Moonshot v1 (8K)', description: '适合短文本处理' },
  { value: 'moonshot-v1-32k', label: 'Moonshot v1 (32K)', description: '适合中等长度文本' },
  { value: 'gpt-4', label: 'GPT-4', description: 'OpenAI 最强模型' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: '更快更便宜' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: '快速经济' },
];

export default function AISettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  // 格式化 API Key 显示（中间隐藏）
  const formatApiKey = (key: string) => {
    if (!key || key.length < 12) return key;
    const prefix = key.slice(0, 10);
    const suffix = key.slice(-6);
    return `${prefix}****${suffix}`;
  };

  // 从 localStorage 加载设置
  useEffect(() => {
    const saved = localStorage.getItem('ai-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.error('Failed to parse AI settings:', e);
      }
    }
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem('ai-settings', JSON.stringify(settings));
      toast.success('AI 设置已保存');
      setHasChanges(false);
    } catch (e) {
      toast.error('保存失败');
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
    toast.info('已重置为默认设置，请点击保存');
  };

  const updateSetting = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const getTemperatureLabel = (temp: number) => {
    if (temp < 0.3) return { label: '精确', color: 'bg-blue-100 text-blue-700' };
    if (temp < 0.7) return { label: '平衡', color: 'bg-green-100 text-green-700' };
    return { label: '创意', color: 'bg-purple-100 text-purple-700' };
  };

  const tempInfo = getTemperatureLabel(settings.temperature);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/settings" 
            className="text-slate-600 hover:text-slate-900 flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Brain className="h-6 w-6 text-violet-500" />
                AI 智能体设置
              </h1>
              <p className="text-slate-600 mt-1">
                配置 AI 模型参数，优化测试用例生成效果
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                重置
              </Button>
              <Button onClick={handleSave} disabled={!hasChanges}>
                <Save className="mr-2 h-4 w-4" />
                保存设置
              </Button>
            </div>
          </div>
        </div>

        {/* API Key Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-amber-500" />
              API 密钥配置
            </CardTitle>
            <CardDescription>
              配置 AI 服务提供商的 API Key，用于调用真实的 AI 模型
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* API Key 显示/编辑区域 */}
            <div className="space-y-2">
              <Label>API Key</Label>
              
              {isEditingKey ? (
                // 编辑模式
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="输入新的 API Key (sk-...)"
                    autoFocus
                    className="flex-1 px-3 py-2 border rounded-md bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      updateSetting('apiKey', tempApiKey);
                      setIsEditingKey(false);
                      toast.success('API Key 已更新');
                    }}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditingKey(false);
                      setTempApiKey('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                // 显示模式（禁止复制）
                <div 
                  className="relative flex items-center justify-between p-3 border rounded-md bg-slate-50 dark:bg-slate-800 select-none"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                  onCopy={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span 
                      className="font-mono text-sm text-slate-700 dark:text-slate-300"
                      style={{ userSelect: 'none' }}
                    >
                      {settings.apiKey ? (
                        showApiKey ? settings.apiKey : formatApiKey(settings.apiKey)
                      ) : (
                        <span className="text-slate-400">未配置 API Key</span>
                      )}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {settings.apiKey && (
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                        title={showApiKey ? '隐藏' : '显示'}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setTempApiKey(settings.apiKey);
                        setIsEditingKey(true);
                      }}
                      className="p-1.5 text-violet-500 hover:text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded"
                      title="更换 Key"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-slate-500">
                {isEditingKey ? '输入新的 API Key 后点击 ✓ 保存' : '点击 ✏️ 图标更换 API Key，点击 👁 显示/隐藏'}
              </p>
            </div>

            {/* API Key 状态提示 */}
            <div className={`p-4 rounded-lg border ${settings.apiKey ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${settings.apiKey ? 'text-green-600' : 'text-amber-600'}`}>
                  {settings.apiKey ? '✓' : '⚠'}
                </div>
                <div>
                  <p className={`font-medium ${settings.apiKey ? 'text-green-800 dark:text-green-400' : 'text-amber-800 dark:text-amber-400'}`}>
                    {settings.apiKey ? '已配置 API Key' : '未配置 API Key'}
                  </p>
                  <p className={`text-sm mt-1 ${settings.apiKey ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}`}>
                    {settings.apiKey 
                      ? '将使用真实 AI 模型生成测试用例，质量更高、更智能'
                      : '当前使用模拟数据生成用例，建议配置 API Key 获得更好的生成效果'}
                  </p>
                </div>
              </div>
            </div>

            {/* 获取 API Key 链接 */}
            <div className="flex gap-4 text-sm">
              <a 
                href="https://platform.moonshot.cn/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-violet-600 hover:text-violet-700 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                获取 Moonshot API Key
              </a>
              <a 
                href="https://platform.openai.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-violet-600 hover:text-violet-700 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                获取 OpenAI API Key
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Model Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>模型选择</CardTitle>
            <CardDescription>选择用于生成测试用例的 AI 模型</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>AI 模型</Label>
              <Select
                value={settings.model}
                onValueChange={(value) => updateSetting('model', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      <div className="flex flex-col items-start">
                        <span>{model.label}</span>
                        <span className="text-xs text-slate-500">{model.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                当前选择: <span className="font-medium">{MODEL_OPTIONS.find(m => m.value === settings.model)?.label}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Temperature Setting */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              温度 (Temperature)
              <Badge className={tempInfo.color}>{tempInfo.label}</Badge>
            </CardTitle>
            <CardDescription>
              控制 AI 输出的随机性。较低值使输出更确定，较高值使输出更多样
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">精确 (0.0)</span>
                <span className="text-lg font-semibold">{settings.temperature.toFixed(1)}</span>
                <span className="text-sm text-slate-500">创意 (1.0)</span>
              </div>
              <Slider
                value={[settings.temperature]}
                onValueChange={([value]) => updateSetting('temperature', value)}
                min={0}
                max={1}
                step={0.1}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">0.0 - 0.3</p>
                <p className="text-slate-600 dark:text-slate-400">适合生成精确的测试步骤</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                <p className="font-medium text-green-700 dark:text-green-400 mb-1">0.4 - 0.7</p>
                <p className="text-slate-600 dark:text-slate-400">平衡精确性和多样性</p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                <p className="font-medium text-purple-700 dark:text-purple-400 mb-1">0.8 - 1.0</p>
                <p className="text-slate-600 dark:text-slate-400">生成更多创意用例</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Card>
          <CardHeader>
            <CardTitle>高级设置</CardTitle>
            <CardDescription>调整更多生成参数</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Max Tokens */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>最大令牌数 (Max Tokens)</Label>
                <span className="text-sm font-medium">{settings.maxTokens}</span>
              </div>
              <Slider
                value={[settings.maxTokens]}
                onValueChange={([value]) => updateSetting('maxTokens', value)}
                min={512}
                max={4096}
                step={256}
              />
              <p className="text-xs text-slate-500">
                控制 AI 响应的最大长度。较大的值允许生成更多用例，但可能增加成本。
              </p>
            </div>

            {/* Top P */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label>核采样 (Top P)</Label>
                <span className="text-sm font-medium">{settings.topP.toFixed(1)}</span>
              </div>
              <Slider
                value={[settings.topP]}
                onValueChange={([value]) => updateSetting('topP', value)}
                min={0.1}
                max={1}
                step={0.1}
              />
              <p className="text-xs text-slate-500">
                控制词汇选择的多样性。建议保持默认值 0.9。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="mt-6 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="py-4">
            <h4 className="font-medium text-amber-800 dark:text-amber-400 mb-2">
              💡 使用建议 & API Key 说明
            </h4>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
              <li>测试用例生成建议使用 0.3-0.5 的温度值，保证输出稳定</li>
              <li>温度越高（0.7-1.0），生成的用例数量越多、创意性越强</li>
              <li>Moonshot 模型对中文支持更好，适合国内用户</li>
              <li>GPT-4 在复杂逻辑场景下表现更优</li>
              <li><strong>API Key 存储在浏览器本地</strong>，不会上传到服务器</li>
              <li>如需全局配置，请在服务器环境变量中设置 KIMI_API_KEY</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
