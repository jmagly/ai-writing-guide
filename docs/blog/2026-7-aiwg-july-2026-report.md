---
title: "AIWG - July 2026 Report"
slug: "2026-7-aiwg-july-2026-report"
date: "2026-07-31"
project: "aiwg"
type: report
tags: [report, "2026-07", "aiwg"]
summary: "AIWG became easier to move, search, and run across coding tools, with stronger release checks, portable skills, session import, and Cockpit controls."
hero: "https://docs.aiwg.io/assets/blog/2026-7-aiwg-july-2026-report.png"
reading_time: 8
status: "published"
canonical: "https://aiwg.io/blog/2026-7-aiwg-july-2026-report"
pillar: "1 report"
audience: "AIWG users and evaluators who want the July 2026 release summary"
aiwg_refs: ["aiwg discover", "aiwg show", "Agent Skills", "Cockpit", "Fortemi shards"]
---

# AIWG - July 2026

AIWG helps AI coding agents work inside a project. It gives them skills, rules, context, and repeatable workflows. July focused on one plain question: can that setup survive a move? A user may change tools. A workspace may move. Old sessions may need to come along. Another person may need to pick up the work.

## TL;DR

July made AIWG easier to move and run. You can find the right helper by saying what you need. You do not need to know its exact name. Agent Skills can move across supported tools with clearer checks. Session import lets useful history come in from more coding apps. Cockpit also shows more about sandbox readiness, so users can start the right kind of session with fewer guesses.

## By the numbers

| What's public | Value |
|---|---|
| Published packages | `aiwg` and `@aiwg/cockpit` |
| July release line | `2026.7.x` |
| Key capabilities | search by intent, portable skills, session import, project-local files, release checks |
| Docs | `https://docs.aiwg.io` |
| Source | `https://github.com/jmagly/aiwg` |

## Highlights

**Find the right helper from plain words.** AIWG's search path is now the first step for many tasks. You describe what you need. You inspect the match. Then you run the skill, rule, agent, or command. That helps when a project has many tools.

**Portable Agent Skills.** July added clearer checks for skills that can be exported and used across supported agent tools. A team can write a project helper once and carry it into more than one coding app.

**Session import became a real workflow.** AIWG added paths for several session and transcript formats. Useful work history should not disappear because it happened in another app. Imported sessions still need review before they become long-term memory.

**Cockpit learned more about the run path.** Cockpit can show sandbox readiness, launch options, provider fit, and session state. That matters when a user needs to choose a host process, a container, or a stronger sandbox wall.

**Release checks got stricter.** The release path gained more signed-tag, package, checksum, and installer validation. That keeps the public package flow tied to the code and docs it claims to publish.

## Features shipped

### Search and routing

AIWG's search and routing work got sharper in July. The public idea is that the agent should ask the project what exists before it guesses. A user can say "find the monthly update workflow" or "review this for security." AIWG can return the closest matching helper with a stable ID.

That helps big projects because the tool list changes over time. It also makes review easier. Instead of asking why an agent made up a process, a reviewer can see which helper was found and used.

### Portable skills and project files

Managed Agent Skills gained a moveable shape and checks. AIWG also improved project-local files, generated quick refs, and standalone project wrappers.

In plain terms, a project can carry its own working habits. A repo can include its local rules, helpers, and workflow notes. Another supported agent app can pick them up without rebuilding the process from scratch. This is the path from "I told the agent once" to "the project knows how this work should run."

### Session import and memory review

July added import paths for many agent-session formats, plus review steps for memory. That split matters. Importing a transcript is not the same as trusting it forever. AIWG treats imported work as material that can be reviewed, searched, kept, or purged.

Use case: you finished a long debugging session in one coding tool, then moved back to another. AIWG can bring that session into the project context path so the next agent can learn from it without asking you to retell the whole story.

### Cockpit and sandbox work

Cockpit continued to move from a dashboard toward a user console. It added readiness views for sandbox setup, fast-start controls, run contracts, network posture, and session recovery.

That helps when an agent task needs a specific boundary. A quick docs edit may not need a virtual machine. A riskier task may need a stronger runtime. Cockpit gives the operator more of that choice in one place.

### Fortemi-backed knowledge packs

AIWG continued to prove its Fortemi shard path. That means AIWG knowledge can be packed with profiles, receipts, and checks. The benefit is not just export. The benefit is knowing what survived the move.

## Fixes

July fixes mostly made the system steadier around publish work, setup, docs, and provider behavior. Install and release paths were tightened so package roots, signed tags, and web handoffs are checked before they are trusted. Doc links and generated guides were repaired as the docs changed.

Provider and setup fixes also matter for daily use. AIWG improved native paths for Codex, Claude, and other supported apps. It kept managed skill data intact. It also cleaned stale deployed files during refresh. The result is less surprise when you update a project or move between tools.

## Performance & reliability

The main reliability work was about reducing doubt. Search now prefers stable IDs. Release checks bind a package to a checked tag and installer. Cockpit tracks session and run state more clearly. These changes are not flashy, but they make agent work easier to audit later.

## Breaking changes & migrations

None for normal users. If you maintain custom project bundles or provider wrappers, review the July docs before publishing a new wrapper.

## Releases

The July `2026.7.x` line shipped through public AIWG package releases. The main themes were portable Agent Skills, stronger search, session import, Fortemi shard checks, Cockpit run controls, project-local packaging, and signed release checks.

## Dependencies & security

Security work focused on release trust and helper boundaries. AIWG added threat-policy material, signed release checks, package checks, and safer skill import behavior. Release keys and web handoffs moved behind stricter checks. No public advisory is called out in this report.

## Docs & developer experience

Docs were split by audience. User docs, agent docs, install guides, and provider quickstarts now have clearer lanes. The CLI README and docs now center the search-first path: search by intent, inspect the result, then run the helper.

## Tests & CI

Tests and CI focused on release checks, managed skill checks, provider file paths, Fortemi shard checks, and Cockpit run contracts. The useful result is that AIWG can check more of its own package and deploy behavior before a release goes out.

## Cross-project impact

AIWG's July work supports the rest of the portfolio. Agentic Sandbox benefits from clearer Cockpit and run controls. Fortemi benefits from shard export and checks. Pagenary benefits from stronger docs publish work and release evidence. The monthly-report workflow itself is a project-local AIWG helper, which makes the report process easier to repeat.

## Known issues & open threads

Session import still needs careful review before imported material becomes long-term project memory. Cockpit remains an active user surface, so run controls and session views will keep changing. Some release and distribution work depends on private systems. Do not treat it as public product behavior until it appears in public docs or packages.

## What's next

Expect more work on session review, memory review, Cockpit operations, portable skills, and release checks. The direction is steady: make agent work easier to find, move, check, and run across more than one tool.

## Appendix

- **Published packages:** `aiwg` and `@aiwg/cockpit`.
- **Release line:** July `2026.7.x`.
- **Source / docs:** `https://github.com/jmagly/aiwg` and `https://docs.aiwg.io`.
- **Window:** July 2026, using the July evidence snapshot prepared through July 30.
