---
name: ops-audit-trail
description: Track all files modified, backups created, commands executed, and outputs received during operational procedures
trigger: During and after runbook execution or operational changes
---

# Ops Audit Trail

## Purpose
Maintain a complete audit trail of all operational actions for accountability, debugging, and compliance. Every command, file change, and backup is recorded.

## Behavior
1. Record each command executed with timestamp, user, and host
2. Record command output (stdout and stderr)
3. Track files created, modified, or deleted
4. Track backups created and their locations
5. Note any manual/human steps performed
6. Produce structured audit trail document

## Output
Structured audit trail saved to `.aiwg/ops/audit/` with:
- Session ID and timestamp range
- Host and user context
- Complete command log with outputs
- File change manifest
- Backup inventory
