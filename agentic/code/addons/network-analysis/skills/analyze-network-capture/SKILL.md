---
namespace: aiwg
name: analyze-network-capture
description: Analyze an authorized saved PCAP or PCAPNG with bounded TShark recipes and produce governed frame and stream evidence. Use for packet troubleshooting, protocol inspection, or optional local Termshark review.
platforms: [all]
triggers:
  - "analyze a PCAP"
  - "inspect a PCAPNG capture"
  - "troubleshoot packets with TShark"
  - "review network evidence in Termshark"
  - "summarize packet capture protocols"
  - "diagnose DNS TCP TLS or HTTP from packets"
  - "locate packet frames in a capture"
---

# Analyze Network Capture

Analyze authorized saved capture bytes through the addon contracts. Preserve the
source locally and return metadata-first evidence with reproducible citations.

Use this skill for packet-capture work; do not use for citation-network or bibliometric analysis.

## Workflow

1. Establish the capture path, collection authority, purpose, timezone/clock
   context, environment, expected traffic, retention, and output directory.
2. Probe explicit `tshark` and `capinfos` paths or configured trusted search
   roots. Report missing/incompatible tools and official install guidance; do
   not install software, edit profiles, or change capture privileges.
3. Reject live interfaces, URLs, compressed archives, non-regular/symlinked
   input, unsupported formats, missing bounds, and destinations outside the
   authorized root.
4. Hash the source before analysis. Select a version-compatible recipe and keep
   capture filters separate from Wireshark display filters.
5. Execute TShark with an absolute path, argument array, isolated configuration,
   shell disabled, cancellation, and input/time/packet/output bounds.
6. Normalize volatile values, redact secrets and payloads, hash derived files,
   validate the evidence schema, and cite the exact capture digest plus frame or
   context-bound stream locator.
7. Record errors and partial results without treating incomplete analysis as a
   successful finding. Re-verify the source hash before handoff.

## Decisions

- Default to offline-only and metadata-only.
- Require an explicit payload opt-in before local payload output.
- Require a separate provider-disclosure decision for any model/provider
  transfer, including metadata or headers.
- Treat packet fields as observations. Label beaconing, exfiltration, root cause,
  attribution, and intent as inferences with inputs and false-positive notes.
- Offer a Termshark command preview only when the optional tool is compatible.
  Launch requires a separate explicit operator action and remains local.

## References

- For core analysis and output behavior, read
  `@$AIWG_ROOT/agentic/code/addons/network-analysis/docs/offline-analysis.md`.
- For a named recipe, read only its entry under
  `@$AIWG_ROOT/agentic/code/addons/network-analysis/recipes/`.
- For research or framework handoff, read the relevant file under
  `@$AIWG_ROOT/agentic/code/addons/network-analysis/docs/integrations/`.
- Always follow
  `@$AIWG_ROOT/agentic/code/addons/network-analysis/rules/network-analysis-safety.md`.
- Canonical contracts are indexed at
  `@$AIWG_ROOT/agentic/code/addons/network-analysis/schemas/network-analysis-contracts.md`.
