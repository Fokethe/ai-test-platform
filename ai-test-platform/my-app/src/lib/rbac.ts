export const ROLE_VALUES = ['ADMIN', 'USER', 'GUEST'] as const;
export type AppUserRole = (typeof ROLE_VALUES)[number];

export const USER_STATUS_VALUES = ['ACTIVE', 'INACTIVE'] as const;
export type AppUserStatus = (typeof USER_STATUS_VALUES)[number];

export interface MenuDefinition {
  key: string;
  label: string;
  routePrefix: string;
}

export const MENU_DEFINITIONS: MenuDefinition[] = [
  { key: 'dashboard', label: 'Dashboard', routePrefix: '/dashboard' },
  { key: 'projects', label: 'Projects', routePrefix: '/projects' },
  { key: 'requirements', label: 'Requirements', routePrefix: '/requirements' },
  { key: 'tests', label: 'Tests', routePrefix: '/tests' },
  { key: 'executions', label: 'Executions', routePrefix: '/executions' },
  { key: 'issues', label: 'Issues', routePrefix: '/issues' },
  { key: 'reports', label: 'Reports', routePrefix: '/reports' },
  { key: 'knowledge', label: 'Knowledge', routePrefix: '/knowledge' },
  { key: 'settings', label: 'Settings', routePrefix: '/settings' },
  { key: 'settingsUsers', label: 'User Management', routePrefix: '/settings/users' },
  { key: 'settingsRoles', label: 'Role & Menu Management', routePrefix: '/settings/roles' },
];

export const MENU_KEYS = MENU_DEFINITIONS.map((menu) => menu.key);

export const DEFAULT_ROLE_MENU_ACCESS: Record<AppUserRole, string[]> = {
  ADMIN: [...MENU_KEYS],
  USER: [
    'dashboard',
    'projects',
    'requirements',
    'tests',
    'executions',
    'issues',
    'reports',
    'knowledge',
    'settings',
  ],
  GUEST: ['dashboard', 'reports'],
};

export function isUserRole(value: unknown): value is AppUserRole {
  return typeof value === 'string' && ROLE_VALUES.includes(value as AppUserRole);
}

export function isUserStatus(value: unknown): value is AppUserStatus {
  return typeof value === 'string' && USER_STATUS_VALUES.includes(value as AppUserStatus);
}

export function normalizeRole(value: unknown): AppUserRole {
  if (isUserRole(value)) {
    return value;
  }
  return 'USER';
}

export function sanitizeMenuKeys(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const menuSet = new Set<string>();
  for (const key of value) {
    if (typeof key === 'string' && MENU_KEYS.includes(key)) {
      menuSet.add(key);
    }
  }
  return Array.from(menuSet);
}

export function getDefaultMenuKeys(role: AppUserRole): string[] {
  return [...DEFAULT_ROLE_MENU_ACCESS[role]];
}

export function resolveMenuKeysForRole(
  role: AppUserRole,
  rows: Array<{ menuKey: string; enabled: boolean }>
): string[] {
  if (rows.length === 0) {
    return getDefaultMenuKeys(role);
  }

  const menuSet = new Set<string>();
  for (const row of rows) {
    if (row.enabled && MENU_KEYS.includes(row.menuKey)) {
      menuSet.add(row.menuKey);
    }
  }

  return Array.from(menuSet);
}
