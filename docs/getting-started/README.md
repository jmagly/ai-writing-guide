# Getting Started with AIWG

Find the scenario that matches where you are right now.

---

## Pick your situation

| I want to... | Guide |
|---|---|
| Get one useful AIWG result before learning the whole system | [Start Here](start-here.md) |
| Have an agent or steward install AIWG from zero to running | [Agentic Install Runbook](../agentic-install-runbook.md) |
| Install AIWG on macOS or fix npm `EACCES` | [macOS Install Guide](macos-install.md) |
| Walk through provider, project, framework, deployment, and verification choices | [Start Here: guided wizard](start-here.md#minimal-command-path) |
| Ask AIWG which path to use first | [Ask The Steward To Route You](first-success-ask-steward.md) |
| Choose the right AI tool/provider handoff | [Provider Handoff](provider-handoff.md) |
| Recover after running AIWG in the wrong folder | [Scope And Recovery](scope-and-recovery.md) |
| Start a brand new project from scratch | [New Project](new-project.md) |
| Bring AI up to speed on code I already have | [Existing Project](existing-project.md) |
| Just try it and see what happens | [Quick Start — No Setup](just-try-it.md) |
| Describe my goal in plain language and find the right AIWG path | [Beginner Language Map](language-map.md) |
| Write better, more consistent documentation | [Content and Writing](writing-and-content.md) |
| Run a security or code quality audit | [Audit Existing Code](audit-existing-code.md) |
| Set up my whole team, not just myself | [Team Setup](team-setup.md) |
| Work in the background while I do other things | [Daemon and Automation](daemon-and-automation.md) |
| Harden an npm project after a supply-chain incident | [npm Supply-Chain Hardening](../security/supply-chain-hardening.md) |

---

## Frameworks

| I'm working on... | Guide |
|---|---|
| Software development (the full lifecycle) | [SDLC Framework](sdlc-framework.md) |
| Marketing campaigns and content | [Marketing Framework](marketing-framework.md) |
| Digital forensics and incident response | [Forensics Framework](forensics-framework.md) |
| Academic or technical research | [Research Framework](research-framework.md) |
| Building and managing a media archive | [Media Curator Framework](media-curator-framework.md) |

---

## Going deeper

| Topic | Guide |
|---|---|
| How intake, flows, gates, and sdlc-accelerate work together | [Flow and Gate Process](flow-and-gate-process.md) |
| Al, RLM, Voice, and other power features | [Key Addons](key-addons.md) |
| Carrying project-specific agents and skills across platforms | [Project-Local Customization](../project-local/overview.md) |
| Validating the beginner path | [Onboarding Validation](onboarding-validation.md) |
| Checking the 2024-2026 onboarding evidence refresh | [Onboarding Research Refresh](onboarding-research-refresh.md) |
| Sharing the beginner path with others | [Share AIWG](share-aiwg.md) |

---

## Not sure which one?

Read the one-paragraph version of each below, then click the one that sounds right.

**Start Here** — You are new to AIWG and want one useful result. Tell the agent what you are trying to do, run `aiwg wizard` when you're ready for guided deployment, then ask the agent to verify the workspace is engaged.

**Agentic Install Runbook** — You want one canonical setup document an agent can
follow from prerequisites through deployment, verification, provider handoff,
and common repair paths.

**Ask The Steward To Route You** — You want AIWG to choose a path for your goal. Ask the steward in chat for one recommendation; the agent verifies it against AIWG's capability index before answering.

**Provider Handoff** — You know whether you are using Claude Code, Codex, Cursor, Copilot, Factory, OpenCode, Warp, Windsurf, Hermes, or OpenClaw, and need the short handoff from local deployment to that tool.

**Scope And Recovery** — You may have run AIWG from the wrong folder, or you need to understand project-scoped setup versus global/user-scoped setup.

**New Project** — You have an idea and want to kick off a real project with proper requirements, architecture, and a development plan. AIWG runs an intake conversation, generates the foundation docs, and assigns AI agents to each phase of the work.

**Existing Project** — You already have a codebase. Maybe you wrote it yourself, maybe you inherited it. You want an AI assistant that actually understands what the code does, follows your conventions, and picks up where things left off.

**Just Try It** — You want to skip setup and see something happen. Run one command, ask the AI a question about your code, get a useful answer. No intake forms, no configuration. Figure out the rest later.

**Beginner Language Map** — You know what you want, but not the AIWG vocabulary. Describe the goal in ordinary language; the agent translates it into AIWG-native capabilities and recommends one focused next action.

**Content and Writing** — You're writing docs, blog posts, proposals, or any other text. You want consistent voice and quality. AIWG's voice framework profiles train the AI to write the way you write.

**Audit Existing Code** — You have code you want reviewed: security issues, test coverage gaps, dead code, dependency risks. AIWG runs structured audits and produces a report with prioritized findings.

**Team Setup** — Multiple developers all using different AI tools. You want everyone to have the same agents, rules, and commands regardless of their platform — Claude Code, Cursor, Copilot, or others.

**Daemon and Automation** — You want AIWG running in the background: scheduled tasks, event-driven scripts, a Telegram bot that reports what the AI is doing. Set it up once, let it run.

---

**SDLC Framework** — Software development from idea to production: intake, architecture, requirements, tests, security, deployment. 90 specialized agents coordinated through phase flows and gate validation.

**Marketing Framework** — Full campaign lifecycle: strategy, content creation across channels, brand and legal review, publication, and performance analysis.

**Forensics Framework** — Digital forensics and incident response following NIST SP 800-86 and MITRE ATT&CK: target profiling, volatile data capture, evidence acquisition, timeline reconstruction, IOC extraction, forensic reporting.

**Research Framework** — Academic and technical research automation: paper discovery, PDF acquisition, RAG-based summarization with hallucination prevention, citation management, GRADE quality assessment.

**Media Curator Framework** — Media archive management: discography research, source discovery, parallel acquisition, quality scoring, metadata tagging, completeness tracking, platform export.

---

**Flow and Gate Process** — The mechanics behind SDLC: how the intake commands, flow commands, gate commands, and the `sdlc-accelerate` meta-command connect and why that structure exists.

**Key Addons** — Al (iterative loops), RLM (large codebase handling), Voice Framework (consistent writing style), and other capabilities that extend any framework.

**Project-Local Customization** — How to add project-specific agents, skills, and scripts under `.aiwg/{extensions,addons,frameworks,plugins}/<name>/` so they deploy automatically with `aiwg use` and survive platform-directory resets. Keeps platform dirs (`.claude/`, `.codex/`, etc.) fully expendable.

**Onboarding Validation** — A lightweight checklist for maintainers to confirm that a new user can move from docs to install, wizard, verification, and one useful AIWG workflow.

**Onboarding Research Refresh** — A short 2024-2026 source refresh tying current agentic mental-model and trust-calibration evidence to the beginner path.

**Share AIWG** — Repo-owned demo, screenshot, and handoff copy for pointing users to one beginner path without moving social execution into this repo.
