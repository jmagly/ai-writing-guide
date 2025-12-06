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

### Step 3: Deploy AIWG to Warp

```bash
# Deploy SDLC framework to create WARP.md
aiwg use sdlc --provider warp
```

**What this creates:**

- `WARP.md` file with AIWG SDLC framework
- 58 specialized SDLC agents (embedded in WARP.md)
- 42+ SDLC commands (embedded in WARP.md)
- aiwg-utils commands (regenerate, etc.)
- Orchestration context for natural language workflows

**Framework options:**

- `aiwg use sdlc` - SDLC agents only (58 agents)
- `aiwg use marketing` - Marketing agents only (37 agents)
- `aiwg use all` - All frameworks

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

## Existing Project Setup (5-10 Minutes)

### Step 1: Install AIWG

```bash
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash
source ~/.bash_aliases
```

### Step 2: Navigate to Existing Project

```bash
cd /path/to/existing/project
```

### Step 3: Deploy AIWG Framework

```bash
# Deploy SDLC framework (includes agents, commands, aiwg-utils)
aiwg use sdlc --provider warp
```

**What this does:**

- Creates `WARP.md` with SDLC framework
- Includes aiwg-utils commands for regeneration
- Enables intelligent merge via `/aiwg-regenerate-warp`

### Step 4: Choose Your Integration Method

You have two options for integrating AIWG into your existing WARP.md:

#### Option A: Quick Append (CLI) - Simple but Limited

```bash
# Simple append - no disruption to existing content
aiwg -deploy-agents --platform warp
```

**What this does:**

- **Preserves** all your existing content exactly as-is
- **Appends** AIWG SDLC Framework section at bottom
- **Creates backup**: `WARP.md.backup-{timestamp}`
- **No modifications** to your existing content

**When to use:** Quick testing, minimal disruption

#### Option B: Intelligent Merge (Slash Command) - **RECOMMENDED for Best Results**

```bash
# Open project in Claude Code (or similar AI IDE)
claude .
```

Then in Claude Code:

```text
/aiwg-update-warp
```

**What this does:**

- **Preserves** all user-specific content (Tech Stack, Team Rules, Project Notes)
- **Intelligently integrates** AIWG framework with your existing content
- **Expands and links** important user notes into SDLC documentation
- **Improves quality** by enriching context for better AI responses
- **Deep integration** - your project rules become part of SDLC workflows
- **Creates backup**: `WARP.md.backup-{timestamp}`

**Example transformations:**

```markdown
# Before intelligent merge
## Deployment Notes
- Production requires 2 approvals

# After intelligent merge
## Deployment Notes
- Production requires 2 approvals
- See detailed deployment workflow: flow-deploy-to-production
- Approval process documented in: .aiwg/deployment/approval-checklist.md
```

**When to use:** Best results, deep SDLC integration, production use

### Step 5: Open in Warp Terminal

```bash
# Navigate to project in Warp
cd /path/to/existing/project
```

**Warp loads:**

- Your existing project rules (preserved and enhanced)
- AIWG SDLC framework (integrated with your context)

---

## Why Use Intelligent Merge? (Option B)

### The Power of Deep Integration

The intelligent merge does more than just append AIWG content - it creates a **cohesive, enriched context** that dramatically improves AI response quality.

### What Makes It "Intelligent"?

**1. Context Linking**

Your existing notes get linked to SDLC workflows:

```markdown
# Your existing note
## Security Requirements
- Must comply with SOC2

# After intelligent merge
## Security Requirements
- Must comply with SOC2
- Security validation workflow: /flow-security-review-cycle
- Compliance tracking: .aiwg/security/compliance-matrix.md
- Gate criteria documented: .aiwg/gates/security-gate-criteria.md
```

**2. Content Expansion**

Vague notes get expanded with actionable details:

```markdown
# Before
## Testing Strategy
- Write tests for all features

# After
## Testing Strategy
- Write tests for all features
  - Unit tests: 80%+ coverage (tools/test/coverage-config.js)
  - Integration tests: API endpoints (test/integration/)
  - E2E tests: Critical user flows (test/e2e/)
- Test execution: /flow-test-strategy-execution
- Test plan template: {AIWG_ROOT}/templates/testing/master-test-plan.md
```

**3. Quality Improvements**

Your project rules get elevated with best practices:

```markdown
# Before
## Deployment Process
- Deploy to staging first

# After
## Deployment Process
- Deploy to staging first
  1. Validate staging deployment (smoke tests)
  2. Run automated regression suite
  3. Manual QA sign-off
  4. Production deployment (blue-green strategy)
  5. Monitor for 24h (hypercare)
- Deployment workflow: /flow-deploy-to-production
- Rollback procedure: .aiwg/deployment/rollback-runbook.md
```

### Real-World Impact

**Without intelligent merge** (CLI append):

```text
User: "Deploy to production"
Warp AI: [Generic deployment steps]
```

**With intelligent merge** (slash command):

```text
User: "Deploy to production"
Warp AI: [Understands your 2-approval requirement]
         [References your rollback procedure]
         [Follows your blue-green strategy]
         [Triggers your monitoring setup]
         [Complete context-aware deployment]
```

### When to Use Each Method

| Scenario | CLI Append | Intelligent Merge |
|----------|-----------|------------------|
| **Quick testing** | ✅ Fast setup | ⚠️ Takes 2-3 min |
| **Production use** | ⚠️ Limited integration | ✅ Best results |
| **Team projects** | ⚠️ Generic responses | ✅ Context-aware |
| **Complex codebases** | ⚠️ Shallow context | ✅ Deep integration |
| **Existing WARP.md** | ✅ Zero disruption | ✅ Preserves + enhances |

**Recommendation**: Start with CLI append for testing, then run intelligent merge for production use.

---

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

## Regenerating WARP.md

When your project evolves, regenerate your context file:

```text
# In an AI IDE with AIWG commands
/aiwg-regenerate-warp --dry-run     # Preview changes
/aiwg-regenerate-warp --show-preserved  # See preserved content
/aiwg-regenerate-warp               # Regenerate (creates backup)
```

The regenerate command:

- Analyzes current project state
- Detects installed AIWG frameworks
- Preserves team directives, conventions, organizational requirements
- Creates fresh, accurate WARP.md

### Manual Update

```bash
# Update AIWG installation
aiwg -update

# Redeploy to WARP.md
aiwg use sdlc --provider warp --force
```

**What happens:**

1. Creates backup: `WARP.md.backup-{timestamp}`
2. Preserves user sections (Tech Stack, Team Conventions, etc.)
3. Replaces AIWG sections with latest
4. Validates structure

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

❌ /flow-security-review-cycle
❌ /flow-inception-to-elaboration
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

**Last Updated**: 2025-12-06
**AIWG Version**: 1.5.0+
**Integration Status**: ✅ Production Ready
