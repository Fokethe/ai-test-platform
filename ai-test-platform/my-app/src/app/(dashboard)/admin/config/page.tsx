'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Settings, 
  Clock, 
  Users, 
  FileText, 
  Database,
  Save,
  RotateCcw,
  Download,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Server
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface SystemConfig {
  executionTimeout: number;
  maxConcurrentExecutions: number;
  logRetentionDays: number;
  enableAutoCleanup: boolean;
  enableEmailNotification: boolean;
  maintenanceMode: boolean;
  apiRateLimit: number;
}

const DEFAULT_CONFIG: SystemConfig = {
  executionTimeout: 300,
  maxConcurrentExecutions: 5,
  logRetentionDays: 30,
  enableAutoCleanup: true,
  enableEmailNotification: true,
  maintenanceMode: false,
  apiRateLimit: 100,
};

export default function AdminConfigPage() {
  const router = useRouter();
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // 加载配置
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/config');
      const result = await response.json();
      
      if (result.code === 0) {
        setConfig({ ...DEFAULT_CONFIG, ...result.data });
      } else {
        toast.error('加载配置失败', {
          description: result.message,
        });
      }
    } catch (error) {
      console.error('Load config error:', error);
      toast.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (result.code === 0) {
        toast.success('配置已保存');
        setHasChanges(false);
      } else {
        toast.error('保存失败', {
          description: result.message,
        });
      }
    } catch (error) {
      console.error('Save config error:', error);
      toast.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setHasChanges(true);
    toast.info('已重置为默认配置');
  };

  const updateConfig = <K extends keyof SystemConfig>(key: K, value: SystemConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const response = await fetch('/api/admin/config/backup', {
        method: 'POST',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-test-platform-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('备份文件已下载');
      } else {
        toast.error('备份失败');
      }
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('备份失败');
    } finally {
      setBackupLoading(false);
      setBackupDialogOpen(false);
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setRestoreLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const response = await fetch('/api/admin/config/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.code === 0) {
        toast.success('配置已恢复');
        loadConfig();
      } else {
        toast.error('恢复失败', {
          description: result.message,
        });
      }
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('恢复失败，请检查备份文件格式');
    } finally {
      setRestoreLoading(false);
      setRestoreDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
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
                <Settings className="h-6 w-6 text-blue-500" />
                系统配置管理
              </h1>
              <p className="text-slate-600 mt-1">
                管理系统参数和运行配置
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                重置
              </Button>
              <Button onClick={handleSave} disabled={!hasChanges || saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                保存配置
              </Button>
            </div>
          </div>
        </div>

        {/* Execution Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              执行配置
            </CardTitle>
            <CardDescription>配置测试执行相关参数</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Execution Timeout */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">执行超时时间</Label>
                  <p className="text-sm text-slate-500">单个测试用例的最大执行时间</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={config.executionTimeout}
                    onChange={(e) => updateConfig('executionTimeout', parseInt(e.target.value) || 0)}
                    className="w-24 text-right"
                    min={60}
                    max={3600}
                  />
                  <span className="text-sm text-slate-500 w-12">秒</span>
                </div>
              </div>
              <Slider
                value={[config.executionTimeout]}
                onValueChange={([value]) => updateConfig('executionTimeout', value)}
                min={60}
                max={3600}
                step={30}
              />
            </div>

            <Separator />

            {/* Max Concurrent */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">并发执行数量</Label>
                  <p className="text-sm text-slate-500">同时运行的最大测试套件数量</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={config.maxConcurrentExecutions}
                    onChange={(e) => updateConfig('maxConcurrentExecutions', parseInt(e.target.value) || 1)}
                    className="w-24 text-right"
                    min={1}
                    max={20}
                  />
                  <span className="text-sm text-slate-500 w-12">个</span>
                </div>
              </div>
              <Slider
                value={[config.maxConcurrentExecutions]}
                onValueChange={([value]) => updateConfig('maxConcurrentExecutions', value)}
                min={1}
                max={20}
                step={1}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              数据管理
            </CardTitle>
            <CardDescription>配置数据保留和清理策略</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Log Retention */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">日志保留天数</Label>
                  <p className="text-sm text-slate-500">测试执行日志的保留期限</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={config.logRetentionDays}
                    onChange={(e) => updateConfig('logRetentionDays', parseInt(e.target.value) || 1)}
                    className="w-24 text-right"
                    min={7}
                    max={365}
                  />
                  <span className="text-sm text-slate-500 w-12">天</span>
                </div>
              </div>
              <Slider
                value={[config.logRetentionDays]}
                onValueChange={([value]) => updateConfig('logRetentionDays', value)}
                min={7}
                max={365}
                step={7}
              />
            </div>

            <Separator />

            {/* Auto Cleanup */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">自动清理</Label>
                <p className="text-sm text-slate-500">自动清理过期日志和数据</p>
              </div>
              <Switch
                checked={config.enableAutoCleanup}
                onCheckedChange={(checked) => updateConfig('enableAutoCleanup', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              系统设置
            </CardTitle>
            <CardDescription>配置系统运行模式</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Maintenance Mode */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base flex items-center gap-2">
                  维护模式
                  {config.maintenanceMode && (
                    <Badge variant="destructive" className="text-xs">已启用</Badge>
                  )}
                </Label>
                <p className="text-sm text-slate-500">启用后仅管理员可访问系统</p>
              </div>
              <Switch
                checked={config.maintenanceMode}
                onCheckedChange={(checked) => {
                  updateConfig('maintenanceMode', checked);
                  if (checked) {
                    toast.warning('维护模式已启用，普通用户将无法访问');
                  }
                }}
              />
            </div>

            <Separator />

            {/* Email Notification */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">邮件通知</Label>
                <p className="text-sm text-slate-500">启用系统邮件通知功能</p>
              </div>
              <Switch
                checked={config.enableEmailNotification}
                onCheckedChange={(checked) => updateConfig('enableEmailNotification', checked)}
              />
            </div>

            <Separator />

            {/* API Rate Limit */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">API 限流</Label>
                  <p className="text-sm text-slate-500">每分钟最大请求数</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={config.apiRateLimit}
                    onChange={(e) => updateConfig('apiRateLimit', parseInt(e.target.value) || 1)}
                    className="w-24 text-right"
                    min={10}
                    max={1000}
                  />
                  <span className="text-sm text-slate-500 w-12">次</span>
                </div>
              </div>
              <Slider
                value={[config.apiRateLimit]}
                onValueChange={([value]) => updateConfig('apiRateLimit', value)}
                min={10}
                max={1000}
                step={10}
              />
            </div>
          </CardContent>
        </Card>

        {/* Backup & Restore */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              数据备份与恢复
            </CardTitle>
            <CardDescription>备份或恢复系统配置数据</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Download className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium">数据备份</h4>
                    <p className="text-sm text-slate-500 mt-1">
                      导出当前所有配置和数据为 JSON 文件
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-3"
                      onClick={() => setBackupDialogOpen(true)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      创建备份
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Upload className="h-5 w-5 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium">数据恢复</h4>
                    <p className="text-sm text-slate-500 mt-1">
                      从备份文件恢复系统配置和数据
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-3"
                      onClick={() => setRestoreDialogOpen(true)}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      恢复数据
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warning */}
        {hasChanges && (
          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800 dark:text-amber-400">
                未保存的更改
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                您有未保存的配置更改，请点击保存按钮应用更改。
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Backup Dialog */}
      <Dialog open={backupDialogOpen} onOpenChange={setBackupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建数据备份</DialogTitle>
            <DialogDescription>
              这将导出所有系统配置、用户设置和历史数据。备份文件将下载到本地。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium">备份内容包括：</p>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  <li>系统配置参数</li>
                  <li>用户偏好设置</li>
                  <li>测试用例数据</li>
                  <li>执行历史记录</li>
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBackupDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleBackup} disabled={backupLoading}>
              {backupLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              确认备份
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>恢复数据备份</DialogTitle>
            <DialogDescription>
              从备份文件恢复数据。这将覆盖当前的配置和数据。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <p className="font-medium">注意：</p>
                <p className="mt-1">恢复操作将覆盖现有数据，建议在恢复前创建当前数据的备份。</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>选择备份文件</Label>
              <Input
                type="file"
                accept=".json"
                onChange={handleRestore}
                disabled={restoreLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
