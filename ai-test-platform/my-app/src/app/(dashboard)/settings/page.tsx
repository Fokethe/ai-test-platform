'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Settings, 
  Bell, 
  Shield, 
  Globe, 
  Moon,
  Loader2,
  Check,
  AlertCircle,
  Brain,
  Server,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { Badge } from '@/components/ui/badge';

interface UserSettings {
  id: string;
  userId: string;
  emailNotify: boolean;
  darkMode: boolean;
  autoRun: boolean;
  twoFactorAuth: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SettingItem {
  id: keyof Omit<UserSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
  icon: React.ReactNode;
  title: string;
  description: string;
  isDev?: boolean;
}

const settingDefinitions: SettingItem[] = [
  {
    id: 'emailNotify',
    icon: <Bell className="h-5 w-5" />,
    title: '邮件通知',
    description: '接收测试执行完成和系统通知邮件',
  },
  {
    id: 'darkMode',
    icon: <Moon className="h-5 w-5" />,
    title: '深色模式',
    description: '使用深色主题',
    isDev: false,
  },
  {
    id: 'autoRun',
    icon: <Globe className="h-5 w-5" />,
    title: '自动执行',
    description: '定时自动执行测试套件',
  },
  {
    id: 'twoFactorAuth',
    icon: <Shield className="h-5 w-5" />,
    title: '两步验证',
    description: '启用两步验证提高账户安全',
    isDev: true,
  },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<keyof UserSettings | null>(null);

  // 加载用户设置
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/settings');
      const result = await response.json();
      
      if (result.code === 0) {
        setSettings(result.data);
        // 同步深色模式设置到主题
        if (result.data.darkMode) {
          setTheme('dark');
        }
      } else {
        toast.error('加载设置失败', {
          description: result.message,
        });
      }
    } catch (error) {
      console.error('Load settings error:', error);
      toast.error('加载设置失败');
    } finally {
      setLoading(false);
    }
  }, [setTheme]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 更新设置
  const toggleSetting = async (key: keyof Omit<UserSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!settings || saving) return;

    const newValue = !settings[key];
    
    // 如果是开发中功能，显示提示但不阻止操作
    const settingDef = settingDefinitions.find(s => s.id === key);
    if (settingDef?.isDev && newValue) {
      toast.info('功能开发中', {
        description: `${settingDef.title}功能即将上线，设置已保存`,
      });
    }

    setSaving(key);
    
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newValue }),
      });

      const result = await response.json();

      if (result.code === 0) {
        setSettings(result.data);
        
        // 特殊处理深色模式
        if (key === 'darkMode') {
          setTheme(newValue ? 'dark' : 'light');
        }
        
        if (!settingDef?.isDev) {
          toast.success('设置已更新');
        }
      } else {
        toast.error('更新失败', {
          description: result.message,
        });
      }
    } catch (error) {
      console.error('Update setting error:', error);
      toast.error('更新设置失败');
    } finally {
      setSaving(null);
    }
  };

  // 获取开关状态
  const getSettingValue = (key: keyof Omit<UserSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!settings) return false;
    return settings[key];
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">系统设置</h1>
            <p className="text-slate-600 mt-1">配置系统偏好和行为</p>
          </div>
          <Card>
            <CardContent className="p-8 flex items-center justify-center">
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>加载中...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">系统设置</h1>
          <p className="text-slate-600 mt-1">配置系统偏好和行为</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              通用设置
            </CardTitle>
            <CardDescription>管理您的系统偏好</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {settingDefinitions.map((setting, index) => (
              <div key={setting.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                      {setting.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{setting.title}</p>
                        {setting.isDev && (
                          <Badge variant="secondary" className="text-xs">
                            开发中
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {setting.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={getSettingValue(setting.id)}
                    onCheckedChange={() => toggleSetting(setting.id)}
                    disabled={saving === setting.id}
                  />
                </div>
                {index < settingDefinitions.length - 1 && (
                  <Separator className="mt-6" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>高级设置</CardTitle>
            <CardDescription>配置 AI 模型和系统参数</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <a 
              href="/ai-settings"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                  <Brain className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="font-medium">AI 智能体设置</p>
                  <p className="text-sm text-slate-500">配置模型、温度等参数</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </a>

            <a 
              href="/admin/config"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">系统配置管理</p>
                  <p className="text-sm text-slate-500">管理超时、并发、备份等</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </a>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>关于</CardTitle>
            <CardDescription>系统信息</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">版本</span>
                <span>v0.1.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">构建时间</span>
                <span>2026-02-16</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">技术支持</span>
                <a href="#" className="text-blue-600 hover:underline">
                  查看文档
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
