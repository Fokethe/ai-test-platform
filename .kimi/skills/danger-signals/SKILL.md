---
name: danger-signals
description: Real-time development risk monitoring and alerts. Auto-monitors during development; triggers when dangerous patterns are detected.
---

# Danger Signals

## Signals

| Signal | Action |
|--------|--------|
| AI repeating previous content | Context full, start new session |
| Code still broken after 3 fixes | Rollback to stable version |
| AI says "according to common practice..." | Too vague, enter `socratic-inquiry` |
| Generated 5+ files at once | Too coarse, "one component at a time" |
| Lots of `any` or `@ts-ignore` | "Strict types, no any" |
| Cost > $0.05 | Ask to continue (`cost-control`) |
| Context > 60% | Prompt new conversation (`context-management`) |

## Response Template

```
🚨 Danger Signal: [description]

Suggested actions:
1. [action 1]
2. [action 2]

Execute? [Y/N]
```

## Constraints

- Stop immediately on signal detection
- Never ignore signals
- Must get user confirmation to continue

## Related Skills

- `cost-control` - Cost monitoring
- `context-management` - Context management
