/**
 * Issues List Page - 问题列表
 * 取代 Bug 列表
 * 使用 Suspense 边界包裹 useSearchParams
 */

import { Suspense } from 'react';
import IssuesContent from './IssuesContent';
import { Loader2 } from 'lucide-react';

export default function IssuesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    }>
      <IssuesContent />
    </Suspense>
  );
}