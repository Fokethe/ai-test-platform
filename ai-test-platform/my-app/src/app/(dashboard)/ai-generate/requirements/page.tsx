/**
 * 需求测试点确认页面
 * TDD 第 5 轮：前端 UI 页面
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, CheckSquare, AlertCircle, Plus, Trash2, Edit2, ArrowRight } from 'lucide-react';

interface TestPoint {
  id: string;
  name: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  relatedFeature: string;
}

interface BusinessRule {
  type: string;
  description: string;
  value?: string;
}

interface Requirement {
  id: string;
  title: string;
  type: string;
  filename: string;
  content: string;
  features: string[];
  businessRules: BusinessRule[];
  testPoints: TestPoint[];
  projectId: string;
  createdAt: string;
}

export default function RequirementReviewPage() {
  const params = useParams();
  const requirementId = params.id as string;

  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<Set<string>>(new Set());
  const [editingPoint, setEditingPoint] = useState<TestPoint | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingPointId, setDeletingPointId] = useState<string | null>(null);
  const [newPoint, setNewPoint] = useState<Partial<TestPoint>>({
    priority: 'P1',
  });

  // 加载需求数据
  useEffect(() => {
    const fetchRequirement = async () => {
      try {
        const response = await fetch(`/api/requirements/${requirementId}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || '加载失败');
        }

        setRequirement(result.data);
        // 默认全选
        setSelectedPoints(new Set(result.data.testPoints.map((p: TestPoint) => p.id)));
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchRequirement();
  }, [requirementId]);

  // 选择/取消选择测试点
  const togglePoint = (pointId: string) => {
    const newSelected = new Set(selectedPoints);
    if (newSelected.has(pointId)) {
      newSelected.delete(pointId);
    } else {
      newSelected.add(pointId);
    }
    setSelectedPoints(newSelected);
  };

  // 全选
  const selectAll = () => {
    if (requirement) {
      setSelectedPoints(new Set(requirement.testPoints.map((p) => p.id)));
    }
  };

  // 全不选
  const deselectAll = () => {
    setSelectedPoints(new Set());
  };

  // 编辑测试点
  const handleEdit = (point: TestPoint) => {
    setEditingPoint({ ...point });
    setIsEditDialogOpen(true);
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (editingPoint && requirement) {
      const updatedPoints = requirement.testPoints.map((p) =>
        p.id === editingPoint.id ? editingPoint : p
      );
      setRequirement({ ...requirement, testPoints: updatedPoints });
      setIsEditDialogOpen(false);
      setEditingPoint(null);
    }
  };

  // 删除测试点
  const handleDelete = (pointId: string) => {
    setDeletingPointId(pointId);
    setIsDeleteDialogOpen(true);
  };

  // 确认删除
  const confirmDelete = () => {
    if (deletingPointId && requirement) {
      const updatedPoints = requirement.testPoints.filter((p) => p.id !== deletingPointId);
      setRequirement({ ...requirement, testPoints: updatedPoints });
      setSelectedPoints((prev) => {
        const newSet = new Set(prev);
        newSet.delete(deletingPointId);
        return newSet;
      });
      setIsDeleteDialogOpen(false);
      setDeletingPointId(null);
    }
  };

  // 添加测试点
  const handleAdd = () => {
    if (newPoint.name && requirement) {
      const point: TestPoint = {
        id: `TP-${Date.now()}`,
        name: newPoint.name,
        description: newPoint.description || '',
        priority: (newPoint.priority as 'P0' | 'P1' | 'P2' | 'P3') || 'P1',
        relatedFeature: newPoint.relatedFeature || requirement.features[0] || '',
      };
      setRequirement({
        ...requirement,
        testPoints: [...requirement.testPoints, point],
      });
      setSelectedPoints((prev) => new Set([...prev, point.id]));
      setNewPoint({ priority: 'P1' });
      setIsAddDialogOpen(false);
    }
  };

  // 生成用例
  const handleGenerate = () => {
    const selectedTestPoints = requirement?.testPoints.filter((p) => selectedPoints.has(p.id));
    console.log('生成用例:', selectedTestPoints);
    // TODO: 跳转到用例生成页面
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P0':
        return 'bg-red-100 text-red-800';
      case 'P1':
        return 'bg-orange-100 text-orange-800';
      case 'P2':
        return 'bg-yellow-100 text-yellow-800';
      case 'P3':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            加载中...
          </div>
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!requirement) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertDescription>未找到需求</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* 标题区域 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{requirement.title}</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            {requirement.filename}
          </span>
          <Badge variant="secondary">{requirement.type}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：需求信息 */}
        <div className="space-y-6">
          {/* 功能点 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">功能点</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {requirement.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* 业务规则 */}
          {requirement.businessRules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">业务规则</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {requirement.businessRules.map((rule, index) => (
                    <li key={index} className="text-sm">
                      <Badge variant="outline" className="mr-2">
                        {rule.type}
                      </Badge>
                      {rule.description}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：测试点列表 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                测试点
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (已选择 {selectedPoints.size}/{requirement.testPoints.length})
                </span>
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  全选
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  全不选
                </Button>
                <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  添加测试点
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {requirement.testPoints.map((point) => (
                  <div
                    key={point.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={selectedPoints.has(point.id)}
                      onCheckedChange={() => togglePoint(point.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{point.name}</span>
                        <Badge className={getPriorityColor(point.priority)}>
                          {point.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {point.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        关联功能: {point.relatedFeature}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(point)}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(point.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1 text-red-500" />
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 生成用例按钮 */}
              <div className="mt-6 flex justify-end">
                <Button
                  size="lg"
                  onClick={handleGenerate}
                  disabled={selectedPoints.size === 0}
                >
                  生成测试用例
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑测试点</DialogTitle>
          </DialogHeader>
          {editingPoint && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">测试点名称</label>
                <Input
                  value={editingPoint.name}
                  onChange={(e) =>
                    setEditingPoint({ ...editingPoint, name: e.target.value })
                  }
                  placeholder="测试点名称"
                />
              </div>
              <div>
                <label className="text-sm font-medium">描述</label>
                <Textarea
                  value={editingPoint.description}
                  onChange={(e) =>
                    setEditingPoint({ ...editingPoint, description: e.target.value })
                  }
                  placeholder="描述"
                />
              </div>
              <div>
                <label className="text-sm font-medium">优先级</label>
                <Select
                  value={editingPoint.priority}
                  onValueChange={(value) =>
                    setEditingPoint({
                      ...editingPoint,
                      priority: value as 'P0' | 'P1' | 'P2' | 'P3',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P0">P0 - 核心</SelectItem>
                    <SelectItem value="P1">P1 - 重要</SelectItem>
                    <SelectItem value="P2">P2 - 一般</SelectItem>
                    <SelectItem value="P3">P3 - 次要</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加测试点</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">测试点名称</label>
              <Input
                value={newPoint.name || ''}
                onChange={(e) => setNewPoint({ ...newPoint, name: e.target.value })}
                placeholder="测试点名称"
              />
            </div>
            <div>
              <label className="text-sm font-medium">描述</label>
              <Textarea
                value={newPoint.description || ''}
                onChange={(e) =>
                  setNewPoint({ ...newPoint, description: e.target.value })
                }
                placeholder="描述"
              />
            </div>
            <div>
              <label className="text-sm font-medium">优先级</label>
              <Select
                value={newPoint.priority}
                onValueChange={(value) =>
                  setNewPoint({ ...newPoint, priority: value as 'P0' | 'P1' | 'P2' | 'P3' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P0">P0 - 核心</SelectItem>
                  <SelectItem value="P1">P1 - 重要</SelectItem>
                  <SelectItem value="P2">P2 - 一般</SelectItem>
                  <SelectItem value="P3">P3 - 次要</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAdd}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p>确定要删除这个测试点吗？此操作不可撤销。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
