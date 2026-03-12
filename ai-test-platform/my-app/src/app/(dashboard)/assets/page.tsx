/**
 * Asset Library - 合并知识库 + 页面管理
 * 使用 Suspense 边界包裹 useSearchParams
 */

import { Suspense } from 'react';
import AssetLibraryContent from './AssetLibraryContent';
import { Loader2 } from 'lucide-react';

export default function AssetLibraryPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    }>
      <AssetLibraryContent />
    </Suspense>
  );
}