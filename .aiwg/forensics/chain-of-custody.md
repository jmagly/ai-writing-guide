# Chain of Custody Log

> This document records the collection, transfer, and storage of all evidence for the referenced case.
> Every person who handles evidence MUST log a transfer entry. Gaps in custody chain may compromise
> the admissibility of evidence. Complete all fields — do not leave entries blank.

---

## Case Information

| Field | Value |
|-------|-------|
| Case ID | `{{case_id}}` |
| Case Title | `{{case_title}}` |
| Target System | `{{hostname}}` |
| Investigation Date | `{{investigation_date}}` |
| Lead Investigator | `{{investigator_name}}` |
| Authorized By | `{{authorized_by}}` |
| Authorization Reference | `{{authorization_ref}}` |
| Classification | `{{classification}}` |
| This Document Version | `{{doc_version}}` |
| Last Updated | `{{last_updated}}` |

---

## Evidence Item Register

Each distinct piece of evidence collected during this investigation. Assign a unique ID (E-001, E-002, etc.) to each item at time of collection. Never reuse IDs within a case.

| ID | Description | Source Path / Location | Collection Date/Time | Hash Algorithm | Hash Value | Collected By | Integrity Verified |
|----|-------------|----------------------|---------------------|---------------|-----------|-------------|-------------------|
| E-001 | `{{evidence_desc_1}}` | `{{source_path_1}}` | `{{collection_datetime_1}}` | SHA-256 | `{{hash_1}}` | `{{collector_1}}` | `{{verified_1}}` |
| E-002 | `{{evidence_desc_2}}` | `{{source_path_2}}` | `{{collection_datetime_2}}` | SHA-256 | `{{hash_2}}` | `{{collector_2}}` | `{{verified_2}}` |
| E-003 | `{{evidence_desc_3}}` | `{{source_path_3}}` | `{{collection_datetime_3}}` | SHA-256 | `{{hash_3}}` | `{{collector_3}}` | `{{verified_3}}` |

### Collection Notes

```
{{collection_notes}}
```

### Evidence Inventory Commands Used

```bash
# Hash all files in evidence directory at collection time
find /evidence/{{case_id}} -type f -exec sha256sum {} \; > /evidence/{{case_id}}/evidence_hashes.sha256

# Verify hashes later (run to confirm no tampering)
sha256sum -c /evidence/{{case_id}}/evidence_hashes.sha256
```

---

## Custody Transfer Log

Record every transfer of evidence between individuals or storage locations. A transfer occurs any time evidence moves from one person's control, or from one storage location, to another.

| Transfer ID | Date / Time | From (Name / Location) | To (Name / Location) | Purpose | Evidence Items | Signature / Confirmation |
|-------------|-------------|----------------------|---------------------|---------|---------------|-------------------------|
| T-001 | `{{transfer_datetime_1}}` | `{{from_1}}` | `{{to_1}}` | `{{purpose_1}}` | `{{items_1}}` | `{{signature_1}}` |
| T-002 | `{{transfer_datetime_2}}` | `{{from_2}}` | `{{to_2}}` | `{{purpose_2}}` | `{{items_2}}` | `{{signature_2}}` |
| T-003 | `{{transfer_datetime_3}}` | `{{from_3}}` | `{{to_3}}` | `{{purpose_3}}` | `{{items_3}}` | `{{signature_3}}` |

**Transfer Protocol:**

- Confirm hash values match before and after any transfer involving digital media
- Both parties must acknowledge the transfer in writing (or via tracked ticketing system)
- Physical media transfers require secure packaging and a transport manifest
- Remote transfers (e.g., SCP, SFTP) must use encrypted channels; log source and destination IPs

---

## Evidence Integrity Verification

Record results of integrity checks performed after collection and after each transfer. A failed check requires immediate escalation — do not continue using the evidence until the discrepancy is resolved.

| Check ID | Date / Time | Evidence Item(s) | Expected Hash | Computed Hash | Result | Performed By | Notes |
|----------|-------------|-----------------|--------------|--------------|--------|-------------|-------|
| IC-001 | `{{check_datetime_1}}` | `{{check_items_1}}` | `{{expected_hash_1}}` | `{{computed_hash_1}}` | `{{result_1}}` | `{{checker_1}}` | `{{check_notes_1}}` |
| IC-002 | `{{check_datetime_2}}` | `{{check_items_2}}` | `{{expected_hash_2}}` | `{{computed_hash_2}}` | `{{result_2}}` | `{{checker_2}}` | `{{check_notes_2}}` |

**Integrity Failure Protocol:**

If a hash mismatch is detected:

1. Immediately quarantine the affected evidence item.
2. Document the discrepancy in this log (do not alter or delete the mismatched entry).
3. Notify `{{integrity_escalation_contact}}`.
4. Do not use the affected evidence in the investigation until the source of the mismatch is determined.
5. If the original source system is still accessible, re-collect the affected item and restart its custody chain.

---

## Storage Location

| Period | Location | Access Control | Custodian |
|--------|----------|---------------|-----------|
| Active investigation | `{{active_storage_path}}` | `{{active_access_control}}` | `{{active_custodian}}` |
| Post-investigation archive | `{{archive_storage_path}}` | `{{archive_access_control}}` | `{{archive_custodian}}` |
| Offsite backup (if applicable) | `{{offsite_storage_path}}` | `{{offsite_access_control}}` | `{{offsite_custodian}}` |

**Retention Period:** `{{retention_period}}`

**Destruction Authorization:** Evidence may only be destroyed after written authorization from `{{destruction_authority}}` and not before `{{earliest_destruction_date}}`.

---

## Notes

```
{{general_notes}}
```

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | `{{doc_creation_date}}` | `{{investigator_name}}` | Initial document |
| `{{version_2}}` | `{{date_2}}` | `{{author_2}}` | `{{changes_2}}` |
