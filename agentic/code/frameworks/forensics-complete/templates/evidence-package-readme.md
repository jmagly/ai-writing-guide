# Evidence Package README

| Field | Value |
|---|---|
| Case ID | `{{case_id}}` |
| Package ID | `{{package_id}}` |
| Created | `{{created}}` |
| Created By | `{{created_by}}` |
| Storage Location | `{{storage_location}}` |

## Contents

| Path | Description | SHA-256 | Source | Collection Time |
|---|---|---|---|---|
| `{{path_1}}` | `{{description_1}}` | `{{sha256_1}}` | `{{source_1}}` | `{{collection_time_1}}` |

## Verification

```bash
sha256sum -c evidence_hashes.sha256
```

## Custody

All transfers for this package must be recorded in:

```text
.aiwg/forensics/chain-of-custody.md
```

## Handling Notes

- Preserve original timestamps where possible.
- Do not edit evidence files in place.
- Store derived analysis outputs separately from raw evidence.
- Document any decompression, conversion, or parsing step as derived work.
