'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { useSystemLanguage } from '@/components/system-language-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useSystemLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error(t('两次输入的密码不一致', 'Passwords do not match'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error(t('邮箱格式不正确', 'Invalid email format'));
      return;
    }

    setLoading(true);

    try {
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const registerData = await registerResponse.json();
      if (registerData.code !== 0) {
        toast.error(registerData.message || t('注册失败', 'Registration failed'));
        return;
      }

      const loginResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
        callbackUrl: '/workspaces',
      });

      if (loginResult?.ok && !loginResult.error) {
        toast.success(t('注册成功', 'Registration successful'));
        router.push('/workspaces');
        router.refresh();
        return;
      }

      toast.success(t('注册成功，请登录', 'Registration successful, please sign in'));
      router.push('/login');
    } catch (error) {
      console.error('Register error:', error);
      toast.error(t('注册失败，请稍后重试', 'Registration failed, please try again later'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('注册账号', 'Create Account')}</CardTitle>
        <CardDescription>{t('创建您的 AI 测试平台账号', 'Create your AI Test Platform account')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('姓名', 'Name')}</Label>
            <Input
              id="name"
              placeholder={t('请输入姓名', 'Your name')}
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('邮箱', 'Email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('密码', 'Password')}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t('至少 6 位字符', 'At least 6 characters')}
              value={formData.password}
              onChange={(event) => setFormData({ ...formData, password: event.target.value })}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('确认密码', 'Confirm Password')}</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder={t('请再次输入密码', 'Enter password again')}
              value={formData.confirmPassword}
              onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('注册中...', 'Registering...') : t('注册', 'Register')}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm text-slate-600">
          {t('已有账号？', 'Already have an account?')}{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            {t('去登录', 'Sign in now')}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
