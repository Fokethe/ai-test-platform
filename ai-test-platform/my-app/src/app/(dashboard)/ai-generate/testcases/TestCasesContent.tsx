'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import {
  AlertTriangle,
  CheckSquare,
  ChevronLeft,
  ClipboardList,
  Download,
  Layers3,
  Loader2,
  Save,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { safeFetcher } from '@/lib/utils/fetcher';

type TestPointOption = {
  id: string;
  name: string;
  description?: string;
  priority?: string;
  relatedFeature?: string;
  order?: number;
};

type RequirementOption = {
  id: string;
  title: string;
  content?: string;
  isConfirmed?: boolean;
  testPointCount?: number;
  testPoints?: TestPointOption[];
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

type GenerationMeta = {
  generatedCount?: number;
  testPointCount?: number;
  rag?: {
    enabled?: boolean;
    similarCasesCount?: number;
  };
  model?: {
    id?: string;
    name?: string;
  };
};

type GenerationSelection = {
  requirementId: string;
  testPointIds: string[];
  modelId: string;
};

const MODEL_OPTIONS = [
  { id: 'gpt-5.3', name: 'GPT-5.3' },
  { id: 'gpt-5.4', name: 'GPT-5.4' },
  { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet' },
  { id: 'kimi-k2.5', name: 'Kimi K2.5' },
];

const DEFAULT_MODEL_ID = MODEL_OPTIONS[0].id;

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter((item) => item.trim().length > 0)));
}

export function resolveModelId(value: string | null | undefined) {
  return MODEL_OPTIONS.some((item) => item.id === value) ? String(value) : DEFAULT_MODEL_ID;
}

function parseDelimitedIds(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return uniqueStrings(
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

export function parseGenerationSelection(
  searchParams: Pick<ReadonlyURLSearchParams, 'get'>
): GenerationSelection {
  const requirementId = searchParams.get('requirementId')?.trim() || '';
  const legacyTestPointId = searchParams.get('testPointId')?.trim() || '';
  const testPointIds = uniqueStrings([
    ...parseDelimitedIds(searchParams.get('testPointIds')),
    legacyTestPointId,
  ]);

  return {
    requirementId,
    testPointIds,
    modelId: resolveModelId(searchParams.get('modelId')),
  };
}

export function buildGenerationQuery(selection: GenerationSelection) {
  const params = new URLSearchParams();

  if (selection.requirementId) {
    params.set('requirementId', selection.requirementId);
  }

  const normalizedIds = uniqueStrings(selection.testPointIds);
  if (normalizedIds.length > 0) {
    params.set('testPointIds', normalizedIds.join(','));
    params.set('testPointId', normalizedIds[0]);
  }

  params.set('modelId', resolveModelId(selection.modelId));

  return params;
}

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

  let rawList: unknown;
  if (Array.isArray(primary?.testCases)) {
    rawList = primary.testCases;
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
    .filter((item) => item.title.length > 0);
}

function getPriorityTone(priority?: string) {
  if (priority === 'P0' || priority === 'CRITICAL' || priority === 'HIGH') {
    return 'border-red-200 bg-red-50 text-red-700';
  }
  if (priority === 'P1' || priority === 'MEDIUM') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }
  if (priority === 'P2' || priority === 'LOW') {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function summarizeSelection(count: number) {
  if (count === 0) {
    return '未选择测试点';
  }
  if (count === 1) {
    return '已选择 1 个测试点';
  }
  return `已选择 ${count} 个测试点`;
}

export default function TestCasesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeSelection = useMemo(() => parseGenerationSelection(searchParams), [searchParams]);
  const routeSelectionKey = `${routeSelection.requirementId}|${routeSelection.testPointIds.join(',')}|${routeSelection.modelId}`;

  const [cases, setCases] = useState<GeneratedTestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
  const [selectedRequirementId, setSelectedRequirementId] = useState(routeSelection.requirementId);
  const [selectedTestPointIds, setSelectedTestPointIds] = useState<string[]>(routeSelection.testPointIds);
  const [selectedModelId, setSelectedModelId] = useState(routeSelection.modelId);
  const [generationMeta, setGenerationMeta] = useState<GenerationMeta | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const autoRunKeyRef = useRef('');

  const { data: requirementsPayload } = useSWR(
    '/api/requirements?page=1&pageSize=100',
    safeFetcher,
    { revalidateOnFocus: false }
  );

  const requirements = useMemo<RequirementOption[]>(
    () => (Array.isArray(requirementsPayload?.data?.list) ? requirementsPayload.data.list : []),
    [requirementsPayload]
  );

  useEffect(() => {
    if (routeSelection.requirementId) {
      setSelectedRequirementId(routeSelection.requirementId);
    }
    if (routeSelection.testPointIds.length > 0) {
      setSelectedTestPointIds(routeSelection.testPointIds);
    }
    if (searchParams.get('modelId')) {
      setSelectedModelId(routeSelection.modelId);
    }
  }, [routeSelection, searchParams]);

  useEffect(() => {
    if (selectedRequirementId && requirements.some((item) => item.id === selectedRequirementId)) {
      return;
    }

    if (requirements.length > 0) {
      setSelectedRequirementId(requirements[0].id);
    }
  }, [requirements, selectedRequirementId]);

  const selectedRequirement = useMemo(
    () => requirements.find((item) => item.id === selectedRequirementId),
    [requirements, selectedRequirementId]
  );

  const availableTestPoints = useMemo(
    () =>
      [...(selectedRequirement?.testPoints || [])].sort(
        (left, right) => (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER)
      ),
    [selectedRequirement]
  );

  const availableTestPointIdSet = useMemo(
    () => new Set(availableTestPoints.map((item) => item.id)),
    [availableTestPoints]
  );

  useEffect(() => {
    setSelectedTestPointIds((prev) => prev.filter((item) => availableTestPointIdSet.has(item)));
  }, [availableTestPointIdSet]);

  const selectedCases = useMemo(
    () => cases.filter((item) => selectedCaseIds.has(item.id)),
    [cases, selectedCaseIds]
  );

  const validRouteTestPointIds = useMemo(
    () => routeSelection.testPointIds.filter((item) => availableTestPointIdSet.has(item)),
    [availableTestPointIdSet, routeSelection.testPointIds]
  );

  const allTestPointsSelected =
    availableTestPoints.length > 0 && selectedTestPointIds.length === availableTestPoints.length;

  const allCasesSelected = cases.length > 0 && selectedCaseIds.size === cases.length;

  const runGeneration = useCallback(
    async (nextSelection: GenerationSelection, options: { updateUrl: boolean }) => {
      const requestKey = `${nextSelection.requirementId}|${nextSelection.testPointIds.join(',')}|${nextSelection.modelId}`;
      autoRunKeyRef.current = requestKey;

      if (options.updateUrl) {
        router.replace(`/ai-generate/testcases?${buildGenerationQuery(nextSelection).toString()}`);
      }

      setLoading(true);
      setError('');
      setHasGenerated(true);
      setCases([]);
      setSelectedCaseIds(new Set());
      setGenerationMeta(null);

      try {
        const response = await fetch(`/api/requirements/${nextSelection.requirementId}/generate-testcases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testPointIds: nextSelection.testPointIds,
            modelId: nextSelection.modelId,
          }),
        });
        const payload = await response.json();

        if (!response.ok || payload.code !== 0) {
          throw new Error(payload.error?.message || payload.message || '生成失败');
        }

        const parsedCases = parseGeneratedCases(payload);
        setCases(parsedCases);
        setSelectedCaseIds(new Set(parsedCases.map((item) => item.id)));
        setGenerationMeta((payload.data?.meta || null) as GenerationMeta | null);

        if (parsedCases.length === 0) {
          toast.error('生成完成，但没有返回可保存的测试用例');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '生成失败');
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (!routeSelection.requirementId || routeSelection.testPointIds.length === 0) {
      return;
    }
    if (selectedRequirementId !== routeSelection.requirementId) {
      return;
    }
    if (availableTestPoints.length === 0 || validRouteTestPointIds.length === 0) {
      return;
    }

    const requestKey = `${routeSelection.requirementId}|${validRouteTestPointIds.join(',')}|${routeSelection.modelId}`;
    if (autoRunKeyRef.current === requestKey) {
      return;
    }

    void runGeneration(
      {
        requirementId: routeSelection.requirementId,
        testPointIds: validRouteTestPointIds,
        modelId: routeSelection.modelId,
      },
      { updateUrl: false }
    );
  }, [
    availableTestPoints.length,
    routeSelection,
    routeSelectionKey,
    runGeneration,
    selectedRequirementId,
    validRouteTestPointIds,
  ]);

  const handleRequirementChange = (value: string) => {
    setSelectedRequirementId(value);
    setSelectedTestPointIds([]);
    setError('');
  };

  const toggleTestPoint = (id: string, checked: boolean) => {
    setSelectedTestPointIds((prev) => {
      if (checked) {
        return uniqueStrings([...prev, id]);
      }
      return prev.filter((item) => item !== id);
    });
  };

  const toggleAllTestPoints = () => {
    if (allTestPointsSelected) {
      setSelectedTestPointIds([]);
      return;
    }
    setSelectedTestPointIds(availableTestPoints.map((item) => item.id));
  };

  const toggleAllCases = (checked: boolean) => {
    if (checked) {
      setSelectedCaseIds(new Set(cases.map((item) => item.id)));
      return;
    }
    setSelectedCaseIds(new Set());
  };

  const toggleCase = (id: string, checked: boolean) => {
    setSelectedCaseIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!selectedRequirementId || selectedTestPointIds.length === 0) {
      toast.error('请先选择需求和至少一个测试点');
      return;
    }

    await runGeneration(
      {
        requirementId: selectedRequirementId,
        testPointIds: selectedTestPointIds,
        modelId: selectedModelId,
      },
      { updateUrl: true }
    );
  };

  const deleteSelected = () => {
    if (selectedCaseIds.size === 0) {
      return;
    }

    setCases((prev) => prev.filter((item) => !selectedCaseIds.has(item.id)));
    setSelectedCaseIds(new Set());
  };

  const saveAll = async () => {
    if (!selectedRequirementId) {
      toast.error('缺少 requirementId，无法保存');
      return;
    }
    if (selectedCases.length === 0) {
      toast.error('请先勾选要保存的测试用例');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/testcases/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementId: selectedRequirementId,
          testCases: selectedCases.map((item) => ({
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
      if (!response.ok || payload.code !== 0) {
        throw new Error(payload.error?.message || payload.message || '保存失败');
      }

      const saved = payload.data?.saved ?? payload.data?.count ?? selectedCases.length;
      toast.success(`保存成功，共 ${saved} 条`);
      router.push('/tests?tab=cases');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = async () => {
    if (selectedCases.length === 0) {
      toast.error('请先勾选要导出的测试用例');
      return;
    }

    setExporting(true);
    try {
      const response = await fetch('/api/testcases/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCases: selectedCases.map((item) => ({
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
          moduleName: selectedCases[0]?.module || '测试用例',
        }),
      });

      const payload = await response.json();
      if (!response.ok || payload.code !== 0) {
        throw new Error(payload.error?.message || payload.message || '导出失败');
      }

      const binary = atob(payload.data.data);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
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

  const selectedPointLabels = availableTestPoints
    .filter((item) => selectedTestPointIds.includes(item.id))
    .map((item) => item.name);

  return (
    <div className="space-y-6 pb-28">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Button variant="ghost" className="-ml-3 w-fit" onClick={() => router.back()}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            返回
          </Button>
          <div className="space-y-2">
            <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50">AI 用例生成工作台</Badge>
            <h1 className="text-3xl font-semibold tracking-tight">直接选需求与测试点，然后生成</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-500">
              这里把选择、生成、筛选、保存放在同一页里，不再要求你先跳去需求详情页再回来。
            </p>
          </div>
        </div>

        <Card className="border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 shadow-sm lg:w-[360px]">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-[var(--electric)]" />
                <span className="text-sm font-medium text-slate-700">当前生成配置</span>
              </div>
              <Badge variant="outline" className="border-blue-200 bg-white text-blue-700">
                {MODEL_OPTIONS.find((item) => item.id === selectedModelId)?.name || selectedModelId}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/70 bg-white/80 p-3">
                <p className="text-xs text-slate-500">需求</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {selectedRequirement ? 1 : 0}
                </p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-3">
                <p className="text-xs text-slate-500">测试点</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {selectedTestPointIds.length}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-blue-200 bg-white/70 p-3 text-sm text-slate-600">
              {selectedRequirement ? (
                <div className="space-y-2">
                  <p className="font-medium text-slate-900">{selectedRequirement.title}</p>
                  <p>{summarizeSelection(selectedTestPointIds.length)}</p>
                </div>
              ) : (
                <p>先选择一个需求，右侧会自动显示对应测试点。</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px,minmax(0,1fr)]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers3 className="h-5 w-5 text-[var(--electric)]" />
              生成范围
            </CardTitle>
            <CardDescription>先选需求，再勾选本次要覆盖的测试点。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>需求</Label>
              <Select value={selectedRequirementId} onValueChange={handleRequirementChange}>
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
              <Label>模型</Label>
              <Select value={selectedModelId} onValueChange={(value) => setSelectedModelId(resolveModelId(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {selectedRequirement ? (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{selectedRequirement.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedRequirement.testPointCount ?? availableTestPoints.length} 个测试点可选
                    </p>
                  </div>
                  {selectedRequirement.isConfirmed ? (
                    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">已确认</Badge>
                  ) : (
                    <Badge variant="secondary">待确认</Badge>
                  )}
                </div>
                {selectedRequirement.content ? (
                  <p className="line-clamp-4 text-sm leading-6 text-slate-600">
                    {selectedRequirement.content}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500">
                当前没有可用需求，请先去需求页上传或整理需求。
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void handleGenerate()} disabled={loading || !selectedRequirementId}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    生成测试用例
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => router.push('/ai-generate/requirements')}>
                去需求页管理
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClipboardList className="h-5 w-5 text-[var(--electric)]" />
                  测试点选择
                </CardTitle>
                <CardDescription>
                  选择一个或多个测试点，生成页会一次性处理，不再只吃第一个 ID。
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                  {summarizeSelection(selectedTestPointIds.length)}
                </Badge>
                {availableTestPoints.length > 0 ? (
                  <Button variant="outline" size="sm" onClick={toggleAllTestPoints}>
                    {allTestPointsSelected ? '取消全选' : '全选测试点'}
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableTestPoints.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center">
                <p className="text-sm text-slate-500">当前需求还没有测试点，先去需求页补充后再生成。</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {availableTestPoints.map((point) => {
                  const checked = selectedTestPointIds.includes(point.id);

                  return (
                    <button
                      key={point.id}
                      type="button"
                      onClick={() => toggleTestPoint(point.id, !checked)}
                      className={`rounded-3xl border p-4 text-left transition-all ${
                        checked
                          ? 'border-blue-300 bg-blue-50/80 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => toggleTestPoint(point.id, Boolean(value))}
                          className="mt-1"
                        />
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-slate-900">{point.name}</p>
                              {point.priority ? (
                                <Badge variant="outline" className={getPriorityTone(point.priority)}>
                                  {point.priority}
                                </Badge>
                              ) : null}
                              {point.relatedFeature ? (
                                <Badge variant="secondary">{point.relatedFeature}</Badge>
                              ) : null}
                            </div>
                            <p className="text-sm leading-6 text-slate-500">
                              {point.description || '未补充测试点描述'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50/70">
          <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
              <div>
                <p className="font-medium text-red-700">生成失败</p>
                <p className="mt-1 text-sm text-red-600">{error}</p>
              </div>
            </div>
            <Button variant="outline" className="border-red-200 bg-white" onClick={() => void handleGenerate()}>
              重新生成
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-lg">生成结果</CardTitle>
              <CardDescription>
                这里会保留本次生成结果，你可以删减后再保存到测试中心。
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {generationMeta?.model?.name ? (
                <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                  {generationMeta.model.name}
                </Badge>
              ) : null}
              {generationMeta?.testPointCount ? (
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                  覆盖 {generationMeta.testPointCount} 个测试点
                </Badge>
              ) : null}
              {generationMeta?.rag?.enabled ? (
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  RAG 已开启
                </Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900">
                {selectedRequirement?.title || '尚未选择需求'}
              </p>
              <p className="text-sm text-slate-500">
                {selectedPointLabels.length > 0
                  ? `已覆盖：${selectedPointLabels.slice(0, 4).join('、')}${selectedPointLabels.length > 4 ? '...' : ''}`
                  : '选择测试点后即可开始生成'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportExcel} disabled={exporting || selectedCases.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                {exporting ? '导出中...' : '导出所选'}
              </Button>
              <Button onClick={saveAll} disabled={saving || selectedCases.length === 0}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? '保存中...' : '保存所选'}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
              <Loader2 className="mb-4 h-8 w-8 animate-spin text-[var(--electric)]" />
              <p className="font-medium text-slate-900">AI 正在整理用例</p>
              <p className="mt-2 text-sm text-slate-500">这一步会根据所选测试点批量生成测试步骤和预期结果。</p>
            </div>
          ) : null}

          {!loading && cases.length > 0 ? (
            <>
              <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={allCasesSelected}
                    onCheckedChange={(value) => toggleAllCases(Boolean(value))}
                  />
                  <span className="text-sm text-slate-600">
                    已勾选 {selectedCaseIds.size} / {cases.length}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deleteSelected}
                  disabled={selectedCaseIds.size === 0}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  删除勾选项
                </Button>
              </div>

              <div className="space-y-4">
                {cases.map((item, index) => (
                  <Card key={item.id} className="overflow-hidden border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedCaseIds.has(item.id)}
                          onCheckedChange={(value) => toggleCase(item.id, Boolean(value))}
                          className="mt-1"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-base">
                              {index + 1}. {item.title}
                            </CardTitle>
                            <Badge variant="outline" className={getPriorityTone(item.priority)}>
                              {item.priority}
                            </Badge>
                            <Badge variant="secondary">{item.module}</Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">前置条件</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {item.precondition || '-'}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">测试步骤</p>
                        <ol className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                          {item.steps.length > 0 ? (
                            item.steps.map((step, stepIndex) => (
                              <li key={`${item.id}-step-${stepIndex}`} className="flex gap-2">
                                <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white text-xs text-slate-500 shadow-sm">
                                  {stepIndex + 1}
                                </span>
                                <span>{step}</span>
                              </li>
                            ))
                          ) : (
                            <li>-</li>
                          )}
                        </ol>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">预期结果</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {item.expectedResult || '-'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : null}

          {!loading && hasGenerated && cases.length === 0 && !error ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center">
              <p className="font-medium text-slate-900">本次没有生成出可用用例</p>
              <p className="mt-2 text-sm text-slate-500">
                可以换一组测试点或模型后再试，页面会保留你的选择。
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            已勾选 {selectedCaseIds.size} 条，可保存 {selectedCases.length} 条
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportExcel} disabled={exporting || selectedCases.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              导出所选
            </Button>
            <Button onClick={saveAll} disabled={saving || selectedCases.length === 0}>
              <CheckSquare className="mr-2 h-4 w-4" />
              {saving ? '保存中...' : '确认保存'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
