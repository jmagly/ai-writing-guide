# GitHub Copilot Quick Start

---

## Install & Deploy

**1. Install**

```bash
npm install -g aiwg
```

**2. Deploy to your project**

```bash
cd /path/to/your/project

# Deploy all 4 artifact types for Copilot
aiwg use sdlc --provider copilot
```

**3. Commit and push**

```bash
git add .github/
git commit -m "Add AIWG custom agents for GitHub Copilot"
git push
```

**4. Regenerate for intelligent integration**

```text
/aiwg-regenerate-copilot
```

This step is critical - it enables natural language command mapping ("run security review" → workflow). Without it, advanced features won't work correctly. See the [Regenerate Guide](#regenerate-guide) for details.

**5. You're ready.** See the [Intake Guide](#intake-guide) for starting projects.

---

## What Gets Created

```text
.github/
├── agents/                  # SDLC agents (Requirements Analyst, Architecture Designer, etc.)
├── skills/                  # Skill directories (voice profiles, project awareness, etc.)
├── copilot-rules/           # Context rules (token security, citation policy, etc.)
└── copilot-instructions.md  # Global instructions

.aiwg/                       # SDLC artifacts
```

> **Note:** GitHub Copilot converts AIWG commands to YAML agent format. Commands appear alongside agents in `.github/agents/` as workflow-triggering agents.

---

## Using Agents

Invoke via @-mention in Copilot Chat:

```text
@security-architect Review the authentication implementation
@test-engineer Generate unit tests for the user service
@code-reviewer Review this PR for quality issues
```

---

## Copilot Coding Agent

Assign issues directly to Copilot:

1. Navigate to an issue
2. In Assignees, select **Copilot**
3. Copilot analyzes and creates a PR

---

## Ralph Iterative Loops

Ralph loops support multi-provider execution. While Copilot agents are deployed via AIWG, Ralph task loops run through the CLI:

```bash
aiwg ralph "Fix all tests" --completion "npm test passes"
```

See [Ralph Guide](../ralph-guide.md) for full documentation including `--provider` options.

---

## Troubleshooting

**Natural language not working?** Run regenerate:
```text
/aiwg-regenerate-copilot
```

**Agents not appearing?** Ensure committed and pushed:
```bash
git status
git push
```

**Redeploy if needed:**
```bash
aiwg use sdlc --provider copilot --force
```
