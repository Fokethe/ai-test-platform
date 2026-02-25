---
name: context-management
description: Prevent AI "amnesia" by regularly summarizing progress and managing long conversations. Use auto-executes, or when user says "summarize progress", "update progress", or "prevent amnesia".
---

# Context Management

## Strategy

### Every 10-15 Rounds

- "Summarize current progress, update progress.txt"
- Output current status summary

### When Switching Features

- Start new session
- Paste KIMI.md + progress.txt as opening

### When Code is Long

- "Show only changes, diff format"
- Avoid repeating unchanged code

### Session Opening Template

```
Read KIMI.md and progress.txt.

Today's goal: [feature]

Pre-dev check:
1. What does this depend on?
2. New files needed? Paths?
3. Potential tech challenges?

After confirmation, start step: [detail]
```

## Compression Tips

- Use diff format for changes
- Reference files with @filename
- Outline first, details after confirmation

## Constraints

- Alert when context > 60%
- No complex ops when context full
- Prefer external docs for state

## Commands

- `/compact` - Compress context

## Related Skills

- `doc-system` - KIMI.md and progress.txt management
- `cost-control` - Token monitoring
