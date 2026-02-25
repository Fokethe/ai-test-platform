---
name: cost-control
description: Token consumption monitoring and cost alerts. Use when reading large files (>5,000 chars), batch modifying files (>3 files), or when cumulative cost exceeds thresholds ($0.05 or $0.10).
---

# Cost Control

Auto-executes every round.

## Rules

- **Read > 5,000 chars**: Show "📊 Reading this file estimated cost: ${cost} (~{n} tokens)"
- **Batch modify > 3 files**: Show "⚠️ Batch modification estimated cost: ${cost}, suggest batch processing"
- **Cumulative > $0.05**: Must ask "Estimated cost ${cost}, continue? [Y/N]"
- **Cumulative > $0.10**: Prompt "💡 Suggest starting new conversation or /compact context"

## Commands

- `/cost` - Show current cumulative consumption
