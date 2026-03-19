# Story 2.1: requirement-ingestion-testpoint-extraction

Status: review

## Story

As a QA engineer,  
I want to upload or paste requirements and auto-extract test points,  
so that I can quickly get a structured first draft for test design.

## Acceptance Criteria

1. **Given** QA uploads a document or pastes requirement text  
   **When** submitting parse request  
   **Then** the system stores the original requirement content  
   **And** returns structured test-point candidates.
2. **Given** requirement text contains multiple feature points  
   **When** parsing completes  
   **Then** test points are grouped by feature dimension for display  
   **And** each test point includes priority and description.

## Tasks / Subtasks

- [x] Establish Story 2.1 DS baseline and current-capability inventory
  - [x] Inspect existing ingestion path: `/api/requirements/upload`, parser stack, and requirement detail flow.
  - [x] Validate parser/unit baseline (`requirement-parser`) and upload integration tests.
  - [x] Confirm current persistence models (`AiRequirement`, `TestPoint`) already support FR9/FR10 core fields.
- [x] Close API contract gaps for upload/paste ingestion (AC: 1)
  - [x] Unified upload and pasted-text handling via `/api/requirements/upload` and `/api/requirements`.
  - [x] Added request validation and normalized unified API responses.
  - [x] Applied `auth + hasProjectAccess(session.user.id, projectId)` checks consistently.
- [x] Ensure feature-grouped test-point output contract (AC: 2)
  - [x] Added grouped output field `testPointGroups` for UI consumption.
  - [x] Normalized test point fields to stable shape (`name/description/priority/relatedFeature/order`).
  - [x] Added route-level regression guards for grouped output behavior.
- [x] Add story-scoped route tests and evidence (AC: 1, 2)
  - [x] Route tests: upload success, paste success, invalid input, unauthorized, forbidden.
  - [x] Route tests: persistence/output assertions for requirement + extracted points.
  - [x] Re-ran parser/integration baseline tests to confirm no regression.
- [x] Integrate dashboard requirement entry flow with story APIs
  - [x] Wire requirements list page to consume `GET /api/requirements`.
  - [x] Wire file-upload interaction to call `POST /api/requirements/upload` with `projectId`.
  - [x] Keep grouped test-point payload available in requirement detail/list workflow.

## Dev Notes

- Story source: Epic 2 / Story 2.1 in planning artifacts.
- Scope boundary: this story focuses on requirement ingestion and extraction only; test point review/edit and traceability UI belong to Story 2.2.
- Baseline observation:
  - Existing parser and ingestion integration tests already pass for core extraction behavior.
  - Current endpoint coverage is stronger on upload path than on explicit pasted-text API contract.

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Started Epic 2 automatically after Epic 1 closure; Story 2.1 set to in-progress.
- 2026-03-19: Completed baseline audit of current requirement ingestion and extraction flow.
- 2026-03-19: Baseline evidence:
  - `npx jest --runInBand --runTestsByPath src/app/api/requirements/__tests__/upload.test.ts`
  - `npx jest --runInBand --runTestsByPath src/lib/ai/agents/__tests__/requirement-parser.test.ts`
- 2026-03-19: Added Story 2.1 ingestion APIs and shared persistence/grouping module:
  - `POST /api/requirements` for pasted-text ingestion.
  - Hardened `POST /api/requirements/upload` with auth/project access and unified response.
  - Hardened `GET /api/requirements/[id]` with auth/project access and grouped output.
- 2026-03-19: Story-scoped route test evidence:
  - `npx jest --config jest.api.config.js --runInBand --runTestsByPath src/app/api/requirements/__tests__/route.test.ts src/app/api/requirements/upload/__tests__/route.test.ts src/app/api/requirements/[id]/__tests__/route.test.ts`
  - `npx jest --config jest.api.config.js --runInBand --runTestsByPath src/app/api/requirements/[id]/generate-testcases/__tests__/route.test.ts src/app/api/requirements/[id]/generate-testcases/__tests__/model-integration.test.ts`
  - `npx jest --runInBand --runTestsByPath src/app/api/requirements/__tests__/upload.test.ts src/lib/ai/agents/__tests__/requirement-parser.test.ts`
- 2026-03-19: Story 2.1 UI closure completed:
  - Rebuilt requirements list UI to consume `GET /api/requirements` list contract.
  - Rebuilt upload page to submit `projectId + file` to `POST /api/requirements/upload`.
  - Added list-route regression test: `src/app/api/requirements/__tests__/list.test.ts`.

### File List

- _bmad-output/implementation-artifacts/2-1-requirement-ingestion-testpoint-extraction.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- ai-test-platform/my-app/src/lib/requirements/ingestion.ts
- ai-test-platform/my-app/src/app/api/requirements/route.ts
- ai-test-platform/my-app/src/app/api/requirements/upload/route.ts
- ai-test-platform/my-app/src/app/api/requirements/[id]/route.ts
- ai-test-platform/my-app/src/app/api/requirements/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/requirements/upload/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/requirements/[id]/__tests__/route.test.ts
