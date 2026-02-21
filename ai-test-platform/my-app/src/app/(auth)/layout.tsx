import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">🧪 AI Test Platform</h1>
          <p className="text-slate-600 mt-2">智能测试平台，让测试更简单</p>
        </div>
        {children}
      </div>
    </div>
  );
}
