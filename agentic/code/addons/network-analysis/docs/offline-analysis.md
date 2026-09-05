# Bounded offline capture analysis

The analyzer reads an authorized saved PCAP or PCAPNG through a private,
digest-verified snapshot. It never selects a capture interface, changes capture
permissions, follows an input symlink, or modifies the source file.

## Programmatic interface

The installed `aiwg` package exports `analyzeOfflineCapture`,
`serializePacketEvidence`, and `writePacketEvidence`:

```js
import { analyzeOfflineCapture, writePacketEvidence } from 'aiwg';

const bundle = await analyzeOfflineCapture({
  capturePath: '/authorized/case/input.pcapng',
  tshark: { path: '/usr/bin/tshark', version: '4.6.8' },
  recipe: {
    id: 'core-metadata',
    version: '1.0.0',
    displayFilter: 'ip || ipv6',
  },
  authorizationRefs: ['authorization:case-owner-001'],
});

await writePacketEvidence(bundle, {
  root: '/authorized/case/output',
  path: '/authorized/case/output/evidence.json',
  format: 'json',
});
```

Probe TShark first and pass the compatible absolute path and detected version.
The analyzer does not discover executables through the ambient `PATH`.

## Bounds and isolation

Default limits are 256 MiB of input, 100,000 packets, 32 MiB of subprocess
output, and five minutes. Callers may lower them. Hard ceilings prevent callers
from widening execution past 2 GiB, 1,000,000 packets, 128 MiB of output, or one
hour. TShark runs with an empty `PATH`, UTC/C locale, an isolated HOME and
Wireshark configuration directory, a fixed argument array, and shell execution
disabled. Timeout and cancellation kill the child process.

Compressed files, URLs, symlinks, directories, unsupported magic, short capture
headers, and files above the requested byte limit fail before TShark runs. The
source is hashed, copied through an open descriptor into a private mode-0600
snapshot, compared to its recorded identity, and re-hashed after analysis.

## Metadata and redaction

The default allowlist covers frame identity and timing, Ethernet/IP endpoints,
TCP/UDP ports and streams, DNS queries, TCP reset/retransmission flags, TLS
handshake metadata, and HTTP method/host/status metadata. Payload, raw bytes,
cookies, authorization fields, credentials, secrets, key logs, extracted file
data, and reassembled data are rejected as requested fields and ignored if a
dissector emits them anyway.

The output records Restricted source handling, metadata-only derived handling,
withheld disclosure, tool and recipe versions, exact display-filter digest,
selected fields, bounds, canonical argv, source and derived hashes, and stable
frame and context-bound stream citations. A capture-summary observation records
the protocol hierarchy, endpoint and conversation counts, timing, TCP
retransmission/reset indicators, and encrypted-transport count. IP addresses,
DNS names, SNI, and HTTP hosts can still be
sensitive metadata; a provider disclosure decision remains required before
sharing any result with a model or other external provider.

## Results and errors

`completed` means bounded execution produced at least one evidence item with no
errors. `empty` means the supported capture produced no selected packets.
`partial` means cancellation, timeout, output exhaustion, or a failing TShark
process left parseable evidence; the error record states the limiting event and
the count preserved. `error` means no successful analysis result was available.

JSON is a canonical object, JSONL is one canonical bundle per line, and Markdown
is a human summary with frame locators. Writers create a new mode-0600 file and
reject an existing path or a destination outside the authorized real output
root. Derived output is hashed independently after the file is synced.
