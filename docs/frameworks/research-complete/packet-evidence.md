# Packet evidence in a research corpus

`packet-evidence` is a first-class source type for governed observations from a
saved PCAP or PCAPNG. It is separate from papers, preprints, and other scholarly
sources. Do not assign a GRADE study rating to a network trace. Assess collection
authority, source integrity, reproducibility, representativeness, and limits.

## Induction workflow

1. Run a bounded offline network-analysis recipe and validate the resulting
   `PacketEvidenceBundle`.
2. Supply a `REF-NNN`, source title, owner, authority reference, purpose,
   representativeness, clock source, source timezone, missing-traffic statement,
   encryption visibility, and analyst limitations.
3. Call `inductPacketEvidenceSource`. The default result includes the bundle
   identity, sanitized derived-artifact descriptors, tool/filter/config
   provenance, and observed/inferred claims. It does not include raw capture
   bytes or a raw capture inclusion record.
4. Write the result into the corpus using
   [`reference-packet-evidence.md`](https://github.com/jmagly/aiwg/blob/main/agentic/code/frameworks/research-complete/templates/reference-packet-evidence.md).
5. Link synthesis claims to the emitted digest-bound frame or context-bound
   stream citations. Keep observations and inferences in separate sections.

```ts
const source = inductPacketEvidenceSource({
  refId: 'REF-240',
  title: 'Checkout timeout trace, controlled reproduction',
  evidence,
  collection: {
    owner: 'team:payments',
    authorityRef: 'authorization:incident-240',
    purpose: 'Reproduce the reported checkout timeout',
    representativeness: 'One staging client and service during a 60-second run',
    clockSource: 'Host NTP; synchronization not independently measured',
    timezone: 'America/New_York',
    missingTraffic: 'No packet-drop counters were available',
    encryptionVisibility: 'TLS metadata visible; application payload unavailable',
    analystLimitations: ['Single vantage point', 'No production traffic'],
  },
});
```

Each research citation retains the portable packet locator and, when the frame
timestamp exists, its UTC observation time. Tool version, executable path,
display/capture-filter digests, profile, config digests, recipe, and collection
authorization remain attached to the source record.

## Raw capture inclusion

Raw inclusion is off by default. A caller must provide an exact capture-bound
approval record and a network-analysis policy whose local-output rules permit
raw packets with explicit opt-in. This records the approved source URI and
digest; it does not perform a copy or authorize transfer to an external
provider. Apply corpus storage and retention controls separately.

## Synthesis guidance

Use observed claims for facts directly present in selected frames, such as an
address, port, response code, reset, retransmission, or timing measurement. Use
inferred claims for interpretations such as beaconing, service behavior, or
adversary activity. State the method and false-positive conditions, and avoid
generalizing beyond the captured interfaces, hosts, and time window.
