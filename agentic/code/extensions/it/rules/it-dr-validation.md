---
enforcement: high
---

# DR Procedure Validation

**Enforcement Level**: HIGH
**Scope**: All disaster recovery runbooks and backup procedures
**Issue**: #491

## Principle

Untested disaster recovery is not disaster recovery. A DR runbook that has never been executed is a hypothesis, not a plan. All DR procedures must be tested periodically and test results must be recorded.

## Mandatory Rules

1. **Every DR runbook must have a test date**: The `Last Tested` field must contain an actual date, not "never" or "TBD". A runbook without a test date is considered untested and must be flagged.

2. **Periodic retesting required**: DR runbooks must be retested at a cadence appropriate to the service criticality:
   - **Critical services**: Test quarterly (every 90 days)
   - **Standard services**: Test semi-annually (every 180 days)
   - **Low-priority services**: Test annually (every 365 days)

3. **Test results must be recorded**: Each test must record:
   - Date of test
   - Scenario tested
   - Pass or fail result
   - Actual recovery duration vs. RTO target
   - Issues discovered during test
   - Remediation status for discovered issues

4. **Failed tests require remediation**: If a DR test fails, the runbook must be updated and retested before the next scheduled test window. An unresolved DR test failure is a high-priority item.

5. **Backup verification is not DR testing**: Verifying that backups exist is necessary but insufficient. DR testing means executing the full recovery procedure (in a test environment) from backup to running service.

6. **RTO/RPO must be validated against actuals**: If a DR test takes longer than the documented RTO, either the RTO must be revised or the procedure must be optimized. Documented targets that do not match reality provide false confidence.

## Validation

When reviewing or creating DR documentation:

- [ ] `Last Tested` field contains a real date
- [ ] Test date is within the required cadence for this service's criticality
- [ ] Test history section has at least one entry
- [ ] All failed test issues have been addressed
- [ ] Actual recovery time is within documented RTO

## Rationale

Organizations discover their DR procedures don't work during actual disasters — the worst possible time to learn. Regular testing converts theoretical recovery plans into proven operational procedures.
