'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import {
  AlertTriangle,
  CheckSquare,
  ChevronLeft,
  Download,
  Loader2,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { safeFetcher } from '@/lib/utils/fetcher';

type RequirementOption = {
  id: string;
  title: string;
  testPoints?: Array<{
    id: string;
    name: string;
  }>;
};

type GeneratedTestCase = {
  id: string;
  title: string;
  precondition: string;
  steps: string[];
  expectedResult: string;
  priority: string;
  module: string;
};

type RawCase = {
  id?: string;
  title?: string;
  name?: string;
  precondition?: string;
  expectedResult?: string;
  priority?: string;
  relatedFeature?: string;
  module?: string;
  steps?: unknown;
};

const MODEL_OPTIONS = [
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet' },
  { id: 'kimi-k2.5', name: 'Kimi K2.5' },
];

function normalizeSteps(steps: unknown): string[] {
  if (Array.isArray(steps)) {
    return steps
      .map((step) => (typeof step === 'string' ? step.trim() : ''))
      .filter(Boolean);
  }
  if (typeof steps === 'string' && steps.trim()) {
    try {
      return normalizeSteps(JSON.parse(steps));
    } catch {
      return steps
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function normalizeCase(raw: RawCase, index: number): GeneratedTestCase {
  return {
    id: raw.id || `generated-${index + 1}`,
    title: (raw.title || raw.name || `测试用例 ${index + 1}`).trim(),
    precondition: (raw.precondition || '').trim(),
    steps: normalizeSteps(raw.steps),
    expectedResult: (raw.expectedResult || '').trim(),
    priority: (raw.priority || 'MEDIUM').trim(),
    module: (raw.module || raw.relatedFeature || '通用模块').trim(),
  };
}

function parseGeneratedCases(payload: unknown): GeneratedTestCase[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const root = payload as Record<string, unknown>;
  const primary = root.data as Record<string, unknown> | undefined;

  let rawList: unknown = undefined;
  if (Array.isArray(primary?.testCases)) {
    rawList = primary?.testCases;
  } else if (Array.isArray((primary?.data as Record<string, unknown> | undefined)?.testCases)) {
    rawList = (primary?.data as Record<string, unknown>).testCases;
  } else if (Array.isArray(root.testCases)) {
    rawList = root.testCases;
  } else if (Array.isArray(root.data)) {
    rawList = root.data;
  }

  if (!Array.isArray(rawList)) {
    return [];
  }

  return rawList
    .map((item, index) => normalizeCase((item || {}) as RawCase, index))
    .filter((item) => item.title.trim().length > 0);
}

export default function TestCasesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requirementId = searchParams.get('requirementId') || '';
  const testPointId = searchParams.get('testPointId') || '';
  const modelId = searchParams.get('modelId') || MODEL_OPTIONS[0].id;

  const [cases, setCases] = useState<GeneratedTestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectRequirementId, setSelectRequirementId] = useState('');
  const [selectTestPointId, setSelectTestPointId] = useState('');

  const { data: requirementsPayload } = useSWR('/api/requirements?page=1&pageSize=100', safeFetcher, {
    revalidateOnFocus: false,
  });

  const requirements: RequirementOption[] = Array.isArray(requirementsPayload?.data?.list)
    ? requirementsPayload.data.list
    : [];

  const selectedRequirement = useMemo(
    () => requirements.find((item) => item.id === selectRequirementId),
    [requirements, selectRequirementId]
  );

  const selectedTestPoints = selectedRequirement?.testPoints || [];

  useEffect(() => {
    if (requirementId) {
      setSelectRequirementId(requirementId);
    }
    if (testPointId) {
      setSelectTestPointId(testPointId);
    }
  }, [requirementId, testPointId]);

  useEffect(() => {
    if (!requirementId || !testPointId) {
      return;
    }

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/requirements/${requirementId}/generate-testcases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testPointIds: [testPointId],
            modelId,
          }),
        });
        const payload = await response.json();
        if (payload.code !== 0) {
          throw new Error(payload.error?.message || payload.message || '生成失败');
        }
        const parsedCases = parseGeneratedCases(payload);
        setCases(parsedCases);
        setSelected(new Set(parsedCases.map((item) => item.id)));
      } catch (err) {
        setError(err instanceof Error ? err.message : '生成失败');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [requirementId, testPointId, modelId]);

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(cases.map((item) => item.id)));
    } else {
      setSelected(new Set());
    }
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const deleteSelected = () => {
    if (selected.size === 0) {
      return;
    }
    setCases((prev) => prev.filter((item) => !selected.has(item.id)));
    setSelected(new Set());
  };

  const continueGenerate = () => {
    if (!selectRequirementId || !selectTestPointId) {
      toast.error('请先选择需求与测试点');
      return;
    }

    const params = new URLSearchParams();
    params.set('requirementId', selectRequirementId);
    params.set('testPointId', selectTestPointId);
    params.set('modelId', modelId);
    router.push(`/ai-generate/testcases?${params.toString()}`);
  };

  const saveAll = async () => {
    if (!requirementId) {
      toast.error('缺少 requirementId，无法保存');
      return;
    }
    if (cases.length === 0) {
      toast.error('没有可保存的测试用例');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/testcases/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementId,
          testCases: cases.map((item) => ({
            title: item.title,
            precondition: item.precondition,
            steps: item.steps,
            expectedResult: item.expectedResult,
            priority: item.priority,
            module: item.module,
          })),
        }),
      });

      const payload = await response.json();
      if (payload.code !== 0) {
        throw new Error(payload.error?.message || payload.message || '保存失败');
      }

      const saved = payload.data?.saved ?? payload.data?.count ?? cases.length;
      toast.success(`保存成功，共 ${saved} 条`);
      router.push('/tests');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = async () => {
    if (cases.length === 0) {
      toast.error('没有可导出的测试用例');
      return;
    }

    setExporting(true);
    try {
      const response = await fetch('/api/testcases/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCases: cases.map((item) => ({
            id: item.id,
            title: item.title,
            precondition: item.precondition,
            expectedResult: item.expectedResult,
            steps: item.steps.map((step, index) => ({
              order: index + 1,
              action: step,
            })),
            priority: item.priority,
            module: item.module,
          })),
          moduleName: cases[0]?.module || '测试用例',
        }),
      });

      const payload = await response.json();
      if (payload.code !== 0) {
        throw new Error(payload.error?.message || payload.message || '导出失败');
      }

      const binary = atob(payload.data.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = payload.data.filename || 'test-cases.xlsx';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };

  if (!requirementId || !testPointId) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              缺少生成参数
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500">
              当前需要 `requirementId` 和 `testPointId` 才能生成用例。你可以在这里先选择后继续。
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>需求</Label>
                <Select
                  value={selectRequirementId}
                  onValueChange={(value) => {
                    setSelectRequirementId(value);
                    setSelectTestPointId('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择需求" />
                  </SelectTrigger>
                  <SelectContent>
                    {requirements.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>测试点</Label>
                <Select value={selectTestPointId} onValueChange={setSelectTestPointId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择测试点" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedTestPoints.map((point) => (
                      <SelectItem key={point.id} value={point.id}>
                        {point.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={continueGenerate}>
                <Sparkles className="w-4 h-4 mr-2" />
                继续生成
              </Button>
              <Button variant="outline" onClick={() => router.push('/ai-generate/requirements')}>
                去需求页选择
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" className="-ml-3" onClick={() => router.back()}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
          <h1 className="text-2xl font-bold">AI 生成测试用例</h1>
          <p className="text-sm text-slate-500 mt-1">
            需求 ID: {requirementId} · 测试点 ID: {testPointId}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportExcel} disabled={exporting || cases.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            {exporting ? '导出中...' : '导出 Excel'}
          </Button>
          <Button onClick={saveAll} disabled={saving || cases.length === 0}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? '保存中...' : '保存到用例库'}
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-red-600 text-sm">{error}</p>
            <Button variant="outline" className="mt-3" onClick={() => window.location.reload()}>
              重试
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!loading && !error ? (
        <Card>
          <CardContent className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={cases.length > 0 && selected.size === cases.length}
                  onCheckedChange={(checked) => toggleAll(Boolean(checked))}
                />
                <span className="text-sm text-slate-500">
                  已选 {selected.size} / {cases.length}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={deleteSelected}
                disabled={selected.size === 0}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                删除选中
              </Button>
            </div>

            <div className="space-y-3">
              {cases.map((item, index) => (
                <Card key={item.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selected.has(item.id)}
                        onCheckedChange={(checked) => toggleOne(item.id, Boolean(checked))}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          {index + 1}. {item.title}
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-1">
                          优先级: {item.priority} · 模块: {item.module}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">前置条件：</span>
                      {item.precondition || '-'}
                    </p>
                    <div className="text-sm">
                      <span className="font-medium">步骤：</span>
                      <ol className="list-decimal list-inside mt-1 space-y-1">
                        {item.steps.map((step, stepIndex) => (
                          <li key={`${item.id}-step-${stepIndex}`}>{step}</li>
                        ))}
                        {item.steps.length === 0 ? <li>-</li> : null}
                      </ol>
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">预期结果：</span>
                      {item.expectedResult || '-'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {cases.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">未生成到可用测试用例</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="fixed bottom-0 left-0 right-0 border-t bg-white px-6 py-3">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="text-sm text-slate-500">
            已选 {selected.size} 条，可保存 {cases.length} 条
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              取消
            </Button>
            <Button onClick={saveAll} disabled={saving || cases.length === 0}>
              <CheckSquare className="w-4 h-4 mr-2" />
              {saving ? '保存中...' : '确认保存'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

