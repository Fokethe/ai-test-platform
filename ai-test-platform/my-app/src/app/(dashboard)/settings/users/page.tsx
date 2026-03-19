'use client';

import { useCallback, useEffect, useState } from 'react';
import { MoreHorizontal, Plus, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useSystemLanguage } from '@/components/system-language-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER' | 'GUEST';
  status: 'ACTIVE' | 'INACTIVE';
}

const roleText: Record<UserRow['role'], { zh: string; en: string }> = {
  ADMIN: { zh: '\u7ba1\u7406\u5458', en: 'Admin' },
  USER: { zh: '\u6210\u5458', en: 'User' },
  GUEST: { zh: '\u8bbf\u5ba2', en: 'Guest' },
};

const statusText: Record<UserRow['status'], { zh: string; en: string }> = {
  ACTIVE: { zh: '\u5df2\u542f\u7528', en: 'Active' },
  INACTIVE: { zh: '\u5df2\u7981\u7528', en: 'Inactive' },
};

export default function UserManagementPage() {
  const { language, t } = useSystemLanguage();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRow['role']>('USER');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`/api/users${query}`, { cache: 'no-store' });
      const payload = await response.json();
      if (payload.code === 0) {
        setUsers(payload.data);
      } else {
        toast.error(payload.error?.message || payload.message || t('\u83b7\u53d6\u7528\u6237\u5931\u8d25', 'Failed to load users'));
      }
    } catch {
      toast.error(t('\u83b7\u53d6\u7528\u6237\u5931\u8d25', 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  }, [search, t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const inviteUser = async () => {
    const email = inviteEmail.trim();
    if (!email) {
      toast.error(t('\u8bf7\u8f93\u5165\u90ae\u7bb1', 'Email is required'));
      return;
    }

    setActionLoading('invite');
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const payload = await response.json();
      if (payload.code === 0) {
        toast.success(t('\u9080\u8bf7\u5df2\u53d1\u9001', 'Invitation sent'));
        setInviteEmail('');
        setInviteRole('USER');
        setInviteOpen(false);
        fetchUsers();
      } else {
        toast.error(payload.error?.message || payload.message || t('\u9080\u8bf7\u5931\u8d25', 'Failed to invite user'));
      }
    } catch {
      toast.error(t('\u9080\u8bf7\u5931\u8d25', 'Failed to invite user'));
    } finally {
      setActionLoading(null);
    }
  };

  const updateUser = async (id: string, patch: Partial<Pick<UserRow, 'role' | 'status'>>) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const payload = await response.json();
      if (payload.code === 0) {
        toast.success(t('\u7528\u6237\u5df2\u66f4\u65b0', 'User updated'));
        fetchUsers();
      } else {
        toast.error(payload.error?.message || payload.message || t('\u66f4\u65b0\u5931\u8d25', 'Failed to update user'));
      }
    } catch {
      toast.error(t('\u66f4\u65b0\u5931\u8d25', 'Failed to update user'));
    } finally {
      setActionLoading(null);
    }
  };

  const resetPassword = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetPassword: true }),
      });
      const payload = await response.json();
      if (payload.code === 0) {
        toast.success(t('\u5bc6\u7801\u91cd\u7f6e\u90ae\u4ef6\u5df2\u53d1\u9001', 'Password reset email sent'));
      } else {
        toast.error(payload.error?.message || payload.message || t('\u91cd\u7f6e\u5931\u8d25', 'Failed to reset password'));
      }
    } catch {
      toast.error(t('\u91cd\u7f6e\u5931\u8d25', 'Failed to reset password'));
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm(t('\u786e\u5b9a\u5220\u9664\u8be5\u7528\u6237\u5417\uff1f\u6b64\u64cd\u4f5c\u4e0d\u53ef\u64a4\u9500\u3002', 'Delete this user? This action cannot be undone.'))) {
      return;
    }

    setActionLoading(id);
    try {
      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (payload.code === 0) {
        toast.success(t('\u7528\u6237\u5df2\u5220\u9664', 'User deleted'));
        fetchUsers();
      } else {
        toast.error(payload.error?.message || payload.message || t('\u5220\u9664\u5931\u8d25', 'Failed to delete user'));
      }
    } catch {
      toast.error(t('\u5220\u9664\u5931\u8d25', 'Failed to delete user'));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            {t('\u7528\u6237\u7ba1\u7406', 'User Management')}
          </h1>
          <p className="text-slate-500 mt-1">
            {t('\u7ba1\u7406\u89d2\u8272\u3001\u8d26\u53f7\u72b6\u6001\u4e0e\u5b89\u5168\u64cd\u4f5c\u3002', 'Manage roles, account status, and access safety.')}
          </p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('\u9080\u8bf7\u7528\u6237', 'Invite User')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('\u9080\u8bf7\u7528\u6237', 'Invite User')}</DialogTitle>
              <DialogDescription>
                {t('\u521b\u5efa\u7981\u7528\u6001\u8d26\u53f7\u5e76\u53d1\u9001\u9080\u8bf7\u90ae\u4ef6\u3002', 'Create an inactive account and send invitation email.')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="invite-email">{t('\u90ae\u7bb1', 'Email')}</Label>
                <Input
                  id="invite-email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('\u89d2\u8272', 'Role')}</Label>
                <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as UserRow['role'])}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('\u9009\u62e9\u89d2\u8272', 'Select role')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">{t('\u7ba1\u7406\u5458', 'Admin')}</SelectItem>
                    <SelectItem value="USER">{t('\u6210\u5458', 'User')}</SelectItem>
                    <SelectItem value="GUEST">{t('\u8bbf\u5ba2', 'Guest')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                {t('\u53d6\u6d88', 'Cancel')}
              </Button>
              <Button onClick={inviteUser} disabled={actionLoading === 'invite'}>
                {actionLoading === 'invite' ? t('\u53d1\u9001\u4e2d...', 'Sending...') : t('\u53d1\u9001\u9080\u8bf7', 'Send Invite')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={t('\u6309\u59d3\u540d\u6216\u90ae\u7bb1\u641c\u7d22', 'Search users by name or email')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('\u7528\u6237\u5217\u8868', 'Users')} ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-slate-500">{t('\u52a0\u8f7d\u4e2d...', 'Loading users...')}</div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border bg-white">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar>
                      <AvatarFallback>{(user.name || user.email)[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{user.name || user.email}</p>
                      <p className="text-sm text-slate-500 truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      {language === 'zh-CN' ? roleText[user.role].zh : roleText[user.role].en}
                    </Badge>
                    <Badge variant={user.status === 'ACTIVE' ? 'default' : 'outline'}>
                      {language === 'zh-CN' ? statusText[user.status].zh : statusText[user.status].en}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={actionLoading === user.id}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>{t('\u89d2\u8272', 'Role')}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => updateUser(user.id, { role: 'ADMIN' })}>
                          {t('\u8bbe\u4e3a\u7ba1\u7406\u5458', 'Set as Admin')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateUser(user.id, { role: 'USER' })}>
                          {t('\u8bbe\u4e3a\u6210\u5458', 'Set as User')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateUser(user.id, { role: 'GUEST' })}>
                          {t('\u8bbe\u4e3a\u8bbf\u5ba2', 'Set as Guest')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>{t('\u8d26\u53f7\u72b6\u6001', 'Status')}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => updateUser(user.id, { status: 'ACTIVE' })}>
                          {t('\u542f\u7528', 'Activate')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateUser(user.id, { status: 'INACTIVE' })}>
                          {t('\u7981\u7528', 'Deactivate')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => resetPassword(user.id)}>
                          {t('\u91cd\u7f6e\u5bc6\u7801', 'Reset Password')}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => deleteUser(user.id)}>
                          {t('\u5220\u9664\u7528\u6237', 'Delete User')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}

              {!loading && users.length === 0 ? (
                <div className="text-sm text-slate-500 py-8 text-center">{t('\u672a\u627e\u5230\u7528\u6237', 'No users found.')}</div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
