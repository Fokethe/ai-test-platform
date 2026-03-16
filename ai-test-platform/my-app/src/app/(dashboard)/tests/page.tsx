/**
 * TestCenter Page - 重构版
 * Bento Grid风格，统一设计系统
 */

import { Suspense } from 'react';
import { TestCenterContent } from './TestCenterContent';
import { Loader2 } from 'lucide-react';

export default function TestCenterPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--electric)]" />
        </div>
      }>
        <TestCenterContent />
      </Suspense>
    </div>
  );
}
