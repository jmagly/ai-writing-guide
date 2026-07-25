---
namespace: aiwg
platforms: [all]
name: Transcribe Media
description: Produce timestamped transcript sidecars for acquired audio/video with hashes, source metadata, speaker labels when available, and explicit degraded plans when STT tooling is missing
script:
  entrypoint: scripts/transcribe_media.mjs
  runtime: node
  cwd: project-root
  argsHint: "run --media <file> --output <sidecar.json> [--source-url <url>] [--diarize] [--credential-provider env:HF_TOKEN]"
triggers:
  - "transcribe video"
  - "transcribe audio"
  - "transcribe podcast"
  - "transcribe lecture"
  - "generate transcript sidecar"
  - "timestamped transcript for research"
  - "video audio research induction"
category: media-curator
---

# Transcribe Media

Create a research-grade transcript sidecar for a local acquired audio or video file. This primitive supports media-curator to research handoff. It does not claim transcription support unless an actual local STT tool, approved service adapter, human transcript, or diarization sidecar is available.

## Inputs

Required:
- Local acquired media path.

Optional:
- Source URL, title, creator, acquired-at timestamp, acquisition ID, language.
- Existing transcript or diarization sidecar.
- Adapter options: `--adapter whisperx`, `--model`, `--device`, `--compute-type`,
  `--min-speakers`, `--max-speakers`, `--diarize`, `--no-diarize`.
- Credential provider reference for gated diarization models. Use
  `--credential-provider env:HF_TOKEN` or another environment variable name
  supplied by an operator/vault wrapper. Never pass token values on argv.

## Executable Adapter

Run local transcription with:

```bash
aiwg run skill transcribe-media -- run \
  --media /path/to/acquired-media.wav \
  --output .aiwg/media/transcripts/acquired-media.transcript.json \
  --source-url "https://example.invalid/source" \
  --adapter whisperx \
  --language en
```

Run diarized transcription when Hugging Face gated-model access is already
available through the environment:

```bash
HF_TOKEN="$TOKEN_FROM_OPERATOR_OR_VAULT" \
aiwg run skill transcribe-media -- run \
  --media /path/to/interview.wav \
  --output .aiwg/media/transcripts/interview.transcript.json \
  --adapter whisperx \
  --diarize \
  --credential-provider env:HF_TOKEN \
  --min-speakers 2 \
  --max-speakers 2
```

The adapter never accepts token literals as CLI arguments and never writes token
values to sidecars, degraded plans, logs, or provenance. It only records the
credential provider type and variable name.

Useful subcommands:

```bash
aiwg run skill transcribe-media -- preflight --media file.wav --output out.json --diarize
aiwg run skill transcribe-media -- convert-whisperx --input native.json --media file.wav --output out.json
aiwg run skill transcribe-media -- run --media file.wav --output out.json --diarize
```

## Output

Write transcript sidecars under `.aiwg/media/transcripts/` or beside the acquired media when the collection already stores sidecars locally.

Recommended filename: `<media-basename>.transcript.json`

Required fields:
- `schema`: `aiwg.media.transcript.v1`
- `source.path`, `source.url`, `source.sha256`
- `transcript.sha256`, `transcript.language`, `transcript.generated_at`, `transcript.tool`, `transcript.quality`
- `segments[]` with stable `id`, `start`, `end`, `text`, and optional `speaker`
- `provenance.wasDerivedFrom`, `provenance.generatedEntity`, `provenance.activity`, `provenance.used`

Segment IDs MUST be stable. Use zero-padded sequential IDs such as `seg-000001` unless the upstream transcript already has durable IDs.

## Hashing

- `source.sha256` is the SHA-256 of the exact local media file bytes.
- `transcript.sha256` is the SHA-256 of the canonical transcript payload used for citation, not the pretty-printed JSON file.
- The canonical payload is the UTF-8 join of `id`, `start`, `end`, `speaker` if present, and `text` for every segment, separated by tabs and newlines.
- Use the same lowercase `sha256:<hex>` convention as media-curator integrity manifests.

## Speaker Labels

Preserve speaker labels when STT output, a diarization sidecar, or a human transcript provides them. If no diarization is available, emit the documented single-speaker fallback `SPEAKER_00` and record the limitation in `transcript.quality.limitations`.

Do not invent speaker names. Replace `SPEAKER_00` with real names only when metadata or human verification proves them.

## Tooling Detection

Check for an available transcription path before generating text:

```bash
command -v whisperx || command -v whisper-cpp || command -v whisper || command -v vosk-transcriber || true
command -v ffmpeg || true
```

If no STT tool or approved transcript source is available, do not fabricate transcript text. Write or report an actionable plan with:
- `schema`: `aiwg.media.transcript-plan.v1`
- `status`: `blocked-tooling-missing`
- source path and source hash when the media file can be read
- next steps for installing local STT tooling or providing a human transcript
- quality limits stating that no transcript hash exists until segment text exists

For WhisperX diarization, preflight MUST check gated-model authorization before
starting transcription. Missing `env:<name>` credentials produce a
`blocked-credential-missing` transcript plan before any expensive STT pass.

## Verification Limits

A generated transcript is evidence of tool output, not proof of exact speech content. Handoff notes MUST state:
- Machine transcripts can contain word errors, omissions, and hallucinated punctuation.
- Speaker labels are provisional unless diarization or human review supports them.
- Speaker diarization is anonymous clustering. It may produce labels such as
  `SPEAKER_00` and `SPEAKER_01`; it does not verify personal identity.
- Speaker identification means replacing anonymous clusters with verified names
  only after explicit metadata or human evidence supports the mapping.
- Research induction should cite the transcript hash and source media hash together.
- Human verification is required before using quotations in high-stakes or published claims.

## Research Handoff

Include the transcript sidecar path, source media hash, transcript hash, source URL, acquisition metadata, quality status, and known limitations.

## Fixture Example

See `examples/sample.transcript.json` for a minimal transcript sidecar with timestamps, speaker fallback, source URL, source hash, transcript hash, and provenance fields.

## References

- @$AIWG_ROOT/agentic/code/frameworks/media-curator/skills/integrity-verification/SKILL.md — SHA-256 manifest and fixity conventions
- @$AIWG_ROOT/agentic/code/frameworks/media-curator/skills/provenance-tracking/SKILL.md — W3C PROV-O derivation model for media artifacts
- @$AIWG_ROOT/agentic/code/frameworks/media-curator/skills/diarize-media/SKILL.md — Dedicated speaker-diarization routing skill
- @$AIWG_ROOT/docs/integrations/media-curator-to-research-handoff.md — Research handoff expectations for media-derived artifacts
