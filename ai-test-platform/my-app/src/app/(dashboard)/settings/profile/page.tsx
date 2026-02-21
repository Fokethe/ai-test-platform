'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { 
  User, 
  Mail, 
  Save, 
  Loader2, 
  Camera, 
  Trash2, 
  Lock, 
  Bell, 
  Globe, 
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UserSettings {
  emailNotify: boolean;
  pushNotify: boolean;
  executionNotify: boolean;
  inviteNotify: boolean;
  systemNotify: boolean;
  language: string;
  timezone: string;
}

const timezones = [
  { value: 'Asia/Shanghai', label: '北京时间 (UTC+8)' },
  { value: 'Asia/Tokyo', label: '东京时间 (UTC+9)' },
  { value: 'Asia/Seoul', label: '首尔时间 (UTC+9)' },
  { value: 'Asia/Singapore', label: '新加坡时间 (UTC+8)' },
  { value: 'Asia/Dubai', label: '迪拜时间 (UTC+4)' },
  { value: 'Europe/London', label: '伦敦时间 (UTC+0)' },
  { value: 'Europe/Paris', label: '巴黎时间 (UTC+1)' },
  { value: 'Europe/Berlin', label: '柏林时间 (UTC+1)' },
  { value: 'America/New_York', label: '纽约时间 (UTC-5)' },
  { value: 'America/Los_Angeles', label: '洛杉矶时间 (UTC-8)' },
  { value: 'America/Chicago', label: '芝加哥时间 (UTC-6)' },
  { value: 'America/Toronto', label: '多伦多时间 (UTC-5)' },
  { value: 'Australia/Sydney', label: '悉尼时间 (UTC+11)' },
  { value: 'Pacific/Auckland', label: '奥克兰时间 (UTC+13)' },
];

const languages = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
];

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    image: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [settings, setSettings] = useState<UserSettings>({
    emailNotify: true,
    pushNotify: true,
    executionNotify: true,
    inviteNotify: true,
    systemNotify: true,
    language: 'zh-CN',
    timezone: 'Asia/Shanghai',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeleteAvatarDialog, setShowDeleteAvatarDialog] = useState(false);

  // 加载用户数据
  useEffect(() => {
    if (session?.user) {
      setFormData({
        name: session.user.name || '',
        email: session.user.email || '',
        image: session.user.image || '',
      });
      fetchUserSettings();
    }
  }, [session]);

  // 获取用户设置
  const fetchUserSettings = async () => {
    try {
      const res = await fetch('/api/user/settings');
      const result = await res.json();
      if (result.code === 0 && result.data) {
        setSettings(prev => ({
          ...prev,
          ...result.data,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  // 保存个人资料
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name }),
      });

      if (!res.ok) throw new Error('更新失败');

      const data = await res.json();
      
      if (data.data?.name) {
        setFormData(prev => ({ ...prev, name: data.data.name }));
      }
      
      await update();
      toast.success('个人资料更新成功');
    } catch (error) {
      toast.error('更新失败');
    } finally {
      setLoading(false);
    }
  };

  // 上传头像
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('只支持 JPG、PNG、GIF、WebP 格式的图片');
      return;
    }

    // 验证文件大小 (最大 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('图片大小不能超过 2MB');
      return;
    }

    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      
      if (result.code === 0) {
        setFormData(prev => ({ ...prev, image: result.data.image }));
        await update();
        toast.success('头像上传成功');
      } else {
        toast.error(result.message || '上传失败');
      }
    } catch (error) {
      toast.error('上传头像失败');
    } finally {
      setAvatarLoading(false);
    }
  };

  // 删除头像
  const handleDeleteAvatar = async () => {
    setAvatarLoading(true);
    try {
      const res = await fetch('/api/user/avatar', {
        method: 'DELETE',
      });

      const result = await res.json();
      
      if (result.code === 0) {
        setFormData(prev => ({ ...prev, image: '' }));
        await update();
        toast.success('头像已删除');
        setShowDeleteAvatarDialog(false);
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch (error) {
      toast.error('删除头像失败');
    } finally {
      setAvatarLoading(false);
    }
  };

  // 修改密码
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('新密码至少6位');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmPassword: passwordData.confirmPassword,
        }),
      });

      const result = await res.json();
      
      if (result.code === 0) {
        toast.success('密码修改成功');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        toast.error(result.message || '修改失败');
      }
    } catch (error) {
      toast.error('修改密码失败');
    } finally {
      setPasswordLoading(false);
    }
  };

  // 保存设置
  const handleSaveSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const result = await res.json();
      
      if (result.code === 0) {
        toast.success('设置保存成功');
      } else {
        toast.error(result.message || '保存失败');
      }
    } catch (error) {
      toast.error('保存设置失败');
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold">个人设置</h1>
          <p className="text-slate-600 mt-1">管理您的个人资料和偏好设置</p>
        </div>

        {/* 头像卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              头像设置
            </CardTitle>
            <CardDescription>上传或更改您的头像</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={formData.image} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
                    {formData.name?.[0] || formData.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                {avatarLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarLoading}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    上传头像
                  </Button>
                  {formData.image && (
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteAvatarDialog(true)}
                      disabled={avatarLoading}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      删除头像
                    </Button>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  支持 JPG、PNG、GIF、WebP 格式，最大 2MB
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </CardContent>
        </Card>

        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              基本信息
            </CardTitle>
            <CardDescription>更新您的个人资料</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  <User className="inline h-4 w-4 mr-1" />
                  姓名
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="您的姓名"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="inline h-4 w-4 mr-1" />
                  邮箱
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  placeholder="您的邮箱"
                />
                <p className="text-xs text-slate-500">邮箱暂不支持修改</p>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                保存资料
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 修改密码 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              修改密码
            </CardTitle>
            <CardDescription>更改您的登录密码</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">当前密码</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="请输入当前密码"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-500" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">新密码</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="至少6位"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-500" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认新密码</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="再次输入新密码"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-500" />
                    )}
                  </Button>
                </div>
              </div>

              <Button type="submit" disabled={passwordLoading}>
                {passwordLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                修改密码
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 通知偏好设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              通知偏好
            </CardTitle>
            <CardDescription>配置您希望接收的通知类型</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">系统通知</p>
                <p className="text-sm text-slate-500">接收系统维护、更新等重要通知</p>
              </div>
              <Switch
                checked={settings.systemNotify}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, systemNotify: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">执行完成通知</p>
                <p className="text-sm text-slate-500">测试执行完成时接收通知</p>
              </div>
              <Switch
                checked={settings.executionNotify}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, executionNotify: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">协作邀请通知</p>
                <p className="text-sm text-slate-500">收到工作空间邀请时接收通知</p>
              </div>
              <Switch
                checked={settings.inviteNotify}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, inviteNotify: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* 语言和地区设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              语言和地区
            </CardTitle>
            <CardDescription>设置您的语言和时区偏好</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                语言
              </Label>
              <Select
                value={settings.language}
                onValueChange={(value) =>
                  setSettings({ ...settings, language: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                时区
              </Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) =>
                  setSettings({ ...settings, timezone: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSaveSettings} disabled={settingsLoading}>
              {settingsLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              保存设置
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 删除头像确认对话框 */}
      <Dialog open={showDeleteAvatarDialog} onOpenChange={setShowDeleteAvatarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除头像</DialogTitle>
            <DialogDescription>确定要删除当前头像吗？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteAvatarDialog(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAvatar}
              disabled={avatarLoading}
            >
              {avatarLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
