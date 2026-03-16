/**
 * AssetLibrary Page - 重构版
 * Bento Grid风格
 */

import { Suspense } from 'react';
import { AssetLibraryContent } from './AssetLibraryContent';
import { Loader2 } from 'lucide-react';

export default function AssetLibraryPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--electric)]" />
        </div>
      }>
        <AssetLibraryContent />
      </Suspense>
    </div>
  );
}
