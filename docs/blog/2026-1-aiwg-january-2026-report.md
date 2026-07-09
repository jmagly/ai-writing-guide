---
title: "AIWG — January 2026 Report"
slug: "2026-1-aiwg-january-2026-report"
date: "2026-01-31"
project: "aiwg"
type: report
tags: [report, "2026-01", "aiwg"]
summary: "AIWG's first full month as a public npm package: an agent loop that retries until the job is done, issue tracking from your chat, steering flags on every command, and setup fixes across all eight supported tools."
status: "published"
canonical: "https://aiwg.io/blog/2026-1-aiwg-january-2026-report"
---

# AIWG — January 2026

_AIWG is a toolkit that helps AI coding agents work in a clear, reliable way. It gives them skills, rules, and shared memory so they make fewer mistakes and stay easy to follow._

## TL;DR

January was AIWG's first full month as a public package on npm. The 2026.1.x series shipped, and each release made real daily use smoother. The headline is the agent loop: you give a task and a way to check it, and AIWG keeps trying until the check passes. Issue tracking arrived too, so agents can file and close work items for you. Every command gained two simple steering flags. And a round of fixes made setup land in the right place on all eight supported AI coding tools.

## By the numbers

| What's public | Value |
|---|---|
| On npm | `aiwg` — install with `npm install -g aiwg` |
| Releases | the 2026.1.x series |
| Works with | Claude Code · OpenAI Codex · GitHub Copilot · Cursor · Factory AI · OpenCode · Warp Terminal · Windsurf |
| New this month | agent loop (Ralph) · issue management · `--interactive` and `--guidance` on all commands |
| Source | github.com/jmagly/aiwg |

## Highlights

**1. The agent loop: keep trying until it works.**
What it is: a new addon called Ralph. (An addon is a small feature pack you can add to AIWG.) You give it a task and a clear "done" check, like "all tests pass."
How you'd use it: say "keep trying until the tests pass." The loop runs the task, checks the result, learns from what failed, and tries again. You can check its status, pause it, resume it, or stop it.
Why it helps: agents often quit after one failed try. The loop turns failure into a lesson instead of a dead end. There is also an outside watcher that keeps long jobs alive even if a session crashes, and it saves the output as it goes.

**2. Issues, handled from your chat.**
What it is: commands to create, update, list, and close work items — the "issues" that track bugs and tasks.
How you'd use it: ask your agent to file an issue for a bug it found. It works with GitHub, Gitea, Jira, or Linear, or with plain local files if you use none of those. When a commit says "Fixes" an issue, the issue closes on its own.
Why it helps: the work your agent does gets tracked like the rest of your team's work, with no copy-paste.

**3. Two small flags that steer every command.**
What it is: every AIWG command now takes `--interactive` and `--guidance`.
How you'd use it: add `--interactive` and the agent asks you a few questions before it starts. Add `--guidance "focus on new users"` and it keeps that note in mind the whole time.
Why it helps: you steer the work up front instead of correcting it after. Less rework, fewer surprises.

**4. Setup that lands right on all eight tools.**
What it is: fixes to how AIWG installs itself into each AI coding tool it supports.
How you'd use it: run the setup command for your tool. Files now go to the exact folders that tool reads, and every addon and command comes along.
Why it helps: before, some tools missed new addons or got files in the wrong spot. Now one setup step gives you the full kit, on any of the eight tools.

**5. Version numbers you can trust.**
What it is: AIWG versions now follow a calendar scheme: year, month, patch — like 2026.1.5.
How you'd use it: nothing to do. Just update as normal with npm.
Why it helps: you can tell at a glance how fresh a release is, and updates install cleanly.

## Features shipped

**The Ralph agent loop.** The biggest new piece this month. You hand it a task plus a way to verify it, and it runs a cycle: do the work, check it, learn from the result, try again. State is saved between rounds, so an interrupted loop can pick up where it left off. A second part, the external supervisor, watches long jobs from outside the session. If the session crashes, the job survives, and the full output is captured for review. Later in the month the loop also gained a memory of past attempts, so it avoids repeating the same failed approach.

**Issue management.** New commands let agents create, update, and sync issues across GitHub, Gitea, Jira, and Linear — or keep them as local files with no service at all. Commits that say they fix an issue update and close it on their own. This keeps agent work visible in the same tracker your team already uses.

**Steering flags everywhere.** All commands now accept `--interactive` (ask me questions first) and `--guidance` (keep this note in mind). The same pattern works across the software and writing commands alike.

**A unified extension system.** Under the hood, AIWG now treats agents, commands, skills, and hooks as one kind of thing: an extension. (A hook is a small action that runs at a set moment, like right after a file is saved.) One system finds them, checks them, and deploys them. This makes new feature packs easier to build and more reliable to install.

**Stronger agents.** Agent definitions gained clear thinking protocols and worked examples, and new specialist agents joined the set. A regression-testing capability was woven through the software workflow, so changes get checked against past behavior. New workflow patterns landed too, including one where the agent explores several solution paths before picking one, and one where code must pass its own tests before it comes back to you.

**A research-backed core.** A large push grounded AIWG's design in published research. The toolkit gained a quality scale for judging evidence, a standard way to track where each artifact came from, and a check that citations point to real sources. The payoff for you: rules and workflows built on tested findings, not guesses.

**Smaller additions.** A new addon bridges AIWG to tools that speak MCP, an open protocol that lets AI apps share tools. A gap-analysis command finds what's missing in a project. And `man aiwg` now works after a global install, so help is one command away.

## Fixes

**Setup and deployment.** The bulk of January's fixes made installs land correctly. Each tool now gets files in its own folders — for example, Codex prompts go to your home folder, and Cursor rules go into the right project folder. New addons are found on their own, so nothing needs a hand-written list. A filter that held back some commands was removed, so the full command set now deploys. The plugin listing file moved to the right spot, so installing AIWG as a Claude Code plugin works cleanly.

**Publishing and versions.** Early version numbers used a format that npm's updater rejects. The format was corrected and written down, so `npm update` works as expected from here on.

**Agent loop polish.** The external supervisor now fills in sensible defaults when an analysis reply comes back incomplete, so long runs don't stall on a missing field.

## Performance & reliability

The reliability story this month is the agent loop itself. Long tasks no longer die with a crashed session: the outside watcher keeps them alive and saves every line of output. Loop state is written to disk, so you can stop and resume without losing progress. And the regression-testing work means changes get compared against known-good behavior before they reach you.

## Breaking changes & migrations

One naming change: the old "ticket" commands were renamed to "issue" commands. If you used a ticket command before, use the matching issue command now — the behavior is the same.

Also, if you installed one of the very first January versions, a fresh `npm install -g aiwg` is the surest way to get on the corrected version scheme.

## Releases

All published to npm as the `aiwg` package:

- **2026.1.3** (January 13) — the agent loop (Ralph) with status, resume, and abort commands; issue management across GitHub, Gitea, Jira, Linear, or local files; `--interactive` and `--guidance` on all commands; the MCP bridge addon; gap analysis; and `man aiwg` support.
- **2026.1.4** (January 14) — setup fixes so each of the eight tools gets files in its correct folders, plus a test suite that proves it.
- **2026.1.5** (January 14) — automatic addon discovery, so every provider picks up new addons like Ralph without code changes.
- **2026.1.6** (January 14) — finished the discovery work for Codex prompts, Cursor rules, Warp, and Windsurf; added the calendar-versioning guide.
- **2026.1.7** (January 14) — removed the command filter, so the full command set deploys everywhere.

## Dependencies & security

No security advisories this month. New token-handling rules shipped with the toolkit: secrets load from files or environment settings at the moment of use, never hard-coded, never printed. Agents that talk to code hosts now follow these rules by default.

## Docs & developer experience

Docs had a big month. A documentation professionalization pass cleaned up the whole set: a shared glossary, consistent terms, and a research-paper library backing the claims. New guides cover the agent loop (including when to use it and when not to), the calendar version scheme, and setting up publish secrets. The README was trimmed to get you started faster, and `man aiwg` puts the manual in your terminal.

## Tests & CI

A new test suite checks that setup places files correctly for all eight tools, catching deployment mistakes before they ship. The build pipeline moved to container-based runs for steadier results, and a publish workflow was added so releases go out the same way every time.

## Cross-project impact

AIWG remained a single project this month, but its parts started working as one system. The agent loop, the issue commands, and the steering flags all plug into the same software workflow. The new extension system means every framework and addon installs through one path. And AIWG can now be installed as a Claude Code plugin from its marketplace listing, which opens a second door beyond npm.

## Known issues & open threads

- People who installed the earliest January versions may find `npm update` fails due to the old version format. A fresh global install fixes it.
- Setup on Codex and Cursor was incomplete until mid-month. If you set up early in January, run the setup command again to get the full command set.
- The agent loop is new. Its docs are solid, but expect steady polish over the next releases.

## What's next

More depth for the agent loop: better memory across runs and smarter recovery. Broader growth of the research-backed rules across all frameworks. Continued polish on multi-tool setup so every provider feels first-class. And steady releases in the 2026.x series as the public package settles into a rhythm.

## Appendix

- **Published packages:** `aiwg` on npm.
- **Releases:** the 2026.1.x series, published to npm in January.
- **Source / docs:** github.com/jmagly/aiwg · window: all of January 2026.
- **Supported tools this month:** Claude Code · OpenAI Codex · GitHub Copilot · Cursor · Factory AI · OpenCode · Warp Terminal · Windsurf.
