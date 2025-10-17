# Warp Terminal Quick Start

## New Project Setup (3 Minutes)

### Step 1: Install AIWG

```bash
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash
source ~/.bash_aliases  # or ~/.zshrc
```

### Step 2: Navigate to Project

```bash
cd /path/to/your/new/project
```

### Step 3: Setup Warp with AIWG

```bash
aiwg -setup-warp
```

**What this creates:**

- `WARP.md` file with AIWG SDLC framework
- 58 specialized SDLC agents (embedded in WARP.md)
- 42+ SDLC commands (embedded in WARP.md)
- Orchestration context for natural language workflows

### Step 4: Open in Warp Terminal

```bash
# Warp automatically loads WARP.md when you navigate to project
cd /path/to/your/new/project  # in Warp Terminal
```

**Warp AI now understands:**

- All SDLC phases (Inception → Elaboration → Construction → Transition)
- 58 specialized agent roles
- 42+ workflow commands
- Natural language orchestration patterns

### Step 5: Start Building (Natural Language)

```text
# In Warp Terminal AI
"Generate intake for an e-commerce platform with React, Node.js, PostgreSQL"

"What SDLC phase should I start with?"

"Transition to Elaboration"

"Run security review"
```

---

## Existing Project Setup (5 Minutes)

### Step 1: Install AIWG

```bash
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash
source ~/.bash_aliases
```

### Step 2: Navigate to Existing Project

```bash
cd /path/to/existing/project
```

### Step 3: Setup Warp (Preserves Existing WARP.md)

```bash
# If you have existing WARP.md with custom rules
aiwg -setup-warp
```

**What this does:**

- **Preserves** all your existing Tech Stack, Team Conventions, Project Rules
- **Adds** AIWG SDLC Framework section at bottom
- **Creates backup**: `WARP.md.backup-{timestamp}`
- **Intelligent merge**: User content stays, AIWG content appended

### Step 4: Open in Warp Terminal

```bash
# Navigate to project in Warp
cd /path/to/existing/project
```

**Warp loads both:**

- Your existing project rules
- AIWG SDLC framework

### Step 5: Analyze Codebase (Key for Existing Projects!)

```text
# In Warp Terminal AI
"Analyze this codebase and generate SDLC intake documents"
```

**What Warp AI does** (using AIWG context):

- Scans dependencies, file structure, infrastructure
- Detects frameworks, languages, patterns
- Generates intake forms
- Estimates complexity and staffing
- Identifies security/compliance requirements

**Example output:**

```text
✓ Detected: React 18.2, Node.js 20, PostgreSQL 15
✓ Found: Docker Compose, GitHub Actions CI
✓ Identified: 15 API endpoints, 23 components
✓ Generated intake forms

Next: "Start Inception phase"
```

### Step 6: Begin SDLC Workflows

```text
"Start Inception phase"
"Transition to Elaboration"
"Run security review for SOC2"
"Generate test plan"
```

---

## Natural Language Commands

**Warp AI understands natural language based on WARP.md context.**

### Phase Transitions

```text
"Let's transition to Elaboration"
"Move to Construction"
"Start Transition phase"
"Ready to deploy to production"
```

### Workflow Execution

```text
"Run security review"
"Execute integration tests"
"Validate architecture"
"Update risk register"
"Deploy to production"
```

### Artifact Generation

```text
"Create Software Architecture Document"
"Generate test plan"
"Build deployment runbook"
"Draft requirements"
```

### Status Checks

```text
"Where are we in the project?"
"What's the current phase?"
"Can we transition to Construction?"
"Check phase gate criteria"
```

### Team Operations

```text
"Onboard new developer Sarah"
"Knowledge transfer from Alice to Bob"
"Schedule retrospective"
```

---

## Deployment Modes

### Mode: `both` (Default)

Deploys general + SDLC agents:

- **3 general agents**: writing-validator, prompt-optimizer, content-diversifier
- **58 SDLC agents**: Full lifecycle coverage

```bash
aiwg -setup-warp --mode both
```

### Mode: `sdlc`

SDLC framework only:

- **58 SDLC agents**: Intake → Inception → Elaboration → Construction → Transition
- **42+ commands**: Full workflow orchestration

```bash
aiwg -setup-warp --mode sdlc
```

### Mode: `general`

General-purpose agents only:

- **3 general agents**: Writing quality, prompt optimization, content generation

```bash
aiwg -setup-warp --mode general
```

---

## Updating AIWG Content

### When to Update

Update WARP.md when:

- AIWG releases new agents or commands
- Agent definitions are enhanced
- You want latest orchestration patterns

### Update Process

```bash
# Update AIWG installation
aiwg -update

# Update WARP.md with latest content
aiwg -update-warp
```

**What happens:**

1. Creates backup: `WARP.md.backup-{timestamp}`
2. Preserves all user sections (Tech Stack, Team Conventions, etc.)
3. Replaces AIWG sections with latest
4. Validates structure and counts

---

## Common Workflows

### Security Review Before Release

```text
# In Warp Terminal AI
"Run comprehensive security review for SOC2 audit"

Warp understands to:
✓ Threat modeling
✓ SAST/DAST scans
✓ Dependency audit
✓ Security gate validation
✓ Remediation tracking
```

### Architecture Evolution

```text
"Evolve architecture to migrate from MongoDB to PostgreSQL"

Warp orchestrates:
✓ ADR creation
✓ Breaking change analysis
✓ Migration strategy
✓ Rollback plan
✓ Architecture review
```

### Performance Optimization

```text
"Optimize API performance, current p95 latency is 850ms, target 200ms"

Warp coordinates:
✓ Baseline metrics
✓ Bottleneck identification
✓ Optimization implementation
✓ Load testing
✓ SLO validation
```

---

## Key Tips

### 1. Start with Codebase Analysis (Existing Projects)

```text
"Analyze codebase and generate intake documents"
```

This gives AIWG the context it needs to provide accurate guidance.

### 2. Use Natural Language

```text
✅ "Run security review"
✅ "Transition to Elaboration"
✅ "Create test plan"

❌ /project:flow-security-review-cycle
❌ /project:flow-inception-to-elaboration
```

Warp AI understands natural language from WARP.md context.

### 3. Provide Strategic Guidance

```text
# Generic
"Run security review"

# With guidance (better)
"Run security review with focus on authentication and HIPAA compliance, SOC2 audit in 3 months"
```

### 4. Customize WARP.md (Preserved on Updates)

Add your own project rules above the AIWG section:

```markdown
# Project Context

## Tech Stack

- React 18.2
- Node.js 20
- PostgreSQL 15

## Deployment Process

- Stage deploys from `develop` branch
- Production requires 2 approvals

<!-- AIWG sections below (auto-updated) -->
```

**Your content is ALWAYS preserved on updates.**

### 5. Use Both Warp and Claude Code

| Feature | Warp Terminal | Claude Code |
|---------|--------------|-------------|
| **Best For** | Command-line workflows | Full orchestration |
| **Artifact Generation** | Limited | Complete |
| **Multi-Agent** | Context only | Full execution |

**Recommendation**: Use Warp for terminal work, Claude Code for artifact generation.

---

## Warp-Specific Features

### Warp Slash Commands

Type `/` in Warp to access:

```bash
/init              # Re-index project (reload WARP.md)
/open-project-rules # Open WARP.md in editor
/add-rule          # Add custom global rule
```

### Command Suggestions

Warp AI suggests commands based on WARP.md context:

```text
# Type: "deploy"
Warp suggests:
  → "Deploy to staging"
  → "Deploy to production with rollback plan"
  → "Check deployment readiness"
```

### Context Awareness

Warp AI knows your project context from WARP.md:

```text
You: "What's the tech stack?"
Warp: "Based on WARP.md: React 18.2, Node.js 20, PostgreSQL 15"

You: "What SDLC phase are we in?"
Warp: "Based on project artifacts: Elaboration phase, ready for Construction gate check"
```

---

## Troubleshooting

### WARP.md Not Loading

**Solution:**

```bash
# In Warp Terminal
/init

# Or navigate to project root and reopen Warp
cd /path/to/project
```

### Setup Command Not Found

**Solution:**

```bash
# Reload shell aliases
source ~/.bash_aliases  # or ~/.zshrc

# Or reinstall
aiwg -reinstall
```

### User Content Lost

**Solution:**

```bash
# Restore from automatic backup
ls WARP.md.backup-*
cp WARP.md.backup-{timestamp} WARP.md

# Re-run merge (NOT --force)
aiwg -setup-warp  # WITHOUT --force
```

### File Too Large (300KB+)

**Solution:**

```bash
# Deploy only what you need
aiwg -setup-warp --mode sdlc  # Skip general agents

# Or use Claude Code for full orchestration
```

---

## Comparison: Warp vs Claude Code

| Feature | Warp Terminal | Claude Code |
|---------|--------------|-------------|
| **Platform** | Terminal-native | IDE-native |
| **File Format** | Single `WARP.md` | Multiple `.claude/agents/*.md` |
| **Orchestration** | Single AI agent | Multi-agent workflows |
| **Use Case** | Command-line workflows | Full SDLC orchestration |
| **Artifact Generation** | Limited | Full (SAD, test plans, etc.) |
| **Natural Language** | Yes ✅ | Yes ✅ |
| **SDLC Workflows** | Context only | Full execution |

**Recommendation:**

- **Use Warp** for terminal-heavy workflows, command suggestions
- **Use Claude Code** for multi-agent orchestration, artifact generation
- **Use Both** for best experience

---

## Advanced Usage

### Custom Sections (Preserved on Updates)

```markdown
# Project Context

## Deployment Process

- Stage deploys from `develop` branch
- Production requires 2 approvals
- Rollback procedure documented in wiki

<!-- AIWG sections below will be auto-updated -->
```

### Integration with Claude Code

Deploy to both platforms:

```bash
# Deploy to Claude Code
aiwg -deploy-agents --mode sdlc
aiwg -deploy-commands --mode sdlc

# Deploy to Warp Terminal
aiwg -setup-warp --mode sdlc

# Use:
# - Claude Code for orchestration, artifact generation
# - Warp for command-line workflows
```

### Selective Updates

```bash
# Update only SDLC agents (skip general)
aiwg -setup-warp --mode sdlc --force

# Update only general agents (skip SDLC)
aiwg -setup-warp --mode general --force
```

---

## FAQ

### Q: Do I need Claude Code to use Warp integration?

**A**: No. Warp integration works standalone. However, Claude Code provides multi-agent orchestration that Warp cannot match.

### Q: Can I edit WARP.md manually?

**A**: Yes! Add custom sections above `<!-- AIWG SDLC Framework -->` marker. They'll be preserved on updates.

### Q: How often should I update?

**A**: Update when AIWG releases new versions (`aiwg -update`), then refresh WARP.md (`aiwg -update-warp`).

### Q: Does this work offline?

**A**: WARP.md setup works offline. Warp AI requires internet for LLM access.

### Q: What if I use both Warp and Cursor?

**A**: AIWG supports both. Deploy to both:

```bash
aiwg -setup-warp              # For Warp
# Create .cursorrules manually  # For Cursor
```

---

## Next Steps

1. **New Projects**: Follow "New Project Setup" above
2. **Existing Projects**: Follow "Existing Project Setup" above (don't skip codebase analysis!)
3. **Learn More**: See full documentation at `docs/integrations/warp-terminal.md`
4. **Get Help**: https://github.com/jmagly/ai-writing-guide/issues

---

## Resources

- **Warp Terminal**: https://www.warp.dev/
- **Warp Rules Documentation**: https://docs.warp.dev/knowledge-and-collaboration/rules
- **AIWG Repository**: https://github.com/jmagly/ai-writing-guide
- **Full Warp Integration Guide**: `docs/integrations/warp-terminal.md`

---

**Last Updated**: 2025-10-17
**AIWG Version**: 1.4.0+
**Integration Status**: ✅ Production Ready
