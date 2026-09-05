# Network Analysis

The `network-analysis` addon turns authorized saved PCAP and PCAPNG files into
bounded, reproducible packet evidence. TShark provides the machine interface.
Termshark is an optional local review surface and is never scraped or driven as
an automation API.

## Supported workflows

- Inspect capture identity, format, protocol hierarchy, endpoints, flows, and
  DNS/TCP/TLS/HTTP metadata.
- Run versioned recipes with explicit display filters, fields, limits, and
  provenance.
- Produce provider-neutral evidence with source/derived hashes and stable frame
  or context-bound stream citations.
- Hand sanitized derived evidence to research, forensics, security, SDLC, and
  operations workflows.
- Preview an optional Termshark command for explicit local operator review.

## Prerequisites

Install a maintained Wireshark release that provides `tshark` and `capinfos`.
Termshark 2.4.0 or later is optional. AIWG does not bundle, install, update, or configure
these third-party programs and never changes capture privileges.

Use explicit absolute executable paths or trusted search roots. The capability
probe reports missing or incompatible tools with official installation links;
it does not mutate the host. See
[`docs/network-analysis/compatibility.md`](../../../../docs/network-analysis/compatibility.md).

## Install and discover

```bash
aiwg use network-analysis --provider codex
aiwg discover "analyze a PCAP"
aiwg discover "troubleshoot packets with TShark"
aiwg discover "review network evidence in Termshark"
```

The deployed `analyze-network-capture` skill works across supported providers.
Discovery phrases intentionally include packet/capture context so academic
citation-network analysis routes elsewhere.

## Safety defaults

- Saved-capture analysis is offline-only. No interface selection, live capture, privilege
  escalation, or active scanning occurs implicitly.
- Raw captures are Restricted evidence. Source bytes stay local, read-only, and
  hash-identified.
- Output is metadata-only by default. Raw packets and payload require explicit
  local opt-in; provider transfer requires a separate exact disclosure decision.
- Subprocesses use absolute executables and argument arrays with shell execution
  disabled. Runtime, input, packet, file, and output sizes are bounded.
- Retention, redaction, cleanup, authority, and limitations travel with evidence.

The approved construction controls are in
[`docs/security/network-analysis-construction-gate.md`](../../../../docs/security/network-analysis-construction-gate.md).
Approval of that gate does not authorize any live capture or provider transfer.

## Ownership boundaries

The addon owns tool probing, safe execution, recipes, evidence contracts, and
handoffs. The existing forensics network analyst remains authoritative for
investigative interpretation. Research retains its own source-quality model;
security owns control findings; SDLC and operations own verification and change
decisions.

## Contents

| Path | Purpose |
| --- | --- |
| `skills/analyze-network-capture/` | Main governed workflow and conditional references |
| `rules/network-analysis-safety.md` | Mandatory authorization, privacy, execution, and integrity boundaries |
| `templates/analysis-request.md` | Operator scope and limitations record |
| `templates/termshark-handoff.md` | Explicit local review record |
| `schemas/network-analysis-contracts.md` | Canonical schema index |
| `docs/` | Workflow, integration, maintenance, and troubleshooting guides |

The [offline analyzer guide](docs/offline-analysis.md) documents the exported
runtime API, hard bounds, error states, metadata allowlist, and local output
formats.

The [governed recipe catalog](recipes/README.md) covers overview, endpoints and
conversations, DNS, TCP, TLS, HTTP metadata, streams, beaconing/timing, and
before/after comparison with explicit heuristic and compatibility boundaries.

The [Termshark handoff guide](docs/termshark-handoff.md) explains reviewed local
launches, profiles, remote-host boundaries, large-capture disk behavior, and
explicit cleanup records.

## License

AIWG content is MIT licensed. Wireshark/TShark and Termshark remain separately
installed and licensed third-party software.
