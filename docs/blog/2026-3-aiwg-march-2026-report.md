---
title: "AIWG — March 2026 Report"
slug: "2026-3-aiwg-march-2026-report"
date: "2026-03-31"
project: "aiwg"
type: report
tags: [report, "2026-03", "aiwg"]
summary: "A heavy shipping month: skills became the core building block, AIWG learned two new tools (OpenClaw and Hermes), a searchable project index arrived, and an always-on daemon took its first steps."
status: "published"
canonical: "https://aiwg.io/blog/2026-3-aiwg-march-2026-report"
---

# AIWG — March 2026

_AIWG is a toolkit that helps AI coding agents work in a clear, reliable way. It gives them skills, rules, and shared memory so they make fewer mistakes and stay easy to follow._

## TL;DR

March was one of the biggest months yet. The 2026.3.x series shipped to npm, and it changed how AIWG is built at its core. Skills — small, reusable how-to guides for agents — are now the main building block. Everything else, like commands, is generated from them. AIWG also learned two new AI tools, OpenClaw and Hermes, bringing the family to ten. A new search index lets agents find your project files by meaning, not just by name. And an always-on helper, called a daemon, took its first steps: it can watch for events, react on its own, and remember things between sessions. A new ops framework rounds it out, for people who run servers and services.

## By the numbers

| What's public | Value |
|---|---|
| On npm | package `aiwg` — the 2026.3.x series |
| Source | github.com/jmagly/aiwg |
| Works with | Claude Code · OpenAI Codex · GitHub Copilot · Cursor · Factory AI · OpenCode · Warp · Windsurf · OpenClaw (new) · Hermes (new) |
| New this month | skills-first design · project search index · daemon and behaviors · ops framework · remote installs |
| What it helps you do | write a skill once and use it everywhere · find project files fast · let agents react to events on their own |

## Highlights

**1. Skills are now the core building block.**
What it is: a skill is a small how-to guide an agent can follow, like "review this code" or "start a release." AIWG now treats skills as the one true source. Commands are made from them at setup time.
How you'd use it: write one skill, run setup, and it shows up in every AI tool you use — no copies to keep in sync.
Why it helps: one file to write, one file to fix. Your helpers behave the same way on every tool.

**2. AIWG runs on two more tools: OpenClaw and Hermes.**
What it is: OpenClaw and Hermes are AI agent tools. AIWG can now set itself up inside both. OpenClaw is also the first tool to get "behaviors" — rules that react to events, like a file change or a schedule.
How you'd use it: run one setup command for the tool you use. AIWG puts its skills, agents, and rules where that tool looks for them.
Why it helps: you keep the same helpers when you switch tools. Nothing to relearn.

**3. A search index for your project.**
What it is: the `aiwg index` command builds a map of your project's plans, designs, and test docs. You can search it by topic and see which files depend on which.
How you'd use it: ask "what do we have about login?" and get the right files back. Before changing a file, check what else leans on it.
Why it helps: agents stop guessing and stop reading the wrong files. That saves time and money, and cuts mistakes.

**4. An always-on helper (the daemon).**
What it is: a daemon is a small program that keeps running in the background. AIWG's daemon can watch for events, run behaviors, and talk to you through a friendly front desk agent called the concierge. It remembers things between sessions.
How you'd use it: turn it on, and it can run checks when files change, follow a schedule, and greet you with real context the next morning.
Why it helps: work keeps moving even when you're not watching. And you never repeat yourself to a helper with no memory.

**5. A new framework for running systems: ops.**
What it is: a full kit for operations work — runbooks (step-by-step repair guides), inventory lists, and checks for servers, IT gear, and streaming setups.
How you'd use it: install the ops framework and ask an agent to follow a runbook or audit what's running on a host.
Why it helps: the same care AIWG brings to writing code now covers keeping systems healthy.

**6. Install from anywhere, set up per project.**
What it is: a remote install system for frameworks and addons, plus a small project settings file (`aiwg.config`) that records which tools and pieces your project uses.
How you'd use it: install a framework by name, even from a remote source. Your project file remembers the setup, so anyone can repeat it.
Why it helps: setups become easy to share and easy to redo.

## Features shipped

**Skills and extensions.** All command sources moved to the skill format. Skills carry plain-language triggers, so an agent can pick the right one from a normal request like "start a security review." A new naming plan makes those triggers clearer. Skills also declare which tools they work on, so setup only deploys what fits.

**More tools, better fit.** Beyond OpenClaw and Hermes, existing tools got real upgrades. GitHub Copilot moved to its newer agent file format. Windsurf got proper rule files with triggers. Cursor gained a cloud agent template, and its skill support was marked native. Guides for wiring AIWG's helper server into each tool shipped for all of them.

**The daemon, behaviors, and memory.** The daemon got a supervisor, a simple web view, and a messaging layer. Behaviors became a real artifact type with their own deployment path. The concierge agent fronts it all: it routes requests, keeps a steady tone, and stores memory across sessions. A cross-tool scheduler can set up timed jobs using whatever your system already has.

**Agent loops.** An agent loop runs a task over and over until it meets a goal you set, like "all tests pass." This month the crash-safe external loop gained adapters for OpenCode and Factory AI, new flags for logging and detail, and safer handling when several loops run at once. Live test suites now prove the loop works against real tools, not just mocks.

**Model choice and evaluation.** A new evaluation suite scores models — both cloud models and ones that run on your own machine — so you can pick with data instead of guesses. Docs for using local models arrived, and a single flag lets you set one model for a whole setup run.

**Quality and rules.** Rules got a two-level index, so agents load only what applies. New grounding agents inject real domain facts — security, performance, compliance — to cut down made-up claims. Token budgets and quality scoring track what agents spend and what they produce. A new rule makes agents ask questions using each tool's native prompt, so questions don't get lost in text.

**Identity for agents.** Agents can now ship with a "soul" file — a short profile of voice, values, and style. Blend one into an agent and it writes with a steadier, more human tone.

**CLI polish.** The command line got a cleaner look, a quiet mode for scripts, and a nightly release channel for people who want the newest build each day. A cleanup audit command finds dead code and stale files. A dev flag lets contributors test local changes without publishing.

## Fixes

**Keeping up with the tools.** AI tools change their model names often. March fixed stale model lists for Codex, Factory AI, OpenCode, and Cursor, so setup uses names that actually work today. The OpenCode adapter was realigned to that project's current home and output format.

**Steadier loops.** The external agent loop got several crash fixes: a snapshot bug that caused a fatal path error, state mix-ups when loops ran in parallel, and leftover state from finished loops that now gets cleaned up.

**Small paper cuts.** The health-check command found its own install path correctly again. The project settings file got its simpler name (`aiwg.config`). Docs that had drifted from the code were brought back in line. Broken links and mobile layout issues on the docs pages were fixed.

## Performance & reliability

The big push was proof, not speed. New live test suites run AIWG against real AI tools — Claude Code and Codex — end to end, so releases are checked in the same setup you use. Integration tests were added for the forensics framework and the external agent loop. A coverage gate in the build pipeline stops changes that shrink test coverage, and a new rule forbids silencing failing checks. Boring on purpose — and it means fewer surprises for you.

## Breaking changes & migrations

One small one: the project settings file was renamed from `aiwg.config.json` to `aiwg.config`. If you made one early in the month, rename it. The move to skills-first changed how commands are built inside AIWG, but your commands still appear and run the same way — no action needed.

## Releases

- **2026.3.0** (March 1) — opened the series with a plain-language "How AIWG Works" guide and groundwork for tracking project artifacts in git.
- **2026.3.1** (March 4) — the discovery and durability release: the `aiwg index` search subsystem, the cleanup audit command, a dead-code analyzer agent, and a blanket model override flag.
- **2026.3.2** (March 4) — quick follow-up fixing index queries and adding the local dev mode for contributors.
- **2026.3.3** (March 24) — the big one: skills-first extensions, the project config and ops subsystems, OpenClaw support, behaviors, daemon starter modules, the rules index, and the remote install system. Several release candidates went out on the `next` channel first, so early testers could try it before the stable tag.

The month also opened with **2026.2.15** (March 1), a final patch closing out the February series.

## Dependencies & security

AIWG's evaluation code now uses a shared, published client library instead of its own copy — one well-tested path instead of two. Publish workflows gained gates that keep project artifacts out of the npm package, so what you install stays lean and contains only the toolkit. No security advisories affected AIWG this month.

## Docs & developer experience

Docs had their best month yet. A new "How AIWG Works" guide explains the whole system in plain words. A scenario-based getting-started series walks through real situations instead of abstract steps. Framework guides, an addon overview, and a deep dive on flows and gates landed too. The README grew a research section that cites the published papers behind AIWG's design, sorted by evidence quality. Guides for local models and for every supported tool were added or refreshed. For contributors, the new dev flag makes testing local changes painless.

## Tests & CI

Unit tests were added for the new metrics and quality modules. Integration tests now cover the forensics framework and spawn real processes to test the external agent loop end to end. Live tests run the daemon and the loop against actual AI tools. The pipeline gained a coverage gate, learned to publish release candidates to a testing channel, and had a few of its own bugs fixed along the way.

## Cross-project impact

AIWG now depends on the Matric evaluation client, tying the two projects together instead of keeping a private copy of that code. Support for OpenClaw and Hermes connects AIWG to those tool communities. And the docs site got its own deploy pipeline, so guide updates reach readers faster.

## Known issues & open threads

- The daemon is young. It works, but expect rough edges while it grows.
- The command-line facelift shipped with a written list of known gaps still to close.
- An experimental methodology addon that shipped in 2026.3.3 was pulled at month-end after review. If you saw it appear and vanish, that was on purpose.
- The agent loop still carries an old internal nickname ("ralph") in places; a cleanup to plainer names was queued for April.

## What's next

April opens the 2026.4.x series. Planned: finish the naming cleanup so agent loops read plainly everywhere, grow the daemon and behaviors, and keep expanding the docs. The skills-first base laid this month is the platform the next few months build on.

## Appendix

- **Published packages:** `aiwg` on npm.
- **Releases:** the 2026.3.x series, published to npm through March.
- **Source:** github.com/jmagly/aiwg · window: all of March 2026.
- **Supported tools this month:** Claude Code · OpenAI Codex · GitHub Copilot · Cursor · Factory AI · OpenCode · Warp · Windsurf · OpenClaw (new) · Hermes (new).
