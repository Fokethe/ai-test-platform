'use client';

import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { ThemeProvider } from './theme-provider';
import { SWRConfig } from 'swr';

interface ProvidersProps {
  children: ReactNode;
  session?: never;
}

// SWR 全局配置
const swrConfig = {
  // 刷新间隔：窗口聚焦时不刷新，减少不必要的请求
  revalidateOnFocus: false,
  // 错误重试
  errorRetryCount: 3,
  // 去重间隔
  dedupingInterval: 5000,
  // 错误重试间隔（毫秒）
  errorRetryInterval: 3000,
  // 加载超时
  loadingTimeout: 10000,
};

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider 
      refetchInterval={5 * 60} // 5 minutes
      refetchOnWindowFocus={false}
    >
      <ThemeProvider>
        <SWRConfig value={swrConfig}>
          {children}
          <Toaster position="top-center" richColors />
        </SWRConfig>
      </ThemeProvider>
    </SessionProvider>
  );
}
