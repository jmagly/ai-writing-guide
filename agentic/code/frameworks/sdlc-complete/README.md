# SDLC Complete Framework

## Overview

The SDLC Complete framework provides a comprehensive Plan → Act lifecycle for software delivery using Claude Code agents. This specialized framework includes agents, commands, templates, and flows for managing the entire software development lifecycle.

## Framework Structure

- `agents/` — 50+ specialized SDLC role agents (architecture-designer, requirements-analyst, security-gatekeeper, etc.)
- `commands/` — SDLC-specific slash commands (intake-start, orchestrate-project, security-gate, etc.)
- `templates/` — Markdown templates for all SDLC artifacts
- `flows/` — Phase-based workflows (Inception → Elaboration → Construction → Transition)
- `add-ons/` — Compliance and legal extensions (GDPR, etc.)
- `metrics/` — Project health and tracking metrics
- `artifacts/` — Sample projects demonstrating complete lifecycle

## Key References

- `plan-act-sdlc.md` — Lifecycle phases and milestones
- `prompt-templates.md` — Copy-ready prompts by phase
- `actors-and-templates.md` — Role and artifact template mappings

## Relationship to Core Repository

This framework is part of the AI Writing Guide repository but serves as a standalone SDLC toolkit. The parent repository contains:

- `/agents/` — General-purpose writing agents (content-diversifier, writing-validator, prompt-optimizer)
- `/commands/` — General-purpose command documentation
- `/core/`, `/validation/`, `/examples/` — Writing Guide content

The SDLC framework agents apply writing guide principles to software artifacts but focus on development lifecycle management rather than general content creation.

## Installation

Use the AI Writing Guide CLI to deploy this framework:

```bash
# Install CLI
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash

# Deploy agents to project
aiwg -deploy-agents --provider claude

# Scaffold new project with SDLC templates
aiwg -new
```

## Usage

See the parent repository's `CLAUDE.md` and `USAGE_GUIDE.md` for comprehensive usage instructions.
