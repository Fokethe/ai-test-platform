---
name: project-context
description: Project structure, tech stack constraints, and coding standards. Use when user mentions "according to spec", "project style", "documentation says", or when understanding project structure.
---

# Project Context

## Structure

| Path | Purpose |
|------|---------|
| docs/ | PRD, API specs, test cases |
| src/ | Source, feature-based organization |
| docs/API/ | API definitions |
| src/components/common/ | Shared components |
| src/utils/ | Pure utility functions (no side effects) |

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Pinia (no Options API)
- **Backend**: Node.js + Express + Prisma
- **Testing**: Vitest + Testing Library
- **Style**: Single quotes, no semicolons, 2-space indent

## Rules

- Never call axios directly in components; use `request.ts`
- Never hardcode API URLs; use env variables
- Never use `any`; use specific types or `unknown`

## Priority

When user mentions specs, read in order:
`docs/GUIDE.md` → `docs/API/README.md` → this skill
