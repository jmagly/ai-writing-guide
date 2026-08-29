# Ops Evidence Governance

AIWG applies one mandatory boundary before operational data reaches an agent response, persistent file, repository, issue, pull request, comment, cross-repository transfer, export, or bundle. The boundary minimizes evidence, redacts secrets, checks artifact classification against a named destination, and attaches retention/disposition metadata.

## Public API

The installed package exports the governance API from `aiwg/governance` (and the root `aiwg` export):

```ts
import {
  createRedactionTransform,
  prepareEvidenceForSink,
  publishEvidence,
  redactStructured,
  redactText,
} from 'aiwg/governance';
```

`redactText()` sanitizes a complete string. `redactStructured()` recursively sanitizes nested JSON/YAML-compatible objects while retaining field names and paths. `createRedactionTransform()` is a bounded Node transform: it buffers one logical value and emits only after complete sanitization, so multiline keys and secrets split across chunks cannot leak partial bytes.

`prepareEvidenceForSink()` returns either a prepared payload plus resolved governance/lifecycle metadata, or a denial containing no publishable payload. `publishEvidence()` additionally calls a supplied sink writer only after preparation succeeds.

```ts
const result = await publishEvidence({
  artifact: {
    id: 'network-audit-2026-08-29',
    kind: 'ITNetworkState',
    category: 'network-inventory',
    payload: collectedState,
    status: 'complete',
  },
  sinkId: 'private-repository',
  policy,
  writer: async ({ payload, governance, lifecycle }) => {
    await persist({ payload, governance, lifecycle });
  },
});
```

The writer is never called for a denial. Persist the returned lifecycle metadata with every generated artifact: creation time, policy ID/version, disposition deadline, evidence tier, and lifecycle action.

## CLI Boundary

Agents and scripts that do not integrate the TypeScript API use:

```bash
aiwg ops evidence prepare \
  --input evidence-request.yaml \
  --policy .aiwg/ops/governance-policy.yaml \
  --output prepared-evidence.json
```

An input request has this shape:

```yaml
artifact:
  id: network-audit-2026-08-29
  kind: ITNetworkState
  category: network-inventory
  tier: durable
  status: complete
  governance:
    classification: restricted-infrastructure
    owner: network-operations
    handling:
      allowedSinks: [private-repository, encrypted-artifact-store]
      crossRepo: approval-required
      retentionPolicy: network-inventory-durable
  payload:
    status: complete
    stdout: "collected output"
    stderr: ""
sinkId: private-repository
```

Omit `--input` to read the JSON/YAML request from stdin. Omit `--output` to emit the prepared envelope to stdout. Every attempt appends a mode-`0600`, payload-free decision to `.aiwg/ops/audit/governance-boundary.jsonl` (or `--audit <path>`). A nonzero/denied result must not be bypassed by copying from the request.

## Redaction Contract

Built-in detectors cover:

- authorization and cookie headers;
- bearer/provider tokens, passwords, API keys, and sensitive environment/config assignments;
- multiline private keys;
- connection strings and URL user information;
- secret-bearing URL query parameters;
- sensitive nested field names;
- encoded values whose decoded content has a recognized secret form.

Project policy can add bounded organization regular expressions and sensitive-key expressions without modifying AIWG source. Pattern IDs are included in replacement markers, but detected values never appear in findings or audits. Invalid/high-risk expressions fail policy validation.

Replacement markers carry the class, optional byte length, and—when the API caller supplies `fingerprintKey`—a short HMAC-SHA256 fingerprint for correlation. Do not store a fingerprint key in the project policy or artifact. Load it at runtime from the organization's secret facility. Without a key, no fingerprint is emitted.

Redaction is a sink guarantee, not proof that the payload is public. It can produce false positives/negatives, does not replace encryption or destination authorization, and cannot retract data already copied to caches, notifications, mirrors, or immutable systems. External and persistent publication fails closed when sanitization is incomplete or exceeds a configured limit.

### Exceptional override

A redaction override requires all of the following:

- the sink explicitly sets `allowRedactionOverride: true`;
- an approval names the exact artifact and sink;
- approval ID, actor, non-empty reason, approval time, and optional future expiration;
- a boundary audit containing the approval identity and reason digest.

No override is inferred from filesystem/tracker capability. Unknown sink visibility cannot be overridden.

## Classification and Publication

Built-in classes have a stable order:

| Classification | Rank | Typical content |
|---|---:|---|
| `public` | 0 | Deliberately public material |
| `internal` | 10 | Routine non-public operations |
| `confidential` | 20 | Sensitive business/operational information |
| `restricted-infrastructure` | 30 | Topology, recovery, access paths, raw ops evidence |
| `restricted-identity` | 40 | Named users, entitlements, IdP/authentication data |

Projects may add stable class IDs with numeric ranks. Resolution order is explicit artifact metadata, inherited parent metadata, artifact-kind default, category default, then project/default `internal`. IT assets/services/network state, inventories, identity audits, DR evidence, and raw audit evidence receive secure non-public defaults.

The publication gate checks allowed sinks, destination visibility/maximum rank, and cross-repository handling. Unknown sink visibility fails closed. A downgrade or `approval-required` transfer needs approval scoped to the artifact and destination; the audit stores an approval reference and reason digest, never the payload or free-form reason.

When the destination permits summaries but not the full artifact, the boundary can create a separately gated summary containing only an artifact fingerprint, kind, stable status, omitted-field count, and redaction classes. It does not copy the artifact ID or source fields.

## Minimization, Retention, and Disposal

Durable evidence defaults to minimum sufficient data: stable status/outcome, exit code/timing, bounded redacted stdout/stderr excerpts, byte counts, and content/command digests. Full output uses the `raw` tier, requires an explicit reason, and defaults to a short TTL.

Retention rules can match category, classification, sink, and tier. Built-in secure defaults cover raw audit output, identity audits, network inventories, DR evidence, sanitized summaries, and generic durable summaries. Project rules take precedence when equally specific. Supported actions are:

- `retain` — keep under the current policy;
- `summarize` — replace detail with durable minimum evidence;
- `redact-fields` — remove configured fields;
- `archive` — transfer to a configured authorized archive;
- `delete` — securely remove through the sink adapter.

`executeLifecycle()` runs a due action through an adapter and emits a payload-free disposition receipt. Failure receipts contain a stable error code, not an exception message or removed content. `placeEvidenceHold()` and `releaseEvidenceHold()` create explicit reason-digested audit events; an active hold pauses disposal without changing the policy/deadline. `reapplyRetentionPolicy()` recomputes the deadline from the original creation time, so policy changes and already-expired records are handled immediately and deterministically.

Immutable issue/comment sinks reject raw evidence. Only an approved durable sanitized summary with a non-expiring policy can be posted; do not publish content whose safety depends on later deletion.

## Schemas and Project Policy

- `schemas/ops/governance-policy.schema.json` validates project classifications, redaction patterns, sinks, and retention rules.
- `schemas/ops/artifact-governance.schema.json` validates governance and lifecycle metadata on generated artifacts.
- Sensitive IT YAML schemas require governance/lifecycle metadata and their shipped templates provide secure defaults.

Start from `agentic/code/frameworks/ops-complete/templates/governance-policy.yaml`. Store project refinements at `.aiwg/ops/governance-policy.yaml`. Never store detector examples containing real secrets, approval reasons containing sensitive payloads, or fingerprint keys in this file.

## Leak Remediation

If a secret or restricted value is published, stop further publication, rotate/revoke exposed credentials, restrict or remove the destination where possible, and open the applicable incident/DFIR handoff using payload-free evidence. Search mirrors, notifications, caches, exports, and downstream copies. Add a synthetic regression and update project detectors. A successful local deletion receipt does not prove erasure from an external system.
