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

# Deploy agents for Copilot:
aiwg -deploy-agents --provider copilot --mode sdlc --deploy-commands --create-agents-md
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
├── agents/                  # AIWG custom agents (YAML)
└── copilot-instructions.md  # Global instructions

.aiwg/                       # SDLC artifacts
```

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
aiwg -deploy-agents --provider copilot --force
```
