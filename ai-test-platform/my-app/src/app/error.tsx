"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-900">
      <div className="flex flex-col items-center gap-4 text-center p-8">
        <AlertTriangle className="h-16 w-16 text-red-500" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">系统错误</h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-md">
          {error.message || "系统发生错误，请稍后重试"}
        </p>
        <Button onClick={reset}>重试</Button>
      </div>
    </div>
  );
}
