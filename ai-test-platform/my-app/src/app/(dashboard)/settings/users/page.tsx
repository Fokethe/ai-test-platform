/**
 * User Management Page
 * 用户管理页面
 */

'use client';

import { useState } from 'react';
import { Users, Plus, Search, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// 模拟用户数据
const mockUsers = [
  { id: '1', name: '系统管理员', email: 'admin@example.com', role: 'ADMIN', status: 'ACTIVE' },
  { id: '2', name: '测试工程师', email: 'tester@example.com', role: 'MEMBER', status: 'ACTIVE' },
  { id: '3', name: '访客用户', email: 'guest@example.com', role: 'VIEWER', status: 'INACTIVE' },
];

const roleLabels: Record<string, string> = {
  ADMIN: '管理员',
  MEMBER: '成员',
  VIEWER: '访客',
};

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  MEMBER: 'bg-blue-100 text-blue-800',
  VIEWER: 'bg-slate-100 text-slate-800',
};

export default function UsersPage() {
  const [users, setUsers] = useState(mockUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInvite = () => {
    if (!inviteEmail) {
      toast.error('请输入邮箱地址');
      return;
    }
    toast.success(`邀请已发送至 ${inviteEmail}`);
    setInviteEmail('');
    setInviteDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            用户管理
          </h1>
          <p className="text-slate-500 mt-1">管理团队成员和权限</p>
        </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              邀请用户
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>邀请用户</DialogTitle>
              <DialogDescription>
                输入邮箱地址邀请新成员加入团队
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>邮箱地址</Label>
                <Input
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleInvite}>发送邀请</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="搜索用户..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>团队成员 ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={roleColors[user.role]}>
                    {roleLabels[user.role]}
                  </Badge>
                  <Badge variant={user.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {user.status === 'ACTIVE' ? '活跃' : '未激活'}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>编辑权限</DropdownMenuItem>
                      <DropdownMenuItem>重置密码</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">删除用户</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                没有找到匹配的用户
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
