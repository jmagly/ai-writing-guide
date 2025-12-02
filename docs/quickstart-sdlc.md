# SDLC Complete Framework - Quick Start

Build software with AI-assisted lifecycle management: Inception → Elaboration → Construction → Transition.

## 3 Ways to Start

### 1. New Project (Greenfield)

```bash
# Install CLI
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/main/tools/install/install.sh | bash

# Create project scaffold
cd /path/to/new/project
aiwg -new

# Deploy agents
aiwg -deploy-agents --mode sdlc
aiwg -deploy-commands --mode sdlc

# Open in Claude Code
claude .
```

```text
# Integrate AIWG with platform (required for orchestration)
You: "Run /aiwg-update-claude"

# Then start intake
You: "Start intake wizard for a customer portal with React and Node.js"
```

### 2. Existing Codebase (Brownfield)

```bash
# Install and deploy
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/main/tools/install/install.sh | bash
cd /path/to/existing/project
aiwg -deploy-agents --mode sdlc
aiwg -deploy-commands --mode sdlc

# Open in Claude Code
claude .
```

```text
# Integrate AIWG with platform (required for orchestration)
You: "Run /aiwg-update-claude"

# Then analyze codebase
You: "Analyze this codebase and generate intake documents"
```

The framework scans your code, detects tech stack, and generates intake forms automatically.

### 3. Manual Intake (Complex Requirements)

For projects with specific compliance, security, or stakeholder requirements:

```bash
aiwg -new
aiwg -deploy-agents --mode sdlc
aiwg -deploy-commands --mode sdlc
# Edit .aiwg/intake/project-intake-form.md manually
# Edit .aiwg/intake/solution-profile.md manually
claude .
```

```text
# Integrate AIWG with platform (required for orchestration)
You: "Run /aiwg-update-claude"

# Then validate intake
You: "Validate intake and start Inception"
```

## Basic Workflow

| Phase | What You Say | What Happens |
|-------|--------------|--------------|
| **Start** | "Generate intake for..." | Creates project definition |
| **Inception** | "Start Inception" | Vision, risks, architecture sketch |
| **Elaboration** | "Transition to Elaboration" | SAD, ADRs, test strategy |
| **Construction** | "Move to Construction" | Iteration planning, CI/CD |
| **Transition** | "Deploy to production" | Deployment, hypercare |

## Key Commands

```text
"Where are we?"                    → Project status
"Run security review"              → Security audit
"Create architecture document"     → Generate SAD
"Check gate criteria"              → Phase validation
"Transition to [phase]"            → Phase transition
```

## Artifacts Location

All documents generated in `.aiwg/`:

```text
.aiwg/
├── intake/        # Project definition
├── requirements/  # User stories, use cases
├── architecture/  # SAD, ADRs
├── testing/       # Test plans, results
├── security/      # Threat models
└── deployment/    # Runbooks
```

## Next Steps

- **Full documentation**: [SDLC Complete README](../agentic/code/frameworks/sdlc-complete/README.md)
- **Natural language commands**: [Simple Language Translations](../agentic/code/frameworks/sdlc-complete/docs/simple-language-translations.md)
- **Templates**: [Template Library](../agentic/code/frameworks/sdlc-complete/templates/)
- **Platform setup**: [Claude Code](integrations/claude-code-quickstart.md) | [Factory AI](integrations/factory-quickstart.md) | [Warp](integrations/warp-terminal-quickstart.md)
