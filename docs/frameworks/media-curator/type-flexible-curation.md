# Type-Flexible Curation Decision

## Decision

Media Curator treats audio, video, transcripts, image sets, documents, and mixed
collections as first-class media inputs. The default entry point is an
assess-and-plan pass that identifies the asset types, source surfaces,
rights/license posture, metadata vocabulary, quality dimensions, fixity needs,
and downstream export or research handoff target.

Music and discography workflows remain supported, but they are specialized
paths selected only when the request, filenames, metadata, or source context
show that the collection is music-centered.

## Rationale

The original framework grew from music archive work, so several commands and
examples still mention artists, albums, or audio tools. Those examples are now
treated as one implemented specialization rather than the framework boundary.
For arbitrary media, starting with assess-and-plan prevents premature audio-only
assumptions while preserving the existing mature paths for music collections.

## Routing Rules

- Use `curate` for unknown or mixed media collections.
- Use music/discography skills when artist, album, track, tour, or release
  structure is explicit.
- Use `transcribe-media` for audio/video that needs research-grade timestamp
  evidence.
- Hand acquired media plus transcript sidecars to research-complete via
  `induct-media` when the target is a citable research corpus.
- Record source URL, acquisition method, rights posture, SHA-256 fixity, and
  provenance for every asset type, even when downstream tagging differs.

## Specialization Pattern

When an asset type deserves reusable support, add the narrowest specialized
tooling that fits the observed need:

1. Start with `curate` assess-and-plan and capture sample files, metadata,
   source URLs, expected outputs, licenses, and fixity requirements.
2. Prefer an existing library or CLI with stable maintenance and documented
   output formats.
3. Wrap the tool as a skill or small helper that preserves the generic contract:
   input discovery/acquisition, quality assessment, metadata/provenance,
   integrity, and export or handoff.
4. Keep type-specific fields in that specialized skill or plugin. Do not move
   them into the generic intake unless they apply across asset classes.
5. If the workflow is project-specific or experimental, author it as a
   project-local bundle under `.aiwg/{extensions,addons,frameworks,plugins}/`
   and promote upstream only after the contract stabilizes.

## Consequences

- New collection types do not require new top-level frameworks before they can
  be assessed and planned.
- Quality assessment is type-specific: audio fidelity, video resolution,
  transcript confidence, image/document legibility, uniqueness, and provenance
  are evaluated only where relevant.
- Existing music workflows remain stable but no longer define the generic
  capability language.
