---
name: ops-audit-trail
description: Track minimum sufficient, governed evidence for operational procedures
trigger: During and after runbook execution or operational changes
---

# Ops Audit Trail

## Purpose
Maintain a useful audit trail of operational actions without turning runtime output into an indefinite disclosure surface. Durable records contain minimum sufficient, redacted evidence; full raw capture is exceptional and short-lived.

## Behavior
1. Record each command identity/digest, timestamp, result, and the minimum host/user context needed for correlation
2. Record status plus bounded stdout/stderr excerpts and digests by default
3. Track files created, modified, or deleted
4. Track backups created and their locations
5. Note any manual/human steps performed
6. Classify the artifact and invoke the mandatory evidence boundary before every write
7. Attach creation time, policy ID/version, disposition deadline, evidence tier, and lifecycle action
8. Produce a structured audit trail document and payload-free boundary audit record

## Output
Structured audit trail saved to `.aiwg/ops/audit/` with:
- Session ID and timestamp range
- Host and user context
- Command/result log with bounded redacted excerpts, counts, and correlation digests
- File change manifest
- Backup inventory

Full raw output requires a recorded reason and the `raw` evidence tier. It MUST use a short-lived restricted policy and MUST NOT be posted to an issue/comment or another immutable sink. All writes to `.aiwg/ops/audit/` go through `prepareEvidenceForSink`/`publishEvidence` (or `aiwg ops evidence prepare`) before persistence.
