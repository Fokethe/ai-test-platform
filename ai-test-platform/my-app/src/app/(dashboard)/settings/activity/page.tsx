/**
 * Activity Log Page
 * 活动日志页面 (原 /admin/logs)
 */

'use client';

import { useState } from 'react';
import { Activity, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// 模拟活动日志数据
const mockLogs = [
  { id: '1', action: '创建工作空间', user: 'Admin', target: '测试团队', time: '2024-01-15 10:30', type: 'CREATE' },
  { id: '2', action: '执行测试', user: 'Admin', target: '登录流程测试', time: '2024-01-15 11:00', type: 'EXECUTE' },
  { id: '3', action: '更新用例', user: 'Admin', target: 'TC-001', time: '2024-01-15 14:20', type: 'UPDATE' },
  { id: '4', action: '删除项目', user: 'Admin', target: '旧项目', time: '2024-01-14 16:45', type: 'DELETE' },
  { id: '5', action: '登录系统', user: 'Admin', target: '-', time: '2024-01-15 09:00', type: 'LOGIN' },
];

const typeColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  EXECUTE: 'bg-purple-100 text-purple-800',
  LOGIN: 'bg-slate-100 text-slate-800',
};

export default function ActivityPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('ALL');

  const filteredLogs = mockLogs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.target.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'ALL' || log.type === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            活动日志
          </h1>
          <p className="text-slate-500 mt-1">查看系统操作记录</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          导出日志
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Input
                placeholder="搜索操作或目标..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {['ALL', 'CREATE', 'UPDATE', 'DELETE'].map((type) => (
                <Button
                  key={type}
                  variant={filter === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(type)}
                >
                  {type === 'ALL' ? '全部' : type}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log List */}
      <Card>
        <CardHeader>
          <CardTitle>最近活动</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <Badge className={typeColors[log.type] || 'bg-slate-100'}>
                      {log.type}
                    </Badge>
                    <div>
                      <p className="font-medium">{log.action}</p>
                      <p className="text-sm text-slate-500">
                        目标: {log.target} | 用户: {log.user}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-slate-400">{log.time}</span>
                </div>
              ))}
              {filteredLogs.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  没有找到匹配的日志
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
