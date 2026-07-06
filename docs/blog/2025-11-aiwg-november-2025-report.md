---
title: "AIWG — November 2025 Report"
slug: "2025-11-aiwg-november-2025-report"
date: "2025-11-30"
project: "aiwg"
type: report
tags: [report, "2025-11", "aiwg"]
summary: "A build month before launch: AIWG learned to run on Factory AI, let you pick your own model, gained a new marketing framework, and grew a real codebase with tests."
status: "published"
canonical: "https://aiwg.io/blog/2025-11-aiwg-november-2025-report"
---

# AIWG — November 2025

_AIWG is a toolkit that helps AI coding agents work in a clear, reliable way. It gives them skills, rules, and shared memory so they make fewer mistakes and stay easy to follow._

## TL;DR

November was a busy build month. AIWG was not yet public, so there were no releases. But a lot got built toward the first launch. The big theme: AIWG learned to set itself up inside a second AI coding tool, Factory AI. You can now pick which model your agents use, instead of being stuck with a fixed one. A brand-new marketing framework arrived, with its own agents and commands. And the core toolkit moved into a real, tested codebase. This was the groundwork for going public.

## By the numbers

| What's public | Value |
|---|---|
| On npm | Not yet — first public release came the next month |
| Source | github.com/jmagly/aiwg |
| Works with | Claude Code · OpenAI Codex · Warp Terminal · Factory AI (new this month) |
| New this month | pick-your-model config · Media/Marketing Kit framework |
| What it helps you do | run agents on more AI tools · choose your model · run marketing work |

## Highlights

**1. AIWG now runs on Factory AI.**
What it is: AIWG can set itself up inside a new AI coding tool called Factory AI. (A "provider" is an AI coding tool AIWG can set itself up inside, like Claude Code or Factory AI.)
How you'd use it: run one setup command for Factory AI, and AIWG puts its agents and commands where that tool looks for them.
Why it helps: you can use the same AIWG helpers on more than one tool. You don't start over when you switch.

**2. Pick your own model.**
What it is: AIWG used to have fixed model names written into its code. Now they live in one small settings file you control.
How you'd use it: point AIWG at the model you want, either with a quick command or by editing the file. You can set it for one project or for all of them.
Why it helps: you upgrade to a newer model, or swap in a cheaper one, without editing any code.

**3. A new marketing framework.**
What it is: a full kit for marketing work, called the Media/Marketing Kit. It brings its own set of helper agents and ready-made commands.
How you'd use it: kick off a campaign, plan content, or run a brand review, each with one command. You can add your own steering notes as you go.
Why it helps: AIWG now covers marketing work too, not just software building.

**4. A real codebase and tests behind AIWG.**
What it is: the core parts moved into a proper code layout, and the tests were rewritten in a modern, checkable way.
How you'd use it: nothing to do — this is under the hood.
Why it helps: a tested, well-organized base means fewer surprises and a smoother path to the public launch.

## Features shipped

**AIWG runs on Factory AI.** This was the month's biggest push. AIWG now knows how to deploy into Factory AI, a second AI coding tool. It maps AIWG's tools onto the ones Factory AI uses, so your agents keep their full set of powers. It also sets up the tool for you, so agents that coordinate other agents get what they need. When you set up a Factory AI project, AIWG can write a starter project file so the tool knows how to work with your code.

**Pick your own model.** Model names no longer live inside the code. They sit in one small settings file. AIWG checks for your choice in a clear order: a quick command wins first, then your project's file, then your personal file, then the built-in default. So you can set a model just for one project, or for everything you do. Upgrading to a newer model is now a one-line change.

**The Media/Marketing Kit.** AIWG gained a whole new framework for marketing. It ships with a large team of helper agents grouped by job — strategy, writing, design, communications, production, and more. It has commands for the everyday tasks: starting a campaign, planning content, reviewing a brand, checking the numbers. It also has many ready-made templates. The work flows through five clear stages, from strategy to writing to review to publishing to results. This month it also got a guided intake, so you can start a project by answering a few simple questions. And every marketing command now takes a steering note (like "focus on new customers") and a guided question-and-answer mode — the same easy pattern the software commands already use.

**A real, tested codebase.** The core software moved into a clean layout, split by job — reading a codebase, running builds, checking health, recovering from errors, and more. The tests moved too, and were rewritten in a modern, type-checked style that catches mistakes early. AIWG also hit a build milestone, with all its planned core features done, and began planning the steps to go public.

## Fixes

Most fixes cleaned up the new Factory AI support. Command names now use the right format for that tool, so they show up and run correctly. A tool-specific name tag that only made sense in one place was removed, so commands work the same everywhere. A round of test cleanup fixed and steadied the tests across the software and writing parts. A setup script that pointed at the wrong address was corrected, and a small setup detail was written down so it's easy to follow.

## Performance & reliability

The quiet win was reliability. The test cleanup raised how much of the code is checked and made the tests steadier, so problems get caught before they reach you. Moving the code into a clear layout, with a modern testing setup, makes the whole toolkit safer to change. None of this is flashy, but it is the base a public launch stands on.

## Breaking changes & migrations

None this month. AIWG was still pre-public, so there was nothing shipped to break.

## Releases

None this month — AIWG had not yet published to npm; the first public release came the next month.

## Dependencies & security

No security alerts needed fixing this month. The move to a settings file for models means those choices now live in version control, where you can see and review them. The build milestone review found no product security problems.

## Docs & developer experience

Docs grew to match the new features. There's a getting-started guide for running AIWG on Factory AI, with setup steps and troubleshooting. There's a full guide to picking your model, with examples for using the newest model, a cheaper one, or your own custom choice. The new marketing framework got its own quick-start. The main README now lists Factory AI as a supported tool.

## Tests & CI

The tests were pulled into one place and rewritten in a modern, type-checked style using a current test runner. A broad cleanup fixed failing tests across the software and writing parts and made the suite steadier. This sets a solid testing base before the code goes public.

## Cross-project impact

AIWG stayed a single project this month, getting ready for launch. Inside it, the new marketing framework now sits alongside the software-building framework, so one toolkit covers both kinds of work. The move to a shared model settings file means every provider — every AI tool AIWG supports — reads model choices the same way.

## Known issues & open threads

- On Factory AI, the agents still need one manual import step before they're ready. Making that automatic is a follow-up.
- The build milestone review flagged a few areas to firm up before the public release, and that work was planned for the following weeks.

## What's next

The big one: the first public release on npm, coming the next month. Finishing the go-public steps — final checks, deployment notes, and a short watch period after launch. More polish on Factory AI setup so it needs fewer manual steps. And more growth for the new marketing framework. Small, steady updates start once AIWG is public.

## Appendix

- **Published packages:** none yet — first public release came the next month.
- **Source:** github.com/jmagly/aiwg · window: all of November 2025.
- **Supported tools this month:** Claude Code · OpenAI Codex · Warp Terminal · Factory AI (new).
