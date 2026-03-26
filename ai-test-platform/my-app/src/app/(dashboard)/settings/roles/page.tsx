'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useSystemLanguage } from '@/components/system-language-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Role = 'ADMIN' | 'USER' | 'GUEST';

interface MenuItem {
  key: string;
  label: string;
  routePrefix: string;
}

interface PermissionsPayload {
  roles: Role[];
  menus: MenuItem[];
  matrix: Record<Role, string[]>;
}

const menuTextMap: Record<string, { zh: string; en: string }> = {
  dashboard: { zh: '工作台', en: 'Dashboard' },
  projects: { zh: '项目管理', en: 'Projects' },
  requirements: { zh: '需求管理', en: 'Requirements' },
  tests: { zh: '测试设计', en: 'Tests' },
  executions: { zh: '测试执行', en: 'Executions' },
  issues: { zh: '缺陷管理', en: 'Issues' },
  reports: { zh: '报告中心', en: 'Reports' },
  knowledge: { zh: '知识库', en: 'Knowledge' },
  settings: { zh: '设置', en: 'Settings' },
  settingsUsers: { zh: '用户管理', en: 'User Management' },
  settingsRoles: { zh: '角色与菜单管理', en: 'Role & Menu Management' },
};

export default function RolePermissionPage() {
  const { data: session } = useSession();
  const { language, t } = useSystemLanguage();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [matrix, setMatrix] = useState<Record<Role, string[]>>({
    ADMIN: [],
    USER: [],
    GUEST: [],
  });
  const [activeRole, setActiveRole] = useState<Role>('USER');

  const selectedSet = useMemo(() => new Set(matrix[activeRole] || []), [matrix, activeRole]);
  const roleName = (role: Role) =>
    language === 'zh-CN'
      ? role === 'ADMIN'
        ? '\u7ba1\u7406\u5458'
        : role === 'USER'
          ? '\u6210\u5458'
          : '\u8bbf\u5ba2'
      : role;

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/menu-permissions', { cache: 'no-store' });
      const payload = await response.json();

      if (payload.code !== 0) {
        toast.error(payload.error?.message || payload.message || t('\u52a0\u8f7d\u6743\u9650\u5931\u8d25', 'Failed to load role permissions'));
        return;
      }

      const data = payload.data as PermissionsPayload;
      setRoles(data.roles);
      setMenus(data.menus);
      setMatrix(data.matrix);
      const currentRole = (session?.user?.role as Role | undefined) || activeRole;
      if (data.roles.includes(currentRole)) {
        setActiveRole(currentRole);
      } else if (!data.roles.includes(activeRole)) {
        setActiveRole(data.roles[0] || 'USER');
      }
    } catch {
      toast.error(t('\u52a0\u8f7d\u6743\u9650\u5931\u8d25', 'Failed to load role permissions'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [session?.user?.role]);

  const toggleMenu = (menuKey: string, checked: boolean) => {
    setMatrix((prev) => {
      const current = new Set(prev[activeRole] || []);
      if (checked) {
        current.add(menuKey);
      } else {
        current.delete(menuKey);
      }
      return {
        ...prev,
        [activeRole]: Array.from(current),
      };
    });
  };

  const saveRolePermissions = () => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/menu-permissions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: activeRole,
            menuKeys: matrix[activeRole] || [],
          }),
        });
        const payload = await response.json();
        if (payload.code !== 0) {
          toast.error(payload.error?.message || payload.message || t('\u4fdd\u5b58\u5931\u8d25', 'Failed to save permissions'));
          return;
        }

        const data = payload.data as {
          role: Role;
          menuKeys: string[];
        };
        setMatrix((prev) => ({
          ...prev,
          [data.role]: data.menuKeys,
        }));

        const permissionVersion = `${Date.now()}`;
        localStorage.setItem('menu_permissions_version', permissionVersion);
        window.dispatchEvent(
          new CustomEvent('menu-permissions-updated', {
            detail: {
              version: permissionVersion,
              role: data.role,
            },
          })
        );
        toast.success(t('\u6743\u9650\u4fdd\u5b58\u6210\u529f', 'Permissions saved'));
      } catch {
        toast.error(t('\u4fdd\u5b58\u5931\u8d25', 'Failed to save permissions'));
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            {t('\u89d2\u8272\u4e0e\u83dc\u5355\u7ba1\u7406', 'Role & Menu Management')}
          </h1>
          <p className="text-slate-500 mt-1">
            {t('\u4e3a\u4e0d\u540c\u89d2\u8272\u914d\u7f6e\u83dc\u5355\u53ef\u89c1\u6027\u3002', 'Configure which menus are visible for each role.')}
          </p>
        </div>
        <Badge variant="outline">{t('故事 1.4', 'Story 1.4')}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('\u89d2\u8272\u9009\u62e9', 'Role Selection')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Select value={activeRole} onValueChange={(value) => setActiveRole(value as Role)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder={t('\u9009\u62e9\u89d2\u8272', 'Select a role')} />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>
                  {roleName(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={saveRolePermissions} disabled={isPending || loading}>
            {isPending ? t('\u4fdd\u5b58\u4e2d...', 'Saving...') : t('\u4fdd\u5b58\u6743\u9650', 'Save Permissions')}
          </Button>
          <Button variant="outline" onClick={fetchPermissions} disabled={loading}>
            {t('\u5237\u65b0', 'Refresh')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('\u83dc\u5355\u53ef\u89c1\u6027', 'Menu Visibility')} - {roleName(activeRole)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">{t('\u52a0\u8f7d\u4e2d...', 'Loading menu permissions...')}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {menus.map((menu) => (
                <div key={menu.key} className="flex items-center gap-3 rounded border p-3">
                  <Checkbox
                    id={`${activeRole}-${menu.key}`}
                    checked={selectedSet.has(menu.key)}
                    onCheckedChange={(checked) => toggleMenu(menu.key, Boolean(checked))}
                  />
                  <Label htmlFor={`${activeRole}-${menu.key}`} className="cursor-pointer">
                    <span className="font-medium block">
                      {language === 'zh-CN'
                        ? (menuTextMap[menu.key]?.zh ?? menu.label)
                        : (menuTextMap[menu.key]?.en ?? menu.label)}
                    </span>
                    <span className="text-xs text-slate-500">{menu.routePrefix}</span>
                  </Label>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
