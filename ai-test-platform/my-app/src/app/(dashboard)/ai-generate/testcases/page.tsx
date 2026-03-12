'use client'

import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import TestCasesContent from './TestCasesContent'

export default function TestCasesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>}>
      <TestCasesContent />
    </Suspense>
  )
}
