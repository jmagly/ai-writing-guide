# Setting Up a Team

Different people on your team use different AI tools. One person uses Claude Code, another uses Cursor, another uses GitHub Copilot. Without AIWG, they all have different agents, different rules, different commands — and no shared context.

AIWG deploys the same framework to every platform so the whole team works from the same foundation.

---

## How it works

You run `aiwg use sdlc` once from the project root. AIWG writes the framework into platform-specific directories for every installed provider:

```
.claude/agents/          ← Claude Code picks this up
.cursor/agents/          ← Cursor picks this up
.github/agents/          ← Copilot picks this up
.factory/droids/         ← Factory AI picks this up
```

Every teammate gets the same agents, the same rules, the same commands — regardless of which AI tool they use. You commit the directories and they propagate through git.

---

## Setup (one person does this)

```bash
npm install -g aiwg
cd /path/to/your/project

# Deploy to all platforms at once
aiwg use all

# Or deploy to specific platforms
aiwg use sdlc                          # Claude Code (default)
aiwg use sdlc --provider cursor        # Cursor
aiwg use sdlc --provider copilot       # GitHub Copilot
aiwg use sdlc --provider warp          # Warp Terminal
```

Then commit the results:

```bash
git add .claude/ .cursor/ .github/ .factory/ .aiwg/
git commit -m "feat: deploy AIWG framework to project"
git push
```

Everyone who pulls gets the framework automatically.

---

## What each teammate needs

Each person installs their own AI platform (Claude Code, Cursor, etc.). They don't need to install AIWG themselves — the framework files are already in the repo via git.

If they want to use the `aiwg` CLI for other tasks (deploying updates, adding agents, running the daemon), they install it individually:

```bash
npm install -g aiwg
```

---

## Keeping everyone in sync

When AIWG releases updates or you add new agents and commands:

```bash
aiwg refresh
```

This pulls the latest framework and re-deploys to all providers. Commit and push, and everyone gets the update with the next `git pull`.

> `aiwg sync` is the deprecated alias and still works, but emits a warning and is scheduled for removal after the 2026.5.x stable line.

---

## Shared project context

The `.aiwg/` directory contains your project's artifacts — requirements, architecture decisions, test strategies. Commit it:

```bash
git add .aiwg/
git commit -m "docs: add project artifacts"
```

Now every teammate's AI session has the same project context. No one has to re-explain the architecture. A new engineer joining the team can open Claude Code and ask:

```
Explain this project to me as if I just joined the team
```

The AI already knows the answer.

---

## Team-level conventions

AIWG rules are shared conventions. When you define a rule — "never use raw SQL", "always include error handling in API endpoints", "require tests for new functions" — it applies to everyone's AI session.

To add a project-level rule:

```
/aiwg-setup-project
```

Or edit `.claude/rules/` directly and commit. The rule applies to everyone on `git pull`.

---

## Onboarding new engineers

When someone new joins the team:

1. They clone the repo
2. They install their AI platform (Claude Code, Cursor, etc.)
3. They open the project

AIWG is already there. The project context is already there. They can start asking the AI questions about the codebase immediately.

To give them a structured onboarding walkthrough:

```
/flow-team-onboarding <name> --role <role>
```

This runs an orchestrated workflow that introduces the codebase, key decisions, and current state.

---

## If your team uses GitHub Actions or CI

You can run AIWG audits as part of CI — security gates, test coverage checks, quality gates before merge:

```yaml
# .github/workflows/quality.yml
- name: Security gate
  run: npx aiwg security-gate
```

See the [security gate reference](../cli-reference.md#security-gate) for configuration.

---

## Multiple frameworks for different teams

Large orgs often have subteams with different needs — frontend, backend, DevOps, marketing. You can deploy different frameworks to different directories or branches:

```bash
# Backend team
cd backend/
aiwg use sdlc

# Marketing team
cd marketing/
aiwg use marketing
```

Each team gets the agents and commands that match their work.
