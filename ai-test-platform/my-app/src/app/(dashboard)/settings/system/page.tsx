/**
 * System Settings Page
 * 系统配置页面
 */

'use client';

import { useState } from 'react';
import { Settings, Save, Database, Shield, Bell, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState({
    // 通知设置
    emailNotifications: true,
    webhookNotifications: false,
    // 安全设置
    require2FA: false,
    sessionTimeout: 30,
    // 存储设置
    autoCleanup: true,
    retentionDays: 90,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success('系统设置已保存');
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            系统配置
          </h1>
          <p className="text-slate-500 mt-1">管理系统全局设置</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? '保存中...' : '保存设置'}
        </Button>
      </div>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            通知设置
          </CardTitle>
          <CardDescription>配置系统通知方式</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>邮件通知</Label>
              <p className="text-sm text-slate-500">通过邮件接收重要通知</p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emailNotifications: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Webhook 通知</Label>
              <p className="text-sm text-slate-500">向外部系统推送通知</p>
            </div>
            <Switch
              checked={settings.webhookNotifications}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, webhookNotifications: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            安全设置
          </CardTitle>
          <CardDescription>配置系统安全策略</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>强制双因素认证</Label>
              <p className="text-sm text-slate-500">要求所有用户启用 2FA</p>
            </div>
            <Switch
              checked={settings.require2FA}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, require2FA: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>会话超时（分钟）</Label>
              <p className="text-sm text-slate-500">无操作后自动登出时间</p>
            </div>
            <Input
              type="number"
              value={settings.sessionTimeout}
              onChange={(e) => setSettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) || 30 }))}
              className="w-24"
            />
          </div>
        </CardContent>
      </Card>

      {/* Storage Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            存储设置
          </CardTitle>
          <CardDescription>配置数据保留策略</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>自动清理</Label>
              <p className="text-sm text-slate-500">自动删除过期数据</p>
            </div>
            <Switch
              checked={settings.autoCleanup}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoCleanup: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>数据保留天数</Label>
              <p className="text-sm text-slate-500">执行记录和日志保留时间</p>
            </div>
            <Input
              type="number"
              value={settings.retentionDays}
              onChange={(e) => setSettings(prev => ({ ...prev, retentionDays: parseInt(e.target.value) || 90 }))}
              className="w-24"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
