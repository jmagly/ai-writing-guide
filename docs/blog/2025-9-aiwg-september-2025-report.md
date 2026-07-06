---
title: "AIWG — September 2025 Report"
slug: "2025-9-aiwg-september-2025-report"
date: "2025-09-30"
project: "aiwg"
type: report
tags: [report, "2025-09", "aiwg"]
summary: "AIWG grew from a writing guide into a framework, with a set of focused AI helpers, ready-to-use commands, and a bigger list of robotic phrasings to avoid."
status: "published"
canonical: "https://aiwg.io/blog/2025-9-aiwg-september-2025-report"
---

# AIWG — September 2025

_AIWG is a toolkit that helps AI coding agents work in a clear, reliable way. It gives them skills, rules, and shared habits so they make fewer mistakes and stay easy to follow._

## TL;DR

September was AIWG's second month, and it changed shape. It started as a guide for better AI writing. This month it grew into a framework. It gained sub-agents — focused AI helpers, each with one job, like reviewing code or writing tests. It gained slash-commands — short typed shortcuts that kick off common tasks. And the list of "banned AI patterns" grew: the tell-tale robotic phrasings that make writing sound machine-made. This was a build-up month. AIWG was still early and not yet public.

## By the numbers

| What's public | Value |
|---|---|
| What AIWG now gives you | sub-agents · ready-to-use commands · a bigger banned-pattern list |
| Sub-agents | one focused helper each: requirements, architecture, code review, tests, devops, security, performance |
| Where it lived | on GitHub, in the open |
| Not yet on npm | first release came later, in December 2025 |

## Highlights

**1. A library of sub-agents.**
What it is: a set of focused AI helpers. Each one does a single job well — like writing requirements, reviewing code, or checking security.
How you'd use it: drop the helpers into your project, then ask one to handle its part of the work.
Why it helps: a helper with one job stays on task and gives clearer results than a jack-of-all-trades.

**2. Ready-to-use commands.**
What it is: short typed shortcuts (slash-commands) that start common jobs, plus templates so you can make your own.
How you'd use it: type a command to review code, write tests, or set up a new project.
Why it helps: you skip the boilerplate and get to real work faster.

**3. A bigger list of banned AI patterns.**
What it is: a growing list of stock phrases that make writing sound machine-made — words like "revolutionary" and "next-generation."
How you'd use it: check your text against the list, and swap flagged words for plain ones.
Why it helps: your writing sounds like a person wrote it, not a bot.

## Features shipped

**Sub-agents: focused helpers with one job.** This was the month's biggest step. AIWG added a starter set of helpers, each built for a single task. There is one for turning a rough idea into clear requirements, one for shaping the design, and one for reviewing code with an eye for security and speed. Others write tests that catch real bugs, handle setup work, and tune for speed. There is also a shared template, so you can build your own helper in the same style.

**Commands and automation.** AIWG added slash-commands you can use right away — reviewing code, generating tests, writing a tidy commit message, drafting API docs, and setting up a project. It also added templates for building your own, plus a way to hook commands into common events so routine steps run on their own.

**A stronger writing guide.** The banned-pattern list grew. It now flags more stock words, adds simple advice on how often a word is fine versus too much, and suggests plain replacements. AIWG also gained its own project guide.

## Fixes

None this month. This was early, additive work — new pieces going in, not old ones being repaired.

## Performance & reliability

None this month.

## Breaking changes & migrations

None this month. Everything added was new. If you used the writing guide before, it still worked the same way.

## Releases

None this month — AIWG had not yet published to npm. Its first public release came later, in December 2025. This month's work lived on GitHub, in the open.

## Dependencies & security

None this month.

## Docs & developer experience

Docs were the heart of the month. Most of the new material was written guidance: how to use the sub-agents, how to build and run commands, and how to hook them into your workflow. A getting-started guide and a roadmap laid out where the project was headed.

## Tests & CI

None this month.

## Cross-project impact

None this month. AIWG was still a standalone project, not yet wired into others.

## Known issues & open threads

- **Still pre-public.** AIWG was not on npm yet, so there was no one-command install. You copied files by hand.
- **Early and rough.** The helpers and commands were a starting set. They would grow and settle in the months after.

## What's next

Turn this pile of parts into a real tool you can install. Grow the set of helpers and commands. Keep sharpening the writing guide. The public releases begin later in the year.

## Appendix

- **Published packages:** none this month — not yet on npm.
- **What shipped:** the first sub-agents, the first commands, and an expanded banned-pattern guide — all on GitHub.
- **Source:** github.com/jmagly/aiwg · window: all of September 2025.
