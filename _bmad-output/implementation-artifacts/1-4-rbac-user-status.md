# Story 1.4: rbac-user-status

Status: review

## Story

As a platform administrator,  
I want to manage user roles and account status,  
so that high-risk management operations are only available to authorized roles.

## Acceptance Criteria

1. **Given** an administrator updates user role or active status  
   **When** saving the change  
   **Then** role/status takes effect immediately  
   **And** the change is recorded in audit logs.
2. **Given** a non-admin user calls management endpoints  
   **When** submitting management operations  
   **Then** API returns `403`  
   **And** the forbidden request is recorded.
3. **Given** the system handles authorization and identity checks  
   **When** validating protected resources  
   **Then** access checks are based on `session.user.id` and role policy  
   **And** no plaintext sensitive configuration is returned.

## Tasks / Subtasks

- [x] Harden admin-only user management surface (AC: 1, 2)
  - [x] Restrict `GET/POST /api/users` to `ADMIN`.
  - [x] Restrict `PUT/DELETE /api/users/[id]` to `ADMIN`; allow self-read for profile query.
  - [x] Normalize invalid payload handling and unified response semantics (`401/403/404/400`).
- [x] Add governance audit trail for critical operations (AC: 1, 2)
  - [x] Add reusable audit helper (`writeAuditLog`) for role/status/menu changes.
  - [x] Record forbidden management access attempts.
  - [x] Record role/status mutation, invitation, password reset, and deletion operations.
- [x] Deliver role/menu permission governance capability (AC: 1, 2, 3)
  - [x] Add admin APIs for role-menu matrix management (`/api/admin/menu-permissions`).
  - [x] Add current-session menu permission API (`/api/auth/me/menu-permissions`).
  - [x] Persist role-menu permissions in Prisma (`role_menu_permissions`) with migration.
- [x] Integrate permission awareness into dashboard navigation (AC: 3)
  - [x] Filter sidebar menus by current user's resolved menu permissions.
  - [x] Keep role-based default fallback when matrix is not configured.
  - [x] Gate role/menu management entry visibility by permission key.
- [x] Add system language preference and switch entry as governance UX enhancement
  - [x] Add `/api/user/settings` `GET/PUT` support for language/timezone + notification preferences.
  - [x] Add `SystemLanguageProvider` with `zh-CN` default and persisted preference.
  - [x] Add language switch entry for auth/dashboard surfaces and localize key settings pages.
- [x] Validate story-scoped test evidence (AC: 1, 2, 3)
  - [x] API: users + user detail + menu permissions + user settings route tests.
  - [x] UI smoke: login page and dashboard auth-layout tests.
  - [x] Governance regression tests from Story 1.2/1.3 remain green after Story 1.4 changes.

## Dev Notes

- Story source: Epic 1 / Story 1.4 in planning artifacts.
- Scope boundary: Story 1.4 covers FR6 + FR8 and governance-related NFR/AR constraints; it does not extend to Epic 2 requirement asset workflows.
- Compatibility: keep NextAuth credentials flow and existing Prisma models intact; apply incremental brownfield changes only.

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Implemented admin-only user governance APIs and added audit logging for forbidden and mutation paths.
- 2026-03-19: Implemented role-menu permission governance APIs and DB persistence (`role_menu_permissions`).
- 2026-03-19: Implemented current-session menu permission resolution endpoint and sidebar permission filtering.
- 2026-03-19: Implemented user settings API for language preference persistence and global language provider.
- 2026-03-19: Localized key auth/settings surfaces to Chinese-first with bilingual switch support.
- 2026-03-19: Story-scoped validation evidence:
  - `npx jest --config jest.api.config.js --runInBand --runTestsByPath src/app/api/users/__tests__/route.test.ts src/app/api/users/[id]/__tests__/route.test.ts src/app/api/admin/menu-permissions/__tests__/route.test.ts src/app/api/auth/me/menu-permissions/__tests__/route.test.ts src/app/api/user/settings/__tests__/route.test.ts`
  - `npx jest --runInBand --runTestsByPath src/app/__tests__/login-page.test.tsx src/app/(dashboard)/__tests__/layout.test.tsx`
  - `npx jest --config jest.api.config.js --runInBand --runTestsByPath src/app/api/projects/__tests__/route.test.ts src/app/api/projects/[id]/__tests__/route.test.ts src/app/api/projects/[id]/members/__tests__/route.test.ts src/app/api/systems/__tests__/route.test.ts src/app/api/systems/[id]/__tests__/route.test.ts src/app/api/pages/__tests__/route.test.ts src/app/api/pages/[id]/__tests__/route.test.ts src/app/api/workspaces/__tests__/route.test.ts`

### File List

- _bmad-output/implementation-artifacts/1-4-rbac-user-status.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- ai-test-platform/my-app/prisma/schema.prisma
- ai-test-platform/my-app/prisma/migrations/20260319133500_add_role_menu_permissions/migration.sql
- ai-test-platform/my-app/src/lib/audit.ts
- ai-test-platform/my-app/src/lib/rbac.ts
- ai-test-platform/my-app/src/app/api/users/route.ts
- ai-test-platform/my-app/src/app/api/users/[id]/route.ts
- ai-test-platform/my-app/src/app/api/users/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/users/[id]/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/admin/menu-permissions/route.ts
- ai-test-platform/my-app/src/app/api/admin/menu-permissions/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/auth/me/menu-permissions/route.ts
- ai-test-platform/my-app/src/app/api/auth/me/menu-permissions/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/user/settings/route.ts
- ai-test-platform/my-app/src/app/api/user/settings/__tests__/route.test.ts
- ai-test-platform/my-app/src/components/system-language-provider.tsx
- ai-test-platform/my-app/src/components/providers.tsx
- ai-test-platform/my-app/src/components/navigation/feishu-sidebar.tsx
- ai-test-platform/my-app/src/app/(auth)/layout.tsx
- ai-test-platform/my-app/src/app/(auth)/login/LoginForm.tsx
- ai-test-platform/my-app/src/app/(auth)/register/page.tsx
- ai-test-platform/my-app/src/app/(dashboard)/settings/page.tsx
- ai-test-platform/my-app/src/app/(dashboard)/settings/users/page.tsx
- ai-test-platform/my-app/src/app/(dashboard)/settings/roles/page.tsx
- ai-test-platform/my-app/src/app/__tests__/login-page.test.tsx

