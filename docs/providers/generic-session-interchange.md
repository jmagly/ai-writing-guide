# Generic Session Interchange

Status: manual import only

Evidence date: 2026-07-26

Tested contract: `aiwg.session-interchange` schema `1.0.0`

## Purpose

The generic adapter imports an explicitly selected AIWG interchange file when
no provider-specific adapter applies. It does not discover sources and does not
guess provider semantics from arbitrary JSON keys.

## Format

The interchange is UTF-8 JSONL. The first record is a mandatory header:

```json
{"type":"aiwg.session-interchange","schemaVersion":"1.0.0","product":"exporter-name","productVersion":"1.0.0","sourceId":"selected-source-id","exportedAt":"2026-07-26T12:00:00Z","consistency":"complete","lifecycle":"complete","workspace":{"id":"workspace-id"},"provenance":{"exporter":"exporter-name","exporterVersion":"1.0.0","sourceClass":"manual-export"}}
```

Following records have `type: "event"` and require `sessionId`, `eventId`,
nonnegative `sequence`, `kind`, `text`, and `lifecycle`. Timestamps must be RFC
3339 with `Z` or an explicit numeric offset. Unknown fields are retained under
the `native.generic` normalized extension.

## Safety and limitations

- Selection and allowed-root authorization are explicit; home-directory
  scanning and network acquisition are not supported.
- Unknown schema majors, arbitrary JSON, missing or duplicate identities,
  ambiguous local timestamps, malformed records, and truncated tails fail
  closed.
- Transcript text is untrusted data. It is redacted before normalized
  persistence and cannot invoke commands, tools, URLs, plugins, or workflows.
- The adapter preserves declared product, workspace, lifecycle, provenance,
  extensions, and unknown fields. It does not infer absent provider semantics.
- Raw provider data is never modified. Deleting an AIWG import removes only
  AIWG-owned normalized and derived copies according to the session lifecycle
  policy; it does not delete the manually selected export.

## Verification

Synthetic fixtures live under `test/fixtures/sessions/generic/`. They cover a
valid v1 interchange, opaque future event kinds, redaction canaries, duplicate
IDs, ambiguous timestamps, unknown schema majors, arbitrary opaque input, and
a truncated provisional file. No real-user transcript data is included.
