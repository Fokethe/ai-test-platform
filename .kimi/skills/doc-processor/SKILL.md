---
name: doc-processor
description: Large document segmentation processing. Use when a referenced file exceeds 30,000 characters, or when the user says "organize document", "process large file", or needs to handle documents in chunks.
---

# Doc Processor

## Process

1. **Stop immediately**: "Large document detected (~{n} chars), triggering segmentation protocol"
2. **Structure analysis**: Output document map, suggest splitting into {x} segments (5,000-8,000 chars each)
3. **Segmentation plan**:
   ```
   Block 1: [chapter range] - ~{n} chars - Topic: {topic}
   Block 2: [chapter range] - ~{n} chars - Topic: {topic}
   ```
4. **Process block by block**: Wait for user to send block 1, process, then request block 2. Never read full text proactively.
5. **Final integration**: Output merge plan and deduplication after all blocks complete.

## Constraints

- Never read > 50,000 chars at once
- Never summarize before segmentation plan is created

## Commands

- `/next` - Continue to next block
- `/plan` - Regenerate segmentation plan
