# SDLC Complete Framework - Quick Start

Build software with AI-assisted lifecycle management: Inception → Elaboration → Construction → Transition.

## 3 Ways to Start

### 1. New Project (Greenfield)

```bash
# Install CLI
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/main/tools/install/install.sh | bash
source ~/.bash_aliases

# Create project scaffold
cd /path/to/new/project
aiwg -new

# Deploy SDLC framework
aiwg use sdlc

# Open in Claude Code
claude .
```

```text
# Integrate AIWG with platform (required for orchestration)
You: "/aiwg-setup-project"

# Then start intake
You: "Start intake wizard for a customer portal with React and Node.js"
```

### 2. Existing Codebase (Brownfield)

```bash
# Install and deploy
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/main/tools/install/install.sh | bash
source ~/.bash_aliases
cd /path/to/existing/project
aiwg use sdlc

# Open in Claude Code
claude .
```

```text
# Integrate AIWG with platform (required for orchestration)
You: "/aiwg-setup-project"

# Then analyze codebase
You: "Analyze this codebase and generate intake documents"
```

The framework scans your code, detects tech stack, and generates intake forms automatically.

### 3. Manual Intake (Complex Requirements)

For projects with specific compliance, security, or stakeholder requirements:

```bash
aiwg -new
aiwg use sdlc
# Edit .aiwg/intake/project-intake-form.md manually
# Edit .aiwg/intake/solution-profile.md manually
claude .
```

```text
# Integrate AIWG with platform (required for orchestration)
You: "/aiwg-setup-project"

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

## Regenerating CLAUDE.md

When your project evolves, regenerate your context file to keep it current:

```text
# Preview what would change
/aiwg-regenerate-claude --dry-run

# See what content would be preserved
/aiwg-regenerate-claude --show-preserved

# Regenerate (creates backup automatically)
/aiwg-regenerate-claude
```

Team directives, conventions, and organizational requirements are automatically preserved.

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

## Voice Profiles for Documentation

For consistent voice across your SDLC documentation, add the Writing Quality framework:

```bash
aiwg use writing           # Add Voice Framework to your project
```

Then use voice profiles when generating artifacts:

```text
"Write the architecture document in technical-authority voice"
"Make this README more friendly for beginners"
"Create API documentation with precise, confident tone"
```

**Built-in profiles**: `technical-authority`, `friendly-explainer`, `executive-brief`, `casual-conversational`

## Next Steps

- **Full documentation**: [SDLC Complete README](../agentic/code/frameworks/sdlc-complete/README.md)
- **Natural language commands**: [Simple Language Translations](../agentic/code/frameworks/sdlc-complete/docs/simple-language-translations.md)
- **Templates**: [Template Library](../agentic/code/frameworks/sdlc-complete/templates/)
- **Voice Framework**: [Voice Framework README](../agentic/code/addons/voice-framework/README.md)
- **Platform setup**: [Claude Code](integrations/claude-code-quickstart.md) | [Factory AI](integrations/factory-quickstart.md) | [Warp](integrations/warp-terminal-quickstart.md)
