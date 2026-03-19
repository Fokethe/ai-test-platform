'use client';

import { ReactNode } from 'react';
import { Languages } from 'lucide-react';
import { useSystemLanguage } from '@/components/system-language-provider';
import { Button } from '@/components/ui/button';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { language, toggleLanguage, t } = useSystemLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <Button variant="outline" size="sm" className="gap-2" onClick={toggleLanguage}>
            <Languages className="h-4 w-4" />
            {language === 'zh-CN' ? 'English' : '简体中文'}
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">🧪 AI Test Platform</h1>
          <p className="text-slate-600 mt-2">
            {t('智能测试平台，让测试更简单', 'Smart AI testing platform for faster quality delivery')}
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
