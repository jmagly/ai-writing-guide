---
enforcement: medium
---

# CMDB as Source of Truth for Asset Records

**Enforcement Level**: MEDIUM
**Scope**: All hardware assets, virtual machines, and tracked infrastructure components
**Issue**: #491

## Principle

The Configuration Management Database (CMDB) is the authoritative source of truth for asset existence and status. If an asset is not in the CMDB, it does not officially exist. If the CMDB says an asset is active, it must be treated as active regardless of what other sources suggest.

## Mandatory Rules

1. **CMDB is authoritative**: When there is a conflict between the CMDB and another source (monitoring, DNS, manual inventory), the CMDB takes precedence until the discrepancy is investigated and the CMDB is updated through the proper process.

2. **All assets must be registered**: Every physical host, virtual machine, network device, and storage system must have a corresponding asset record in the CMDB. Unregistered assets discovered during audits must be filed as issues for immediate registration.

3. **Decommission procedure required before deletion**: An asset record must never be deleted from the CMDB without completing the full decommission procedure:
   - Verify no active services depend on the asset
   - Remove monitoring and alerting configuration
   - Revoke identity provider credentials and certificates
   - Remove DNS records
   - Update dependent service documentation
   - Archive the minimum durable asset record (set status to `retired`; dispose of expired sensitive fields under its lifecycle policy)
   - Record decommission date and reason

4. **Status transitions must be documented**: Changing an asset's status (active to maintenance, active to retired) requires a change record. Status changes must include a reason and be traceable to an issue.

5. **Periodic reconciliation**: The CMDB must be reconciled against live infrastructure at a regular cadence. Discrepancies (assets in CMDB not found on network, assets on network not in CMDB) must be investigated and resolved.

6. **Asset records must be complete**: An asset record missing critical fields (hostname, IP, owner, SLA tier) is considered incomplete. Incomplete records must be flagged for remediation.

7. **Authority does not mean indefinite retention**: Preserve the authoritative identity/status/history needed for CMDB traceability, while lifecycle policy may summarize, redact, archive, or dispose of expired sensitive fields and generated reconciliation evidence. A legal/compliance hold pauses disposition explicitly; it does not silently rewrite the policy.

8. **Publication is gated**: Asset records default to `restricted-infrastructure`. Every repository, issue/PR/comment, cross-repo, or export sink must pass the ops information-governance boundary before disclosure.

## Validation

When working with asset records:

- [ ] Asset exists in CMDB before any operational work is performed on it
- [ ] Decommission follows the full procedure (no direct deletion)
- [ ] Status changes have an associated change record
- [ ] Record contains all required fields (no blank critical fields)
- [ ] CMDB matches observed live state (or discrepancy is documented)

## Rationale

Shadow IT and untracked assets are the source of security blind spots, billing surprises, and recovery failures. The CMDB provides a single, auditable record of what exists, who owns it, and what SLA it carries. Deleting records without a decommission procedure erases institutional knowledge and breaks traceability for incident investigation.
