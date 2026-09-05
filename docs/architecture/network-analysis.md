# ADR: Network analysis addon architecture and contracts

- Status: Proposed - contract implementation complete; construction gate pending #2279 approval
- Date: 2026-09-05
- Issue: #2270
- Decision owners: AIWG maintainers

## Context

AIWG needs a network-analysis capability that can inspect authorized saved
packet captures, preserve evidence identity, and hand sanitized observations to
research, forensics, security-engineering, SDLC, and ops workflows. The
architecture must support TShark first because TShark exposes stable offline
machine-readable output from the Wireshark family. Termshark remains useful for
human review, but its terminal UI is not a reliable automation contract.

Packet evidence has higher handling risk than ordinary logs. A capture can
contain credentials, payloads, hostnames, addresses, session keys, regulated
data, or third-party traffic. Contracts therefore need explicit source and
derived digests, frame and stream locators, tool/config versions, sensitivity,
redaction, retention, disclosure, provenance, and analysis errors. They also
need to separate observations from inferences so downstream frameworks can cite
facts without laundering model or recipe conclusions into packet facts.

## Decision

AIWG will implement `network-analysis` as a standalone addon with optional
framework adapters. The addon owns provider-neutral contracts and recipe
metadata. Framework adapters consume those contracts and may project them into
research records, forensic evidence, security findings, SDLC validation notes,
or ops runbooks, but those projections are not the canonical packet record.

The initial contract pair is:

- `schemas/network-analysis/packet-evidence.v1.schema.json`
- `schemas/network-analysis/analysis-recipe.v1.schema.json`

`PacketEvidenceBundle` is the canonical evidence handoff. It binds every
finding to a `capture_digest` and at least one locator. A packet citation
resolves to either `pcap:sha256:<digest>#frame=<number>` or
`pcap:sha256:<digest>#stream=<tcp|udp>:<id>&context=<sha256>`. Frame citations
are stable within the exact capture. Stream citations include a context digest
because stream numbering depends on tool version, executable path, profile,
configuration, argv, and filter identity. Evidence items declare
`basis = observation` or `basis = inference`.
Observations require observed fields. Inferences require method, input evidence
identities, and false-positive notes. Confidence uses the shared vocabulary
`observed`, `high`, `probable`, `possible`, and `unknown`.

The runtime helper in `src/network-analysis/citations.ts` defines the portable
citation normal form and exposes `formatEvidenceCitation` to convert the schema
locator shape into that URI form without losing the context digest.
After schema validation, `validateEvidenceReferences` checks capture/source
digest equality, derived artifact references, and citation/context membership.
`resolvePacketCitation` checks a locator against the reader's verified capture
identity and frame/stream inventory. These checks do not compute file hashes;
the future reader must verify source and derived bytes before supplying those
identities. `src/network-analysis/governance.ts` supplies the source and derived
file hashing/re-verification boundary; a syntactically valid digest alone is not
proof of integrity.

`AnalysisRecipe` is the canonical bounded-analysis request. It separates
capture filters from display filters structurally: capture filters require
`type = capture_filter`, BPF/libpcap language, and
`applied_before_capture = true`; display filters require
`type = display_filter`, Wireshark display-filter language, and
`applied_after_capture = true`. Recipes declare requested fields/statistics,
expected output schema, compatibility constraints, hard limits, payload policy,
sensitivity class, and reserved extension points for Zeek and Suricata.

The addon contract is TShark-first and Termshark-optional. A Termshark handoff
may record an operator command and display filter for interactive review, but
automation must not scrape Termshark screens or depend on private Termshark
cache files. Zeek and Suricata enrichment can be added later through explicit
adapter contracts without changing the packet-evidence identity model.

Security and privacy behavior is defined by the versioned governance-record
schema and the construction gate in
`docs/security/network-analysis-construction-gate.md`. The default policy is
offline-only, metadata-only, payload-denied, and provider-transfer-denied.
Live capture and provider disclosure are separate decisions with exact scopes
and expiry. Approval of the construction gate does not authorize either
operation.

## Alternatives Considered

### Couple automation to Termshark

Rejected because Termshark is a terminal UI for human packet review. Its screen
state and private cache formats are not stable provider-neutral contracts.

### Make framework adapters the source of truth

Rejected because research, forensics, SDLC, security, and ops need different
views over the same packet facts. The packet evidence bundle remains the
canonical record; framework artifacts are projections.

### Start with a Zeek or Suricata contract

Rejected for the first increment because TShark is the common offline extractor
for PCAP/PCAPNG fields and statistics. Zeek and Suricata remain named extension
points for later enrichment.

### Use untyped filter strings

Rejected because BPF/libpcap capture filters and Wireshark display filters have
different semantics and execution timing. The recipe schema keeps them in
separate typed arrays so consumers cannot confuse them structurally.

## Consequences

The addon can emit portable evidence without requiring a specific AI provider,
framework, or TUI. Downstream frameworks get stable citations and handling
metadata, while implementation work can proceed in small increments: scaffold,
tool probe, offline analyzer, recipe catalog, Termshark handoff, and adapters.

The cost is stricter contract maintenance. Any additive v1 changes require
schema examples, fixtures, and contract tests. Any semantic change that breaks a
previously valid packet-evidence or analysis-recipe record requires a new major
version and migration notes. Unsupported major versions fail closed.

## Explicit Non-Goals

- Bundle or redistribute Termshark, Wireshark, Zeek, or Suricata.
- Parse Termshark screen output or private cache files.
- Perform root escalation, silent interface capture, indefinite live capture,
  or covert monitoring.
- Store unrestricted payloads by default.
- Replace expert packet, incident-response, or forensic analysis.
- Implement analyzer execution, governance automation, or framework adapters in
  this issue.

## Verification Evidence

- Packet evidence schema:
  `schemas/network-analysis/packet-evidence.v1.schema.json`
- Analysis recipe schema:
  `schemas/network-analysis/analysis-recipe.v1.schema.json`
- Governance record schema:
  `schemas/network-analysis/governance-record.v1.schema.json`
- Threat model and gate:
  `docs/security/network-analysis-threat-model.md` and
  `docs/security/network-analysis-construction-gate.md`
- Fixtures:
  `test/fixtures/network-analysis/contracts/`
- Contract tests:
  `test/unit/network-analysis/contracts.test.ts`
