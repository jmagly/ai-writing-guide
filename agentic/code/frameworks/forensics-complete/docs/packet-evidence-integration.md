# Governed packet evidence integration

The `network-analysis` addon owns TShark probing, safe execution, recipe
compilation, evidence contracts, hashes, and portable locators. The existing
forensics Network Analyst remains authoritative for investigative
interpretation, correlation, IOC decisions, timeline reconstruction, and final
findings. This integration supplies evidence; it does not replace that role or
duplicate its PCAP playbooks.

## Evidence manifest and custody

Use `createForensicPacketEvidenceEntry` after a `PacketEvidenceBundle` reaches
the forensic case boundary. Independently verify the capture SHA-256, then
record the case/evidence IDs, sender, recipient, UTC receipt time, storage
location, and collection authorization. The entry carries:

- source and bundle identity and status
- TShark executable path/version and exact canonical argv
- capture/display-filter and config digests
- sanitized derived-artifact identities
- stable frame and context-bound TCP/UDP stream locators
- restricted, payload-withheld handling defaults

`appendPacketEvidenceToForensicManifest` adds this entry without changing older
manifest records. Continue logging later access, movement, integrity checks, and
custody transfers in the case's `chain-of-custody.md`.

## Analysis and findings

Reuse the Network Analyst's IOC, timeline, beaconing, exfiltration, lateral
movement, DNS, TLS, and stream-analysis practices. Begin with the bounded recipe
matching the question, then correlate packet observations with host, DNS,
firewall, proxy, identity, and application evidence. A pattern such as regular
timing or encrypted transport is a candidate for analysis, not proof of C2,
exfiltration, or malicious intent.

`createForensicNetworkFinding` requires severity, confidence, observation or
analyst-inference classification, analyst, UTC time, false-positive notes, and
locators already registered in the evidence manifest. Findings retain capture
digest and full analysis-context provenance.

ATT&CK associations are contextual mappings that the analyst must validate:

| Context | Technique |
| --- | --- |
| Web-protocol behavior relevant to C2 analysis | [T1071.001 — Web Protocols](https://attack.mitre.org/techniques/T1071/001/) |
| DNS behavior relevant to C2 analysis | [T1071.004 — DNS](https://attack.mitre.org/techniques/T1071/004/) |
| Evidence of an encrypted channel used to conceal activity | [T1573 — Encrypted Channel](https://attack.mitre.org/techniques/T1573/) |

Do not map ordinary DNS, HTTP, or TLS traffic to ATT&CK solely because the
protocol appears in a trace. Record the behavior and supporting context that
makes the technique applicable.

## Security review

For preventive review, use packet evidence to validate expected network
controls and protocol exposure: segmentation, egress policy, service ports,
DNS policy, encryption coverage, plaintext metadata exposure, and before/after
control behavior. Route evidence-bearing incident work to `forensics-complete`.
Security-engineering prepares this handoff and does not collect live evidence.

All security recipes operate on saved captures through the offline analyzer.
They cannot initiate active scans, select interfaces, elevate capture
privileges, or start live capture. A payload-sensitive finding requires an
explicit approval reference and a policy that permits payload output. Provider
disclosure remains a separate decision.

## End-to-end example

1. Start the custody log and confirm investigation authority.
2. Verify a preserved capture's SHA-256 and run a bounded offline recipe.
3. Validate the bundle and append its packet-evidence entry to the case manifest.
4. Give the evidence locators to the Network Analyst for existing DNS, TLS,
   stream, beaconing, exfiltration, lateral-movement, IOC, and timeline analysis.
5. Record only analyst-confirmed findings with severity, confidence,
   false-positive notes, ATT&CK context where justified, and packet citations.
6. Apply payload and disclosure policy before including sensitive content or
   moving any artifact outside the case boundary.
