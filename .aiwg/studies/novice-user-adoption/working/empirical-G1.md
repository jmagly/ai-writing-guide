---
artifact_type: empirical_data_point
study: novice-user-adoption
workstream: G
related_us: US-NUA-G-01
related_issue: "#1341"
status: draft
phase: construction
created: 2026-05-14
voice: technical-authority
---

# Empirical G-1 — Where Do Users Run Their First `aiwg use`?

## Question

Where do users invoke `aiwg use` for the first time? Distribution of `cwd` between `$HOME` (or other top-level directory) and a project root. If a project root, what kind of project?

## Why It Matters

Tunes the Workstream B project-isolation warning threshold. If most first-time users are *already* in a project root, the warning is rarely shown and the design is fine. If many are in `$HOME`, the warning's UX quality determines a large fraction of first impressions.

## Method Options

| Method | Cost | Confidence yield | Recommended for |
|---|---|---|---|
| Discord/Telegram poll | Low | Medium (self-selected respondents) | Initial directional data |
| Opt-in instrumentation in `aiwg use` (writes to `.aiwg/activity.log`) | Medium | High (actual behavior, not self-report) | Long-term data; requires implementation |
| Qualitative interview (3-5 users) | High | Medium-high (deep but small N) | Disambiguating poll findings |

**Recommended initial method**: Discord/Telegram poll within the next CalVer cycle. Pair with opt-in instrumentation as a follow-up.

## Poll Instrument

**Channel**: Discord `#announcements` and Telegram channel.

**Question** (one-screen, three options + free-text):

> When you ran `aiwg use` for the first time, where were you?
>
> 🅰 In a project directory (had `.git/`, `package.json`, or equivalent)
> 🅱 In `$HOME` or another top-level location (no project files there)
> 🅲 In a scratch directory I made for AIWG specifically
> 🅳 Something else — reply with detail

**Follow-up question** (only for 🅰): "What kind of project? (software, research, marketing, other)"

**Privacy**: anonymous; no identifiers collected; aggregate counts only.

**Duration**: open for 7 days. Aggregate counts published as the data point.

**Pass criterion**: at least one directional data point with documented confidence level. The poll satisfies this on close.

## N=1 Data Point (this session)

Per the issue's "informal-but-directional data is acceptable" framing, recording one data point from the project owner is a legitimate first signal — explicitly noted as N=1 and not representative.

**Data point**:

- User: project owner (anonymized as `study-runner`)
- First `aiwg use` invocation: from a project root containing `.git/`, `package.json`, and many other signals
- Project type: software (AIWG itself — meta-case)
- Cwd at invocation: `/home/roctinam/dev/aiwg/`
- Outcome: deployment proceeded without warning (project signals present)
- Date observed: 2026-05-14
- Confidence: **N=1 single observation, self-reported from study runner**. Not generalizable. Used as smoke-test that the warning path correctly stays silent in this case.

## Confidence Level

- **N=1 data point**: directional only. Confirms the no-warning path works on a project-rich directory; says nothing about novice users.
- **Poll** (when run): expected N=10-50 based on Discord/Telegram engagement levels. Confidence will be medium — self-selected sample (only people who answer polls), but enough to direct future tuning.
- **Opt-in instrumentation** (when implemented): confidence high — actual behavior, but biased toward users who opt in (likely power users, not novices).

**Honest framing**: poll-confidence is medium and biased toward respondents who care; instrumentation-confidence is high but biased toward opt-ins. Neither method, alone, is representative of true novice users. Combined, they're directional.

## Feedback Loop

Per the issue: outputs feed Workstream B (warning threshold tuning), NOT block.

- If poll shows >50% start in `$HOME`-class locations: Workstream B's warning quality is high-leverage; consider the 5s-delay tuning question already flagged in `warning-text-cognitive-walkthrough.md`.
- If poll shows >80% start in project roots: the warning is rarely shown and the current 3s default is sufficient.

## Null Outcome Documentation

If the poll achieves <5 respondents (inconclusive), document the reason (low engagement window, channel choice, etc.) and propose follow-up:

- Try in-product opt-in survey
- Schedule a community office-hour with the question
- Wait for the next major release announcement window

Per the issue: null outcomes get follow-up methods, not "we tried and gave up."

## Acceptance Status (this issue)

| Acceptance criterion | Status |
|---|---|
| At least one data point collected for G-1, documented with confidence level | ✅ N=1 from study runner; explicit confidence noting |
| Output published to `empirical-G1.md` | ✅ This file |
| Confidence level documented | ✅ "N=1, directional only" |

The poll instrument is queued for the project owner to run during the comms window for ADR-NUA-001 (#1338) — two opportunities for one Discord post.

## References

- US-NUA-G-01: `../requirements/user-stories.md`
- SAD §6.6 (telemetry privacy)
- Test strategy §8
- NFR-OBS-02
