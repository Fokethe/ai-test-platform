/**
 * Create Test Page - 新建用例/套件
 */

'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Beaker, Folder, Plus, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { apiClient } from '@/lib/api';

export default function CreateTestPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaultType = (searchParams.get('type') as 'CASE' | 'SUITE') || 'CASE';

  const [type, setType] = useState<'CASE' | 'SUITE'>(defaultType);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    const projectId = searchParams.get('projectId');
    if (!projectId) {
      setFormError('缺少项目ID，请从项目页面进入');
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      type,
      priority: formData.get('priority'),
      tags: JSON.stringify((formData.get('tags') as string)?.split(',').filter(Boolean) || []),
      projectId,
      content: type === 'CASE'
        ? JSON.stringify({
            steps: (formData.get('steps') as string)?.split('\n').filter(s => s.trim()) || [],
            expected: formData.get('expected') || '',
          })
        : JSON.stringify({ config: {} }),
    };

    try {
      const result = await apiClient.post('/api/tests', data);
      router.push(`/tests/${result.id}`);
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
          <Link href="/tests">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">新建{type === 'CASE' ? '用例' : '套件'}</h1>
          <p className="text-slate-500">创建新的测试{type === 'CASE' ? '用例' : '套件'}</p>
        </div>
      </div>

      {/* Type Toggle */}
      <div className="flex gap-2 mb-6">
        <Button
          type="button"
          variant={type === 'CASE' ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => setType('CASE')}
        >
          <Beaker className="w-4 h-4 mr-2" />
          测试用例
        </Button>
        <Button
          type="button"
          variant={type === 'SUITE' ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => setType('SUITE')}
        >
          <Folder className="w-4 h-4 mr-2" />
          测试套件
        </Button>
      </div>

      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">名称 *</label>
            <Input
              name="name"
              placeholder={type === 'CASE' ? '例如: 用户登录成功' : '例如: 用户模块测试套件'}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">描述</label>
            <Textarea
              name="description"
              placeholder="简要描述这个测试的目的..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">优先级</label>
              <select
                name="priority"
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                defaultValue="MEDIUM"
              >
                <option value="CRITICAL">紧急</option>
                <option value="HIGH">高</option>
                <option value="MEDIUM">中</option>
                <option value="LOW">低</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">标签</label>
              <Input
                name="tags"
                placeholder="用逗号分隔, 如: smoke, api"
              />
            </div>
          </div>
        </div>

        {/* 用例特有字段 */}
        {type === 'CASE' && (
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-medium">测试步骤</h3>
            
            <div>
              <label className="text-sm font-medium">操作步骤</label>
              <Textarea
                name="steps"
                placeholder={`1. 打开登录页面
2. 输入用户名和密码
3. 点击登录按钮`}
                rows={6}
              />
              <p className="text-xs text-slate-500 mt-1">每行一个步骤</p>
            </div>

            <div>
              <label className="text-sm font-medium">预期结果</label>
              <Textarea
                name="expected"
                placeholder="登录成功，跳转到首页"
                rows={3}
              />
            </div>
          </div>
        )}

        {/* 套件特有字段 */}
        {type === 'SUITE' && (
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-medium">套件配置</h3>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-500">
                创建套件后，可以在详情页添加测试用例
              </p>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-4 pt-6 border-t">
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                创建{type === 'CASE' ? '用例' : '套件'}
              </>
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/tests">取消</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
