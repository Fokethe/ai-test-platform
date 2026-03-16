/**
 * Create Test Page - 新建用例/套件
 * 使用 Suspense 边界包裹 useSearchParams
 */

import { Suspense } from 'react';
import CreateTestContent from './CreateTestContent';
import { Loader2 } from 'lucide-react';

export default function CreateTestPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    }>
      <CreateTestContent />
    </Suspense>
  );
}