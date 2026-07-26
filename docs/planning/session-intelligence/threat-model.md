# Session Intelligence Threat Model and Risk Register

## Assets

- Provider transcripts and attachments.
- Normalized sessions/events and search projections.
- Extracted candidates and promoted memory.
- Source, derivation, review, promotion, and deletion lineage.
- Workspace/provider authorization boundaries.

## Trust Boundaries

1. Provider-owned source to AIWG bounded reader.
2. Raw provider record to normalization/redaction.
3. Approved normalized evidence to search or optional embeddings.
4. Evidence to model-assisted extraction.
5. Candidate review to memory/KB promotion.
6. Lifecycle command to repository/index cleanup.

All transcript fields, tool outputs, links, attachments, and provider metadata
are untrusted.

## Required Controls

- Explicit source/account authorization; no ambient home scan.
- Canonical allowed roots, regular-file checks, bounded streaming, and schema
  validation.
- No execution or URL fetching from transcript content.
- Classification and secret/PII redaction before derived processing.
- Workspace/provider scope enforced in repository queries before ranking.
- Evidence citations and fixed-schema validation for extracted candidates.
- Synthetic/redacted fixtures only.
- Previewable deletion with content-free terminal receipt.
- Content-free audit events for mutations and sensitive reads.

## Risk Register

| ID | Risk | Severity | Required mitigation | Verification |
|---|---|---:|---|---|
| SI-R01 | Traversal, symlink, special-file, or oversized import | High | Allowed roots, canonical paths, regular files, configurable bounds | Negative and fuzz fixtures |
| SI-R02 | Prompt/tool injection during extraction | Critical | Treat content as data, fixed output schema, no tools/network, citation validation | Prompt-injection corpus fails closed |
| SI-R03 | Secrets/PII leak through index, snippet, embedding, export, or logs | Critical | Pre-index detection/redaction, approved display fields, content-free logs | Canary secrets absent from every derived surface |
| SI-R04 | Cross-workspace/provider data bleed | Critical | Repository-level scope predicates before ranking | Cross-scope negative queries return zero hits |
| SI-R05 | Schema drift silently corrupts evidence | High | Version probes, unknown-major fail closed, opaque unknown events | New-major fixture creates no partial normalized state |
| SI-R06 | Mutable active source yields torn import | High | Complete-record reads, provider API/snapshot preference, provisional consistency | Concurrent append and SQLite snapshot tests |
| SI-R07 | Candidate hallucination or unsupported claim | High | Mandatory citations, confidence/conflict state, explicit review | Uncited candidate cannot persist or promote |
| SI-R08 | Incomplete deletion leaves searchable or derived copies | High | Impact preview, idempotent cascade, orphan checks, terminal receipt | Search/orphan checks after purge |
| SI-R09 | Provider deletion claim exceeds evidence | High | Separate archive/provider/AIWG/purge states | Provider-specific deletion fixtures |
| SI-R10 | Real sensitive data enters fixtures | High | Synthetic fixtures, secret/PII lint, fixture namespace | CI blocks credential/PII canaries |
| SI-R11 | Search snippet reveals restricted fields | High | Snippets only from approved redacted projection | Restricted fields absent from results |
| SI-R12 | Bulk input exhausts local resources | Medium | Quotas, streaming, checkpoints, bounded queues, graceful failure | Large/repetitive corpus stress tests |
| SI-R13 | Promoted memory survives source purge without warning | High | Dependency report and explicit revoke/supersede decision | Purge cannot silently remove or retain promotion |
| SI-R14 | Optional remote model/backend receives data without consent | Critical | Local default, operation-specific network authorization and preview | Network denied by default in integration tests |

## Security Acceptance Gate

Release is blocked unless:

- Injection canaries never invoke tools or network access.
- Known secret/PII canaries are absent from search, embeddings, extraction
  payloads, exports, diagnostics, and receipts.
- Cross-scope queries and promotions fail closed.
- Unknown source schemas create no visible partial sessions.
- Purged content is absent from all AIWG-owned search and candidate surfaces.
