---
artifact_type: cognitive_walkthrough
study: novice-user-adoption
workstream: B
related_uc: UC-NUA-002
related_us: [US-NUA-B-01, US-NUA-B-02, US-NUA-B-03]
status: draft
phase: construction
created: 2026-05-14
voice: technical-authority
---

# Cognitive Walkthrough — Project-Isolation Warning Text

## Purpose

Validate that the verbatim warning text shipped in `src/cli/project-isolation/warning.ts` does what UC-NUA-002 says it should: tell a novice user, at the moment `aiwg use` would otherwise deploy to a surprise location, *what is about to happen, what they can do, and how to escape*.

The text under review:

> "No project detected here. AIWG will deploy to the current directory. To associate AIWG with a specific project, run this from your project root. Continuing in 3 seconds — press Ctrl-C to cancel."

## Method

Cognitive Walkthrough is a discount-usability method (Wharton et al., 1994). For each task step, the analyst asks four questions:

1. Will the user try to achieve the right effect?
2. Will the user notice the correct action is available?
3. Will the user associate the correct action with the effect they want?
4. Will the user see that progress is being made toward their goal?

A "no" or "uncertain" answer flags a usability defect.

## Persona

**Novice user, first AIWG run.** They opened a terminal. The terminal landed in `$HOME`. They read or were told to run `aiwg use sdlc`. They have no prior context for what `aiwg use` does to a directory, no muscle memory for AIWG conventions, and no preference between deploying to `$HOME` vs. a project.

## Task

The user has typed `aiwg use sdlc` from `$HOME`. AIWG has not yet written any files. The warning has fired. The 3-second countdown is running.

## Walkthrough

### Step 1 — Read sentence 1: "No project detected here."

| CW Question | Assessment |
|---|---|
| Right goal? | The user's goal is "deploy AIWG." Sentence 1 reframes that goal as "deploy AIWG *somewhere*." That nudge is appropriate. ✅ |
| Notice correct action? | No action requested yet. The sentence is orientation. ✅ |
| Associate action with effect? | n/a |
| Visible progress? | Yes — the message is the system telling the user *what it sees*. ✅ |

**Finding**: clear. "No project detected here" sets up the rest without prescribing.

### Step 2 — Read sentence 2: "AIWG will deploy to the current directory."

| CW Question | Assessment |
|---|---|
| Right goal? | This is the consequence statement. A novice now knows the default action. ✅ |
| Notice correct action? | The sentence implies "if this is what you wanted, do nothing." That's a passive correct action and is appropriately visible. ✅ |
| Associate action with effect? | "Do nothing → deploy to cwd" is associable, but a novice who doesn't know what 'current directory' means in their shell may stall. ⚠️ |
| Visible progress? | Yes — confirms what is about to happen. ✅ |

**Finding**: minor. "Current directory" is correct terminology but assumes the user knows what `cwd` is. The 3-second delay (Step 5) is the safety net.

**Mitigation**: defer — adding `(/home/alice)` to the message would make it concrete but lengthens the warning past the natural pause point. Validate empirically in Workstream G.

### Step 3 — Read sentence 3: "To associate AIWG with a specific project, run this from your project root."

| CW Question | Assessment |
|---|---|
| Right goal? | This is the corrective instruction. ✅ |
| Notice correct action? | The action ("run this from your project root") is visible. ✅ |
| Associate action with effect? | A novice who has never thought of a "project root" may not know what it means. The phrase is jargon. ⚠️ |
| Visible progress? | Yes — gives the user something to do. ✅ |

**Finding**: moderate. "Project root" is industry-standard but novice-opaque. A novice may interpret it as a generic "some folder" rather than "the folder where your code lives."

**Mitigation**: defer to Workstream G empirical question on warning comprehension. If field data confirms the term is opaque, swap to "the folder containing your project (e.g., the folder with package.json, .git, etc.)." That phrasing is longer and the wording change must clear UC-NUA-002 as an artifact update.

### Step 4 — Read sentence 4: "Continuing in 3 seconds — press Ctrl-C to cancel."

| CW Question | Assessment |
|---|---|
| Right goal? | This is the escape hatch. ✅ |
| Notice correct action? | "Ctrl-C to cancel" is explicit and uses common terminal vocabulary. ✅ |
| Associate action with effect? | Ctrl-C → cancel is a near-universal terminal idiom. ✅ |
| Visible progress? | Yes — and the 3-second window gives time to act. ✅ |

**Finding**: clear. The escape hatch is well-marked.

### Step 5 — During the 3-second delay

| CW Question | Assessment |
|---|---|
| Right goal? | The user is now deciding: continue or cancel. ✅ |
| Notice correct action? | The previous step already pointed at Ctrl-C. ⚠️ — 3 seconds is short for a true novice reading every word. |
| Associate action with effect? | Yes, if they remember the Ctrl-C instruction. ⚠️ |
| Visible progress? | Implicit — there is no countdown UI. The user knows it will end in 3s but doesn't see the timer ticking. ⚠️ |

**Finding**: moderate. 3 seconds may be too short for novices who read slowly or whose terminals scrolled the warning out of view. No visible countdown means a user who hesitated has no indication of remaining time.

**Mitigations**:
- **Option A** — extend to 5 seconds. Trades urgency for accessibility. Defer the choice to Workstream G empirical data.
- **Option B** — render a live countdown (`...3...2...1...`). Higher cognitive scaffolding but adds terminal-rendering complexity. Out of scope for Workstream B.
- **Decision for this CR**: ship the spec'd 3 seconds. Flag for Workstream G measurement (US-NUA-G-01).

### Step 6 — User cancels (presses Ctrl-C)

| CW Question | Assessment |
|---|---|
| Right goal? | User wants to abort and re-run from a project. ✅ |
| Notice correct action? | The warning text already named the next step (Sentence 3). ✅ |
| Associate action with effect? | Yes. ✅ |
| Visible progress? | The process exits cleanly with no artifacts (UC-NUA-002 A2 postcondition). The user knows the deploy didn't happen because no output follows. ⚠️ — silent exit may leave a user wondering whether anything happened. |

**Finding**: minor. The cancel path is mechanically correct but emits no confirmation message. A novice might expect "Cancelled — no files written." The implementation currently returns exit code 130 with a `'Cancelled.'` message, which mostly addresses this.

**Code reference**: `src/cli/handlers/use.ts` returns `{ exitCode: 130, message: 'Cancelled.' }` on cancel.

### Step 7 — User does nothing → 3 seconds elapse → deploy continues

| CW Question | Assessment |
|---|---|
| Right goal? | The user accepts the default. ✅ |
| Notice correct action? | No action required. ✅ |
| Associate action with effect? | The next output the user sees is normal `aiwg use` deployment output. They get the result they asked for. ✅ |
| Visible progress? | Yes — deployment proceeds. An activity-log entry is also written (NFR-OBS-01). ✅ |

**Finding**: clear.

## Summary of Findings

| Step | Severity | Finding | Disposition |
|------|----------|---------|-------------|
| 1 | ✅ Clear | Orientation sentence does its job | Ship |
| 2 | ⚠️ Minor | "Current directory" assumes terminal literacy | Validate in Workstream G |
| 3 | ⚠️ Moderate | "Project root" is jargon for novices | Validate in Workstream G; reword if empirical data confirms confusion |
| 4 | ✅ Clear | Escape hatch is well-marked | Ship |
| 5 | ⚠️ Moderate | 3s is short; no countdown UI | Validate in Workstream G; consider 5s if data supports |
| 6 | ⚠️ Minor | Silent cancel could leave user uncertain | Currently emits `'Cancelled.'` via exitCode 130 — sufficient |
| 7 | ✅ Clear | Default path is clean | Ship |

## Acceptance Status

UC-NUA-002 acceptance criterion **"Cognitive Walkthrough confirms novice users correctly interpret the warning"** is **partially satisfied**:

- The warning is structurally correct: it orients, names the default, prescribes the correction, and exposes the escape hatch.
- Two terms ("current directory", "project root") are flagged as jargon-risk and routed to Workstream G empirical validation rather than reworded preemptively. This is consistent with the study's research-before-decision posture — wording changes should be driven by data, not analyst intuition.
- The 3-second delay is also flagged for Workstream G calibration.

The warning text **ships as specified** with the above three items recorded as Workstream G inputs.

## References

- UC-NUA-002: `../requirements/UC-NUA-002-runs-aiwg-use-first-time.md`
- SAD §5.1: `../architecture/software-architecture-doc.md`
- Test strategy §3: `../testing/test-strategy.md`
- US-NUA-G-01 (warning-comprehension empirical question): `../requirements/`
- Wharton, Rieman, Lewis & Polson (1994) — "The Cognitive Walkthrough Method: A Practitioner's Guide"

## Voice & Citation Notes

- Voice: technical-authority — direct, names trade-offs, no marketing softening
- Citations: Wharton et al. (1994) named without DOI here because the CW method is widely-documented foundational HCI work and not in the AIWG research corpus; corpus-grade citation can be added under research-papers if Workstream G's empirical validation cites it formally
