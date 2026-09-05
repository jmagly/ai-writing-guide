# Packet evidence for operations verification

Use the network-analysis `overview`, `dns`, `tcp-health`, `tls`, `http-metadata`,
`stream-selection`, and `before-after` recipes for protocol troubleshooting and
change validation on authorized saved captures. Record environment identity,
topology assumptions, vantage point, traffic scenario and isolation, load,
sample window, and clock alignment before comparing results.

`comparePacketEvidenceForVerification` links the exact requirement, test,
defect/change, build, evidence bundle, capture digest, and recipe. It compares
summary counts and protocol hierarchy while excluding volatile endpoint
identities, ephemeral ports, frame/stream numbers, absolute timestamps, and
capture hashes from the metric comparison. The identities remain in the audit
record for traceability.

A comparison is incomparable when recipe, display filter, TShark version,
topology fingerprint, or completion state differs. Unknown or misaligned clocks
produce a partially comparable result with timing excluded. Do not force a
numerical delta across incomparable inputs.

For DNS, TCP, TLS, and HTTP diagnosis, report direct observations such as query
metadata, retransmission/reset counts, encrypted-transport presence, response
codes, or bounded duration. Dependency-path and performance conclusions must
include load, topology, vantage point, sample window, and clock conditions.
These observations do not by themselves establish which component caused a
latency or retry change.

## Change-validation example

1. Record `CHG-240`, the requirement/test IDs, baseline and candidate build IDs,
   and the shared topology fingerprint.
2. Generate the same controlled traffic for both captures and run the same
   `before-after` recipe and TShark version.
3. Compare the bundles. Stop if the report is incomparable; resolve the
   mismatch and repeat with a new evidence record.
4. Add the report to `.aiwg/ops/audit/` through the governed evidence boundary,
   then record the runbook verification result and any rollback decision.

## Defect example

For a retry defect, attach the failing build's sanitized evidence record to the
defect card, cite the frames/streams supporting the observation, and record the
known-good comparison. After the fix, repeat the same synthetic or controlled
scenario and attach the new bundle. State the observed delta and retain the
non-causal performance language until broader evidence supports attribution.

## CI traffic boundary

CI examples must create deterministic synthetic client/server traffic in an
isolated namespace or container network and capture only that fixture. They must
never select a shared runner interface or capture unrelated runner traffic.
Publish sanitized bundle JSON and derived artifact hashes; raw PCAP is a
restricted, explicitly approved artifact with short retention.
