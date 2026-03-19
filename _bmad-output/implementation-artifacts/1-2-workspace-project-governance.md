# Story 1.2: workspace-project-governance

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform administrator,  
I want to create and manage workspaces, projects, and members,  
so that teams can collaborate within clear organizational boundaries.

## Acceptance Criteria

1. **Given** an authenticated administrator  
   **When** creating a workspace and adding projects  
   **Then** workspace/project data is persisted  
   **And** members can be assigned to the intended project scope.
2. **Given** a regular project member requests asset data  
   **When** querying project-scoped resources  
   **Then** only authorized project assets are returned  
   **And** unauthorized project data is not visible.
3. **Given** an administrator configures project-level system/page metadata  
   **When** saving configuration  
   **Then** metadata is persisted successfully  
   **And** downstream requirement/test assets can reference that hierarchy.

## Tasks / Subtasks

- [x] Harden workspace/project governance APIs and permission boundaries (AC: 1, 2)
  - [x] Ensure `/api/projects` list queries are constrained by workspace membership of `session.user.id` (not only query params).
  - [x] Ensure `/api/projects/[id]` read/update/delete checks membership and role before returning or mutating data.
  - [x] Add/complete project member assignment flow (list/add/remove/update/transfer) with dedicated `project_members` model and access-type semantics (`OWNED/SHARED/LOANED/TRANSFERRED`).
- [x] Enforce resource-level visibility for project metadata and assets (AC: 2, 3)
  - [x] Add project-scope authorization checks for `/api/systems`, `/api/systems/[id]`, and `/api/pages`.
  - [x] Validate resource ownership chains (`workspace -> project -> system -> page`) before read/write operations.
  - [x] Return consistent `401/403/404` responses via unified API response utilities.
- [x] Complete project-level metadata management path (AC: 1, 3)
  - [x] Ensure system/page creation paths persist required metadata tied to valid project/system IDs.
  - [x] Add/update validations for required fields and malformed payloads via shared request parsing helpers.
  - [x] Keep write paths auditable and ready for future FR6/FR8 role-management extension.
- [x] Align dashboard workflows with backend requirements (AC: 1, 3)
  - [x] Fix project creation UI flow to provide required `workspaceId` when calling `/api/projects`.
  - [x] Ensure workspace/project detail pages display permission-aware actions and stable member/project counts.
- [x] Add test coverage for governance behavior and regressions (AC: 1, 2, 3)
  - [x] Add route tests for workspace/project/system/page APIs: unauthorized, forbidden, authorized, and not-found paths.
  - [x] Add regression tests to prevent cross-workspace/project data leakage.
  - [x] Update relevant UI tests for project creation and permission-driven rendering.

## Dev Notes

- Story source: Epic 1 / Story 1.2 in planning artifacts.
- Scope boundary: this story targets FR1-FR4 governance only; do not implement FR5-FR8 authentication/role-lifecycle business features here.
- Current baseline observation:
  - `projects/[id]`, `systems`, and `pages` routes currently validate authentication but lack full resource-level authorization checks.
  - `projects/page.tsx` create flow sends `{ name, description }`, while backend expects `workspaceId`; this causes create-path mismatch.
  - Several governance endpoints mix response patterns; preserve/normalize unified API response contracts.

### Technical Requirements

- Authorization must be based on `session.user.id` and resource ownership checks, not only client-provided IDs.
- Keep API contracts consistent with `successResponse`, `itemResponse`, `listResponse`, `createdResponse`, and `errorResponse`.
- Use shared request/query helpers when appropriate (`parseJsonBody`, `buildQueryParams`) to reduce duplicated parsing logic.
- Keep Prisma operations scoped and explicit for membership checks:
  - `workspaceMember` for workspace access
  - project ownership chain checks for `Project`, `System`, `Page`
- Preserve brownfield incremental implementation (AR7): update existing routes and pages before adding new abstractions.

### Architecture Compliance

- Respect modular monolith boundaries:
  - `src/app/api/**` for transport and HTTP surface
  - `src/lib/**` for shared helpers/policies
  - `prisma/**` for schema/migration updates only if strictly required
- Do not bypass unified API envelope patterns.
- Keep route behavior deterministic for downstream RAG/test modules that depend on workspace/project scoping.

### Library & Framework Requirements

- Node `>=18`, npm `>=9`
- Next.js `16.1.6`, React `19.2.3`, TypeScript `5`
- Prisma + NextAuth baseline remains unchanged

### File Structure Requirements

- Expected touch points (as needed):
  - `ai-test-platform/my-app/src/app/api/projects/route.ts`
  - `ai-test-platform/my-app/src/app/api/projects/[id]/route.ts`
  - `ai-test-platform/my-app/src/app/api/systems/route.ts`
  - `ai-test-platform/my-app/src/app/api/systems/[id]/route.ts`
  - `ai-test-platform/my-app/src/app/api/pages/route.ts`
  - `ai-test-platform/my-app/src/app/(dashboard)/projects/page.tsx`
  - `ai-test-platform/my-app/src/app/(dashboard)/workspaces/[id]/page.tsx`
  - `ai-test-platform/my-app/src/lib/hooks/use-api.ts`
- Suggested test additions:
  - `ai-test-platform/my-app/src/app/api/projects/__tests__/route.test.ts`
  - `ai-test-platform/my-app/src/app/api/projects/[id]/__tests__/route.test.ts`
  - `ai-test-platform/my-app/src/app/api/systems/__tests__/route.test.ts`
  - `ai-test-platform/my-app/src/app/api/pages/__tests__/route.test.ts`
- Avoid broad unrelated refactors outside Epic 1 governance scope.

### Testing Requirements

- Required checks:
  - targeted API route tests for modified endpoints
  - project governance regression tests (membership boundaries)
  - dashboard flow smoke checks for workspace/project management
- Required evidence:
  - forbidden access tests for unauthorized cross-project requests
  - successful admin create/update flows for workspace/project/system/page hierarchy
  - stable response envelope assertions for list/detail/error paths

### Previous Story Intelligence (Story 1.1)

- Reuse existing bootstrap and validation helpers instead of reintroducing ad-hoc scripts/parsers.
- Keep edits scoped and explicit; avoid sweeping changes in unrelated modules.
- Repository has historical encoding issues: keep file edits UTF-8-safe and avoid large-scale text rewrites.
- Story 1.1 already documented baseline limitations (lint/full-suite noise). Focus validation on story-scoped tests first.

### References

- [Source: _bmad-output/planning-artifacts/epics.md (Epic 1 / Story 1.2)]
- [Source: _bmad-output/planning-artifacts/prd.md (FR1-FR4, RBAC Matrix)]
- [Source: _bmad-output/planning-artifacts/architecture.md (API contract, modular boundaries, `session.user.id` policy)]
- [Source: _bmad-output/project-context.md (API response and auth consistency rules)]
- [Source: _bmad-output/implementation-artifacts/1-1-baseline-env-setup.md (previous story learnings)]
- [Source: ai-test-platform/my-app/src/app/api/workspaces/route.ts]
- [Source: ai-test-platform/my-app/src/app/api/workspaces/[id]/route.ts]
- [Source: ai-test-platform/my-app/src/app/api/projects/route.ts]
- [Source: ai-test-platform/my-app/src/app/api/projects/[id]/route.ts]
- [Source: ai-test-platform/my-app/src/app/api/systems/route.ts]
- [Source: ai-test-platform/my-app/src/app/api/systems/[id]/route.ts]
- [Source: ai-test-platform/my-app/src/app/api/pages/route.ts]
- [Source: ai-test-platform/my-app/src/app/(dashboard)/projects/page.tsx]
- [Source: ai-test-platform/my-app/src/app/(dashboard)/workspaces/[id]/page.tsx]
- [Source: ai-test-platform/my-app/src/lib/api-response.ts]
- [Source: ai-test-platform/my-app/src/lib/api-handler.ts]
- [Source: ai-test-platform/my-app/src/lib/auth.ts]
- [Source: ai-test-platform/my-app/prisma/schema.prisma]

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Debug Log References

### Completion Notes List

- 2026-03-19: Created comprehensive Story 1.2 implementation context and guardrails; marked ready-for-dev.
- 2026-03-19: Resolved `package.json` merge markers and rebuilt `jest.api.config.js` so story-scoped tests could run.
- 2026-03-19: Verified Story 1.2 with targeted API route suites for projects, project members, systems, and pages.
- 2026-03-19: Updated dashboard project UI tests to assert workspace-aware creation flow and batch-action rendering.
- 2026-03-19: Refactored governance from workspace-member-only checks to project-member-aware authorization for projects/systems/pages, with compatibility fallback through workspace ownership chain.
- 2026-03-19: Added personal workspace bootstrap (`ownerId` + `isPersonal`) via workspace APIs and registration flow, ensuring each user has a dedicated workspace baseline.
- 2026-03-19: Added Story 1.2 regression tests for project member transfer semantics, workspace personal-space guarantees, and register-session bootstrap path.
- 2026-03-19: Story-scoped validation evidence:
  - `npm run test:api -- --runInBand --runTestsByPath src/app/api/projects/__tests__/route.test.ts src/app/api/projects/[id]/__tests__/route.test.ts src/app/api/projects/[id]/members/__tests__/route.test.ts src/app/api/systems/__tests__/route.test.ts src/app/api/systems/[id]/__tests__/route.test.ts src/app/api/pages/__tests__/route.test.ts src/app/api/pages/[id]/__tests__/route.test.ts src/app/api/workspaces/__tests__/route.test.ts src/app/api/auth/register/__tests__/route.test.ts`
  - `npm test -- --runInBand --runTestsByPath src/app/(dashboard)/projects/__tests__/enterprise-ui.test.tsx`

### File List

- _bmad-output/implementation-artifacts/1-2-workspace-project-governance.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- ai-test-platform/my-app/package.json
- ai-test-platform/my-app/jest.api.config.js
- ai-test-platform/my-app/jest.config.cjs
- ai-test-platform/my-app/src/app/(dashboard)/projects/page.tsx
- ai-test-platform/my-app/src/app/(dashboard)/projects/__tests__/enterprise-ui.test.tsx
- ai-test-platform/my-app/src/app/(dashboard)/workspaces/[id]/page.tsx
- ai-test-platform/my-app/src/app/api/auth/register/route.ts
- ai-test-platform/my-app/src/app/api/auth/register/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/workspaces/route.ts
- ai-test-platform/my-app/src/app/api/workspaces/[id]/route.ts
- ai-test-platform/my-app/src/app/api/workspaces/__tests__/route.test.ts
- ai-test-platform/my-app/src/lib/personal-workspace.ts
- ai-test-platform/my-app/src/lib/project-access.ts
- ai-test-platform/my-app/src/app/api/projects/route.ts
- ai-test-platform/my-app/src/app/api/projects/[id]/route.ts
- ai-test-platform/my-app/src/app/api/projects/[id]/members/route.ts
- ai-test-platform/my-app/src/app/api/systems/route.ts
- ai-test-platform/my-app/src/app/api/systems/[id]/route.ts
- ai-test-platform/my-app/src/app/api/pages/route.ts
- ai-test-platform/my-app/src/app/api/pages/[id]/route.ts
- ai-test-platform/my-app/src/app/api/projects/[id]/members/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/projects/[id]/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/projects/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/systems/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/systems/[id]/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/pages/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/pages/[id]/__tests__/route.test.ts
- ai-test-platform/my-app/prisma/schema.prisma
- ai-test-platform/my-app/prisma/migrations/20260319035433_project_member_personal_workspace/migration.sql
