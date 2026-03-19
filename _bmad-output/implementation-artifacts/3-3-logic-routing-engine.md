# Story 3.3: logic-routing-engine

Status: review

## Story

As a QA Lead,  
I want logic routing rules by question type and priority,  
so that the system can choose a better source path automatically.

## Acceptance Criteria

1. **Given** admin defines routing rules with priority and conditions  
   **When** rules are saved  
   **Then** versioned rule sets are activated  
   **And** historical versions can be rolled back.
2. **Given** a retrieval request  
   **When** a logic route rule is matched  
   **Then** system uses the selected source path  
   **And** matched rule explanation is returned.

## Tasks / Subtasks

- [x] Added logic routing persistence model and migration
  - [x] `rag_routing_rule_sets` table with active-version semantics.
- [x] Added routing rules API with rollback
  - [x] `GET /api/knowledge/routing-rules`
  - [x] `PUT /api/knowledge/routing-rules`
  - [x] `POST /api/knowledge/routing-rules` (rollback)
- [x] Added logic router library
  - [x] Rule parser and condition evaluator (`ALL` / `ANY` + operator support).
  - [x] Priority-based matching and default fallback path.
- [x] Integrated logic route decision into `POST /api/knowledge/search`
  - [x] Returns `data.routing` with matched rule info and selected sources.
  - [x] Multi-source aggregation is filtered by selected sources.
- [x] Added route-level tests
  - [x] `src/app/api/knowledge/routing-rules/__tests__/route.test.ts`
  - [x] Search route tests extended for matched-rule source filtering.

## Test Evidence

- `npx jest --config jest.api.config.js --runInBand --runTestsByPath src/app/api/knowledge/routing-rules/__tests__/route.test.ts src/app/api/knowledge/search/__tests__/route.test.ts`

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Implemented versioned logic routing rule sets with explicit rollback flow.
- 2026-03-19: Added deterministic rule evaluation (priority + conditions + mode).
- 2026-03-19: Wired routing hit explanation into search response metadata.

### File List

- ai-test-platform/my-app/prisma/schema.prisma
- ai-test-platform/my-app/prisma/migrations/20260319190000_add_rag_routing_rule_sets/migration.sql
- ai-test-platform/my-app/src/lib/ai/rag/logic-routing.ts
- ai-test-platform/my-app/src/app/api/knowledge/routing-rules/route.ts
- ai-test-platform/my-app/src/app/api/knowledge/routing-rules/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/knowledge/search/route.ts
- ai-test-platform/my-app/src/app/api/knowledge/search/__tests__/route.test.ts
