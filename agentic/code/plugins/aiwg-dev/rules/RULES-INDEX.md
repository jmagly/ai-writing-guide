# AIWG Developer Tools Rules Index

Contributor-focused rules for building AIWG addons, frameworks, skills, agents, and commands correctly. Install explicitly with `aiwg use aiwg-dev` — not included in `aiwg use all`.

---

## AIWG Developer Tools Rules (5 rules — active with aiwg-dev addon)

### HIGH

#### aiwg-ci-safety
**Summary**: AIWG has thousands of downstream users — a broken CI workflow that merges to main can cascade into a bad npm publish that corrupts installs across the entire user base. `.gitea/workflows/` changes require explicit human authorization before committing. CI hook templates for user projects must NOT go in `.gitea/` or `.github/` in this repo — they are inert source data in `agentic/code/frameworks/<name>/ci/` and are deployed to target projects via `--ci-hooks-enabled`. Agents may draft and propose CI changes but must not commit to forge directories autonomously.
**When to apply**: Any time `.gitea/workflows/` or `.github/workflows/` is being modified, creating CI hook templates for a framework, reviewing agentic tasks that touch the CI pipeline
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/aiwg-ci-safety.md

#### skill-placement
**Summary**: New skills, agents, commands, rules, and templates MUST go into `agentic/code/addons/<name>/` or `agentic/code/frameworks/<name>/`. Files placed directly in `.claude/`, `.github/`, `.cursor/`, `.warp/`, `.codex/`, `.windsurf/`, `.opencode/`, or `~/.openclaw/` are deployment targets — they are overwritten by `aiwg sync` and are invisible to the installer. A file only ships to users if it lives in `agentic/code/`.
**When to apply**: Creating any new AIWG artifact (skill, agent, command, rule, template), editing a deployed file, onboarding as a new AIWG contributor
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/skill-placement.md

#### no-circular-skill-calls
**Summary**: A command marked `executedViaSkillRunner: true` removes its TypeScript handler from the CLI routing table. If the SKILL.md then invokes `aiwg <same-command>`, the CLI has no handler to receive the call — creating an infinite loop. SKILL.md for skill-executed commands MUST perform all work via provider tools (Read, Write, Bash, Task) or direct script invocation. Never call back into the CLI command by name. `sdlc-accelerate` is the reference implementation.
**When to apply**: Setting `executedViaSkillRunner: true` on a command, writing SKILL.md for a CLI command, auditing existing skill-executed commands
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/no-circular-skill-calls.md

### MEDIUM

#### component-completeness
**Summary**: Each artifact type has required files before it is considered complete. Skill: SKILL.md with `description:` frontmatter, title, behavior section, and manifest registration. Agent: `.md` with `name`, `description`, `model`, `tools` frontmatter and manifest registration. Command: definition in `definitions.ts` plus handler or `executedViaSkillRunner: true`. Addon: `manifest.json` with required fields and a `README.md`. Rule: `.md` file with priority level and entry in `RULES-INDEX.md`. Incomplete components cause silent deployment failures.
**When to apply**: Before marking any artifact as done, before filing a PR, after scaffolding a new component, during code review of new extensions
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/component-completeness.md

#### addon-boundaries
**Summary**: `agentic/code/` is framework source that ships to users via `aiwg use`. `.aiwg/` is project-local output for the AIWG project's own development — it does NOT ship. Never put framework artifacts in `.aiwg/`. Skills may reference normalized `.aiwg/` paths (declared in `memory.creates`), but never repo-local paths. The decision guide: "Is this for AIWG users? → agentic/code/. Is this a project artifact? → .aiwg/."
**When to apply**: Adding schemas, templates, or process documents, writing agent/skill definitions that reference local files, any time you are unsure whether content is framework source or project output
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/addon-boundaries.md

#### aiwg-dir-reference-contract
**Summary**: Skills and agents in `agentic/code/` may only `@`-reference `.aiwg/` paths that are normalized — declared in a component's `memory.creates` (Tier 2) or guaranteed by `aiwg init` (Tier 1: `.aiwg/AIWG.md`, `.aiwg/frameworks/registry.json`). Repo-local paths (specific files only in the AIWG dev repo) silently fail in user projects. The contract is manifest-derived: when a new framework creates `.aiwg/` paths, declare them in `memory.creates`. Validate with `grep -rn "@\.aiwg/" agentic/code/` and cross-check against installed manifests.
**When to apply**: Writing skills or agents that reference `.aiwg/` paths, adding a new framework that creates `.aiwg/` artifacts, reviewing distributable skills for link correctness
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/aiwg-dir-reference-contract.md

---

## Quick Reference by Context

| Task Type | Relevant Rules |
|-----------|---------------|
| **Creating a new skill or agent** | skill-placement, component-completeness |
| **Creating a new CLI command** | component-completeness, no-circular-skill-calls |
| **Setting `executedViaSkillRunner: true`** | no-circular-skill-calls |
| **Creating or extending an addon** | skill-placement, component-completeness, addon-boundaries |
| **Adding schemas or templates** | addon-boundaries |
| **Writing agent/skill `.aiwg/` references** | aiwg-dir-reference-contract |
| **Adding a new framework with `.aiwg/` paths** | aiwg-dir-reference-contract, addon-boundaries |
| **Writing agent definitions** | addon-boundaries, skill-placement |
| **Onboarding as a contributor** | skill-placement, addon-boundaries |
| **Pre-PR checklist** | component-completeness, skill-placement |
| **Adding CI hook templates for a framework** | aiwg-ci-safety, skill-placement, addon-boundaries |
| **Modifying `.gitea/workflows/` or `.github/workflows/`** | aiwg-ci-safety |
| **Any agentic task touching CI** | aiwg-ci-safety |

---

*Generated from aiwg-dev manifest.json — 6 rules*
*Full rule files: @$AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/*
