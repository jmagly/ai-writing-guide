# Factory AI Quick Start with AIWG

> **⚠️ IMPORTANT:** Factory requires **manual droid import** after deployment. Unlike Claude Code, droids aren't auto-loaded. See [Step 3: Import Droids](#step-3-import-droids-in-factory-cli-required) below.
>
> **✅ Auto-configured:** Custom Droids are automatically enabled in `~/.factory/settings.json` during deployment.
>
> **Quick Import:** `droid . → /droids → I → A → Enter` (restart droid first if it was already running)

## Prerequisites

- Factory AI CLI installed (`curl -fsSL https://app.factory.ai/cli | sh`)
- Node.js 18+ (for aiwg CLI)
- Git (for version control)
- **Custom Droids enabled** in Factory settings (see setup steps below)

## Installation

### Install AIWG CLI

```bash
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/main/tools/install/install.sh | bash
source ~/.bash_aliases  # or ~/.zshrc
```

### Verify Installation

```bash
aiwg -version
```

## New Project Setup (5 Minutes)

### Step 1: Create Project Structure

```bash
cd /path/to/your/project
aiwg -new
```

**What this creates:**
- `.aiwg/` - SDLC artifact directory
- `.aiwg/intake/` - Intake form templates
- `AGENTS.md` - Project documentation template

### Step 2: Deploy Factory Droids

```bash
# Deploy SDLC droids to .factory/droids/
aiwg -deploy-agents --provider factory --mode sdlc

# Deploy commands to .factory/commands/
aiwg -deploy-commands --provider factory --mode sdlc

# Or deploy everything at once (recommended)
aiwg -deploy-agents --provider factory --mode both --deploy-commands --create-agents-md
```

**What gets deployed:**
- 53 SDLC droids → `.factory/droids/`
- 42+ flow commands → `.factory/commands/`
- AGENTS.md → project root (with `--create-agents-md` flag)
- Factory droids use native Factory format (YAML frontmatter)
- **Tool mapping**: Claude Code tools automatically mapped to Factory equivalents
- **Orchestration tools**: Task & TodoWrite added to coordination agents

### Step 3: Import Droids in Factory CLI (REQUIRED)

**⚠️ IMPORTANT:** Factory doesn't auto-load droids from `.factory/droids/`. You must import them manually.

**Good news:** The deployment script automatically enables Custom Droids in `~/.factory/settings.json`, so you can skip the settings step!

**Import Steps:**

1. **Open Factory and restart** (to load the new setting):
   ```bash
   droid .
   # If this is your first time using custom droids, restart droid to load the setting:
   # Ctrl+C, then: droid .
   ```

2. **Import Droids**:
   ```bash
   /droids
   # Press 'I' to start import
   # Press 'A' to select all (or Space for individual)
   # Press Enter to import
   ```

3. **Verify Import**:
   ```bash
   /droids
   # Should see 53 droids listed with descriptions
   ```

**What happens during deployment:**
- ✅ Deployment automatically enables `enableCustomDroids: true` in `~/.factory/settings.json`
- ✅ Creates `.factory/droids/*.md` files (53 droids)
- ❌ You still need to import droids manually (Factory security feature)

**What happens during import:**
- Factory scans `.factory/droids/` for droid files
- Converts them to Factory's internal format
- Registers them as available subagents
- You can now invoke them via natural language or Task tool

### Step 4: Open in Factory AI

```bash
droid .
```

### Step 5: Generate Project Intake

**Option A: Interactive Intake**
```text
You: "Start intake wizard for a customer portal project"
Droid: [Uses intake-coordinator droid with interactive questions]
```

**Option B: Direct Intake**
```text
You: "Generate intake for an e-commerce platform: React frontend, Node.js backend, PostgreSQL database, targeting 100k users, GDPR compliance required"
Droid: [Creates complete intake forms in .aiwg/intake/]
```

### Step 6: Begin SDLC Phases

**Inception Phase**
```text
You: "Start Inception phase"
Droid: [Orchestrates Concept → Inception workflow]
  - Uses intake-coordinator to validate intake
  - Uses requirements-analyst to document vision
  - Creates .aiwg/planning/phase-plan-inception.md
```

**Elaboration Phase**
```text
You: "Transition to Elaboration"
Droid: [Generates architecture baseline]
  - architecture-designer creates SAD
  - Parallel review by security-architect, test-architect
  - documentation-synthesizer merges feedback
  - Output: .aiwg/architecture/software-architecture-doc.md
```

**Construction Phase**
```text
You: "Move to Construction"
Droid: [Sets up iteration workflows]
  - Creates iteration plans
  - Configures CI/CD guidance
  - Establishes testing strategy
```

**Deploy to Production**
```text
You: "Deploy to production"
Droid: [Orchestrates deployment workflow]
  - deployment-manager validates readiness
  - reliability-engineer performs ORR
  - Creates deployment artifacts in .aiwg/deployment/
```

## Existing Project Setup (10 Minutes)

### Step 1: Install AIWG

```bash
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/main/tools/install/install.sh | bash
```

### Step 2: Deploy to Existing Project

```bash
cd /path/to/existing/project

# Deploy droids, commands, and AGENTS.md
aiwg -deploy-agents --provider factory --mode sdlc --deploy-commands --create-agents-md

# Or just the script path if aiwg not aliased
node ~/.local/share/ai-writing-guide/tools/agents/deploy-agents.mjs --provider factory --mode sdlc --deploy-commands --create-agents-md
```

### Step 3: Import Droids (REQUIRED)

**⚠️ Factory requires manual import** - droids aren't auto-loaded.

**Note:** Deployment automatically enables Custom Droids in `~/.factory/settings.json`, so you can skip the settings configuration!

```bash
droid .  # Open Factory (restart if running to load new setting)

# In Factory CLI:
/droids
# Press 'I' → 'A' (select all) → Enter (import)

# Verify:
/droids  # Should list 53 imported droids
```

### Step 4: Generate Intake from Codebase

Then in Factory:
```text
You: "Analyze this codebase and generate AIWG intake forms"
Droid: [Uses intake-from-codebase approach]
  - Scans code structure
  - Identifies architecture patterns
  - Documents technical stack
  - Creates intake forms in .aiwg/intake/
```

### Step 5: Check Project Status

```text
You: "Where are we in the SDLC?"
Droid: [Generates project status report]
  - Analyzes .aiwg/ artifacts
  - Determines current phase
  - Identifies blockers
  - Recommends next steps
```

## Common Workflows

### Architecture Design

```text
You: "Create software architecture document"
Droid: [Multi-agent workflow]
  - architecture-designer: Creates SAD draft
  - security-architect: Reviews security controls
  - test-architect: Validates testability
  - documentation-synthesizer: Merges to final SAD
  - Output: .aiwg/architecture/software-architecture-doc.md
```

### Security Review

```text
You: "Run comprehensive security review"
Droid: [Coordinates security agents]
  - security-architect: Threat modeling
  - security-gatekeeper: Gate validation
  - security-auditor: Code review
  - Output: .aiwg/security/security-review-YYYY-MM-DD.md
```

### Test Planning

```text
You: "Generate test strategy for microservices architecture"
Droid: [Uses test-architect]
  - Analyzes architecture
  - Defines test levels (unit, integration, E2E)
  - Creates test plan template
  - Output: .aiwg/testing/test-strategy.md
```

### Risk Assessment

```text
You: "Update risk register with focus on scalability"
Droid: [Uses risk-assessor (from requirements-analyst family)]
  - Reviews current risks
  - Identifies scalability risks
  - Proposes mitigation strategies
  - Updates .aiwg/risks/risk-list.md
```

## Directory Structure

After AIWG deployment:

```
your-project/
├── .factory/
│   ├── droids/          # 53 AIWG SDLC droids
│   │   ├── intake-coordinator.md
│   │   ├── architecture-designer.md
│   │   ├── security-architect.md
│   │   └── ... (50 more)
│   └── commands/        # 42+ flow commands
│       ├── flow-inception-to-elaboration.md
│       ├── flow-security-review-cycle.md
│       └── ...
├── .aiwg/               # SDLC artifacts
│   ├── intake/          # Project intake forms
│   ├── requirements/    # User stories, use cases
│   ├── architecture/    # SAD, ADRs, diagrams
│   ├── testing/         # Test strategy, plans
│   ├── security/        # Threat models, reviews
│   ├── planning/        # Phase and iteration plans
│   ├── deployment/      # Deployment plans, runbooks
│   └── quality/         # Code reviews, retrospectives
├── AGENTS.md            # Project + AIWG documentation (optional)
└── ... (your code)
```

## Using AIWG Droids

### Direct Droid Invocation

```text
# Specific droid tasks
"Use requirements-analyst to review US-001"
"Ask security-architect to evaluate authentication design"
"Have test-engineer create test plan for payment flow"
```

### Natural Language Orchestration

Factory automatically maps natural language to droids:

```text
"Start security review"        → security-architect, security-gatekeeper, security-auditor
"Create architecture baseline" → architecture-designer + reviewers + synthesizer
"Generate test plan"           → test-architect, test-engineer
"Deploy to production"         → deployment-manager, reliability-engineer
"Run iteration 5"              → Entire iteration workflow
```

### Multi-Agent Patterns

Factory handles parallel execution automatically:

**Pattern: Primary Author → Parallel Reviewers → Synthesizer**

```text
You: "Create comprehensive SAD for microservices platform"

Factory orchestrates:
1. architecture-designer creates draft
2. Parallel review:
   - security-architect validates controls
   - test-architect checks testability  
   - requirements-analyst verifies traceability
   - technical-writer ensures clarity
3. documentation-synthesizer merges feedback
4. Final SAD saved to .aiwg/architecture/
```

## Global vs Project Droids

### Project Droids (Default)

```bash
# Deploy to current project only
aiwg -deploy-agents --provider factory --mode sdlc
# Creates .factory/droids/ in current project
```

**Use for:**
- Project-specific SDLC agents
- Team collaboration (commit to git)
- Customized workflows

### Personal Droids (Global)

```bash
# Deploy to personal droids directory
aiwg -deploy-agents --provider factory --mode sdlc --target ~/.factory
# Creates ~/.factory/droids/ (global)
```

**Use for:**
- Personal workflow agents
- Cross-project agents
- Private customizations

**Note:** Project droids override personal droids when names match.

## Customizing Droids

### Edit Droid Configuration

```bash
# Open droid in editor
code .factory/droids/architecture-designer.md
```

**Customize:**
- `model`: Change to faster/slower model
- `tools`: Restrict to specific tools
- System prompt: Adjust behavior and style

### Example Customization

```yaml
---
name: architecture-designer
description: Creates software architecture documents
model: claude-sonnet-4-5-20250929  # Change from opus for faster/cheaper
tools: ["Read", "LS", "Grep", "Glob", "Edit", "Create"]  # Remove Execute for safety
---

[Custom prompt here]
```

## Model Options

AIWG agents are classified by role:
- **Reasoning** (opus): Complex analysis, critical decisions
- **Coding** (sonnet): Standard coding, reviews
- **Efficiency** (haiku): Simple tasks, summaries

**Model Configuration**:
- Default models are defined in `agentic/code/frameworks/sdlc-complete/config/models.json`
- See configuration file for current model versions

**Option 1: Command-line Override** (temporary)
```bash
aiwg -deploy-agents --provider factory --mode sdlc \
  --reasoning-model <your-reasoning-model> \
  --coding-model <your-coding-model> \
  --efficiency-model <your-efficiency-model>
```

**Option 2: Configuration File** (persistent, recommended)

Create `models.json` in your project root or `~/.config/aiwg/models.json`:

```json
{
  "factory": {
    "reasoning": { "model": "claude-opus-4-1-20250805" },
    "coding": { "model": "claude-sonnet-4-5-20250929" },
    "efficiency": { "model": "claude-haiku-3-5" }
  },
  "shorthand": {
    "opus": "claude-opus-4-1-20250805",
    "sonnet": "claude-sonnet-4-5-20250929",
    "haiku": "claude-haiku-3-5"
  }
}
```

See `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/config/models.json` for the complete template.

## Troubleshooting

### Droids Not Found / Not Available

**Problem:** Factory says "subagent not found" or droids don't appear in `/droids`

**Solution:**

```bash
# 1. Verify files were deployed
ls .factory/droids/
# Should show 53 .md files

# 2. Check Custom Droids setting (should be automatic)
cat ~/.factory/settings.json
# Should contain: "enableCustomDroids": true
# If missing, deployment auto-configures this

# 3. Restart droid to load settings
# Ctrl+C to exit current session
droid .

# 4. Import droids manually
/droids
# Press 'I' for Import
# Press 'A' to select all
# Press Enter to import

# 5. Verify import succeeded
/droids
# Should list 53 droids with descriptions

# If still not working, redeploy with auto-configuration:
aiwg -deploy-agents --provider factory --mode sdlc --force
# This will re-enable Custom Droids in settings.json
# Then restart droid and repeat import steps above
```

### Model Not Available

```bash
# Check Factory models
droid /models

# Edit droid to use available model
code .factory/droids/[droid-name].md
# Change 'model:' in frontmatter
```

### Commands Not Working

```bash
# Deploy commands
aiwg -deploy-commands --provider factory --mode sdlc

# Verify deployment
ls .factory/commands/
```

### AIWG Not Found

```bash
# Verify AIWG installation
ls ~/.local/share/ai-writing-guide

# Reinstall if needed
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/main/tools/install/install.sh | bash
```

## Factory-Specific Notes

### Droid Import is Manual (Not Automatic)

Unlike Claude Code (which auto-discovers `.claude/agents/`), Factory requires manual import:

**Why?**
- Factory validates and registers droids during import
- Allows selective import (you can choose which droids to enable)
- Prevents accidental execution of untrusted droids

**When to re-import:**
- After updating droid files (edit `.factory/droids/*.md`)
- After pulling team changes that modify droids
- When adding new droids to the project

**Import shortcuts:**
```bash
droid .
/droids → I → A → Enter
```

### Custom Droids Feature (Auto-Enabled)

Factory's custom droids are **experimental**, but the deployment script automatically enables them:

**What the deployment does:**
```bash
# Automatically configures ~/.factory/settings.json:
{
  "enableCustomDroids": true
}
```

**Manual enable (if needed):**
```bash
droid
/settings
# Toggle "Custom Droids" under Experimental
```

This setting persists to `~/.factory/settings.json` and registers the Task tool.

**After deployment, just restart droid to load the setting.**

## Best Practices

### 1. Commit Droids to Git

```bash
git add .factory/
git commit -m "feat: Add AIWG SDLC droids"
```

**Why:** Team members get same droids, consistent workflows

### 2. Use .gitignore for Artifacts

```bash
# .gitignore
.aiwg/working/      # Temporary files
.aiwg/reports/      # Generated reports
```

**Why:** Avoid committing generated content, keep intake/architecture/planning

### 3. Start with Intake

Always begin with intake forms before architecture or implementation.

```text
"Generate project intake for [description]"
```

### 4. Use Phase Gates

Validate gate criteria before transitioning phases:

```text
"Check if we're ready to move to Construction"
# Factory checks .aiwg/gates/ for validation
```

### 5. Leverage Multi-Agent Workflows

Let Factory coordinate multiple droids for comprehensive reviews:

```text
"Review this design" 
# Factory launches security-architect, test-architect, requirements-analyst in parallel
```

## Next Steps

1. **Explore Droids:** Review `.factory/droids/` to see available agents
2. **Generate Intake:** Start with project intake forms
3. **Follow Phases:** Progress through Inception → Elaboration → Construction → Transition
4. **Customize Workflows:** Adjust droids to match your team's process

## Resources

- **AIWG Repository:** https://github.com/jmagly/ai-writing-guide
- **AIWG Documentation:** `~/.local/share/ai-writing-guide/README.md`
- **SDLC Framework:** `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/README.md`
- **Templates:** `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/`
- **Factory AI Docs:** https://docs.factory.ai/

## Differences from Other Providers

**Factory vs Claude Code:**
- Factory uses `.factory/droids/` not `.claude/agents/`
- Factory droids have YAML frontmatter (Claude uses similar format)
- Factory has built-in orchestration
- Factory supports global personal droids (`~/.factory/droids/`)

**Factory vs OpenAI/Codex:**
- Factory has native droid invocation (not just AGENTS.md)
- Factory handles multi-agent orchestration automatically
- Factory droids are individual files (OpenAI can aggregate to AGENTS.md)
