---
name: it-dr-test
description: DR procedure testing and verification — execute DR runbook in test mode, validate recovery
trigger: when the operator requests a DR test, DR drill, or recovery verification
---

# DR Procedure Testing

## Purpose

Execute a disaster recovery runbook in a controlled test environment to validate that the procedure works, meets RTO/RPO targets, and to identify issues before a real disaster.

## Workflow

### 1. Preparation

- Identify the DR runbook to test
- Confirm test environment is available and isolated from production
- Verify backup sources are accessible
- Record start time for RTO measurement

### 2. Execute DR Runbook

Walk through each step of the DR runbook in the test environment:

- Execute each command as documented
- Record status plus bounded redacted excerpts/digests against expected output for each step
- Note any steps that require modification
- Time each major phase

### 3. Validate Recovery

After completing the runbook:

- Run all health checks documented in the runbook
- Verify data integrity against RPO target
- Confirm service is functional (not just running)
- Test dependent service connectivity

### 4. Record Results

Produce a test report:

```markdown
## DR Test Report: {service_name}
**Date**: {date}
**Scenario**: {scenario_tested}
**Result**: {PASS / FAIL}

### Timing
| Phase | Expected | Actual |
|-------|----------|--------|
| {phase} | {expected_time} | {actual_time} |
| **Total** | **{rto_target}** | **{actual_total}** |

### RTO Met: {yes / no}
### RPO Met: {yes / no}

### Issues Found
| Step | Issue | Severity | Remediation |
|------|-------|----------|-------------|

### Runbook Updates Required
- {update_1}
- {update_2}
```

### 5. Update Runbook

- Apply any corrections discovered during testing
- Update the `Last Tested` date
- Add entry to test history table
- Schedule next test

## Output

- DR test report
- Updated DR runbook (if corrections needed)
- Updated test history
- Issue tickets for unresolved problems

## Governance Boundary

DR artifacts default to `restricted-infrastructure` with the `dr-evidence` retention category. Recovery commands, backup destinations, topology, timings, and raw validation output must pass through `aiwg ops evidence prepare` before persistence. Full raw capture requires an explicit reason and short TTL. Durable reports preserve outcome, RTO/RPO status, bounded redacted excerpts, and digests. Immutable issue sinks receive only a prepared sanitized summary that does not depend on later deletion.
