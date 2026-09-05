---
ref_id: REF-XXX
title: "Descriptive title for the packet-evidence source"
source_type: packet-evidence
evidence_bundle_id: "packet-evidence:<id>"
capture_digest: "sha256:<hex>"
collection_authority_ref: "authorization:<id>"
inducted_at: YYYY-MM-DD
---

# REF-XXX: {Packet evidence title}

## Evidence Citation

Use a locator emitted by the evidence bundle:

```text
pcap:sha256:<capture-digest>#frame=<number> @ <UTC timestamp>
pcap:sha256:<capture-digest>#stream=<tcp|udp>:<id>&context=<context-digest> @ <UTC timestamp>
```

The timestamp supplements the digest-bound locator. A stream citation is valid
only with the analysis-context digest that defines its stream numbering.

## Collection Context

- **Owner**: {source owner or custodian}
- **Authority**: {collection authorization reference and basis}
- **Purpose**: {why the capture was collected}
- **Representativeness**: {covered hosts, interfaces, period, and sampling limits}
- **Clock source**: {clock source and synchronization confidence}
- **Source timezone**: {timezone or explicitly unknown}
- **Missing traffic**: {drops, excluded interfaces, asymmetric paths, gaps}
- **Encryption visibility**: {metadata visible and content unavailable}
- **Analyst limitations**: {skills, tools, time, access, and scope limits}

## Observed Facts

List facts with `kind: observation` from the evidence bundle. Preserve each
statement, confidence value, and packet locator. Do not rewrite a heuristic as
an observed fact.

## Inferences

List `kind: inference` claims separately with their declared input evidence,
method, false-positive conditions, and cautious language. Corroborate important
behavioral conclusions with independent sources where possible.

## Limitations

Record representativeness, clock/timezone, missing traffic, encryption, capture
status (`completed`, `partial`, or `empty`), tool limits, and analyst limits.

## Provenance

- **Evidence bundle**: {bundle ID, schema version, status, created time}
- **Capture identity**: {SHA-256 digest; local raw path omitted}
- **Tool**: {TShark version and executable identity}
- **Analysis context**: {context digest, filter digests, profile, config digests}
- **Recipe**: {recipe ID and version}
- **Derived artifacts**: {artifact IDs, media types, URIs, SHA-256 digests}

## Source Quality

- **Scholarly classification**: non-scholarly observational evidence
- **GRADE study rating**: not applicable
- **Assessment basis**: collection authority, capture integrity, analysis
  reproducibility, representativeness, and recorded limitations

## Raw Capture Decision

Default: raw capture excluded. Record only sanitized derived artifacts and the
capture digest. Inclusion requires an exact approval reference, approved actor,
basis, matching capture digest, and a policy that explicitly permits raw-packet
output. Never treat corpus induction as provider-transfer authorization.
