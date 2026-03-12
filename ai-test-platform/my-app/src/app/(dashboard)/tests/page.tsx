/**
 * TestCenter Page - 合并用例/套件/AI生成
 * 使用 Suspense 边界包裹 useSearchParams
 */

import { Suspense } from 'react';
import TestCenterContent from './TestCenterContent';
import { Loader2 } from 'lucide-react';

export default function TestCenterPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    }>
      <TestCenterContent />
    </Suspense>
  );
}