# Offline operation and troubleshooting

## Offline cache states

| State | Meaning | Required action |
|---|---|---|
| warm and verified | cache digest and revision match a verified receipt | bounded reads may proceed |
| cold | no usable cache exists | rebuild from an available local canonical source |
| stale | a newer known revision exists | rebuild; do not report current |
| corrupt | digest or structure validation fails | quarantine, diagnose, and rebuild |
| wrong revision | cache is valid but bound to another revision | select the correct revision or rebuild |
| unverifiable | evidence needed to establish freshness is absent | label unverifiable; do not upgrade to verified |

Offline means no network adapter invocation, including authentication,
capability probing, telemetry, redirects, schema retrieval, or fallback. A
local cache hit alone does not prove offline compliance.

## Stable diagnostic guide

| Diagnostic | Meaning | Corrective action |
|---|---|---|
| `DATASET_ADAPTER_UNAVAILABLE` | adapter missing or incompatible | install/qualify the declared version; do not substitute silently |
| `DATASET_SCHEMA_MISMATCH` | data and bound schema disagree | inspect rejects and create a reviewed schema revision |
| `DATASET_CHECKPOINT_MISMATCH` | cursor binding changed | restart from a compatible committed checkpoint or re-plan |
| `DATASET_CAPABILITY_PENDING` | capability lacks passing evidence | use an approved fallback or wait; do not claim support |
| `DATASET_RECEIPT_UNVERIFIABLE` | receipt/digest chain cannot be proven | preserve artifacts and rebuild/verify from canonical input |
| `DATASET_PRIVACY_DOWNGRADE` | projection weakens classification | stop and retain the stronger classification |
| `DATASET_NETWORK_FORBIDDEN` | operation would use network under offline policy | select a local source/cache or obtain a new reviewed policy |
| `DATASET_BACKEND_MISMATCH` | backend cannot meet the plan | renegotiate capability and create a new plan |

Runtime implementations may use additional codes. Consult the installed CLI
help and emitted structured diagnostic; do not pattern-match free-form text.
