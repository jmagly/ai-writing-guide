---
title: "AIWG — February 2026 Report"
slug: "2026-2-aiwg-february-2026-report"
date: "2026-02-28"
project: "aiwg"
type: report
tags: [report, "2026-02", "aiwg"]
summary: "AIWG's biggest month yet: every supported AI tool now gets the full toolkit, releases publish to npm on their own, and three new frameworks arrived — research, media curation, and digital forensics."
status: "published"
canonical: "https://aiwg.io/blog/2026-2-aiwg-february-2026-report"
---

# AIWG — February 2026

_AIWG is a toolkit that helps AI coding agents work in a clear, reliable way. It gives them skills, rules, and shared memory so they make fewer mistakes and stay easy to follow._

## TL;DR

February was AIWG's biggest month so far. The 2026.2.x series shipped steadily on npm all month. The headline is "Universal Deploy": all eight supported AI coding tools now get all four kinds of AIWG content — agents, commands, skills, and rules. Releases also began publishing to npm on their own, so a new version reaches you the moment it is tagged. Three new frameworks arrived: one for research work, one for managing media archives, and one for digital forensics (investigating computer break-ins). And a new rules setup cut the context load of rules by about 95 percent, so your agent keeps more room for real work.

## By the numbers

| What's public | Value |
|---|---|
| On npm | `aiwg` — the 2026.2.x series, published through February |
| Source | github.com/jmagly/aiwg |
| Works with | Claude Code · OpenAI Codex · GitHub Copilot · Cursor · Factory AI · OpenCode · Warp Terminal · Windsurf |
| New this month | universal deploy across all eight tools · research framework · media-curator framework · forensics framework · deep-context (RLM) addon · daemon mode · chat bots for Slack, Discord, and Telegram |
| What it helps you do | run the same helpers on any of eight AI tools · handle huge inputs · investigate incidents · keep agent code tidy |

## Highlights

**1. Every tool gets everything.**
What it is: AIWG works inside eight AI coding tools. (A "provider" is an AI tool AIWG can set itself up inside, like Claude Code or Cursor.) Before, some tools only got part of the kit. Now all eight get agents, commands, skills, and rules.
How you'd use it: run one setup command for your tool. AIWG puts every piece where that tool looks for it.
Why it helps: you get the same full toolkit no matter which AI tool you use. Switching tools no longer means losing features.

**2. Releases now ship themselves.**
What it is: when a new version is tagged, it publishes to npm on its own. Early in the month this pipeline was built and fixed, and it ran for the rest of February.
How you'd use it: nothing to do. `npm install -g aiwg` always gets you the newest public release.
Why it helps: fixes and features reach you fast, with no manual publish step to forget.

**3. Rules got 95 percent lighter.**
What it is: AIWG ships rules that keep agents honest — like "never delete tests to make them pass." Each rule used to be its own file loaded into the agent's context. Now one short index sums them all up, with links to the full text.
How you'd use it: redeploy with your usual setup command. Old rule files are cleaned up for you.
Why it helps: the agent's context window is its working memory. Less space spent on rules means more space for your actual code.

**4. Three new frameworks.**
What it is: a research framework (checks sources, grades evidence, verifies citations), a media-curator framework (finds, tags, and organizes music and video archives), and a forensics framework (guides a careful, step-by-step look into a computer break-in without harming evidence).
How you'd use it: deploy any of them with one command, like `aiwg use research` or `aiwg use media-curator`.
Why it helps: AIWG now covers more kinds of work than just building software — with the same agents-plus-rules approach.

**5. Handle inputs too big for one agent.**
What it is: a new addon for very large jobs, called RLM (short for recursive language model). It splits a huge input — say, millions of words — into pieces, has helper agents work each piece, then merges the answers.
How you'd use it: deploy it with `aiwg use rlm`, then ask a question over a huge codebase or document set.
Why it helps: you can work with material far bigger than any single agent's memory, without losing detail.

**6. Agents that work your issue list with you.**
What it is: a new command that takes your open issues and works through them, one by one. It posts a status note on each issue and reads your replies before moving on.
How you'd use it: say "address the open issues." The agent works, reports on the issue thread, and waits for your feedback when it matters.
Why it helps: you steer the work through normal issue comments. No need to sit and watch.

## Features shipped

**Universal deployment.** The core work of the month. All eight supported tools now receive all four content types. Rules became a first-class deployable piece, just like agents and commands. Tools that read one big context file get rules woven into that file; tools that read separate files get separate files. GitHub Copilot reached full parity with the rest. A related rule now enforces zero AI branding in your output — no "generated by" stamps in commits, code, or docs, on any platform.

**Deep context and background work.** The RLM addon (above) landed, and addons became first-class setup targets — `aiwg use rlm` works just like deploying a framework. A new daemon mode lets AIWG run in the background: it can watch files, run tasks on a schedule, and keep long jobs alive. A new messaging layer adds chat bots for Slack, Discord, and Telegram, so you can talk to your agents from chat, both ways.

**Long, crash-proof agent runs.** The external agent loop wraps a work session that may run for hours. It saves snapshots before and after, takes checkpoints as it goes, and picks up where it left off after a crash. It remembers what worked across runs, and it can drive more than one AI tool.

**New frameworks, fully wired in.** The research framework brings agents for grading evidence quality, checking citations, and tracking where every claim came from. The media-curator framework covers a whole archive pipeline: study an artist's catalog, find sources, download, filter by quality, tag, check completeness, and export for players like Plex or Jellyfin. The forensics framework brings a full incident-response team — agents for memory, logs, network traffic, cloud, and containers — plus strict rules like "never modify the evidence." All of them deploy to any of the eight tools.

**Keeping agent code manageable.** New rules set size limits on the code agents write, so files stay small enough for future agents (and people) to read. New commands score a codebase's "agent readiness," gate overly complex changes in CI, and help split oversized files safely. A set of specialist agents also arrived — cloud experts, framework experts like React and Django, and ready-made team lineups.

**Smarter setup underneath.** Provider setup moved to a manifest-driven design: each framework describes itself in a small file, and every tool's deploy path reads that file. Adding a new framework no longer means hand-editing eight separate tool integrations.

**Fit the toolkit to your machine.** You can now declare your context window size — how much working memory your model has. AIWG then scales how many helper agents run at once. This matters if you run smaller or local models.

## Fixes

Setup and deployment got steadier. When a skill and a command shared a name, tools could silently pick the wrong one; skills now win. A skill file format issue on OpenAI Codex was corrected. Help text now lists all eight supported tools, and stale docs — old counts, old command names, missing frameworks — were brought up to date. The publish pipeline was fixed to handle re-runs safely, and a release-file naming slip (a leading zero) was corrected so version updates work cleanly.

## Performance & reliability

The lean rules change is the big one: one short index now replaces a long stack of rule files, cutting rules' context cost by about 95 percent. That leaves your agent more room to think. The test suite was also consolidated — duplicate tests merged, flaky timing checks steadied — with no loss of coverage. And the new crash-resilient loop means a long agent run no longer dies with a lost session.

## Breaking changes & migrations

No breaking changes. One migration note: to get the new consolidated rules, redeploy with your usual command (for example, `aiwg use sdlc`). Old individual rule files are removed for you.

## Releases

The 2026.2.x series shipped on npm through February. The notable steps:

- **2026.2.1 and 2026.2.2 (Feb 8):** the "Universal Deploy" work went public — all eight tools, all four content types, rules as a deployable piece, and the automated npm publish pipeline itself.
- **2026.2.3 (Feb 9), "Deep Context":** the RLM addon, daemon mode, and the Slack, Discord, and Telegram bots.
- **2026.2.4 (Feb 9), "Issue Thread":** the issue-driven agent loop and context window budgets.
- **2026.2.5 through 2026.2.8 (Feb 14), "Lean Rules" to "Full Catalog":** the consolidated rules index, the media-curator framework, and one-command deploys for the research and media-curator frameworks.
- **2026.2.9 through 2026.2.11 (Feb 15–24):** manifest-driven setup across all tools, plus CI and platform-service polish.
- **2026.2.12 through 2026.2.14 (Feb 27–28):** doc-drift detection (`aiwg doc-sync`), a fast idea-to-build pipeline (`aiwg sdlc-accelerate`), the forensics framework, code-manageability tooling, and the specialist agent teams.

## Dependencies & security

A dated file-matching library (glob) was updated to its current major version, clearing a deprecation warning and known vulnerabilities. The zero-attribution rule also tightened output hygiene: no tool branding leaks into your commits or code. No security advisories affected AIWG this month.

## Docs & developer experience

Docs grew a lot. New guides cover daemon mode, messaging bots, model choice (Claude, GPT, and local models), and prompting techniques. The docs site, docs.aiwg.io, got its own build-and-deploy pipeline: every release now refreshes the site, and doc changes are checked for broken links before merge. Dozens of broken links were repaired, and the welcome page now shows the full framework and addon lineup. The CLI reference was audited so command lists match what actually ships.

## Tests & CI

CI learned to publish to npm automatically on tag push and to handle re-runs without errors. The test suite was consolidated with no coverage loss, and several flaky tests — timing checks, Docker-environment quirks — were fixed or made deterministic. Doc site builds are now validated in CI too.

## Cross-project impact

AIWG's reach widened this month. The same toolkit now serves software teams, researchers, media archivists, and incident responders. Release tags now also refresh the aiwg.io website automatically, so the public site keeps pace with the code without manual steps.

## Known issues & open threads

- Daemon mode and the chat bots are brand new. Expect rough edges while they mature.
- The RLM addon is an early take on very-large-input work; its patterns will keep evolving.
- Docs cleanup continues — the link fixes landed late in the month, and more site polish is planned.

## What's next

More growth for the new frameworks — forensics, research, and media curation all have room to deepen. More polish on the docs site. Continued work on background and chat-driven agents. And steady 2026.3.x releases as the month turns.

## Appendix

- **Published packages:** `aiwg` on npm.
- **Releases:** the 2026.2.x series, published to npm through February 2026.
- **Source / docs:** github.com/jmagly/aiwg · docs.aiwg.io · window: all of February 2026.
- **Supported tools this month:** Claude Code · OpenAI Codex · GitHub Copilot · Cursor · Factory AI · OpenCode · Warp Terminal · Windsurf.
