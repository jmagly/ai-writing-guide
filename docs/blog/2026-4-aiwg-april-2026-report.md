---
title: "AIWG — April 2026 Report"
slug: "2026-4-aiwg-april-2026-report"
date: "2026-04-30"
project: "aiwg"
type: report
tags: [report, "2026-04", "aiwg"]
summary: "A month of public test builds: the 'Autonomous Systems' release line ran on npm's next channel all month, bringing a web dashboard, pick-your-own storage, and agents that follow your git rules."
status: "published"
canonical: "https://aiwg.io/blog/2026-4-aiwg-april-2026-report"
---

# AIWG — April 2026

_AIWG is a toolkit that helps AI coding agents work in a clear, reliable way. It gives them skills, rules, and shared memory so they make fewer mistakes and stay easy to follow._

## TL;DR

April was a huge build-and-test month. AIWG's next big version, 2026.4.0, is called "Autonomous Systems." All month, it shipped as release candidates — early test builds you could install right away from npm's `next` channel. The work inside was wide. A web dashboard lets you watch your agents from a browser. A new storage system lets AIWG keep its memory in your own notes app, like Obsidian. Project settings now teach agents your team's git habits, so they stop guessing. The command line got a deep cleanup so it starts fast, exits clean, and never hangs. And a full kit for building AI training data moved into its own package. No stable version shipped in April — the point was to get this large release right before tagging it.

## By the numbers

| What's public | Value |
|---|---|
| On npm | package `aiwg` — the 2026.4.0 release-candidate series, on the `next` channel |
| Source | github.com/jmagly/aiwg |
| New public repo | github.com/jmagly/aiwg-training — the training-data kit as its own plugin |
| Works with | Claude Code · OpenAI Codex · GitHub Copilot · Cursor · Factory AI · OpenCode · Warp · Windsurf · OpenClaw · Hermes |
| New this month | web dashboard · pick-your-own storage · project git settings · skill quality scores · early VS Code extension |
| What it helps you do | watch agents in a browser · keep agent memory in your notes app · make agents follow your team's git rules |

## Highlights

**1. Try the next version all month long.**
What it is: a release candidate is a test build — almost final, shared early so people can try it. April's builds went out on npm's `next` channel, from rc.1 on April 1 to rc.32 on April 30.
How you'd use it: run `npm install -g aiwg@next` and you get the newest test build. Your feedback shapes the final cut.
Why it helps: you see new features weeks early, and the stable release lands with fewer surprises.

**2. A web dashboard for your agents.**
What it is: the `aiwg serve` command now opens a real dashboard in your browser. It shows your agents, a live terminal for each one, and a health view.
How you'd use it: start it, open the page, and watch an agent work. You can send it tasks and step in when it needs a human answer.
Why it helps: no more squinting at logs. You see what your agents are doing, as they do it.

**3. Keep AIWG's memory in your own notes app.**
What it is: AIWG stores things — memory, notes, logs, research. Now you choose where. It can write to plain files, or straight into Obsidian or Logseq, two popular note apps.
How you'd use it: point a storage setting at your notes vault. There's also a `migrate` command to move old data over.
Why it helps: your agent's memory lives where you already read and search. Nothing gets stuck in a hidden folder.

**4. Agents that follow your git rules.**
What it is: a small project settings file now records how your team ships code. Straight to main? Branch first? Always a pull request? It also records where your repos and issue tracker live.
How you'd use it: answer one setup question, or run `aiwg config set`. From then on, the commit and pull-request helpers read your answer and follow it.
Why it helps: agents stop guessing your workflow. No more surprise branches on a solo project, or direct pushes on a team one.

**5. A command line that starts fast and never hangs.**
What it is: a deep cleanup of the `aiwg` command itself. Clear error messages, clean exit codes, a new `aiwg diagnose` helper, and an end to the hangs that could stall a session.
How you'd use it: nothing to learn — commands just behave. When something breaks, the error now tells you what to do.
Why it helps: a tool you trust in scripts and in CI, not just at the keyboard.

**6. A kit for building AI training data, now its own plugin.**
What it is: a full pipeline for making fine-tuning datasets — gather sources, check quality and licenses, create examples, format them, and scrub test data out. It moved to its own repo: github.com/jmagly/aiwg-training.
How you'd use it: install the training plugin when you need it. The main toolkit stays lean if you don't.
Why it helps: teams building custom models get a guided path. Everyone else gets a smaller install.

**7. Quality scores for skills.**
What it is: skills are the how-to files agents follow. A new `aiwg skill-lint` command grades each one against a rubric, and every skill in AIWG was cleaned up to pass.
How you'd use it: run it on your own skills to catch missing names, bad headers, and thin instructions.
Why it helps: better skill files mean agents that follow them better.

## Features shipped

**The dashboard and the sandbox.** The `aiwg serve` web app grew fast. It ships inside the npm package, so there is nothing extra to build. It shows live terminals with real scrollback, an agent list, a task submission form, and a health tab. It also talks to sandboxes — safe, separate machines where an agent can run without touching your computer. You can see each sandbox, give each agent its own identity, and approve steps when the agent asks. A session picker lets you jump between running agents.

**Storage you choose.** Under the new system, each part of AIWG — memory, knowledge base, activity log, research notes, and more — asks one resolver where to write. Backends shipped for plain files, Obsidian, Logseq, and Fortemi (a memory service in the same product family). New commands let you inspect the setup, test a backend, and migrate data between them. The activity log also learned to rotate old entries and to record qualifying commands on its own.

**Project settings agents obey.** The project config file gained two big blocks. One declares your repos: which remote is primary, where issues live, where CI runs. The other declares your delivery policy: direct commits, feature branches, or pull requests. New `aiwg config` commands read and write these from the terminal, and the guided intake asks about them up front. The commit, pull-request, and issue helpers all consume the answers.

**Memory and wikis.** A new semantic-memory kernel gives any framework a shared way to ingest notes, check them, and log queries. On top of it, a new `llm-wiki` addon builds a personal wiki from what your agents learn, with page styles for research, business, or book notes — Obsidian-friendly out of the box.

**Deeper software process.** The SDLC framework — AIWG's software-building process kit — was audited against a popular 12-point checklist for reliable agent software, and the gaps were closed with new templates, lint rules, and gates. A new specification layer means designs now include behavior specs and pseudo-code before coding starts, so the coding step is translation, not guesswork. The research framework gained corpus intelligence: graph indices, gap detection, and snapshots of what your sources cover.

**More ways to install and run.** An early VS Code extension arrived, with a chat participant and setup helpers. A new `aiwg session` command launches a fully checked, self-healing agent session in one step. `aiwg feedback` files a bug report from the terminal, with your system details attached. Setup can now run without prompts, for fresh servers and cloud images. And the ops framework learned to adopt repos you already cloned and to find ones you forgot about.

## Fixes

**Install and packaging.** One test build, rc.28, was broken when installed from npm — a wrong import path. It was found and fixed in the next candidates, and the build now checks for it. A crash from opening too many files during deploys was fixed. Deploys also got smarter: unchanged skills are skipped, which cuts noise and time.

**Hangs and exits.** Several bugs could leave the command line hanging after work finished — one for up to five minutes. A stabilization sweep removed them, and commands now exit cleanly on their own.

**Terminal and dashboard.** The in-browser terminal fixed a black-screen bug, trimmed noisy replay history, and reconnects cleanly when the link drops.

**Deploy correctness.** Skill names that collided with Claude Code's built-ins are now resolved automatically. Leftover files from old layouts get cleaned up. Counts in generated context files no longer reset to zero after partial deploys.

**Keeping up with the tools.** Stale model names were refreshed, and Factory AI moved up to top-tier support after its agent runner and integrations were verified.

## Performance & reliability

Reliability was the month's core theme — that's what a release-candidate month is for. The command line gained structured logging, startup tracing, and budget gates that watch its own speed. Config writes became atomic, so a crash can't corrupt them. Deploys skip files that didn't change. And the whole test suite was brought back to green: long-standing test failures were fixed rather than skipped.

## Breaking changes & migrations

- **`aiwg sync` is deprecated.** Use `aiwg refresh` instead. The old name still works and prints a warning, so nothing breaks today.
- **The training framework moved out.** It is now its own plugin at github.com/jmagly/aiwg-training. If you used it, install the plugin; the main package no longer carries it.
- **Skill files need headers.** If you write your own skills, each SKILL.md now needs a `name` and `description` up top. The new linter tells you exactly what's missing.

## Releases

No stable version shipped in April — by design. The month belonged to the 2026.4.0 release-candidate series, published to npm on the `next` channel as the work landed: rc.1 opened the series on April 1, and steady candidates followed through rc.32 on April 30. Installing `aiwg@next` at any point gave you that day's build. The release is nicknamed "Autonomous Systems," after its biggest theme: agents that can run, watch, and report on their own, safely.

## Dependencies & security

The install got leaner and safer. Heavy optional libraries — machine-learning models, terminal rendering, graph tools — moved out of the required install, so you only pull them if a feature needs them. A tool-discovery routine that probed your system path was replaced with a strict allowlist, closing a small trust gap. File writes for config and logs became atomic. No security advisories affected AIWG this month.

## Docs & developer experience

A full user guide shipped for the new storage system, and the command reference grew to cover the storage and ops commands. Contributors got a documented fork workflow, a dev mode that flags when your fork drifts from upstream, and a doc-consolidation skill that crawls a repo and builds a categorized index of its docs. The `aiwg sync` deprecation was written up with clear migration notes.

## Tests & CI

The build pipeline now lints every skill file's header on every pull request, across the whole corpus, and posts a score summary right on the PR. Metadata validation covers skill files too. The suite itself got healthier: all pre-existing test failures were fixed, timing-sensitive tests were steadied for CI, and the release workflows learned to handle pre-release versions like the month's candidates.

## Cross-project impact

The training kit became its own public project, so it can grow on its own release schedule. The new Fortemi storage backend ties AIWG's memory to that product's memory service. Obsidian and Logseq support connects AIWG to two large note-taking communities. And the early VS Code extension opens a path to the largest editor ecosystem there is.

## Known issues & open threads

- The stable cut of the "Autonomous Systems" line had not shipped by month-end; hardening continued into May.
- One April test build (rc.28) was broken on install. If you hit it, any later candidate fixes it.
- The web dashboard and sandbox support are young. They work, but expect rough edges.
- The VS Code extension is an early preview, not yet a polished release.

## What's next

Finish the hardening and ship this work as a stable release. Keep growing the dashboard and sandbox story — watching and steering agents from a browser is just getting started. Add more storage backends. And keep the monthly rhythm: build in the open, test on `next`, then tag.

## Appendix

- **Published packages:** `aiwg` on npm · `aiwg-training` (new standalone plugin repo).
- **Releases:** the 2026.4.0 release-candidate series, published to npm on the `next` channel through April.
- **Source / docs:** github.com/jmagly/aiwg · github.com/jmagly/aiwg-training · window: all of April 2026.
- **Supported tools this month:** Claude Code · OpenAI Codex · GitHub Copilot · Cursor · Factory AI · OpenCode · Warp · Windsurf · OpenClaw · Hermes.
