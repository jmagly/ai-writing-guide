---
title: "AIWG — December 2025 Report"
slug: "2025-12-aiwg-december-2025-report"
date: "2025-12-31"
project: "aiwg"
type: report
tags: [report, "2025-12", "aiwg"]
summary: "Launch month: AIWG went public on npm, added four more AI coding tools, and gained skills, artifact-building agents, and its own docs site."
status: "published"
canonical: "https://aiwg.io/blog/2025-12-aiwg-december-2025-report"
---

# AIWG — December 2025

_AIWG is a toolkit that helps AI coding agents work in a clear, reliable way. It gives them skills, rules, and shared memory so they make fewer mistakes and stay easy to follow._

## TL;DR

This was launch month. On December 10, AIWG published its first public release to npm. Anyone can now install it with one command. And the toolkit that launched was much bigger than the one from November. Four more AI coding tools gained support: GitHub Copilot, Cursor, OpenCode, and an early version for Windsurf. Skills arrived — small, ready-made how-to guides that agents follow. A new family of helper agents, the Smiths, can build new agents, commands, and skills for you on demand. And a new docs site with full search went live. December turned AIWG from a private project into a public tool.

## By the numbers

| What's public | Value |
|---|---|
| On npm | Yes — first public release on December 10, 2025 |
| Package | `aiwg` — install with `npm install -g aiwg` |
| Released versions | 2024.12.0 · 2024.12.2 · 2024.12.3 · 2024.12.4 |
| Source | github.com/jmagly/aiwg |
| Works with | Claude Code · OpenAI Codex · Warp · Factory AI · GitHub Copilot (new) · Cursor (new) · OpenCode (new) · Windsurf (new, early) |
| New this month | public npm install · skills · the Smiths · MCP server · docs site with search |

A note on the version numbers: these first releases carry a "2024.12" label. Later releases moved to numbers that match the calendar.

## Highlights

**1. AIWG is public.**
What it is: the first release of AIWG on npm, the main package store for JavaScript tools.
How you'd use it: run `npm install -g aiwg`, then run one setup command in your project. AIWG places its agents, commands, and rules where your AI tool looks for them.
Why it helps: no more building from source. You get the whole toolkit in a minute, and updates come the same easy way.

**2. Four more AI tools supported.**
What it is: AIWG can now set itself up inside GitHub Copilot, Cursor, and OpenCode. An early version for Windsurf landed too. (A "provider" is an AI coding tool AIWG can set itself up inside.)
How you'd use it: run the setup command and name your tool. AIWG writes its files in the format that tool expects.
Why it helps: you and your team can use different AI tools and still share the same agents, commands, and rules.

**3. Skills arrived.**
What it is: skills are short, ready-made guides an agent can follow to do one job well — like checking a workspace's health or applying a writing voice.
How you'd use it: ask for the task in plain words. The agent finds the matching skill and follows its steps.
Why it helps: agents stop guessing at common tasks. They follow a tested recipe instead, so results are steadier.

**4. The Smiths: agents that build agents.**
What it is: a set of maker agents. AgentSmith builds new agents. SkillSmith builds skills. CommandSmith builds commands. ToolSmith and MCPSmith build tools and connectors.
How you'd use it: describe the helper you wish you had. The right Smith writes it, checks it, and puts it where your tool can use it right away.
Why it helps: you're not limited to what ships in the box. Your toolkit can grow to fit your project.

**5. AIWG speaks MCP.**
What it is: AIWG now runs its own MCP server. (MCP is a standard plug that lets AI tools talk to outside helpers.)
How you'd use it: connect your AI tool to the AIWG server, and it can reach AIWG's features through that standard plug.
Why it helps: tools that speak MCP get AIWG's help even without files on disk. One standard covers many tools.

**6. A real docs site.**
What it is: a documentation site with a fun terminal look and full-text search.
How you'd use it: open the docs, type what you're looking for, and jump straight to the answer.
Why it helps: launch means new users. New users need docs they can search, not a pile of files.

## Features shipped

**Going public.** The npm package system was the month's anchor. AIWG got a clean package build, an install path, and a publish pipeline. An update command, `aiwg-refresh`, lets you pull the newest version and redeploy without leaving your session. A plugin system also landed, so pieces of AIWG can install as Claude Code plugins, with a registry and status checks behind it.

**More tools, one toolkit.** Support grew to GitHub Copilot, Cursor, and OpenCode, each with its own file layout and naming rules handled for you. An early Windsurf version joined as an experiment. Factory AI support, new in November, gained skills and MCP wiring. The goal stays the same: write your setup once, use it in whichever AI tool you like.

**Skills and voice.** Claude Code skills support landed first, then a broad set of skills for the software and marketing frameworks. A new Voice Framework addon lets you create, blend, and analyze writing voices, so content sounds the way you want. A claims-validator skill checks that written claims hold up. A workspace health skill spots setup problems before they bite.

**The Smiths.** The maker agents form a small ecosystem. Each one takes a plain-word request, drafts the new artifact, validates it, and deploys it. MCPSmith goes further: it can stand up a new MCP connector in a container when your project needs one.

**Quality and structure.** Testing became a first-class rule across the software framework, backed by a testing-quality addon that enforces it. A guided-implementation addon adds step-by-step control for bigger builds. The workspace moved to a framework-scoped layout, so each framework keeps its files in its own place. A development kit arrived for people who want to build their own frameworks. And the writing checker grew its pattern list past five hundred entries, so it catches more stiff, machine-sounding text.

## Fixes

Most fixes cleared the runway for launch. A pre-release audit swept up ten issues before the first publish. The publish pipeline got several rounds of care: the package file was cleaned for npm, flaky tests were moved out of the publish path, and files that broke Windows builds were removed. The new docs site got polish — search results now highlight matches, deep links are preserved, and navigation order is correct. Factory AI agent names and tool mappings were corrected, and Codex integration tests were made to pass. A pair of skill and command modules that were deleted by mistake were restored. The rollback command now finds its backups in both places they can live.

## Performance & reliability

Launch put reliability first. The publish workflow was hardened so a bad build cannot slip out to npm. A metadata check runs in the pipeline and validates every agent and command definition before release. Tests run on every merge, so problems surface before publish day, not after. The steadier test suite from November paid off here: going public went smoothly.

## Breaking changes & migrations

Two changes matter if you installed early in the month. First, the workspace layout changed: files now group by framework instead of sitting in one shared pile. A migrate command moves your project over, and a rollback command undoes it if needed. Second, commands dropped an old `/project:` prefix. If you typed commands the old way, use the plain name now.

## Releases

- **2024.12.0** (December 10) — the first public release. The core toolkit on npm: frameworks, agents, commands, setup for multiple AI tools, and the CLI.
- **2024.12.2** (December 11) — publish-pipeline fixes so installs work cleanly from npm.
- **2024.12.3** (December 11) — the "It Just Works" release: setup polish, better defaults, and smoother first-run experience.
- **2024.12.4** (December 12) — post-launch cleanup from the pre-release audit, plus packaging fixes.

## Dependencies & security

No security alerts needed fixing this month. The package file was trimmed before publish so the npm package ships only what it needs. A test hook that ran on every publish was removed in favor of testing at merge time, which keeps the publish step small and predictable.

## Docs & developer experience

The docs site is the big story: a searchable site with a terminal look, result highlighting, and working deep links. Docs also grew with the features — a knowledge-base command with troubleshooting notes, setup guides for the new tools, and clearer notes in the project setup guide. The `aiwg-refresh` command improves everyday life too: update and redeploy in one step, mid-session.

## Tests & CI

The pipeline grew up for launch. A metadata-validation workflow checks every definition file on each change. The publish workflow was split from the test workflow, so tests gate merges and publishes stay fast. Flaky, timing-sensitive tests were moved out of the publish path. Windows-breaking files were removed so the pipeline runs clean across systems. A container test now covers the new MCP server.

## Cross-project impact

The new docs site runs on the same documentation engine used across the portfolio, including its full-text search. Beyond that, AIWG stayed a single project this month — but a public one now, which other projects can install and build on.

## Known issues & open threads

- The Windsurf support is early and marked experimental. Expect rough edges there.
- A few timing-sensitive tests were too flaky for the publish pipeline. They run at merge time instead, and fixing the flakiness is a follow-up.
- The first releases carry a "2024.12" version label. Later releases align the number with the calendar.
- Factory AI setup still has a manual step or two, carried over from November.

## What's next

Steady public updates, now that the install path is live. More polish for the newest tools, and moving Windsurf past experimental. Growing the skills catalog. And aligning version numbers with the calendar going forward. The pattern from here is small, frequent releases instead of one big drop.

## Appendix

- **Published packages:** `aiwg` on npm — first published December 10, 2025.
- **Releases:** the 2024.12 series (2024.12.0, 2024.12.2, 2024.12.3, 2024.12.4), published to npm in December.
- **Source:** github.com/jmagly/aiwg · window: all of December 2025.
- **Supported tools this month:** Claude Code · OpenAI Codex · Warp · Factory AI · GitHub Copilot (new) · Cursor (new) · OpenCode (new) · Windsurf (new, experimental).
