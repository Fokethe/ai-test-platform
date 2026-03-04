/**
 * Requirement Confirmation Page - 需求确认页面
 * TDD Batch 5.6: 需求确认页面完整实现
 * 
 * 功能：
 * 1. 显示需求文档详情
 * 2. 显示AI解析出的测试点列表
 * 3. 支持编辑/删除/添加测试点
 * 4. 支持选择测试点生成用例
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  Edit2,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
  FileText,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface TestPoint {
  id: string;
  name: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
}

interface Requirement {
  id: string;
  title: string;
  content: string;
  fileName: string;
  fileType: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  testPoints: TestPoint[];
  features: string[];
  businessRules: string[];
  createdAt: string;
  updatedAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// 优先级配置
const PRIORITY_CONFIG = {
  P0: { label: 'P0 - 核心功能', color: 'bg-red-100 text-red-700 border-red-200' },
  P1: { label: 'P1 - 重要功能', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  P2: { label: 'P2 - 一般功能', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  P3: { label: 'P3 - 次要功能', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export default function RequirementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requirementId = params.id as string;

  const [selectedPointIds, setSelectedPointIds] = useState<Set<string>>(new Set());
  const [editingPoint, setEditingPoint] = useState<TestPoint | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'testpoints'>('overview');

  // 获取需求详情
  const { data, error, isLoading, mutate } = useSWR(
    requirementId ? `/api/requirements/${requirementId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const requirement: Requirement | null = data?.data || null;

  // 初始化选中状态
  useEffect(() => {
    if (requirement?.testPoints) {
      setSelectedPointIds(new Set(requirement.testPoints.map((p) => p.id)));
    }
  }, [requirement?.testPoints]);

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked && requirement?.testPoints) {
      setSelectedPointIds(new Set(requirement.testPoints.map((p) => p.id)));
    } else {
      setSelectedPointIds(new Set());
    }
  };

  // 选择单个测试点
  const handleSelectPoint = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedPointIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedPointIds(newSelected);
  };

  // 打开编辑对话框
  const handleEditClick = (point: TestPoint) => {
    setEditingPoint({ ...point });
    setIsEditDialogOpen(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingPoint || !requirement) return;

    try {
      const response = await fetch(`/api/requirements/${requirementId}/test-points/${editingPoint.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPoint),
      });

      if (!response.ok) throw new Error('保存失败');

      await mutate();
      setIsEditDialogOpen(false);
      setEditingPoint(null);
      toast.success('测试点已更新');
    } catch (err) {
      toast.error('保存失败');
    }
  };

  // 打开删除对话框
  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setIsDeleteDialogOpen(true);
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!deletingId || !requirement) return;

    try {
      const response = await fetch(
        `/api/requirements/${requirementId}/test-points/${deletingId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('删除失败');

      await mutate();
      setSelectedPointIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(deletingId);
        return newSet;
      });
      setIsDeleteDialogOpen(false);
      setDeletingId(null);
      toast.success('测试点已删除');
    } catch (err) {
      toast.error('删除失败');
    }
  };

  // 添加新测试点
  const handleAddPoint = async (point: Omit<TestPoint, 'id'>) => {
    if (!requirement) return;

    try {
      const response = await fetch(`/api/requirements/${requirementId}/test-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(point),
      });

      if (!response.ok) throw new Error('添加失败');

      const result = await response.json();
      await mutate();
      setSelectedPointIds((prev) => new Set([...prev, result.data.id]));
      setIsAddDialogOpen(false);
      toast.success('测试点已添加');
    } catch (err) {
      toast.error('添加失败');
    }
  };

  // 生成测试用例
  const handleGenerateTestCases = async () => {
    if (selectedPointIds.size === 0) {
      toast.error('请至少选择一个测试点');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(
        `/api/requirements/${requirementId}/generate-testcases`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testPointIds: Array.from(selectedPointIds),
          }),
        }
      );

      if (!response.ok) throw new Error('生成失败');

      const result = await response.json();
      toast.success(`已生成 ${result.data?.length || 0} 个测试用例`);
      
      // 跳转到测试用例预览页面
      router.push(
        `/ai-generate/testcases?requirementId=${requirementId}&testPointId=${Array.from(selectedPointIds)[0]}`
      );
    } catch (err) {
      toast.error('生成测试用例失败');
    } finally {
      setIsGenerating(false);
    }
  };

  // 获取状态显示
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { label: '解析完成', color: 'bg-green-100 text-green-700', icon: CheckCircle2 };
      case 'PROCESSING':
        return { label: '解析中', color: 'bg-yellow-100 text-yellow-700', icon: Loader2 };
      case 'FAILED':
        return { label: '解析失败', color: 'bg-red-100 text-red-700', icon: AlertTriangle };
      default:
        return { label: '待处理', color: 'bg-slate-100 text-slate-700', icon: Clock };
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (error || !requirement) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <p>加载需求详情失败</p>
            </div>
            <Button variant="outline" className="mt-4" onClick={() => mutate()}>
              重试
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(requirement.status);
  const StatusIcon = statusDisplay.icon;

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* 页面标题 */}
      <div className="mb-6">
        <Button variant="ghost" className="mb-4 -ml-4" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          返回
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{requirement.title}</h1>
            <p className="text-muted-foreground mt-1">查看和确认需求解析结果</p>
          </div>
          <Badge className={statusDisplay.color}>
            <StatusIcon className={`w-3 h-3 mr-1 ${requirement.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
            {statusDisplay.label}
          </Badge>
        </div>
      </div>

      {/* 标签切换 */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'outline'}
          onClick={() => setActiveTab('overview')}
        >
          <FileText className="h-4 w-4 mr-2" />
          需求概览
        </Button>
        <Button
          variant={activeTab === 'testpoints' ? 'default' : 'outline'}
          onClick={() => setActiveTab('testpoints')}
        >
          <Check className="h-4 w-4 mr-2" />
          测试点 ({requirement.testPoints?.length || 0})
        </Button>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* 需求信息卡片 */}
          <Card>
            <CardHeader>
              <CardTitle>需求信息</CardTitle>
              <CardDescription>原始需求文档信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">文件名</Label>
                  <p className="font-medium">{requirement.fileName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">文件类型</Label>
                  <p className="font-medium">{requirement.fileType}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">创建时间</Label>
                  <p className="font-medium">
                    {new Date(requirement.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">更新时间</Label>
                  <p className="font-medium">
                    {new Date(requirement.updatedAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
              <Separator />
              <div>
                <Label className="text-muted-foreground">需求内容</Label>
                <ScrollArea className="h-64 mt-2 border rounded-lg p-4 bg-slate-50">
                  <div className="whitespace-pre-wrap text-sm">{requirement.content}</div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          {/* 功能特性 */}
          {requirement.features && requirement.features.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>功能特性</CardTitle>
                <CardDescription>AI识别出的功能特性</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {requirement.features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="text-sm py-1 px-3">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 业务规则 */}
          {requirement.businessRules && requirement.businessRules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>业务规则</CardTitle>
                <CardDescription>AI识别出的业务规则</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {requirement.businessRules.map((rule, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* 测试点工具栏 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={
                    requirement.testPoints?.length > 0 &&
                    selectedPointIds.size === requirement.testPoints.length
                  }
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="text-sm cursor-pointer">
                  全选 ({selectedPointIds.size}/{requirement.testPoints?.length || 0})
                </Label>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                添加测试点
              </Button>
              <Button
                size="sm"
                onClick={handleGenerateTestCases}
                disabled={isGenerating || selectedPointIds.size === 0}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1" />
                    生成用例 ({selectedPointIds.size})
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 测试点列表 */}
          <div className="space-y-3">
            {requirement.testPoints?.map((point) => (
              <Card key={point.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedPointIds.has(point.id)}
                      onCheckedChange={(checked) =>
                        handleSelectPoint(point.id, checked as boolean)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{point.name}</h3>
                            <Badge
                              variant="outline"
                              className={PRIORITY_CONFIG[point.priority].color}
                            >
                              {PRIORITY_CONFIG[point.priority].label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {point.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(point)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteClick(point.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {(!requirement.testPoints || requirement.testPoints.length === 0) && (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">暂无测试点</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsAddDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    添加第一个测试点
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑测试点</DialogTitle>
          </DialogHeader>
          {editingPoint && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">测试点名称</Label>
                <Input
                  id="edit-name"
                  value={editingPoint.name}
                  onChange={(e) =>
                    setEditingPoint({ ...editingPoint, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-priority">优先级</Label>
                <Select
                  value={editingPoint.priority}
                  onValueChange={(value: 'P0' | 'P1' | 'P2' | 'P3') =>
                    setEditingPoint({ ...editingPoint, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">描述</Label>
                <Textarea
                  id="edit-description"
                  value={editingPoint.description}
                  onChange={(e) =>
                    setEditingPoint({ ...editingPoint, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit}>
              <Save className="h-4 w-4 mr-1" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加对话框 */}
      <AddTestPointDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddPoint}
      />

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="py-4">确定要删除这个测试点吗？此操作不可撤销。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 添加测试点对话框组件
function AddTestPointDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (point: Omit<TestPoint, 'id'>) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'P0' | 'P1' | 'P2' | 'P3'>('P1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim(), priority });
    // 重置表单
    setName('');
    setDescription('');
    setPriority('P1');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>添加测试点</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="add-name">
              测试点名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="add-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入测试点名称"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-priority">优先级</Label>
            <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-description">描述</Label>
            <Textarea
              id="add-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入测试点描述（可选）"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit">
              <Plus className="h-4 w-4 mr-1" />
              添加
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
