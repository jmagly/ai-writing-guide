---
enforcement: critical
---

# Ops Information Governance Rules

**Enforcement Level**: CRITICAL
**Scope**: Agent responses containing collected operational data; audit files; generated artifacts; repository writes; commits; issue, PR, and comment bodies; cross-repository references or copies; exports; and bundles

## Principle

No collected operational payload crosses a response, persistence, or publication boundary directly. Every boundary applies the same sequence: resolve classification, minimize evidence, redact secrets, authorize the destination, and attach retention metadata. Filesystem or tracker access is not publication authorization.

## Mandatory Boundary

Before any write or submission, use the public `aiwg/governance` API (`prepareEvidenceForSink` or `publishEvidence`) or the CLI boundary:

```bash
aiwg ops evidence prepare \
  --input evidence-request.yaml \
  --policy .aiwg/ops/governance-policy.yaml \
  --output prepared-evidence.json
```

The request names the artifact identity/kind/category, payload, destination sink, evidence tier, and any scoped approval. The command writes a payload-free decision record to `.aiwg/ops/audit/governance-boundary.jsonl`. A denied result contains no publishable payload and MUST NOT be bypassed by copying from the source request.

## Required Order

1. Resolve artifact classification using explicit metadata, parent inheritance, kind/category defaults, then the project default.
2. Capture minimum sufficient durable evidence: outcome/status, bounded redacted excerpts, counts, and digests.
3. Apply text or nested-structured redaction. Streaming output MUST remain buffered until chunk-boundary-safe sanitization completes.
4. Gate the resolved classification against a named sink. Unknown sink visibility fails closed.
5. Attach creation time, policy ID/version, disposition deadline, tier, and lifecycle action.
6. Only then write the prepared value or submit it to a repository, issue, PR, comment, export, bundle, artifact store, or agent response.

## Classification and Sinks

Built-in classifications, from least to most restrictive, are `public`, `internal`, `confidential`, `restricted-infrastructure`, and `restricted-identity`. Project-defined classes MUST have a stable ID and numeric rank so ordering remains interoperable.

Sensitive ops kinds use non-public defaults. In particular, inventory/network/DR/raw evidence defaults to `restricted-infrastructure`; identity evidence defaults to `restricted-identity`. A public or less-trusted sink receives the full artifact only when its policy ceiling allows it. Otherwise the boundary denies or emits a separately gated, payload-free sanitized summary.

Classification downgrade, a cross-repository transfer marked `approval-required`, or an exceptional redaction bypass requires an approval scoped to the exact artifact and sink, with actor, reason, timestamp, and optional expiration. Audit records contain the approval ID and a digest of the reason, not the reason or artifact payload. Unknown sinks cannot be overridden.

## Redaction Guarantee

Built-in detectors cover authorization/cookie headers, tokens, passwords, private keys, connection strings, URL credentials and secret query parameters, sensitive environment/config keys, provider token formats, and encoded secret-bearing values. Project policy can add bounded organization patterns and sensitive key patterns without changing framework source.

Markers preserve the detector class and optional length/HMAC fingerprint for correlation. Diagnostics MUST contain markers, paths, counts, and fingerprints only—never detected values. Redaction is not encryption and cannot make an unauthorized destination acceptable.

If sanitization fails or exceeds a configured resource limit, external and persistent sinks fail closed. A redaction override is valid only when the sink explicitly permits overrides and the approval is scoped, current, and audited. Silent bypass is forbidden.

## Retention and Disposal

- Raw capture is a separate restricted tier with a short default TTL. It requires an explicit reason; raw evidence is never published to an immutable issue/comment sink.
- Durable evidence defaults to minimum sufficient content. Raw and durable tiers may use different access and retention policies.
- Policy rules can match artifact category, classification, sink, and tier, and can retain, summarize, redact fields, archive, or delete.
- Legal/compliance holds are explicit, audited, reversible, and pause disposition without changing the underlying deadline or policy.
- Disposal emits a payload-free receipt. Failures surface a stable error code and MUST be retried or escalated; a receipt never claims remote deletion that was not verified.
- Immutable issue/comment sinks receive only policy-approved, non-expiring sanitized summaries. Do not post evidence that depends on future deletion.

## Leak Remediation

If a secret or restricted payload crosses a boundary, stop further publication, preserve only payload-free incident evidence, notify the owner, revoke or rotate affected credentials, remove or restrict the destination where possible, and open the applicable incident/DFIR handoff. Re-run sanitization with a synthetic reproduction and update project patterns. Deletion from a local sink does not prove deletion from caches, mirrors, notifications, or immutable external systems.

## Enforcement

- **On violation**: halt before write/submission; return the boundary reason codes; request a policy or scoped approval change.
- **Severity**: CRITICAL—bypass can disclose credentials, identity data, topology, or recovery details.
- **Detection**: raw tracker bodies, direct artifact writes, complete stdout/stderr persistence without a raw-capture reason, missing lifecycle metadata, unknown sink IDs, payload-bearing decision logs, or publication after a denied boundary result.
