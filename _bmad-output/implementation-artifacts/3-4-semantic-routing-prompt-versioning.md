# Story 3.4: semantic-routing-prompt-versioning

Status: review

## Story

As a QA Lead,  
I want semantic routing to choose prompt template versions by scenario,  
so that generation quality is controllable and traceable.

## Acceptance Criteria

1. **Given** multiple prompt templates by scenario  
   **When** template versions are published  
   **Then** version and scope are persisted  
   **And** scenario-level history is traceable and rollbackable.
2. **Given** a retrieval request enters semantic routing  
   **When** semantic match selects a template  
   **Then** selection reason and confidence are returned  
   **And** can be used for evaluation analysis.

## Tasks / Subtasks

- [x] Added prompt template version persistence model and migration
  - [x] `rag_prompt_template_versions` table with `(projectId, scenario, version)` uniqueness.
- [x] Added prompt template API with rollback
  - [x] `GET /api/knowledge/prompt-templates`
  - [x] `PUT /api/knowledge/prompt-templates`
  - [x] `POST /api/knowledge/prompt-templates` (rollback)
- [x] Added semantic routing library
  - [x] Active template loading and scenario history listing.
  - [x] Keyword/scenario overlap scoring.
  - [x] Template selection result includes confidence and reason.
- [x] Integrated semantic route stage into `POST /api/knowledge/search`
  - [x] Returns `data.semanticRouting` with template/version/confidence/reason.
  - [x] Includes prompt preview for traceability.
- [x] Added route-level tests
  - [x] `src/app/api/knowledge/prompt-templates/__tests__/route.test.ts`
  - [x] Search route tests extended for semantic metadata assertions.

## Test Evidence

- `npx jest --config jest.api.config.js --runInBand --runTestsByPath src/app/api/knowledge/prompt-templates/__tests__/route.test.ts src/app/api/knowledge/search/__tests__/route.test.ts`

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Implemented versioned prompt-template management with scenario-scoped rollback.
- 2026-03-19: Added semantic routing selector and confidence/reason output contract.
- 2026-03-19: Integrated template selection metadata into search response for downstream evaluation.

### File List

- ai-test-platform/my-app/prisma/schema.prisma
- ai-test-platform/my-app/prisma/migrations/20260319193000_add_rag_prompt_template_versions/migration.sql
- ai-test-platform/my-app/src/lib/ai/rag/semantic-routing.ts
- ai-test-platform/my-app/src/app/api/knowledge/prompt-templates/route.ts
- ai-test-platform/my-app/src/app/api/knowledge/prompt-templates/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/knowledge/search/route.ts
- ai-test-platform/my-app/src/app/api/knowledge/search/__tests__/route.test.ts
