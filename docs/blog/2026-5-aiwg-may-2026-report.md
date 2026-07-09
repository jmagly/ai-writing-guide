---
title: "AIWG — May 2026 Report"
slug: "2026-5-aiwg-may-2026-report"
date: "2026-05-31"
project: "aiwg"
type: report
tags: [report, "2026-05", "aiwg"]
summary: "The biggest month yet: a major stable release, signed and verifiable packages, a guided setup wizard, per-project customization without forking, and steady updates all month."
status: "published"
canonical: "https://aiwg.io/blog/2026-5-aiwg-may-2026-report"
---

# AIWG — May 2026

_AIWG is a toolkit that helps AI coding agents work in a clear, reliable way. It gives them skills, rules, and shared memory so they make fewer mistakes and stay easy to follow._

## TL;DR

May was AIWG's busiest month so far. The headline is **2026.5.0** — a major stable release that folded in months of test builds. It brought per-project customization without forking, a leaner "core skills" model, and plain-words discovery on every supported AI tool. Mid-month, AIWG hardened its **supply chain** — the path code travels from us to your machine. Every release is now signed, carries proof of where it was built, and ships a full list of its parts. A guided **setup wizard** arrived for first-time users, along with a set of beginner guides. Agents got smarter about long tasks: they can work out their own finish line and keep going through long sessions instead of stopping to ask. And the AIWG engineering blog went live. Updates shipped to npm steadily all month.

## By the numbers

| What's public | Value |
|---|---|
| Published packages | `aiwg` — on npm |
| New this month | the 2026.5.x stable line · signed releases · `aiwg wizard` · per-project bundles |
| Key capabilities | customize per project · verify what you install · guided first-run setup · smarter long-running agents |
| Docs | docs.aiwg.io |
| Source | github.com/jmagly/aiwg |

## Highlights

**1. A major stable release: 2026.5.0.**
What it is: the biggest AIWG release to date. It gathered months of test builds into one stable version you can install with confidence.
How you'd use it: install or update from npm as usual. Everything below rides on this line.
Why it helps: test builds move fast but can wobble. A stable tag means the whole set was checked together, end to end.

**2. Customize AIWG per project — no fork needed.**
What it is: you can now keep your own skills, rules, and agents inside one project, next to your code. One command scaffolds a starter bundle. Another deploys it. A third can graduate it into the shared library later, copied byte for byte.
How you'd use it: say your team has a house rule for commit messages. Scaffold a small bundle, drop the rule in, and deploy. It sits alongside the built-in rules. If it proves useful, promote it so other projects get it too.
Why it helps: before, real customization meant forking the whole toolkit. Now it takes about five minutes, and removal never deletes your source files.

**3. Releases you can verify.**
What it is: every AIWG release is now signed and carries proof of where it was built. Each one also ships a full, signed list of the parts inside it. This was a direct response to a wave of attacks on public code registries this spring.
How you'd use it: standard npm tools can check the proof for you. There is also a guard that refuses brand-new package versions for their first week, since fresh, unvetted versions are where poisoned code tends to hide.
Why it helps: you can trust what lands on your machine — and AIWG ships ready-made helpers so you can protect your own packages the same way.

**4. A guided setup wizard.**
What it is: `aiwg wizard` walks a first-time user through setup: pick your AI tool, pick a profile, pick a mode, then verify it all works.
How you'd use it: run one command and answer a few plain questions. New beginner guides cover what to do next and how to recover if something looks off.
Why it helps: your first success comes faster, with fewer wrong turns. Setup even warns you if you're about to install into the wrong folder, like your home directory.

**5. Agents that finish the job.**
What it is: two upgrades for long-running work. Task loops can now infer their own finish line — they read your project and propose a measurable "done," like "the test suite passes." And a new rule tells agents to keep working through long sessions: save progress to disk, compact, and continue, instead of stopping to ask "should I keep going?"
How you'd use it: start a loop with a plain request like "fix the failing tests." No extra setup needed.
Why it helps: long tasks used to stall on vague goals or die when the session filled up. Now they push through to a clear, checkable end.

**6. Find the right tool on any AI app.**
What it is: AIWG's "search first" habit now reaches all ten supported AI tools. Agents load a small always-on core, then look up everything else by describing what they need in plain words.
How you'd use it: nothing to do — agents query the index on their own. You can also run `aiwg discover "deploy to production"` yourself and read any result in full with `aiwg show`.
Why it helps: hundreds of skills stay one query away without crowding the agent's limited working space. Agents stop saying "I don't have a tool for that" when the tool exists.

## Features shipped

**Per-project customization.** A full lifecycle for project-local bundles landed: scaffold, deploy, health-check, remove, and promote. Bundles use the exact same shape as the shared library, so graduating one upstream is a verified copy with zero rewriting. A safety list stops a local bundle from quietly replacing a safety-critical built-in. Every step is written to an activity log you can audit later.

**Trust and security.** Beyond signed releases, May added a new applied-security framework. It brings focused reviewers and rules for the sharp edges of security work. They cover picking the right encryption building blocks, keeping keys separate by purpose, checking crypto command flags, banning known-dangerous functions, and tracing a system's chain of trust. AIWG also audited itself against a well-known 28-practice security checklist. The gaps became shipped rules and skills — including templates and checks you can apply to your own projects.

**Smarter discovery.** `aiwg discover` became a first-class command, joined by `aiwg show` to fetch any skill or rule in full, `aiwg features` to list what's available, and `aiwg run skill` to execute script-backed skills directly. A new language map helps novices find things by intent, not exact names. Deploys now end with a clear "reload your session" note per tool, which cleared up a whole class of "my agent can't find X" confusion.

**Long-running and team agents.** Task loops route to each AI tool's own native loop where one exists, and stay in-session by default. For bot fleets on small budgets, new discipline rules landed: quiet bots that only answer when addressed, spending tiers with confirmation before expensive work, tool-call quotas that stop wasteful retry loops, and a repo-access check before an agent touches a neighboring repository. A machine-readable status export lets outside dashboards watch workspace health.

**Research and knowledge work.** The research framework absorbed a full set of corpus tools: a freshness radar that flags stale sources, profile generation for people and organizations in your library, funder-network analysis, and discovery logging. The index now renders readable views — by year, topic, venue, author, and more — in one build step. A first media primitive landed too: a transcript sidecar for audio and video, with hashes and timestamps, preparing the ground for turning talks into research notes.

**Local issue tracking.** Projects can now keep a simple, file-based issue list that works offline. It syncs with a live tracker when you want — import, export, and two-way sync, with conflict handling documented. A guide agent helps you pick and set up the right workflow.

**Better setup everywhere.** Provider detection got smarter in mixed workspaces, so refresh and regenerate target the right tool's files. The Hermes integration gained a complete optional MCP surface — MCP is a standard plug that lets tools talk to each other. Windows setup and health checks were hardened. And every framework can now install as a one-command plugin in Claude Code, not just the flagship two.

## Fixes

A silent-failure class in the publish pipeline was closed: release steps that failed quietly now fail loudly, so updates reliably reach npm. The capability-routing helper (`aiwg steward`) works end to end after two path and schema fixes. Duplicate slash commands on Claude Code and doubled skill listings on Codex were cleaned up. `aiwg use all` stopped repeating its full post-deploy flow for every framework. Fresh installs no longer scaffold a doubled workspace layout that looked like a half-finished migration. Upgrades now heal stale hook paths that could crash a session at startup. And a sweep driven by an outside tester's report fixed a run of command-line paper cuts, from broken help flags to missing files in the shipped build.

## Performance & reliability

Release discipline was the quiet win. The build now fails fast if version numbers drift out of step across files, and tests run against a fresh build instead of a stale one — a gap that had bitten one mid-month release. Long-document search became more reliable: short files are indexed instead of skipped, saved search prep is checked for completeness before reuse, and flags no longer eat your search words. Heavy optional parts, like a local database engine, moved out of the default install, so plain installs are lighter and cleaner.

## Breaking changes & migrations

No hard breaks this month. Two soft deprecations to note:

- **`aiwg sync` is now an alias for `aiwg refresh`.** It still works but prints a warning; switch when convenient.
- **Skills are the canonical form; commands are generated from them.** The old `aiwg add-command` path is deprecated in favor of adding a skill.

One naming note: there was never a stable 2026.4.0 on npm. That test series rolled forward, and all of its work shipped inside 2026.5.0.

## Releases

Updates shipped steadily through the month — small and frequent, so fixes reach you quickly. Early May also carried a run of release-candidate builds on the test channel, leading up to the stable line. Each release below is public on npm.

- **2026.5.0** (May 11) — the major stable release: per-project bundles, the core-skills model, plain-words discovery, and months of folded-in work.
- **2026.5.1** (May 11) — quick fix so the health check runs cleanly on installed copies.
- **2026.5.2** (May 11) — tester-report fix sweep; issue and PR filing helpers; the release process becomes a saved, config-driven checklist.
- **2026.5.3** (May 13) — supply-chain hardening complete: signed releases, build provenance, a signed parts list, and the release-age guard.
- **2026.5.4** (May 13) — full Hermes support, including the complete optional MCP surface.
- **2026.5.5** (May 14) — the search-first habit reaches every supported tool; setup warns before installing into the wrong folder.
- **2026.5.6** (May 14) — task loops infer their own finish line; agents keep working through long sessions instead of stopping to ask.
- **2026.5.7** (May 15) — steadier long-document search; loops stay in the current session by default.
- **2026.5.8** (May 18) — fleet discipline for bots: quiet mode, spending tiers, tool quotas, repo-access checks, and a status export.
- **2026.5.9** (May 18) — faster full deploys; operator commands stay findable on every tool.
- **2026.5.10** (May 19) — the `aiwg wizard` guided setup and the beginner guide set.
- **2026.5.11** (May 25) — smarter tool detection in mixed setups; local issue sync; first transcript support for audio and video.
- **2026.5.12** (May 28) — research corpus tools (freshness radar, profiles, funder analysis) and the launch of the engineering blog.
- **2026.5.13** (May 30) — clean fresh installs and self-healing upgrades for older setups.

## Dependencies & security

This was the strongest security month in AIWG's history, driven by a spring wave of attacks on public package registries. Every release now carries a signed proof of origin, a signature over the package bytes, and a signed inventory of everything inside. The build pipeline pins every outside action and container to an exact fingerprint, so a moved tag can't slip new code into a build. A policy check blocks risky dependency sources. Installs refuse package versions younger than seven days. A startup script that ran on every install was removed outright. Heavy optional dependencies became opt-in rather than default. And the same protections ship as skills and templates you can apply to your own projects, with a step-by-step guide.

## Docs & developer experience

The **AIWG engineering blog** launched at docs.aiwg.io, with posts kept as plain markdown files in the public repo. A new architecture overview with diagrams gives newcomers a visual map of how the pieces fit. Beginner docs grew a full set: first success, choosing your AI tool, scope and recovery, and a plain-words language map. Contributor guides for filing issues and pull requests landed, along with matching templates. A "verify a release" guide walks through checking signatures and provenance by hand. And the docs site now builds from the published publishing tool instead of a source checkout, which made deploys simpler and safer.

## Tests & CI

The publish pipeline gained a signed-tag gate: nothing ships unless the release tag verifies. A version-lockstep check fails the build if the package files disagree about the version. Tests now run after a fresh build in the publish workflow, matching the main pipeline. A fake sandbox harness landed so the serve stack can be tested without live infrastructure, with an optional live tier when a real sandbox is reachable. Windows paths got dedicated hardening and coverage.

## Cross-project impact

- AIWG's docs and blog publish through **Pagenary**, the family's publishing tool — the docs site now installs it from npm like any user would.
- The **research-papers** corpus tooling merged into the research framework, replacing a pile of one-off scripts with supported commands.
- Groundwork for the **agent dashboard** shipped quietly: a standard contract for the places agents run, a fake sandbox for testing, and a bridge for background missions. That dashboard arrives next month.
- The **Hermes** and **OpenClaw** integrations matured, and behavior bundles now deploy across all supported tools.

## Known issues & open threads

- Turning talks and videos into full research notes is still in progress; May shipped the transcript groundwork, and the complete pipeline lands next month.
- After a deploy, some AI tools still need a session reload before new skills appear. Deploys now say so clearly, but making it automatic is a follow-up.
- Older installs that hit the duplicated-workspace bug may see one final cleanup prompt; the fix in 2026.5.13 stops it from happening again.
- Behavior checks on a few of the less-common AI tools still rely on field reports; structural checks pass, and live validation continues.

## What's next

A visual dashboard for watching and steering your agents is deep in build and arrives next month. The media-to-research pipeline gets completed, so recordings flow straight into citable notes. Search gets smarter about plain-sentence questions. And the steady stream of small updates continues.

## Appendix

- **Published packages:** `aiwg` — on npm.
- **Releases:** the 2026.5.x series, 2026.5.0 through 2026.5.13, published to npm through May.
- **Source / docs:** github.com/jmagly/aiwg · docs.aiwg.io · window: all of May 2026.
