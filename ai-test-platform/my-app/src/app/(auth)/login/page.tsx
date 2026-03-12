'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import LoginForm from './LoginForm';

// 默认导出 - 用 Suspense 包裹
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
