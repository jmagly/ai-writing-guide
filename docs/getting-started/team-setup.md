# Setting Up a Team

> **First time using AIWG?** Begin with [Install, Connect, and Verify](install-connect-verify.md). This guide assumes
AIWG is connected to the target project and your provider session can read the deployed context.

Different people on your team use different AI tools. One person uses Claude
Code, another uses Cursor, another uses GitHub Copilot. AIWG gives the project
a shared context and provider-specific files so each tool starts from the same
repo facts and conventions.

The useful team outcome is a committed `.aiwg/` context plus provider files
that each teammate can verify from their own tool.

---

## How it works

Run [Install, Connect, and Verify](install-connect-verify.md) from the project
root for the first provider. Repeat the deployment step for each provider the
team uses. AIWG writes provider-specific files such as:

```
.claude/agents/          ← Claude Code picks this up
.cursor/agents/          ← Cursor picks this up
.github/agents/          ← Copilot picks this up
.factory/droids/         ← Factory AI picks this up
```

Commit the generated provider files and `.aiwg/` artifacts that your team has
reviewed. Teammates can then verify the handoff from their own provider
session.

---

## Setup For Multiple Providers

```bash
cd /path/to/your/project

# Deploy the complete system to each provider
aiwg use all --provider claude
aiwg use all --provider cursor
aiwg use all --provider copilot
aiwg use all --provider warp
```

Each `aiwg use` invocation builds the shared capability index, connects that
provider to the project context, and verifies the deployment before returning.

Then commit the results:

```bash
git add .claude/ .cursor/ .github/ .factory/ .aiwg/
git commit -m "feat: deploy AIWG framework to project"
git push
```

Everyone who pulls gets the reviewed project context and provider files.

---

## What each teammate needs

Each person installs their own AI platform. They can start from the committed
provider files, then ask the agent to verify that the current session has read
the project context.

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

Now each teammate's AI session can read the same project context after its
provider handoff succeeds. A new engineer joining the team can open their AI
tool in the project and ask:

```
Explain this project to me as if I just joined the team
```

The answer should cite `.aiwg/` artifacts or repository files so the teammate
can see which context was used.

---

## Team-level conventions

AIWG rules are shared conventions. When you define a rule such as "avoid raw
SQL", "include error handling in API endpoints", or "require tests for new
functions", commit it with the provider files that should receive it.

To add a project-level rule:

```
/aiwg-setup-project
```

Or edit the appropriate provider rules directory and commit it. Each teammate
should verify the rule is loaded in their own provider session.

---

## Onboarding new engineers

When someone new joins the team:

1. They clone the repo
2. They install their AI platform (Claude Code, Cursor, etc.)
3. They open the project in that platform

Then have them run the verification ask from [Provider Handoff](provider-handoff.md)
before depending on the context.

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

See the [security gate reference](https://github.com/jmagly/aiwg/blob/main/docs/cli/reference.md#security-gate) for configuration.

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

Success means each subteam can verify its provider files, project context, and
first useful output from its own directory.
