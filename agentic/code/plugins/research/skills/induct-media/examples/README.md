# induct-media worked fixture

A complete, self-contained example of the media-curator → research-complete
handoff. It demonstrates acquired-media metadata plus a transcript sidecar
flowing into research-complete artifacts. All values are illustrative
placeholders (zeroed hashes, `example.invalid` URL).

## Inputs (produced by media-curator)

| File | Producer | Schema |
|---|---|---|
| `sample.acquisition.json` | `/acquire` (media-curator) | `aiwg.media.acquisition.v1` |
| `sample.transcript.json` | `/transcribe-media` (media-curator) | `aiwg.media.transcript.v1` |

`sample.acquisition.json` is byte-identical to
`agentic/code/frameworks/media-curator/skills/acquire/examples/sample.acquisition.json`
— the same producer fixture, so the input contract is verified end to end.

## Outputs (produced by induct-media)

| File | Template | Notes |
|---|---|---|
| `expected-REF-101.md` | `templates/reference-media.md` | Media REF; `hash-only` storage (license is platform ToS only) |
| `expected-REF-101-citations.md` | `templates/citation-sidecar.md` | Spoken-reference table; verbal mention at 00:14:02 |
| `expected-REF-101-radar.md` | `templates/radar-sidecar.md` | Media GRADE B+ (institutional lecture) |

Plus index/search metadata (not shown as a file here) so `research-query` can
find the REF by title, speaker, source URL, channel/venue, source type, and
transcript text.

## Reproduce

```bash
/induct-media examples/sample.acquisition.json \
  --transcript examples/sample.transcript.json \
  --source-url "https://example.invalid/watch?v=lecture101" \
  --storage hash-only \
  --ref-id REF-101
```

## Consistency invariants demonstrated

- The acquisition `sha256` equals the transcript `source.sha256` — the transcript
  was derived from the acquired bytes.
- Every timestamp in the citation sidecar (00:14:02) and the REF's Key Timestamps
  (00:12:34, 00:14:02) points to a real segment in `sample.transcript.json`.
- Spoken quotes match the transcript segment text exactly.
- Storage is `hash-only` because `license: "platform ToS only"` — media is not
  copied into the corpus; the source media hash is the integrity anchor.
