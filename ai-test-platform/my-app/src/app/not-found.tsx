import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function GlobalNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4 text-center p-8">
        <FileQuestion className="h-16 w-16 text-slate-400" />
        <h1 className="text-2xl font-bold">404 - 页面未找到</h1>
        <p className="text-slate-600 max-w-md">
          您访问的页面不存在或已被删除
        </p>
        <Button asChild>
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    </div>
  );
}
