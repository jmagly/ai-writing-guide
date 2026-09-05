# Governed recipe catalog

Each JSON file is a complete `network-analysis.analysis-recipe/v1` document.
Recipes operate on saved PCAP/PCAPNG input, declare hard limits and sensitivity,
request metadata fields only, and produce packet evidence with capture-digest and
frame or context-bound stream locators.

| Recipe | Direct observations | Heuristic boundary |
| --- | --- | --- |
| `overview` | Frame identity, timing, length, decoded protocols | None |
| `endpoints-conversations` | Link/network addresses, ports, streams, counts | Volume needs an environment baseline |
| `dns` | Queries, responses, codes, transaction/timing metadata | Periodicity or label entropy can only trigger review |
| `tcp-health` | Flags, stream IDs, retransmission/zero-window labels, ACK timing | Capture loss and asymmetry can resemble degradation |
| `tls` | Handshake, SNI, certificate metadata, versions/ciphers, alerts | Encryption is common and is not malicious by itself |
| `http-metadata` | Method, host, status, timing, stream | Periodicity and baseline differences can only trigger review |
| `stream-selection` | Stream/frame membership, sequence and reassembly length | Selection does not assign intent |
| `beaconing-timing` | Timestamp, length, peer, and stream observations | At least five intervals plus an environment baseline are required |
| `before-after` | Independently governed normalized capture summaries | Association with a change requires comparable conditions |

Heuristics always include their method and false-positive conditions. The DNS,
HTTP/beaconing, and encrypted-channel review contexts refer to MITRE ATT&CK
[T1071.004 DNS](https://attack.mitre.org/techniques/T1071/004/),
[T1071.001 Web Protocols](https://attack.mitre.org/techniques/T1071/001/), and
[T1573 Encrypted Channel](https://attack.mitre.org/techniques/T1573/). These are
classification references, not claims that an observed flow is malicious.
Security-oriented interpretation defers to the existing
`forensics-complete/agents/network-analyst.md` authority and its playbook; the
recipes supply reproducible packet facts and bounded hypotheses rather than
replacing investigative judgment.

## Compatibility

The initial catalog supports maintained TShark 4.4.x and 4.6.x. Runtime
compilation checks the exact detected version and probed field inventory.
Missing optional fields produce recorded diagnostics. A declared replacement is
used only when the replacement was also probed. Missing required fields and
unsupported versions fail closed with an actionable version/field diagnostic.

`before-after` is applied independently to two captures. Each result keeps its
own digest and analysis context; a downstream comparison may proceed only after
checking capture point, filter, duration, load, topology, clock, missing traffic,
and encryption comparability.
