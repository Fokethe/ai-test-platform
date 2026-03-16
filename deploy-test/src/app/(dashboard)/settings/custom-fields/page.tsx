/**
 * Custom Fields Settings Page
 * 自定义字段设置页面
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Plus, Settings, Trash2, Edit, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import { swrFetcher as fetcher } from '@/lib/utils/fetcher';

const FIELD_TYPES = [
  { value: 'text', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'date', label: '日期' },
  { value: 'select', label: '下拉选择' },
  { value: 'multiselect', label: '多选' },
  { value: 'boolean', label: '布尔值' },
];

const APPLIES_TO = [
  { value: 'test', label: '测试用例' },
  { value: 'requirement', label: '需求' },
  { value: 'issue', label: '问题' },
  { value: 'run', label: '执行' },
];

export default function CustomFieldsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    type: 'text',
    appliesTo: 'test',
    required: false,
    description: '',
  });

  // 获取自定义字段列表
  const { data: fieldsData, mutate } = useSWR('/api/custom-fields', fetcher);
  const fields = Array.isArray(fieldsData?.data) ? fieldsData.data : [];

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('创建失败');

      toast.success('自定义字段创建成功');
      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        label: '',
        type: 'text',
        appliesTo: 'test',
        required: false,
        description: '',
      });
      mutate();
    } catch (error) {
      toast.error('创建失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/custom-fields/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('删除失败');

      toast.success('自定义字段已删除');
      mutate();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const getTypeLabel = (type: string) => {
    return FIELD_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getAppliesToLabel = (appliesTo: string) => {
    return APPLIES_TO.find((a) => a.value === appliesTo)?.label || appliesTo;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">自定义字段</h1>
          <p className="text-slate-500">管理测试用例、需求等实体的自定义字段</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新建字段
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>新建自定义字段</DialogTitle>
              <DialogDescription>添加一个新的自定义字段到系统中</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">字段名称（英文）</Label>
                <Input
                  id="name"
                  placeholder="如: priority_level"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">显示名称</Label>
                <Input
                  id="label"
                  placeholder="如: 优先级级别"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">字段类型</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="appliesTo">应用于</Label>
                <Select
                  value={formData.appliesTo}
                  onValueChange={(value) => setFormData({ ...formData, appliesTo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLIES_TO.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">描述（可选）</Label>
                <Input
                  id="description"
                  placeholder="字段的用途说明"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreate}>创建</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Fields List */}
      <div className="space-y-4">
        {fields.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Settings className="mx-auto h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500">暂无自定义字段</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                创建第一个字段
              </Button>
            </CardContent>
          </Card>
        ) : (
          fields.map((field: any) => (
            <Card key={field.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <GripVertical className="w-5 h-5 text-slate-400 mt-1" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{field.label}</h3>
                        <Badge variant="outline">{field.name}</Badge>
                        {field.required && <Badge>必填</Badge>}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>类型: {getTypeLabel(field.type)}</span>
                        <span>•</span>
                        <span>应用于: {getAppliesToLabel(field.appliesTo)}</span>
                      </div>
                      {field.description && (
                        <p className="text-sm text-slate-400 mt-1">{field.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingField(field)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(field.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}