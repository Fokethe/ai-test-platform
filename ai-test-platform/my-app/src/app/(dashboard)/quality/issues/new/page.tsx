/**
 * Create Issue Page - 上报问题/Bug
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bug, Plus, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { apiClient } from '@/lib/api';

export default function CreateIssuePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      type: 'BUG',
      severity: formData.get('severity'),
      priority: formData.get('severity'), // 使用 severity 作为 priority
      projectId: 'default',
    };

    try {
      const result = await apiClient.post('/api/issues', data);
      router.push(`/quality/issues/${result.data.id}`);
    } catch (err: any) {
      setFormError(err.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/quality">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">上报问题</h1>
          <p className="text-slate-500">创建新的 Bug 报告或改进建议</p>
        </div>
      </div>

      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 标题 */}
        <div>
          <label className="text-sm font-medium">问题标题 *</label>
          <Input
            name="title"
            placeholder="简洁描述问题，例如：登录按钮点击无响应"
            required
          />
        </div>

        {/* 严重程度 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">严重程度 *</label>
            <select
              name="severity"
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
              defaultValue="MEDIUM"
              required
            >
              <option value="CRITICAL">紧急 - 系统不可用</option>
              <option value="HIGH">高 - 主要功能受损</option>
              <option value="MEDIUM">中 - 次要功能问题</option>
              <option value="LOW">低 - 轻微问题</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">关联测试</label>
            <Input
              name="testId"
              placeholder="测试用例 ID (可选)"
            />
          </div>
        </div>

        {/* 描述 */}
        <div>
          <label className="text-sm font-medium">问题描述 *</label>
          <Textarea
            name="description"
            placeholder={`请详细描述问题：

**重现步骤：**
1. 
2. 
3. 

**实际结果：**

**预期结果：**

**环境信息：**
- 浏览器：
- 操作系统：`}
            rows={12}
            required
          />
        </div>

        {/* 截图/附件 */}
        <div>
          <label className="text-sm font-medium">附件</label>
          <div className="mt-2 border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
            <p className="text-slate-500">拖拽文件到此处，或点击上传</p>
            <p className="text-xs text-slate-400 mt-1">支持图片、视频、日志文件</p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-4 pt-6 border-t">
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <Bug className="w-4 h-4 mr-2" />
                提交问题
              </>
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/quality">取消</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
