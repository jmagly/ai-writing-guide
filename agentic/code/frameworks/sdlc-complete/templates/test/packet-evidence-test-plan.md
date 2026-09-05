# Packet Evidence Test Plan

- Verification ID:
- Requirement IDs:
- Test IDs:
- Baseline build/configuration ID:
- Candidate build/configuration ID:
- Baseline/candidate evidence bundle IDs and capture SHA-256 digests:
- Analysis recipe ID/version and display-filter digest:
- Environment IDs and topology fingerprints:
- Vantage point and topology assumptions:
- Traffic source, scenario, isolation, and unrelated-traffic exclusion:
- Load and sample-window conditions:
- Clock-alignment method, offsets, and tolerance:
- Expected DNS/TCP/TLS/HTTP, retry, reset, latency, or dependency-path result:
- Comparability result and excluded metrics:
- Stable packet citations:
- Derived-artifact attachments and disclosure classification:

For CI, generate deterministic synthetic traffic inside an isolated namespace or
equivalent test boundary. Start and stop a capture only inside that authorized
test fixture; never capture unrelated runner, host, or tenant traffic. Attach
sanitized evidence bundles and derived hashes by default, not raw captures.

Treat timing and count changes as observations under the recorded conditions.
Do not state that a build or configuration caused a difference without a design
and corroborating evidence that supports causal inference.
