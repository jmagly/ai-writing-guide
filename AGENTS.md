# Repository Guidelines

## Project Structure & Module Organization
Keep contributions inside the existing documentation tree: `core/` captures philosophy references, `validation/` holds rules and checklists, `context/` serves trimmed briefs, `docs/agents/` and `docs/subagents/` store role playbooks, `docs/commands/` documents slash workflows, `docs/sdlc/` contains PLAN → ACT SDLC scripts, while `examples/` and `patterns/` illustrate outcomes. Reserve `tools/` for helper scripts and explain invocation alongside the script.

## Build, Test, and Development Commands
- `npm exec markdownlint-cli2 "**/*.md"` (Node ≥18) enforces Markdown consistency before review.
- `rg "keyword" -n context` searches guidance quickly; prefer it over slower alternatives.
- Note any additional linters or scripts in the PR body so reviewers can rerun them.

## Coding Style & Naming Conventions
Write in concise, expert prose that mirrors `README.md`. Use Title Case for H1s, sentence case for subordinate headings, and wrap lines near 100 characters. Reference paths with backticks and name new documents with lowercase hyphenated filenames unless the file is a canonical entry point (e.g., `CLAUDE.md`).

## Testing Guidelines
Treat every addition as policy: confirm alignment with `validation/banned-patterns.md` and update `validation/validation-checklist.md` when rules shift. Provide paired “good” and “needs revision” snippets when changing guidance so agents can self-audit.

## Commit & Pull Request Guidelines
Follow the established history with imperative, scoped commit subjects under ~55 characters. Group related directories per commit. Pull requests should summarize scope, flag high-priority files, link issues or roadmap items, and attach lint or test output that supports risk assessment.

## Plan-Act SDLC Playbook
Use this ladder as a PLAN → ACT to-do list, assigning each step to a responsible agent or human:
1. **Vision Charter** – Product strategist + domain expert expand `<idea>` into personas, outcomes, and differentiation. Prompt: “Act as a product trio; elaborate `<idea>` into problem statement, target users, success metrics, and constraints.”
2. **Requirements Elaboration** – Requirements analyst codifies user stories, acceptance tests, glossary, compliance flags, and open questions for stakeholder review.
3. **Solution Architecture** – Architecture designer establishes module boundaries, data contracts, SOLID-driven dependencies, and integration touchpoints with operations.
4. **Implementation Planning** – Break work into single-file or narrowly scoped tasks; map UI/API/data/infra layers to parallel agents and define synchronization checkpoints.
5. **Build & Iteration Loop** – For each task, cycle PLAN → ACT → Evaluate (`tests`, `lint`, scenario scripts) → Debug → Correct until acceptance criteria pass or escalation is needed.
6. **Verification & Validation** – Combine automated suites, exploratory scripts, and user acceptance runs; require regression signals before merge.
7. **Release & Operations** – Coordinate deployment plans, rollout guards, observability hooks, and runbooks so support agents can triage quickly.
8. **Lifecycle Feedback** – Schedule analytics reviews and user interviews; feed insights back into the backlog and future prompts.
Document decisions and artifacts from every step in `docs/sdlc/` (or project-specific mirrors) so long-running efforts remain synchronized, even across multi-day agent sessions. Favor modular designs, SOLID principles, and high test coverage to keep follow-on edits localized.

Refer to `docs/sdlc/plan-act-sdlc.md` for full-stage guidance and `docs/sdlc/prompt-templates.md` for copy-ready prompts when seeding agent workflows.

## Agent-Facing Notes
When updating a playbook, echo the critical directives in `context/quick-reference.md` so lightweight contexts stay fresh, and capture inter-agent handoffs directly in the relevant guides to maintain orchestration discipline.
