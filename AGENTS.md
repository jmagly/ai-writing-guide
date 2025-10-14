# Repository Guidelines

## Project Structure & Module Organization

Keep contributions inside the existing documentation tree: `core/` captures philosophy references, `validation/` holds rules and checklists, `context/` serves trimmed briefs, `docs/agents/` and `docs/subagents/` store role playbooks, `docs/commands/` documents slash workflows, `docs/sdlc/` houses PLAN → ACT SDLC scripts, prompts, and templates, while `examples/` and `patterns/` illustrate outcomes. Reserve `tools/` for helper scripts and explain invocation alongside the script.

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

Anchor multi-agent work on the lifecycle phases:

1. **Inception** – Validate business case, scope, and funding through charter, risk, and stakeholder artifacts.
2. **Elaboration** – Baseline architecture and requirements; retire top risks and tailor the development case.
3. **Construction** – Iterate on prioritized use cases with PLAN → ACT → Evaluate → Debug → Correct loops, pairing code with comprehensive tests.
4. **Transition** – Prepare deployment, training, and support while confirming product acceptance and operational readiness.

Document decisions and artifacts from every phase within `docs/sdlc/` (or project-specific mirrors) so long-running efforts stay synchronized. Favor modular designs, SOLID principles, and high test coverage to keep follow-on edits localized.

Refer to `docs/sdlc/plan-act-sdlc.md` for detailed milestones, `docs/sdlc/prompt-templates.md` for copy-ready prompts, `docs/sdlc/actors-and-templates.md` for role and artifact guidance, and `docs/sdlc/templates/` when instantiating new documents.

## Agent-Facing Notes

When updating a playbook, echo the critical directives in `context/quick-reference.md` so lightweight contexts stay fresh, and capture inter-agent handoffs directly in the relevant guides to maintain orchestration discipline.
