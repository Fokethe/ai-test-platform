# Story 1.3: auth-login-session

Status: review

## Story

As a project member,  
I want to register and login with email/password,  
so that I can access authorized resources through a recognized session.

## Acceptance Criteria

1. **Given** a new user submits valid registration data  
   **When** registration succeeds  
   **Then** a user account is created and can be used for login  
   **And** password is stored securely.
2. **Given** an existing user submits valid credentials  
   **When** login succeeds  
   **Then** the system creates an active session  
   **And** subsequent requests can identify `session.user.id`.
3. **Given** a request has no valid session  
   **When** it accesses protected resources  
   **Then** API returns `401`  
   **And** protected pages redirect to login without exposing data.

## Tasks / Subtasks

- [x] Strengthen registration flow for Story 1.3 scope (AC: 1, 2)
  - [x] Keep secure password hashing (`bcrypt`) in register API.
  - [x] Ensure successful registration bootstraps personal workspace baseline.
  - [x] Expand register API tests for validation, conflict, and transaction failure branches.
- [x] Add explicit session-identification API surface (AC: 2, 3)
  - [x] Add `/api/auth/me` endpoint for current-session user identity.
  - [x] Add route tests for authenticated and unauthenticated cases.
- [x] Close protected-page entry guard (AC: 3)
  - [x] Add server-side auth check in `(dashboard)` layout.
  - [x] Redirect unauthenticated users to `/login`.
  - [x] Add layout-level tests for redirect/render behavior.
- [x] Normalize auth-related E2E path assumptions (AC: 2, 3)
  - [x] Update `e2e/auth.spec.ts` to use `/login` and `/register` paths.
  - [x] Keep assertions lightweight to avoid brittle false failures in DS phase.

## Dev Notes

- Story source: Epic 1 / Story 1.3 in planning artifacts.
- Scope boundary: implement FR5 + FR7 only; role lifecycle and user status administration stay in Story 1.4.
- Compatibility: keep existing NextAuth credentials flow and callback-based token/session enrichment.

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Added `/api/auth/me` endpoint and tests to validate `session.user.id` recognition path.
- 2026-03-19: Added dashboard-level server auth guard with redirect to `/login` and corresponding layout tests.
- 2026-03-19: Refactored register page auto-login to standard `signIn('credentials')` flow.
- 2026-03-19: Expanded register API tests to cover invalid payloads, validation failures, duplicate email, happy path, and transaction error handling.
- 2026-03-19: Updated E2E auth spec to current route conventions (`/login`, `/register`).
- 2026-03-19: Story-scoped verification evidence:
  - `npm run test:api -- --runInBand --runTestsByPath src/app/api/auth/register/__tests__/route.test.ts src/app/api/auth/me/__tests__/route.test.ts src/app/api/workspaces/__tests__/route.test.ts`
  - `npm test -- --runInBand --runTestsByPath src/app/__tests__/login-page.test.tsx src/app/(dashboard)/__tests__/layout.test.tsx`
  - `npx playwright test e2e/auth.spec.ts --project=chromium`

### File List

- _bmad-output/implementation-artifacts/1-3-auth-login-session.md
- ai-test-platform/my-app/src/app/api/auth/me/route.ts
- ai-test-platform/my-app/src/app/api/auth/me/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/auth/register/route.ts
- ai-test-platform/my-app/src/app/api/auth/register/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/(dashboard)/layout.tsx
- ai-test-platform/my-app/src/app/(dashboard)/__tests__/layout.test.tsx
- ai-test-platform/my-app/src/app/(auth)/register/page.tsx
- ai-test-platform/my-app/e2e/auth.spec.ts
