---
ref_id: REF-XXX
title: "Short descriptive title of media source"
source_type: video            # video | audio | podcast | lecture | interview | talk
source_url: "https://example.invalid/watch?v=..."
platform: "YouTube"           # YouTube | Internet Archive | podcast feed | direct hosting | other
duration: "HH:MM:SS"
published: YYYY-MM-DD         # upload, publication, or recording date when known
speakers:
  - name: "Lastname, First"
    prof-id: PROF-P-slug      # omit when unresolved
channel_or_venue:
  name: "Channel, podcast feed, conference, course, or venue"
  prof-id: PROF-O-slug        # PROF-O for org/venue/channel when known; free text otherwise
transcript_path: "media/transcripts/REF-XXX-title.transcript.json"
transcript_hash: "sha256:<hex>"
media_storage:
  policy: hash-only           # copied | lfs | object-storage | hash-only
  path: "media/video/REF-XXX-title.mp4"
  sha256: "sha256:<hex>"
license: "platform ToS only | CC-BY | public domain | permission recorded | unknown"
---

# REF-XXX: {Media Title}

<!--
Time-based media reference template for videos, lectures, podcasts, talks, and
interviews. Use this when the source is consumed through a recording plus a
timestamped transcript, not a PDF. The paper templates remain unchanged.
-->

## 1. Citation

{Speaker or channel} ({published year}). *{Title}* [{source_type}; {duration}]. {Platform or venue}. {source_url}

Timestamp citations use:

`@.aiwg/research/findings/REF-XXX.md @ HH:MM:SS - "exact transcript quote"`

## 2. Media Profile

- **Source type**: {video | audio | podcast | lecture | interview | talk}
- **Platform**: {platform}
- **Channel / venue**: {name and PROF-O/PROF-S when known}
- **Speakers**: {speaker list and PROF-P IDs when known}
- **Duration**: {HH:MM:SS}
- **Publication / recording date**: {date or unknown}
- **License posture**: {explicit license, platform ToS only, permission recorded, unknown}

## 3. Referenced By

(To be populated as downstream documents cite this media source.)

### 3b. Profiles

- Speakers reuse `PROF-P-<slug>` with role `speaker`.
- Channels, podcast feeds, conference series, courses, and recording venues use
  `PROF-O-<slug>` when they are organizations/venues or `PROF-S-<slug>` when
  they are discovery sources/feeds.

## 4. Executive Summary

{2-4 paragraphs. State the recording's thesis, important claims, and why it
matters for this corpus. Distinguish what is said in the recording from later
interpretation.}

## 5. Summary

{Longer narrative summary grounded in the transcript. Use timestamp anchors for
major sections:

### [00:00:00] Opening / setup
### [00:12:34] Main argument
### [00:42:10] Questions / discussion
}

## 6. Key Findings

1. **{Finding header}** - {specific claim with timestamp anchor}.
2. ...

## 7. Context / Format

{Describe whether this is a peer-reviewed venue talk, institutional lecture,
course recording, podcast interview, panel, livestream, or informal upload.
Record production context and moderation/interview format where relevant.}

## 8. Evidence and Transcript Method

- **Transcript path**: `{transcript_path}`
- **Transcript hash**: `{transcript_hash}`
- **Source media hash**: `{media_storage.sha256}`
- **Transcript origin**: {machine transcription tool, human transcript, platform captions}
- **Speaker labeling**: {verified names, diarization labels, or single-speaker fallback}
- **Known limitations**: {machine transcript errors, missing captions, uncertain speaker IDs}

## 9. Key Timestamps

| Timestamp | Speaker | Exact transcript quote | Why it matters |
|---|---|---|---|
| 00:00:00 | SPEAKER_00 | "{exact quote}" | {claim or context} |

Quotes MUST match the transcript text exactly. Do not quote from machine
transcripts in high-stakes or published claims until human verification has
checked the segment.

## 10. Cross-References

In-corpus connections:
- **REF-YYY** ({short title}) - {how this recording cites, discusses, extends, or contradicts it}

Citation network: [REF-XXX-citations.md](../citations/REF-XXX-citations.md)

## 11. External References

- Source page: {source_url}
- Local media: `{media_storage.path}` or hash-only record
- Transcript: `{transcript_path}`
- Channel / venue page: {URL if available}

## 12. Citation Record

Use BibTeX only when there is a stable scholarly record. Otherwise record a
plain source citation:

```text
{Speaker}. "{Title}." {Platform or venue}, {published}, {source_url}. Accessed YYYY-MM-DD.
```

## 13. Revision History

- YYYY-MM-DD - Initial media induction ({agent / human identifier}).

## 14. Document Classification

- **Tier**: {Time-based media | Lecture | Podcast | Interview | Conference talk}
- **Quality**: {A / A- / B / C / D - rationale using media GRADE guidance}
- **Relevance**: {VERY HIGH / HIGH / MEDIUM / LOW - for this corpus's themes}

GRADE guidance:
- Peer-reviewed or official conference recording with traceable venue: A- when
  the content is substantive and source integrity is verified.
- Credible institutional lecture or course recording: B+ by default.
- Podcast or informal interview with identifiable experts: B by default.
- Unvetted platform upload, unclear speaker identity, or no transcript
  verification: C until corroborated.

## 15. Implementation Relevance

{How this media source informs downstream design, research direction, teaching,
or corpus synthesis. If none, record cross-corpus relevance instead.}
