# Network Analysis

Network Analysis is an optional AIWG addon for inspecting an authorized saved
PCAP or PCAPNG. It produces bounded, reproducible packet metadata with source
digests, tool and recipe provenance, explicit limitations, and frame or stream
locators. It can support troubleshooting, research evidence, incident review,
security control review, and change verification.

Ask your agent to deploy the `network-analysis` addon for the active provider,
then describe the saved capture, collection authority, purpose, expected
traffic, retention policy, and question to answer. The agent starts with a
metadata-only overview and chooses the smallest versioned recipe that addresses
the question.

AIWG does not bundle packet-analysis programs. Install a maintained Wireshark
release from the [official download page](https://www.wireshark.org/download.html)
to provide TShark and Capinfos. [Termshark](https://github.com/gcla/termshark)
is an optional local terminal viewer. The addon never installs these tools,
starts live capture, changes privileges, scans hosts, or transfers capture data.

Raw captures are Restricted evidence, and packet metadata can identify people
or systems. Local analysis permission does not permit payload extraction or
provider disclosure. Retention, redaction, disclosure, and verified cleanup are
recorded at the point where evidence or local viewer state is created.

The source package contains the detailed operator guide, recipe catalog,
Termshark handoff, framework integration index, compatibility matrix,
architecture record, schema reference, fixture guide, maintainer guide, and
release checklist. Unsupported tool versions and missing required fields fail
closed; missing Termshark only disables the optional viewer handoff.
