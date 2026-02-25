---
name: git-commit
description: Generate Conventional Commits compliant messages. Use when the user says "generate commit message", "write commit", "commit message", or "how to commit this change".
---

# Git Commit

## Format

```
<type>(<scope>): <subject>
<body>
<footer>
```

## Types

| Type | Meaning |
|------|---------|
| feat | New feature |
| fix | Bug fix |
| docs | Documentation |
| style | Code style (no functional change) |
| refactor | Refactoring |
| test | Tests |
| chore | Build/tool changes |

## Rules

1. Subject ≤ 50 chars, imperative ("add" not "added")
2. Body explains why and compares changes
3. Breaking changes: `BREAKING CHANGE:`

## Example

```
feat(auth): add JWT token refresh

- Add auto-refresh on token expiration
- Handle 401 in axios interceptor
- Add refresh queue to avoid duplicates

Fixes user re-login after long sessions
```
