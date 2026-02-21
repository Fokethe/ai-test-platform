"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex h-[calc(100vh-64px)] items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-semibold">出错了</h2>
        <p className="text-slate-600 max-w-md">
          {error.message || "页面加载失败，请稍后重试"}
        </p>
        <div className="flex gap-2">
          <Button onClick={reset}>重试</Button>
          <Button variant="outline" onClick={() => window.location.href = "/workspaces"}>
            返回工作台
          </Button>
        </div>
      </div>
    </div>
  );
}
