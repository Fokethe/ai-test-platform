'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Play,
  Plus,
  ArrowLeft,
  GripVertical,
  Trash2,
  Save,
  FolderOpen,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state';

interface TestCase {
  id: string;
  title: string;
  priority: string;
  status: string;
}

interface TestSuiteCase {
  id: string;
  order: number;
  testCase: TestCase;
}

interface TestSuite {
  id: string;
  name: string;
  description: string | null;
  testSuiteCases: TestSuiteCase[];
  project: {
    id: string;
    name: string;
  };
}

export default function TestSuiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const suiteId = params.id as string;

  const [suite, setSuite] = useState<TestSuite | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', description: '' });
  const [availableCases, setAvailableCases] = useState<TestCase[]>([]);
  const [addCaseOpen, setAddCaseOpen] = useState(false);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    fetchSuite();
  }, [suiteId]);

  const fetchSuite = async () => {
    try {
      const res = await fetch(`/api/test-suites/${suiteId}`);
      if (!res.ok) throw new Error('获取失败');
      const data = await res.json();
      setSuite(data);
      setEditData({ name: data.name, description: data.description || '' });
    } catch (error) {
      toast.error('获取测试套件详情失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCases = async () => {
    if (!suite) return;
    try {
      const res = await fetch(`/api/testcases?projectId=${suite.project.id}`);
      if (!res.ok) throw new Error('获取失败');
      const data = await res.json();
      // 过滤掉已在套件中的用例
      const existingIds = new Set(
        suite.testSuiteCases.map((tsc) => tsc.testCase.id)
      );
      setAvailableCases(data.filter((tc: TestCase) => !existingIds.has(tc.id)));
    } catch (error) {
      toast.error('获取可用用例失败');
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/test-suites/${suiteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (!res.ok) throw new Error('保存失败');

      toast.success('保存成功');
      setEditing(false);
      fetchSuite();
    } catch (error) {
      toast.error('保存失败');
    }
  };

  const handleAddCases = async (caseIds: string[]) => {
    try {
      const currentIds = suite?.testSuiteCases.map((tsc) => tsc.testCase.id) || [];
      const res = await fetch(`/api/test-suites/${suiteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCaseIds: [...currentIds, ...caseIds],
        }),
      });

      if (!res.ok) throw new Error('添加失败');

      toast.success('用例添加成功');
      setAddCaseOpen(false);
      fetchSuite();
    } catch (error) {
      toast.error('添加用例失败');
    }
  };

  const handleRemoveCase = async (testCaseId: string) => {
    try {
      const currentIds = suite?.testSuiteCases.map((tsc) => tsc.testCase.id) || [];
      const res = await fetch(`/api/test-suites/${suiteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCaseIds: currentIds.filter((id) => id !== testCaseId),
        }),
      });

      if (!res.ok) throw new Error('移除失败');

      toast.success('用例已移除');
      fetchSuite();
    } catch (error) {
      toast.error('移除用例失败');
    }
  };

  const handleExecute = async () => {
    setExecuting(true);
    try {
      const res = await fetch(`/api/test-suites/${suiteId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headless: true }),
      });

      if (!res.ok) throw new Error('执行失败');

      const data = await res.json();
      toast.success('测试套件开始执行');
      router.push('/executions');
    } catch (error) {
      toast.error('执行测试套件失败');
    } finally {
      setExecuting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      P0: 'bg-red-100 text-red-700',
      P1: 'bg-orange-100 text-orange-700',
      P2: 'bg-yellow-100 text-yellow-700',
      P3: 'bg-blue-100 text-blue-700',
    };
    return colors[priority] || 'bg-slate-100 text-slate-700';
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (!suite) {
    return (
      <div className="p-6">
        <EmptyState icon={FolderOpen} title="测试套件不存在" description="请返回列表查看其他套件" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            {editing ? (
              <Input
                value={editData.name}
                onChange={(e) =>
                  setEditData({ ...editData, name: e.target.value })
                }
                className="text-xl font-bold h-auto py-1"
              />
            ) : (
              <h1 className="text-2xl font-bold">{suite.name}</h1>
            )}
            <p className="text-slate-500 text-sm">{suite.project.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>
                取消
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                保存
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                编辑
              </Button>
              <Button onClick={handleExecute} disabled={executing}>
                <Play className="mr-2 h-4 w-4" />
                {executing ? '执行中...' : '执行套件'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">描述</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <Textarea
              value={editData.description}
              onChange={(e) =>
                setEditData({ ...editData, description: e.target.value })
              }
              placeholder="描述这个测试套件的用途..."
            />
          ) : (
            <p className="text-slate-600">
              {suite.description || '暂无描述'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Test Cases */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            测试用例 ({suite.testSuiteCases.length})
          </CardTitle>
          <Dialog open={addCaseOpen} onOpenChange={setAddCaseOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchAvailableCases();
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                添加用例
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>添加测试用例</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 py-4">
                {availableCases.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    暂无可添加的用例
                  </p>
                ) : (
                  availableCases.map((tc) => (
                    <div
                      key={tc.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer"
                      onClick={() => handleAddCases([tc.id])}
                    >
                      <div>
                        <p className="font-medium">{tc.title}</p>
                        <Badge
                          variant="secondary"
                          className={getPriorityColor(tc.priority)}
                        >
                          {tc.priority}
                        </Badge>
                      </div>
                      <Plus className="h-4 w-4 text-slate-400" />
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {suite.testSuiteCases.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="暂无测试用例"
              description='点击"添加用例"按钮向套件中添加测试用例'
            />
          ) : (
            <div className="space-y-2">
              {suite.testSuiteCases.map((tsc, index) => (
                <div
                  key={tsc.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 group"
                >
                  <GripVertical className="h-5 w-5 text-slate-400 cursor-move" />
                  <span className="text-slate-400 w-6 text-center">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{tsc.testCase.title}</p>
                    <Badge
                      variant="secondary"
                      className={getPriorityColor(tsc.testCase.priority)}
                    >
                      {tsc.testCase.priority}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100"
                    onClick={() => handleRemoveCase(tsc.testCase.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
