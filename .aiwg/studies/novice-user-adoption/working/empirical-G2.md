---
artifact_type: empirical_data_point
study: novice-user-adoption
workstream: G
related_us: US-NUA-G-02
related_issue: "#1341"
status: draft
phase: construction
created: 2026-05-14
voice: technical-authority
---

# Empirical G-2 — Where Do Users Open AI Sessions?

## Question

Do users open their AI agent sessions at a project root, in a subdirectory of a project, or in `$HOME`? Affects whether per-provider rule-file scanning (which is typically rooted at cwd or close ancestors) actually fires.

## Why It Matters

Rule files like `.claude/rules/*.md`, `.github/copilot-instructions.md`, `.cursor/rules/*.mdc` are scanned from the agent's invocation directory. If users open sessions from `~/dev/` rather than `~/dev/specific-project/`, the per-project rules don't load.

This is the Workstream A "rule hook" column's empirical input.

## Method Options

| Method | Notes |
|---|---|
| Poll (Discord/Telegram) | Same instrument as G-1; one extra question |
| Qualitative interview | 3-5 users; explore *why* they choose where to open sessions |
| Indirect inference from session-context patterns | Where the provider exposes this (rare); difficult to anonymize |

**Recommended initial method**: poll, paired with G-1.

## Poll Instrument

**Question**:

> When you start an AI agent session (Claude Code, Codex, Cursor, etc.), what directory are you usually in?
>
> 🅰 The project root (where the `.git/` lives)
> 🅱 A subdirectory of the project (e.g., `src/` or `docs/`)
> 🅲 `$HOME` or another non-project location
> 🅳 Varies a lot — reply with detail

**Privacy**: anonymous, aggregate counts.

**Pass criterion**: at least one directional data point with confidence level.

## N=1 Data Point (this session)

- User: study runner
- Session start location: project root (`/home/roctinam/dev/aiwg/`)
- Frequency self-report: project root ~95% of the time; subdirectory rare (only when working in a deeply-nested submodule)
- Provider: Claude Code
- Confidence: **N=1, self-report, study-runner**. Not generalizable.

Observation: with the project-root convention, rule files in `.claude/rules/` always load. The 9 system reminders received in this session confirm `.claude/rules/*.md` files are being loaded into the context window.

## Cross-Reference to Saved Memory

`feedback_discovery_multi_hook` saved memory notes: "AIWG discovery has four hooks, not one — Rule, AIWG.md, quickref, discovery-agent; don't single-point-of-failure analysis on rule auto-loading."

The G-2 question matters less if AIWG.md / quickref / discovery-agent hooks cover the cases where rule-file scanning misses. The hookup matrix (#1336) measures all four; G-2 specifically tunes the rule-file column.

## Confidence Level

- N=1 data point: directional only; consistent with the "rule files load when started from project root" assumption.
- Poll (when run): medium confidence; self-selected respondents.

## Feedback Loop

Per the issue: outputs feed Workstream A (rule auto-load assumption validation), NOT block.

- If poll shows users frequently start from subdirectories or `$HOME`: rule-file hook is unreliable; AIWG.md and quickref hooks need to carry more weight. (Affects design priorities in Workstream F's natural-language probe path.)
- If poll shows >80% start from project root: rule-file hook assumption is sound; current architecture stands.

## Null Outcome Documentation

Same as G-1: low respondents → document reason, propose follow-up methods (in-product survey, office hour).

## Acceptance Status (this issue)

| Acceptance criterion | Status |
|---|---|
| At least one data point collected for G-2 with confidence | ✅ N=1 with explicit confidence statement |
| Output published to `empirical-G2.md` | ✅ This file |

## References

- US-NUA-G-02: `../requirements/user-stories.md`
- Hookup matrix: `./hookup-matrix.md`
- Saved memory: `feedback_discovery_multi_hook`
