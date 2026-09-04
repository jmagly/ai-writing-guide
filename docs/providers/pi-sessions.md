# Pi session acquisition

AIWG discovers Pi v3 JSONL session trees only inside explicitly authorized roots. The default Pi root is `${PI_CODING_AGENT_SESSION_DIR}` when set, otherwise `~/.pi/agent/sessions`; callers may select an explicit export instead.

The adapter preserves native entry IDs and parent IDs as provenance, maps messages, model/thinking changes, compaction, summaries, labels, and custom entries, and retains unknown entry types as opaque records. Tool results and custom extension data are redacted at ingestion. Unknown session majors, malformed or truncated JSONL, oversized records, duplicate IDs, symlinks, and paths outside the authorized root fail closed.

Verification lives in `test/unit/sessions/pi-adapter.test.ts` and the shared provider conformance and repository importer suites.
