# GitHub Copilot Integration Guide

This guide explains how to integrate AIWG with GitHub Copilot, GitHub's AI-powered coding assistant.

## Overview

GitHub Copilot provides AI-powered coding assistance through:
- **Inline Suggestions**: Auto-complete style code suggestions as you type
- **Copilot Chat**: Conversational AI assistant in IDEs and GitHub.com
- **Copilot Coding Agent**: Autonomous agent that can work on issues and create PRs
- **Custom Agents**: Specialized agents defined in `.github/agents/`
- **Code Review**: AI-powered pull request reviews

AIWG integrates with Copilot's custom agent system for SDLC-aware assistance.

## Quick Start

### 1. Prerequisites

- GitHub account with Copilot access (Pro, Pro+, Business, or Enterprise)
- A repository on GitHub.com

### 2. Deploy AIWG Agents

```bash
# Deploy agents and create copilot-instructions.md
aiwg -deploy-agents --provider copilot --mode sdlc --deploy-commands --create-agents-md
```

This creates:
- `.github/agents/` - AIWG SDLC custom agents (YAML format)
- `.github/copilot-instructions.md` - Global project instructions

### 3. Commit and Push

```bash
git add .github/
git commit -m "Add AIWG custom agents for GitHub Copilot"
git push
```

## Directory Structure

After deployment:

```
project/
├── .github/
│   ├── agents/                  # AIWG custom agents
│   │   ├── security-architect.yaml
│   │   ├── test-engineer.yaml
│   │   ├── code-reviewer.yaml
│   │   └── ...
│   └── copilot-instructions.md  # Global instructions
└── .aiwg/                       # SDLC artifacts
    ├── requirements/
    ├── architecture/
    └── ...
```

## Using AIWG Custom Agents

### Invoke via @-mention in Copilot Chat

```
@security-architect Review the authentication implementation
@test-engineer Generate unit tests for the user service
@code-reviewer Review this PR for quality issues
```

### Available Agent Categories

| Category | Agents |
|----------|--------|
| **Planning** | `@requirements-analyst`, `@architecture-designer`, `@api-designer` |
| **Implementation** | `@software-implementer`, `@test-engineer`, `@code-reviewer` |
| **Security** | `@security-architect`, `@security-auditor` |
| **Documentation** | `@technical-writer`, `@documentation-synthesizer` |
| **Operations** | `@deployment-manager`, `@reliability-engineer` |

## Using Copilot Coding Agent

Copilot coding agent can autonomously work on issues:

### Assign an Issue to Copilot

1. Navigate to an issue in your repository
2. In the Assignees section, select **Copilot**
3. Copilot will analyze the issue and create a pull request

### Trigger from Copilot Chat

```
@copilot Create a PR to fix issue #123
@copilot Implement the feature described in issue #456
```

## Agent Format

AIWG agents are deployed in GitHub Copilot's YAML format:

```yaml
name: security-architect
description: Security architecture and threat modeling specialist
model:
  name: gpt-4
  temperature: 0.2
  max_tokens: 4000
tools: ["search", "fetch", "githubRepo", "problems"]
instructions: |
  You are a security architecture specialist focused on threat modeling
  and security requirements analysis.

  ## Responsibilities
  - Analyze code for security vulnerabilities
  - Review authentication and authorization patterns
  - Identify potential threat vectors
  ...
```

## Configuration

### copilot-instructions.md

Global instructions that apply to all Copilot interactions:

```markdown
# Project Instructions for Copilot

## AIWG SDLC Framework

This project uses the AI Writing Guide SDLC Framework.

### Available Custom Agents
- `@architecture-designer` - System architecture decisions
- `@security-architect` - Security reviews and threat modeling
- ...

### SDLC Artifacts
All artifacts stored in `.aiwg/` directory.
```

### Model Configuration

Override default models when deploying:

```bash
aiwg -deploy-agents --provider copilot \
  --reasoning-model gpt-4 \
  --coding-model gpt-4 \
  --efficiency-model gpt-4o-mini
```

## Available Tools

Copilot custom agents can use these tools:

| Tool | Description |
|------|-------------|
| `search` | Search codebase and documentation |
| `createFile` | Create new files |
| `editFiles` | Edit existing files |
| `deleteFile` | Delete files |
| `createDirectory` | Create directories |
| `runInTerminal` | Execute shell commands |
| `fetch` | Fetch web resources |
| `runSubagent` | Invoke other agents |
| `githubRepo` | Access repository information |
| `problems` | View code problems/diagnostics |
| `changes` | View pending changes |
| `todos` | Manage task lists |

## Copilot Code Review

Enable AI-powered code review on pull requests:

1. Create a pull request
2. Under Reviewers, add **Copilot** as a reviewer
3. Copilot will analyze the changes and provide feedback

## Best Practices

1. **Use custom agents for specialized tasks** - Match agent expertise to the work
2. **Provide context in instructions** - Update `copilot-instructions.md` with project specifics
3. **Leverage coding agent for routine work** - Assign straightforward issues to Copilot
4. **Enable code review** - Get AI feedback on all pull requests
5. **Maintain SDLC artifacts** - Keep `.aiwg/` directory updated for context

## Comparison with Other Providers

| Feature | GitHub Copilot | Claude Code | OpenCode |
|---------|---------------|-------------|----------|
| Agent Format | YAML | Markdown | Markdown |
| Agent Location | `.github/agents/` | `.claude/agents/` | `.opencode/agent/` |
| Commands | Via agents | `.claude/commands/` | `.opencode/command/` |
| Global Instructions | `copilot-instructions.md` | `CLAUDE.md` | `AGENTS.md` |
| Autonomous Agent | Copilot coding agent | Task tool | OpenCode agent |

## Troubleshooting

### Custom agents not appearing

```bash
# Verify deployment
ls -la .github/agents/

# Ensure files are committed
git status

# Redeploy with force
aiwg -deploy-agents --provider copilot --force
```

### Agent not responding

1. Ensure Copilot is enabled for the repository
2. Check that the agent YAML is valid
3. Verify you have appropriate Copilot subscription

### Copilot coding agent not working

1. Ensure coding agent is enabled in repository settings
2. Verify you have Copilot Pro, Pro+, Business, or Enterprise
3. Check that the repository is on GitHub.com (not GitHub Enterprise Server)

## References

- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [About Custom Agents](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-custom-agents)
- [About Copilot Coding Agent](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-github-copilot-coding-agent)
- [AIWG SDLC Framework](../reference/sdlc-framework.md)
- [AIWG Agent Catalog](../reference/agents.md)
