import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex h-[calc(100vh-64px)] items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <FileQuestion className="h-12 w-12 text-slate-400" />
        <h2 className="text-xl font-semibold">页面未找到</h2>
        <p className="text-slate-600">
          您访问的页面不存在或已被删除
        </p>
        <Button asChild>
          <Link href="/workspaces">返回工作台</Link>
        </Button>
      </div>
    </div>
  );
}
