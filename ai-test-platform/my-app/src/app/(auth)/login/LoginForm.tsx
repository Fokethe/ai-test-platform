'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSystemLanguage } from '@/components/system-language-provider';
import { toast } from 'sonner';

const REMEMBERED_EMAIL_KEY = 'rememberedEmail';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const { t } = useSystemLanguage();
  
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Load remembered email from localStorage on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  // Handle remember me checkbox change
  const handleRememberMeChange = (checked: boolean) => {
    setRememberMe(checked);
    if (!checked) {
      // Clear localStorage when unchecked
      localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        toast.error(t('邮箱或密码错误', 'Invalid email or password'));
      } else if (result?.ok) {
        // Save or clear email based on remember me
        if (rememberMe) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, formData.email);
        } else {
          localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }
        
        toast.success(t('登录成功', 'Login successful'));
        router.push(callbackUrl);
        router.refresh();
      } else {
        toast.error(t('登录失败，请稍后重试', 'Login failed, please try again later'));
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(t('登录失败，请稍后重试', 'Login failed, please try again later'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('登录', 'Sign In')}</CardTitle>
        <CardDescription>{t('输入您的账号信息继续', 'Enter your account to continue')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('邮箱', 'Email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('请输入邮箱地址', 'you@example.com')}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('密码', 'Password')}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t('请输入密码', 'Enter your password')}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={handleRememberMeChange}
            />
            <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
              {t('记住邮箱', 'Remember email')}
            </Label>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('登录中...', 'Signing in...') : t('登录', 'Sign In')}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm text-slate-600">
          {t('还没有账号？', "Don't have an account?")}{' '}
          <Link href="/register" className="text-blue-600 hover:underline">
            {t('立即注册', 'Create one')}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
