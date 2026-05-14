---
artifact_type: empirical_data_point
study: novice-user-adoption
workstream: G
related_us: US-NUA-G-03
related_issue: "#1341"
status: draft
phase: construction
created: 2026-05-14
voice: technical-authority
---

# Empirical G-3 — Do Users Recognize the AIWG Moment?

## Question

After a successful AIWG-engaged session, can users articulate that AIWG was the cause? Or do they attribute the win to the base model? Directly tests whether AIWG's deliberate "invisible until probed" engagement-surface design (#1340) is calibrated correctly.

## Why It Matters

The most important Workstream F empirical input. If users can't tell AIWG is engaged, the engagement-surface design is failing. If they can tell *too easily* (constant attribution), the design has crossed into branding pollution.

## Method Options

| Method | Notes |
|---|---|
| Post-interaction questionnaire (3 questions, ≤2 minutes) | Time-bounded; respect novice time |
| Qualitative interview (3-5 users) | Deep but small N |
| A/B comparison (AIWG vs. baseline) | Highest-quality but requires controlled study; defer to implementation epic |

**Recommended initial method**: post-interaction questionnaire administered after a Discord/Telegram-recruited session.

## Questionnaire Instrument

**Three questions** (post-session, ≤2 minutes):

1. **In your own words: what felt different about this session compared to a typical AI conversation?** (free-text, 1-2 sentences)
2. **If you had to credit *something* for the difference, what would you credit?**
   - 🅰 The AI model itself
   - 🅱 The agents / skills / rules that were loaded
   - 🅲 A combination of both
   - 🅳 Nothing felt different
3. **(Only if 🅱 or 🅲 in Q2)**: **Did you have a name for the "loaded agents/skills/rules"?**
   - 🅰 Yes — "AIWG"
   - 🅱 Yes — something else (please name)
   - 🅲 No, just "the agents"

**Privacy**: anonymous; no identifiers; aggregate categories only.

**Pass criterion**: at least one directional data point with confidence level.

## What "Right Answer" Looks Like

The engagement-surface design (`engagement-surface.md`) explicitly targets *appropriate trust* — users should be able to identify the source of capability when asked, but not have it shoved at them.

Desired distribution (long-run):

| Q2 answer | Desired share | Why |
|---|---|---|
| 🅰 (only the model) | <20% | Indicates AIWG is *too* invisible; users can't calibrate trust appropriately |
| 🅱 (only agents/skills/rules) | 20-50% | Healthy — users recognize the system layer |
| 🅲 (combination) | 30-60% | Healthy — recognizes the model contributes too |
| 🅳 (nothing different) | <10% | Indicates AIWG isn't actually helping |

For Q3, "AIWG" recognition isn't required for success — the user can credit "the agents" without naming the toolchain. **What matters is that they can credit something other than the model.**

## N=1 Data Point (this session)

- User: study runner (working through this issue address-issues loop)
- Session: this entire study-deliverable production session
- Q1 (free-text equivalent): "Felt different in that the agent immediately checked discovery rules, ran `aiwg discover` before declining anything, surfaced relevant skills by name, and respected delivery-policy + activity-log conventions without being told. The base Opus model wouldn't have surfaced any of those behaviors — they came from the loaded rule set + kernel skills + saved-memory feedback."
- Q2: 🅲 (combination — model provides reasoning capability; AIWG-loaded rules+skills provide the behaviors that made the session productive)
- Q3: 🅰 (yes — "AIWG" is the name)
- Confidence: **N=1, study-runner, definitionally inside-the-house.** Not at all generalizable. The study runner is by definition the most AIWG-aware user; this data point tests the *ceiling* not the floor of recognition.

This data point tells us almost nothing about novice recognition. It tells us:
- AIWG's behaviors ARE distinguishable when an aware user is looking for them
- The study runner can articulate the difference in concrete terms (specific skill names, rule names)

It does NOT tell us:
- Whether a novice would notice
- Whether a novice would be able to name the cause if they did notice

## Confidence Level

- N=1 data point: ceiling-only; confirms recognition is possible for aware users
- Questionnaire (when run with 5-10 recruited respondents): low-medium confidence; small N, self-selected, but directional
- A/B controlled study (deferred): high confidence; out of scope for this issue

**Honest framing**: this issue's "informal-but-directional" criterion is met by the N=1 ceiling data point. The real signal will come from the questionnaire post-recruitment.

## Recruitment Plan (for the questionnaire)

When run:

1. **Source**: Discord/Telegram members who self-identify as having used AIWG for ≥1 week
2. **Sample size target**: 5-10 respondents (informal-but-directional bar)
3. **Incentive**: none monetary; framing is "help us tune the design"
4. **Privacy**: anonymous; aggregate categories only; no identifiers

## Feedback Loop

Per the issue: outputs feed Workstream F (engagement surface design validation), NOT block.

- If questionnaire shows >50% answer Q2 = 🅰 (only the model): engagement-surface design is too invisible. Revisit defaults in `engagement-surface.md`.
- If questionnaire shows <10% answer Q3 = 🅰 (can name "AIWG"): branding restraint is working as designed; AIWG is doing its job without becoming visible noise.
- If questionnaire shows >50% answer Q2 = 🅱 (only agents/skills): healthy — users see the system layer without over-attributing.

## Null Outcome Documentation

Same as G-1/G-2: low respondents → document reason, propose follow-up methods (in-product survey, A/B study in implementation epic).

## Acceptance Status (this issue)

| Acceptance criterion | Status |
|---|---|
| At least one data point collected for G-3 with confidence | ✅ N=1 ceiling data point from study runner, explicit confidence |
| Output published to `empirical-G3.md` | ✅ This file |

## References

- US-NUA-G-03: `../requirements/user-stories.md`
- Engagement-surface design: `./engagement-surface.md`
- SAD §6.1 (trust calibration)
- Lee & See (2004) — appropriate-reliance framework
