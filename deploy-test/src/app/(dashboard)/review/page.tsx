/**
 * Review Queue Page
 * 审核队列页面
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';

interface ReviewItem {
  id: string;
  type: 'testcase' | 'requirement' | 'report';
  title: string;
  submittedBy: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'high' | 'medium' | 'low';
}

const mockItems: ReviewItem[] = [
  {
    id: '1',
    type: 'testcase',
    title: '用户登录功能测试用例',
    submittedBy: '张三',
    submittedAt: '2026-03-11',
    status: 'pending',
    priority: 'high',
  },
  {
    id: '2',
    type: 'requirement',
    title: '订单管理模块需求文档',
    submittedBy: '李四',
    submittedAt: '2026-03-10',
    status: 'pending',
    priority: 'medium',
  },
];

const typeLabels: Record<string, string> = {
  testcase: '测试用例',
  requirement: '需求文档',
  report: '测试报告',
};

const statusConfig = {
  pending: { label: '待审核', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '已通过', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  rejected: { label: '已拒绝', icon: XCircle, color: 'bg-red-100 text-red-800' },
};

const priorityConfig = {
  high: { label: '高', color: 'bg-red-100 text-red-800' },
  medium: { label: '中', color: 'bg-yellow-100 text-yellow-800' },
  low: { label: '低', color: 'bg-blue-100 text-blue-800' },
};

export default function ReviewPage() {
  const [items] = useState<ReviewItem[]>(mockItems);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const filteredItems = items.filter(
    (item) => filter === 'all' || item.status === filter
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">审核队列</h1>
        <p className="text-slate-500">审核测试用例、需求文档和报告</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status === 'all' && '全部'}
            {status === 'pending' && '待审核'}
            {status === 'approved' && '已通过'}
            {status === 'rejected' && '已拒绝'}
          </Button>
        ))}
      </div>

      {/* Review List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-500">暂无待审核项目</p>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => {
            const StatusIcon = statusConfig[item.status].icon;
            return (
              <Card key={item.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{typeLabels[item.type]}</Badge>
                        <Badge className={priorityConfig[item.priority].color}>
                          {priorityConfig[item.priority].label}优先级
                        </Badge>
                        <Badge className={statusConfig[item.status].color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig[item.status].label}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-lg">{item.title}</h3>
                      <p className="text-sm text-slate-500">
                        提交人: {item.submittedBy} | 提交时间: {item.submittedAt}
                      </p>
                    </div>
                    {item.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="text-red-600">
                          <XCircle className="w-4 h-4 mr-1" />
                          拒绝
                        </Button>
                        <Button size="sm" className="text-white">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          通过
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
