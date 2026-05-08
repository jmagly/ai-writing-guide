---
name: ops-verify
description: Post-procedure verification runner — executes verification commands and validates expected output
trigger: After runbook execution, deployment, or configuration change
---

# Ops Verify

## Purpose
Run verification commands after any operational procedure and validate that expected output matches actual output. Produces a pass/fail report.

## Behavior
1. Parse the verification section of the relevant runbook or procedure
2. Execute each verification command
3. Compare actual output against expected output patterns
4. Produce structured pass/fail report
5. If any verification fails: flag, include diagnostic output, suggest troubleshooting steps

## Output
Structured verification report:
- Overall: PASS / FAIL
- Per-check results with actual vs expected
- Recommended next steps for failures
