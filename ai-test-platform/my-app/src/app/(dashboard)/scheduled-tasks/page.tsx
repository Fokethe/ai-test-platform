'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Play,
  Pause,
  Edit2,
  Trash2,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  RefreshCw,
  Bell,
  TestTube,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ListSkeleton } from '@/components/ui/skeleton-list';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface ScheduledTask {
  id: string;
  name: string;
  description: string | null;
  cron: string;
  testCaseIds: string[];
  config: any;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  notifications: any;
  createdAt: string;
  updatedAt: string;
}

export default function ScheduledTasksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cron: '0 9 * * *',
    testCaseIds: [] as string[],
    isActive: true,
    emailNotify: true,
  });

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTasks();
    }
  }, [status]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scheduled-tasks');
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      setTasks(data.data);
    } catch (error) {
      toast.error('获取定时任务失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const url = editingTask
        ? `/api/scheduled-tasks/${editingTask.id}`
        : '/api/scheduled-tasks';
      const method = editingTask ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          cron: formData.cron,
          testCaseIds: formData.testCaseIds,
          isActive: formData.isActive,
          notifications: formData.emailNotify
            ? { email: true, webhook: false }
            : null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save task');
      }

      toast.success(editingTask ? '任务已更新' : '任务已创建');
      setDialogOpen(false);
      resetForm();
      fetchTasks();
    } catch (error: any) {
      toast.error(error.message || '保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个定时任务吗？')) return;

    try {
      const res = await fetch(`/api/scheduled-tasks/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete task');

      toast.success('任务已删除');
      fetchTasks();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`/api/scheduled-tasks/${id}/toggle`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to toggle task');

      const data = await res.json();
      toast.success(data.data.isActive ? '任务已启用' : '任务已暂停');
      fetchTasks();
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const handleExecute = async (id: string) => {
    try {
      const res = await fetch(`/api/scheduled-tasks/${id}/execute`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to execute task');

      const data = await res.json();
      toast.success('任务已开始执行');
      router.push(`/executions`);
    } catch (error) {
      toast.error('执行失败');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      cron: '0 9 * * *',
      testCaseIds: [],
      isActive: true,
      emailNotify: true,
    });
    setEditingTask(null);
  };

  const openEditDialog = (task: ScheduledTask) => {
    setEditingTask(task);
    setFormData({
      name: task.name,
      description: task.description || '',
      cron: task.cron,
      testCaseIds: task.testCaseIds,
      isActive: task.isActive,
      emailNotify: task.notifications?.email || false,
    });
    setDialogOpen(true);
  };

  const formatCron = (cron: string) => {
    const patterns: Record<string, string> = {
      '0 9 * * *': '每天 9:00',
      '0 0 * * *': '每天 0:00',
      '0 */6 * * *': '每 6 小时',
      '0 0 * * 1': '每周一 0:00',
      '0 0 1 * *': '每月 1 日 0:00',
    };
    return patterns[cron] || cron;
  };

  if (status === 'loading') {
    return <ListSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">定时任务</h1>
          <p className="text-muted-foreground mt-1">
            设置自动化测试的定时执行计划
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          新建任务
        </Button>
      </div>

      {/* 任务列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>任务列表</span>
            <span className="text-sm font-normal text-muted-foreground">
              共 {tasks.length} 个任务
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ListSkeleton />
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-full ${
                        task.isActive
                          ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      }`}
                    >
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{task.name}</h3>
                        {task.isActive ? (
                          <Badge className="bg-green-500">运行中</Badge>
                        ) : (
                          <Badge variant="secondary">已暂停</Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatCron(task.cron)}
                        </span>
                        <span className="flex items-center gap-1">
                          <TestTube className="h-3 w-3" />
                          {task.testCaseIds.length} 个用例
                        </span>
                        {task.notifications?.email && (
                          <span className="flex items-center gap-1">
                            <Bell className="h-3 w-3" />
                            邮件通知
                          </span>
                        )}
                        {task.lastRunAt && (
                          <span>
                            上次执行:{' '}
                            {new Date(task.lastRunAt).toLocaleString('zh-CN')}
                          </span>
                        )}
                        {task.nextRunAt && task.isActive && (
                          <span>
                            下次执行:{' '}
                            {new Date(task.nextRunAt).toLocaleString('zh-CN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleExecute(task.id)}
                      title="立即执行"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggle(task.id)}
                      title={task.isActive ? '暂停' : '启用'}
                    >
                      {task.isActive ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(task)}
                      title="编辑"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(task.id)}
                      className="text-red-600 hover:text-red-700"
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {tasks.length === 0 && (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">暂无定时任务</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    创建第一个任务
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cron 表达式参考 */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">Cron 表达式参考</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <code className="bg-muted px-2 py-1 rounded">0 9 * * *</code>
              <p className="text-muted-foreground mt-1">每天 9:00</p>
            </div>
            <div>
              <code className="bg-muted px-2 py-1 rounded">0 */6 * * *</code>
              <p className="text-muted-foreground mt-1">每 6 小时</p>
            </div>
            <div>
              <code className="bg-muted px-2 py-1 rounded">0 0 * * 1</code>
              <p className="text-muted-foreground mt-1">每周一 0:00</p>
            </div>
            <div>
              <code className="bg-muted px-2 py-1 rounded">0 0 1 * *</code>
              <p className="text-muted-foreground mt-1">每月 1 日</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 创建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? '编辑定时任务' : '新建定时任务'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>任务名称</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="例如：每日回归测试"
              />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="任务描述（可选）"
              />
            </div>
            <div className="space-y-2">
              <Label>Cron 表达式</Label>
              <Input
                value={formData.cron}
                onChange={(e) =>
                  setFormData({ ...formData, cron: e.target.value })
                }
                placeholder="0 9 * * *"
              />
              <p className="text-xs text-muted-foreground">
                格式：分 时 日 月 周
              </p>
            </div>
            <div className="space-y-2">
              <Label>测试用例 ID（用逗号分隔）</Label>
              <Input
                value={formData.testCaseIds.join(', ')}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    testCaseIds: e.target.value
                      .split(',')
                      .map((id) => id.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="例如：abc123, def456"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label>立即启用</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.emailNotify}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, emailNotify: checked })
                  }
                />
                <Label>邮件通知</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {editingTask ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
