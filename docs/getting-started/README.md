# Getting Started with AIWG

Find the scenario that matches where you are right now.

---

## Pick your situation

| I want to... | Guide |
|---|---|
| Start a brand new project from scratch | [New Project](new-project.md) |
| Bring AI up to speed on code I already have | [Existing Project](existing-project.md) |
| Just try it and see what happens | [Quick Start — No Setup](just-try-it.md) |
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

---

## Not sure which one?

Read the one-paragraph version of each below, then click the one that sounds right.

**New Project** — You have an idea and want to kick off a real project with proper requirements, architecture, and a development plan. AIWG runs an intake conversation, generates the foundation docs, and assigns AI agents to each phase of the work.

**Existing Project** — You already have a codebase. Maybe you wrote it yourself, maybe you inherited it. You want an AI assistant that actually understands what the code does, follows your conventions, and picks up where things left off.

**Just Try It** — You want to skip setup and see something happen. Run one command, ask the AI a question about your code, get a useful answer. No intake forms, no configuration. Figure out the rest later.

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

**Project-Local Customization** — How to add project-specific agents, skills, and scripts to `.aiwg/.project/` so they deploy automatically with `aiwg use` and survive platform-directory resets. Keeps platform dirs (`.claude/`, `.codex/`, etc.) fully expendable.
