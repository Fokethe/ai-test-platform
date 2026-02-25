---
name: doc-system
description: Dual-track documentation with KIMI.md (AI manual) and progress.txt (progress tracking). Use when initializing new projects, or user says "create project docs", "initialize docs".
---

# Doc System

## Dual Documents

### KIMI.md (AI Manual)

- **Location**: Project root
- **Content**: Tech stack, file conventions, rules, current goal
- **Update**: Read at session start, update when goals change

### progress.txt (Progress Tracker)

- **Location**: Project root
- **Content**: Completed, current, next steps, tech debt
- **Update**: After each feature completion

## KIMI.md Template

```markdown
# Project: [name]
# Stack: [tech stack]

## Rules
- [specific constraints]

## Conventions
- Pages: src/app/[route]/page.tsx
- Components: src/components/[Name]/index.tsx

## Current Goal
[update each session]

## Completed
[AI auto-updates]
```

## Constraints

- Required for new projects
- Read both files at every session start
- No complex dev without these docs

## Related Skills

- `context-management` - Session context management
- `workflow` - 4-step development workflow
