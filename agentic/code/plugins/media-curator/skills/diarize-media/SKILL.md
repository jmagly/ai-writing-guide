---
namespace: aiwg
platforms: [all]
name: diarize-media
description: Run local speaker diarization for acquired audio/video with WhisperX and pyannote, preserving anonymous speaker clusters in canonical transcript sidecars
script:
  entrypoint: scripts/diarize_media.mjs
  runtime: node
  cwd: project-root
  argsHint: "run --media <file> --output <sidecar.json> --credential-provider env:HF_TOKEN [--min-speakers N] [--max-speakers N]"
triggers:
  - "speaker diarization audio"
  - "diarize media"
  - "diarize audio speakers"
  - "diarize video speakers"
  - "transcribe and diarize media speakers"
  - "speaker clustering media"
category: media-curator
---

# Diarize Media

Run local speaker diarization for acquired audio/video and write a canonical
`aiwg.media.transcript.v1` sidecar. This is a dedicated routing skill for the
diarization part of the media-curator transcript workflow.

## What Diarization Means

Speaker diarization is anonymous clustering: it answers "which portions sound
like the same speaker?" with labels such as `SPEAKER_00` and `SPEAKER_01`.

Speaker identification is different: it maps an anonymous cluster to a verified
person. Do not replace anonymous labels with names unless acquisition metadata,
a human transcript, or explicit review evidence supports that mapping.

## Executable Adapter

The bundled adapter uses WhisperX plus pyannote Community-1:

```bash
HF_TOKEN="$TOKEN_FROM_OPERATOR_OR_VAULT" \
aiwg run skill diarize-media -- run \
  --media /path/to/interview.wav \
  --output .aiwg/media/transcripts/interview.transcript.json \
  --credential-provider env:HF_TOKEN \
  --min-speakers 2 \
  --max-speakers 2
```

The credential provider is a reference, not a token value. The adapter checks
the referenced environment variable before transcription starts, injects it into
the local WhisperX process environment, and never writes token values to argv,
disk, logs, state, provenance, or manifests.

## Preflight

```bash
aiwg run skill diarize-media -- preflight \
  --media /path/to/interview.wav \
  --output .aiwg/media/transcripts/interview.transcript.json \
  --credential-provider env:HF_TOKEN \
  --min-speakers 2 \
  --max-speakers 2 \
  --format json
```

Preflight checks:
- media readability and source SHA-256
- output directory writability
- `whisperx` availability
- `ffmpeg` availability warning
- CPU/GPU capability reporting
- gated-model authorization through the named credential provider

Missing authorization emits `aiwg.media.transcript-plan.v1` with
`status: blocked-credential-missing` before the expensive STT stage.

## Output And Degraded Mode

Successful runs produce the same canonical sidecar as `transcribe-media`, with
stable segment IDs, source and transcript hashes, tool provenance, anonymous
speaker labels, and quality limitations.

If WhisperX writes transcription/alignment JSON and then exits non-zero during
diarization, the adapter preserves the completed output as a valid sidecar with
`transcript.quality.status: degraded-diarization-failed`. If no native JSON is
available, it writes an actionable transcript plan instead of fabricating text.

## References

- @$AIWG_ROOT/agentic/code/frameworks/media-curator/skills/transcribe-media/SKILL.md — Shared transcript sidecar schema and WhisperX adapter
- @$AIWG_ROOT/agentic/code/frameworks/media-curator/skills/provenance-tracking/SKILL.md — Provenance model for derived media artifacts
