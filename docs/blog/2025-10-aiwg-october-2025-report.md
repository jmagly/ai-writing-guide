---
title: "AIWG — October 2025 Report"
slug: "2025-10-aiwg-october-2025-report"
date: "2025-10-31"
project: "aiwg"
type: report
tags: [report, "2025-10", "aiwg"]
summary: "A big build month: AIWG took shape as guided workflows, specialized agents, and templates for planning, building, testing, and shipping software with AI. Nothing shipped to users yet."
status: "published"
canonical: "https://aiwg.io/blog/2025-10-aiwg-october-2025-report"
---

# AIWG — October 2025

_AIWG is a toolkit that helps AI coding agents work in a clear, reliable way. It gives them skills, rules, ready-made workflows, and shared memory so they make fewer mistakes and stay easy to follow._

## TL;DR

October was a big build month. This is when AIWG really took shape. The framework gained guided workflows for the whole life of a software project — plan, design, build, test, and ship. It gained specialized agents for each stage. It gained a large set of ready-to-use templates. And it gained a simple installer and a command-line tool. It also learned to set itself up on more than one AI coding app.

One term first: SDLC means "software development life cycle" — the steps a team follows to plan, build, test, and ship software. AIWG now walks you through those steps.

Nothing shipped to users yet. AIWG had not published to npm. This was build-in-progress.

## By the numbers

| What's public | Value |
| --- | --- |
| Where to find it | github.com/jmagly/aiwg |
| On npm | Not yet — the first public release came later |
| What it now offered | guided workflows for each stage · specialized agents · a large template library · a CLI and one-line installer |
| Works with | Claude Code · OpenAI Codex · Warp Terminal |

## Highlights

**1. Guided workflows for the whole life of a project.**
What it is: ready-made steps for each stage of building software — plan, design, build, test, and ship.
How you'd use it: pick a stage, and AIWG walks you and your agents through it, one step at a time.
Why it helps: you don't have to invent the process. You follow a clear path and skip fewer steps.

**2. A team of agents that draft, review, and merge.**
What it is: specialized agents, each good at one job — one writes a first draft, others review it, and one merges the feedback.
How you'd use it: ask for a document, like a design write-up. AIWG runs the draft-review-merge cycle for you.
Why it helps: you get a stronger result than one agent working alone, with fewer blind spots.

**3. Start fast — from an idea or from code you already have.**
What it is: a guided "intake" that captures what you're building. It can start from a plain description, or read an existing codebase and describe it for you.
How you'd use it: answer a few questions, or point it at your project. AIWG fills in the starting details.
Why it helps: you get moving in minutes, whether the project is brand new or already exists.

**4. Just say what you want.**
What it is: plain-language triggers for the workflows. You don't need to memorize commands.
How you'd use it: say "move to the design stage" or "run a security review," and AIWG picks the right workflow.
Why it helps: you work in normal words, and the tool does the mapping.

**5. A large template library.**
What it is: fill-in-the-blank documents for the common needs — requirements, architecture, testing, security, privacy, and more.
How you'd use it: reach for the template you need, and start from a solid outline instead of a blank page.
Why it helps: you keep your work consistent and complete, and you save time.

**6. Set up on more than one AI tool, in one command.**
What it is: a one-line installer and an `aiwg` command-line tool that place AIWG's helpers where each AI app expects them.
How you'd use it: run one command. AIWG sets itself up for Claude Code, OpenAI Codex, or Warp Terminal.
Why it helps: you keep the same helpers and habits as you move between tools.

## Features shipped

**The workflow set.** This was the heart of the month. AIWG gained ready-made workflows for each stage of a project, and for the jumps between stages. There are also ongoing workflows you run again and again — like reviewing risks, checking security, running tests, deploying, and holding a look-back after a stage. Each workflow is a guide: what to produce, who reviews it, and what "done" looks like.

**Specialized agents and the draft-review-merge pattern.** AIWG gained agents for the roles a real project needs — from writing requirements to designing architecture to reviewing code. A shared pattern ties them together: one agent drafts, several review in parallel, and one merges the feedback into a clean result. New documentation agents make this work for write-ups, not just code.

**Guided intake.** A friendly intake wizard asks about your project and captures the basics. It has an interactive mode and a "fill the gaps" mode for a form you already started. A second path reads an existing codebase and writes the intake for you. You can also add guidance up front, so the tool aims the right way from the start.

**The template library.** AIWG gained a broad set of templates covering requirements, architecture, testing, security, privacy, legal, metrics, and team setup. There are small "cards" for test cases and team roles too. The templates carry ownership notes, so it's clear who owns each piece.

**The installer and command-line tool.** A one-line installer sets everything up. The `aiwg` command-line tool creates new projects, deploys agents, and keeps itself current. It checks for the right version of Node.js (the program that runs the tool) and can install it if needed. If a setup goes wrong, it recovers on its own instead of leaving a mess.

**Support for more AI tools.** AIWG learned to set itself up cleanly for OpenAI Codex and Warp Terminal, on top of Claude Code. It knows where each app looks for its helpers and puts them in the right spot. For tools that read a single shared file, it gathers the pieces into one place.

**Writing quality and voice.** AIWG gained a set of tools that check AI-written text for robotic habits — tired phrases, weak verbs, over-hedging, and cookie-cutter structure. It can also match a chosen voice, so the writing sounds the way you want. A themed voice guide shipped as an early example.

**Turn a transcript into notes.** A new command takes a meeting transcript and turns it into a clean summary you can share.

**Tracing and contributor tools.** AIWG gained a way to link requirements to code and tests, so you can see what covers what. It also gained tools to help outside contributors follow a clear, repeatable path.

## Fixes

Setup got more careful. New projects now create the right folders, and a scaffolding script that could fail was repaired. The tool that deploys agents got better at spotting files it had already placed, so it stops making duplicates. Warp Terminal commands were wired into the installer correctly. Public links were pointed at the right home. The intake step that people found confusing was clarified — it's one of several ways to start, not a required first move. And a planning template was rewritten to capture what stakeholders actually care about.

## Performance & reliability

Reliability got real attention. The installer now recovers on its own when a step fails, so a bad setup doesn't leave you stuck. The command-line tool checks its own version and updates itself when you run it. It confirms Node.js is present and the right version. Groundwork for testing and for checking quality targets — like speed, security, and reliability — was also built this month, ready for the stages ahead.

## Breaking changes & migrations

None this month. AIWG had no public users yet, so there was nothing to break. The command-line tool did settle on a single name, `aiwg`, with clear subcommands — but that only affected the project's own build, not any user.

## Releases

None this month — AIWG had not yet published to npm; this was build-in-progress.

## Dependencies & security

A security-review workflow shipped as part of the workflow set, so security has a clear place in the process. Tracing work also landed, linking requirements to code and tests. Package changes this month were internal setup only. No security alerts needed fixing.

## Docs & developer experience

The README got a full redesign for clarity and a friendlier first read. New sections cover what you need before you start, with step-by-step install guides, plus plain warnings and legal notes so expectations are clear. A command reference explains the command-line tool. A plain-language guide maps everyday phrases to the right workflow. And a guide explains the draft-review-merge pattern, so you can follow how the agents work together.

## Tests & CI

The first test infrastructure landed, along with a way to check quality targets like speed and security. Automatic checks kept the docs and lists consistent, and a drift check flagged when a generated file fell out of date. Some of the strictest documentation checks were paused late in the month, to be revisited once the build settled.

## Cross-project impact

- This month is the **foundation** for everything that follows. The workflows, agents, templates, and multi-tool setup built here are what later AIWG work builds on.
- The **writing quality and voice** tools became the base for AIWG's later writing helpers.
- **Multi-tool support** (Claude Code, OpenAI Codex, Warp Terminal) set the pattern for the many AI apps AIWG supports today.

## Known issues & open threads

- **Not public yet.** AIWG had not published to npm, so there was no one-command install for outside users this month.
- **Still mid-build.** The design and build stages were in progress, so some pieces were internal and rough.
- **Strict doc checks paused.** The tightest documentation checks were turned off late in the month, to be turned back on later.

## What's next

Keep building toward a first public release. Finish the build stages, publish to npm, and add more AI tools. Keep sharpening the workflows, the agents, and the writing tools. Small, steady progress from here.

## Appendix

- **Published packages:** none yet — not on npm this month.
- **Source:** github.com/jmagly/aiwg · window: all of October 2025.
- **What it offered:** guided workflows for each stage · specialized agents · a large template library · a CLI and one-line installer · setup for Claude Code, OpenAI Codex, and Warp Terminal.
