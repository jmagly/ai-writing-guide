---
title: "AIWG - August 2026 Report"
slug: "2026-8-aiwg-august-2026-report"
date: "2026-08-28"
project: "AIWG"
type: report
tags: [report, "2026-08", aiwg]
summary: "AIWG's August releases made agent work easier to run, check, resume, and trust across projects and tools, with agentic graphs turning complex work into visible, replayable maps."
hero: "https://docs.aiwg.io/assets/blog/2026-8-aiwg-august-2026-report.png"
hero_alt: "Sunlit glacier-blue glass forms rising from water, representing clear and inspectable agent operations."
status: "published"
canonical: "https://aiwg.io/blog/2026-8-aiwg-august-2026-report"
---

# AIWG — August 2026

*AIWG helps your AI tool work with a project. It installs agents, skills, rules, commands, and project notes in the paths your AI tool already reads. It also gives the agent safer ways to find tools, keep proof, run long work, and report what happened.*

## TL;DR

August made AIWG feel more like a work layer than a list of tools. You can run more jobs with proof. You can keep project memory with review. You can pause and resume long work. You can let each project show its own tools without filling every chat with every file.

The biggest design step was the agentic graph pattern. Instead of treating agent work as one long chat, AIWG can model complex work as a graph: agent steps, tool steps, code steps, sandbox steps, checks, retries, and human gates connected by explicit edges. That makes the route visible before it runs and easier to inspect after it finishes. August's Flow graph profile, graph backends, mission contracts, Sandbox links, Agent-to-Agent support, and guarded loop work all move AIWG toward that model.

## By the numbers

| What's public | Value |
|---|---|
| Managed npm packages | `aiwg`, `@aiwg/cli`, `@aiwg/cockpit` |
| Full package | `aiwg` |
| Lightweight signed-web CLI | `@aiwg/cli` |
| Cockpit package | `@aiwg/cockpit` |
| August npm version line | `2026.8.0`, `2026.8.1`, `2026.8.2`, `2026.8.3`, `2026.8.4`, `2026.8.5`, `2026.8.7`, `2026.8.8`, `2026.8.10`, `2026.8.11`, `2026.8.12`, `2026.8.13`, `2026.8.14`, `2026.8.15`, `2026.8.16`, `2026.8.17`, `2026.8.18`, `2026.8.19`, `2026.8.20`, `2026.8.25`, `2026.8.26` |
| Docs | docs.aiwg.io |
| Public repository | github.com/jmagly/aiwg |

## Highlights

**1. Long agent jobs are easier to trust.**
What it is: an AIWG mission is a job record for work that may pause, fail, retry, or need a yes/no choice.
How you'd use it: ask an agent to update several parts of a project. If the run stops, AIWG can keep the job state.
Why it helps: you can see what ran, what stopped, and what can start again.

**2. Project memory now has a review path.**
What it is: compound memory keeps raw notes as raw notes. Useful facts need review before they become trusted.
How you'd use it: add meeting notes, then ask for the key project facts. Review the facts before AIWG uses them later.
Why it helps: memory can grow without turning every draft note into truth.

**3. Each project can show its own tools.**
What it is: project quickrefs give the agent a small guide to local tools, packs, and provider setup.
How you'd use it: add a custom work flow to one repo. Your agent can find it by intent.
Why it helps: custom tools stay easy to find, but the chat stays small.

**4. Agentic graphs became useful work maps.**
What it is: an agentic graph is a map of work. Nodes can be agent steps, tool calls, code tasks, Sandbox runs, checks, artifacts, or human decisions. Edges show order, dependency, evidence, retry, and handoff.
How you'd use it: use a graph when work has branches, joins, checks, retries, or more than one agent. A release job, research synthesis, package audit, or migration can become a graph instead of a loose transcript.
Why it helps: you can check the route before it runs, bind proof to each node, pause or resume at a clear point, and replay the path it took.

**5. Storage moves now have clearer rules.**
What it is: AIWG can store memory, research, logs, and proof in different places.
How you'd use it: keep memory on disk, put research on another drive, or test a move first.
Why it helps: a store has to say what it can really do. Moves can be checked before trust shifts.

**6. Setup and package trust got stricter.**
What it is: setup files, release files, package assets, and alerts carry more exact proof.
How you'd use it: before you trust a setup file or alert, check which bytes and lockfile made it.
Why it helps: you do not have to trust a name alone.

## Features shipped

**External jobs.** AIWG added a way for cron, timers, or CI to start one bounded job. AIWG still checks the job, runs it once, locks it, hides secrets from proof, and reports the result. Use this for scheduled checks or repair work where the clock belongs outside AIWG.

**Reviewed memory.** Compound memory joins raw notes, wiki pages, short facts, context packs, saved output, and project context. That sounds broad, but the rule is simple. Raw notes stay raw. Facts need review. Output is only proof until you accept it. This lets a project remember more with less risk.

**Mission control.** Durable mission work now covers pause, resume, cancel, retry, and restart. It also tracks yes/no choices from the operator. Later releases added one mission contract across the command line, Cockpit, Flow, and storage. That helps a job keep the same identity as it moves.

**Safer plugin and package work.** AIWG improved Git-backed package install, offline checks, export and import, plugin remove, local source use, and full plugin delivery. If a package has files the release gate did not expect, the gate stops. This makes bad package shape a hard stop, not a warning.

**Project tool routing.** Managed quickrefs let a repo describe its own AIWG tools. A project can add local extensions, addons, frameworks, plugins, or providers. The agent gets a small guide instead of a huge file set. `aiwg regenerate` also got better at choosing the right repair path.

**Prompt-first docs.** Public docs now lead with what you ask your agent to do. Long command details are still there for operators. They are no longer the main user path. `aiwg use` also reports one clear ready state after deploy, index, context build, and checks.

**Proof across release surfaces.** AIWG added trust records, signed manifests, public schemas, setup handoffs, provider receipts, and signed web resource checks. In plain terms, more files now say where they came from, what exact bytes they used, and how a later check can prove it.

**Agentic graph runtime.** The optional Flow graph profile lets AIWG check, explain, dry-run, run, and replay graph-shaped work. It can route agent steps, tool steps, Sandbox steps, code steps, and human decisions through clear adapters. Simple tasks do not need a graph. Use one when the route matters.

The design pattern is practical. A node owns its inputs, output, state, and evidence. An edge says why one node can follow another. A check point gives the operator a place to resume. A guarded loop can retry bounded work without becoming an invisible spin. When Sandbox is used, the graph can keep the isolation step separate from the planning step. When Agent-to-Agent is used, the graph can show the handoff instead of hiding it inside prose.

**Graph and storage backends.** JSON remains the default graph store. Graphology is an optional local graph toolset. SQLite is an optional same-host graph store. Storage docs now split memory, research, activity logs, proof records, and sandbox identity into separate subsystems. Each store has to state what it can support.

## Fixes

Help is safer. Asking for help now stays on the help path before a command can change state.

Windows refresh is more reliable. Package manager wrappers keep their native quotes, even when paths have spaces.

Refresh is more honest. If a package update fails but deploy repair still runs, the final result says so.

Discovery after install is steadier. Fresh and repeated installs rebuild the graph and sync the Fortemi Core export used by discover/show.

Provider deploys are cleaner. Codex, Hermes, and multi-provider paths got fixes for profile paths, small default installs, stale managed files, and provider metadata.

Agentic graphs see more of the real project. Local Markdown links can become graph edges. Global graph stats can show up by default. Linked artifact dirs and Python project layouts are handled better. That matters because real work rarely lives in one file or one prompt.

## Performance & reliability

Release jobs now have more time for cold runners. SQLite graph storage gained safer lock handling, check points, one-step schema changes, backups, and multi-process tests. Guarded graph loops make repeated work more bounded. Package builds depend less on files left by an earlier step. CLI cold start has a repeatable gate and local checks.

## Breaking changes & migrations

None this month.

## Releases

Public npm releases for the managed package set:

- **2026.8.0** (Aug 2) - external jobs, session proof, theme work, Fortemi links, and safer deps.
- **2026.8.1** (Aug 3) - compound memory, sandbox fleets, paid-resource sign-in, and safer Codex deploy.
- **2026.8.2** (Aug 3) - Git package exchange, proof, offline checks, and portable recovery.
- **2026.8.3** (Aug 3) - plugin life-cycle fixes, release mirror repair, and MCP/Hono deps.
- **2026.8.4** (Aug 4) - full Claude Code plugin catalog, durable missions, operator choice proof, and storage import.
- **2026.8.5** (Aug 4) - Cockpit activity views, signed web-resource checks, session proof, and plugin delivery repair.
- **2026.8.7** (Aug 5) - package allowlist repair and package-root tests.
- **2026.8.8** (Aug 12) - project quickrefs, smarter regenerate, artifact-root repair, and CLI speed gates.
- **2026.8.10** (Aug 15) - repeatable release packaging and release-runner deploy checks.
- **2026.8.11** (Aug 16) - multi-bundle refresh, fresh install discovery, and Codex budget checks.
- **2026.8.12** (Aug 17) - artifact checks, release attestations, research labs, and monitor tests.
- **2026.8.13** (Aug 20) - Hermes profile deploy and checksum-checked publish tools.
- **2026.8.14** (Aug 21) - output modes and clear artifact destination policy.
- **2026.8.15** (Aug 21) - public setup handoffs and split customer/internal tracker roles.
- **2026.8.16** (Aug 22) - setup digest binding and verified publish completion.
- **2026.8.17** (Aug 22) - runnable Flow graphs, graph benchmarks, release talks, and Python-aware indexing.
- **2026.8.18** (Aug 24) - Flow graph profile, Agent-to-Agent (A2A) 1.0 support, canonical installs, and graph degraded modes.
- **2026.8.19** (Aug 24) - Markdown graph links, small default bulk installs, global graph stats, and symlink indexing.
- **2026.8.20** (Aug 25) - mission versions, storage move contracts, Universal Harness Protocol (UHP) client, SQLite hardening, and guarded graph loops.
- **2026.8.25** (Aug 25) - safe help, Windows refresh repair, clearer partial recovery, and release-runner headroom.
- **2026.8.26** (Aug 27) - patched deps, repeatable alert exports, and stronger proof for obfuscated-code findings.

## Dependencies & security

August tightened deps and the proof around them. The release line moved affected JavaScript, MCP, Hono, YAML, Nano ID, esbuild, and XML paths to safer versions where public release notes called them out.

Alerts also got better proof. They now record the file set, lockfile, package path, and integrity check behind a finding. Code that only looks hidden or packed is not enough for a high-risk alert. It needs behavior proof too.

## Docs & DX

Docs now focus more on user goals. The common setup path starts with an agent prompt and a self-checking install. Command details remain for operators and scripts.

Docs also added or refreshed pages for web-backed resources, graph backends, storage, migration, Agent-to-Agent support, setup checks, artifact output policy, and provider deploy behavior. Code blocks gained copy buttons, and the site moved to the current public theme.

## Tests & CI

Tests grew around the riskiest paths: storage, graph runs, plugin packs, provider deploys, release assets, signed tags, npm publish, and dep proof. The JavaScript test stack also moved to Vitest 4.

Publish jobs now allow more time for cold installs, tests, signatures, and package publish. The gates still keep signing, proof, bills of materials, checksums, and post-publish checks.

## Cross-project impact

**Agentic Sandbox:** AIWG Cockpit and graph work can show supported sandbox activity, posture, dispatch, retry, check point, resume, cancel, and proof boundaries. The sandbox runtime is still a separate product.

**Fortemi:** AIWG uses Fortemi Core for signed web-backed discovery and index flows. AIWG also keeps Fortemi storage use separate from static index and shard conversion paths. Fortemi server and HotM client changes belong in their own reports.

**Pagenary:** AIWG docs and site release work benefit from the publishing stack, but Pagenary product claims stay in the Pagenary report.

## Known issues & open threads

Some work is still bounded. Universal Harness Protocol support is experimental. The new storage move planner is not behind every old move command yet. SQLite graph storage is for same-host use and needs local benchmark proof before teams set support limits. Agentic graphs are strongest where the work has real branches, gates, retries, or evidence needs; small one-step tasks should stay simple. Some desktop source deps remain tracked outside the released desktop bundle boundary. Linux desktop packages were not qualified in the public release notes.

## What's next

The next step is to make the new contracts feel normal. That means clearer graph examples, smoother storage moves, better Cockpit proof views, and simpler help for project-local tools. It also means more release checks, so packages, setup files, web resources, and dep alerts stay easy to check.

## Appendix

- **Published packages:** `aiwg`, `@aiwg/cli`, `@aiwg/cockpit`.
- **Public repository:** `https://github.com/jmagly/aiwg`.
- **Release notes:** `https://github.com/jmagly/aiwg/releases`.
- **Public changelog:** `https://github.com/jmagly/aiwg/blob/main/CHANGELOG.md`.
- **Docs:** `https://docs.aiwg.io`.
- **npm:** `https://www.npmjs.com/package/aiwg`, `https://www.npmjs.com/package/@aiwg/cli`, `https://www.npmjs.com/package/@aiwg/cockpit`.
- **Window:** August 2026, observed through August 28, 2026.
