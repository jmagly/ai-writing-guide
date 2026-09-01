---
namespace: aiwg
platforms: [all]
name: public-meeting-reconcile
description: Reconcile a supplied public-meeting transcript, vote ledger, and official minutes while preserving uncertainty and requiring human verification.
script:
  entrypoint: scripts/meeting_reconcile.mjs
  runtime: node
  cwd: project-root
  argsHint: "<vote-ledger.json> <meeting-reconciliation.json>"
triggers:
  - reconcile a public meeting transcript with minutes
  - validate a vote ledger
  - compare meeting votes and approved minutes
---

# Public Meeting Reconcile

## Process

1. Resolve the jurisdiction/source/recording posture before media acquisition.
2. Reuse media-curator transcription and research-complete media induction when
   installed; otherwise emit `blocked-dependency-missing` rather than text.
3. Keep media, transcript, vote ledger, and minutes reconciliation versioned
   separately. Record agenda item, motion text/state, mover, seconder,
   timestamp, citation, member votes/abstentions/recusals/absences, and both
   announced and calculated results. Never identify a speaker from diarization
   alone.
4. Run the executable gate. Conflicts, inferred votes, unverified official
   labels, and missing source cues block.
5. A human verifies each material motion, vote, speaker label, and public/closed
   boundary before any handoff to publication.

## Output

JSON gate results plus a reviewed reconciliation packet; never official minutes.

## References

- `schemas/vote-ledger.schema.json`
- `schemas/meeting-reconciliation.schema.json`
- media-curator `transcribe-media` and `diarize-media`; research-complete `induct-media`
