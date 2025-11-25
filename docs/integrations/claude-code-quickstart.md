# Claude Code Quick Start

## New Project Setup (5 Minutes)

### Step 1: Install AIWG

```bash
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash
source ~/.bash_aliases  # or ~/.zshrc
```

### Step 2: Create New Project

```bash
cd /path/to/your/new/project
aiwg -new
```

**What this does:**

- Creates `.aiwg/` directory with intake templates
- Creates `.claude/` directory structure
- Adds CLAUDE.md with AIWG orchestration context

### Step 3: Deploy Agents & Commands

```bash
# Deploy SDLC framework
aiwg -deploy-agents --mode sdlc
aiwg -deploy-commands --mode sdlc

# Or deploy everything (general + SDLC)
aiwg -deploy-agents --mode both
aiwg -deploy-commands --mode both
```

### Step 4: Open in Claude Code

```bash
# Open project in Claude Code
claude .
```

### Step 5: Start Building

**Option A: Interactive Intake**

```text
You: "Start intake wizard for a customer portal project"
Claude: [Orchestrates /intake-wizard with interactive questions]
```

**Option B: Direct Intake**

```text
You: "Generate intake for an e-commerce platform with React, Node.js, PostgreSQL, targeting 100k users, must be GDPR compliant"
Claude: [Creates complete intake forms in .aiwg/intake/]
```

### Step 6: Begin Inception Phase

```text
You: "Start Inception phase"
Claude: [Orchestrates Concept → Inception workflow]
```

**What happens:**

- Vision document generated
- Initial risk assessment
- Architecture sketch
- Security screening
- Business case outline

### Step 7: Progress Through Lifecycle

```text
# When Inception complete
You: "Transition to Elaboration"
Claude: [Generates SAD, ADRs, test strategy, phase plan]

# When Elaboration complete
You: "Move to Construction"
Claude: [Sets up iteration plans, CI/CD, development workflows]

# Deploy to production
You: "Deploy to production"
Claude: [Orchestrates deployment workflow]
```

---

## Existing Project Setup (10 Minutes)

### Step 1: Install AIWG

```bash
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash
source ~/.bash_aliases
```

### Step 2: Navigate to Project

```bash
cd /path/to/existing/project
```

### Step 3: Deploy Agents & Commands First

```bash
# Deploy SDLC framework
aiwg -deploy-agents --mode sdlc
aiwg -deploy-commands --mode sdlc
```

### Step 4: Choose Your Integration Method

You have two options for integrating AIWG into your existing CLAUDE.md:

#### Option A: Simple Setup (New CLAUDE.md or First Time)

```bash
# Open in Claude Code
claude .
```

```text
# In Claude Code
You: "Setup AIWG project context"
Claude: [Runs /aiwg-setup-project]
```

**What this does:**

- Reads existing CLAUDE.md (if present)
- Preserves all user content
- Adds AIWG orchestration section at bottom
- Creates `.aiwg/` directory structure

**When to use:** First-time setup, no CLAUDE.md exists yet

#### Option B: Intelligent Merge (Existing CLAUDE.md) - **RECOMMENDED for Best Results**

```bash
# Open in Claude Code
claude .
```

```text
# In Claude Code
You: "Update CLAUDE.md with intelligent AIWG integration"
Claude: [Runs /aiwg-update-claude]
```

**What this does:**

- **Preserves** all user-specific content (Repository Purpose, Team Rules, etc.)
- **Intelligently integrates** AIWG framework with your existing content
- **Expands and links** important user notes into SDLC documentation
- **Improves quality** by enriching context for better AI responses
- **Deep integration** - your project rules become part of SDLC workflows
- **Creates backup**: `CLAUDE.md.backup-{timestamp}`

**Example transformations:**

```markdown
# Before intelligent merge
## Team Rules
- Use Prettier for formatting
- Run tests before pushing

# After intelligent merge
## Team Rules
- Use Prettier for formatting (config: .prettierrc)
- Run tests before pushing
  - Test execution: /flow-test-strategy-execution
  - Coverage target: 80%+ (enforced by CI)
  - Pre-commit hook: .husky/pre-commit
- Code review required for all PRs
  - Review checklist: .aiwg/quality/code-review-checklist.md
```

**When to use:** Existing CLAUDE.md with project-specific content, production use

---

## Why Use Intelligent Merge? (Option B)

### The Power of Deep Integration

The intelligent merge (`/aiwg-update-claude`) does more than just append AIWG content - it creates a **cohesive, enriched context** that dramatically improves AI response quality.

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
- Security validation: /flow-security-review-cycle
- Compliance framework: /flow-compliance-validation SOC2
- Audit preparation: .aiwg/security/audit-prep-checklist.md
- Gate criteria: .aiwg/gates/security-gate-criteria.md
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
  - Unit tests: 80%+ coverage (jest.config.js)
  - Integration tests: API endpoints (test/integration/)
  - E2E tests: Critical user flows (playwright.config.js)
- Test execution: /flow-test-strategy-execution
- Test architecture: .aiwg/testing/test-strategy.md
- Coverage reporting: CI/CD pipeline (.github/workflows/test.yml)
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
  1. Run full test suite (unit + integration + E2E)
  2. Deploy to staging environment
  3. Automated smoke tests (post-deployment)
  4. Manual QA sign-off (critical flows)
  5. Production deployment (blue-green strategy)
  6. Monitor for 24h (hypercare period)
- Deployment workflow: /flow-deploy-to-production
- Rollback runbook: .aiwg/deployment/rollback-procedure.md
- Monitoring dashboards: .aiwg/deployment/monitoring-setup.md
```

### Real-World Impact

**Without intelligent merge** (simple setup):

```text
User: "Run security review before release"
Claude: [Generic security checklist]
```

**With intelligent merge** (intelligent integration):

```text
User: "Run security review before release"
Claude: [Understands SOC2 requirement]
        [References your audit timeline]
        [Uses your compliance framework]
        [Checks your specific gate criteria]
        [Generates audit-ready documentation]
        [Complete context-aware security review]
```

### When to Use Each Method

| Scenario | Simple Setup | Intelligent Merge |
|----------|-----------|------------------|
| **First-time setup** | ✅ Quick start | ⚠️ Use after initial setup |
| **No CLAUDE.md yet** | ✅ Creates from scratch | ❌ Requires existing file |
| **Existing CLAUDE.md** | ⚠️ Just appends | ✅ Deep integration |
| **Production use** | ⚠️ Limited context | ✅ Best results |
| **Team projects** | ⚠️ Generic responses | ✅ Context-aware |
| **Complex codebases** | ⚠️ Shallow context | ✅ Rich integration |

**Recommendation**: Use simple setup first, then run intelligent merge to enhance integration.

---

### Step 5: Generate Intake from Codebase

**This is the key step for existing projects!**

```text
You: "Analyze this codebase and generate intake documents"
Claude: [Orchestrates /intake-from-codebase]
```

**What happens:**

- Scans package.json, requirements.txt, etc. for dependencies
- Analyzes directory structure and file patterns
- Detects frameworks, languages, architectures
- Identifies infrastructure (Docker, K8s, CI/CD)
- Generates complete intake forms in `.aiwg/intake/`
- Estimates project complexity and staffing needs

**Example output:**

```text
✓ Scanned 1,245 files
✓ Detected: React 18.2, Node.js 20, PostgreSQL 15
✓ Found: Docker Compose, GitHub Actions CI
✓ Identified: 15 API endpoints, 23 React components
✓ Generated intake forms: .aiwg/intake/

Next steps:
1. Review intake forms: .aiwg/intake/project-intake-form.md
2. Start Inception: "Start Inception phase"
```

### Step 6: Review and Refine Intake

```bash
# Review generated intake
cat .aiwg/intake/project-intake-form.md
cat .aiwg/intake/solution-profile.md
```

```text
# Refine if needed
You: "Update intake to add HIPAA compliance requirement"
Claude: [Updates intake forms]
```

### Step 7: Kick Off Inception Phase

```text
You: "Start Inception with focus on security and compliance"
Claude: [Validates intake, begins Inception workflows]
```

---

## Natural Language Commands

**No need to memorize slash commands!** Just talk naturally:

### Phase Transitions

```text
"Transition to Elaboration"
"Move to Construction"
"Start Transition phase"
```

### Workflow Execution

```text
"Run security review"
"Execute integration tests"
"Validate architecture"
"Update risk register"
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

## Common Workflows

### Security Review Before Release

```text
You: "Run comprehensive security review for SOC2 audit"
Claude: [Orchestrates security review cycle]
  ✓ Threat modeling
  ✓ SAST/DAST scans
  ✓ Dependency audit
  ✓ Security gate validation
  ✓ Remediation tracking
```

### Architecture Evolution

```text
You: "Evolve architecture to migrate from MongoDB to PostgreSQL"
Claude: [Orchestrates architecture evolution]
  ✓ ADR creation
  ✓ Breaking change analysis
  ✓ Migration strategy
  ✓ Rollback plan
  ✓ Architecture review
```

### Performance Optimization

```text
You: "Optimize API performance, current p95 latency is 850ms, target 200ms"
Claude: [Orchestrates performance optimization]
  ✓ Baseline metrics
  ✓ Bottleneck identification
  ✓ Optimization implementation
  ✓ Load testing
  ✓ SLO validation
```

---

## Key Tips

### 1. Start with Intake (Even for Existing Projects)

**Why?** Intake captures critical context:

- Business objectives
- Technical constraints
- Compliance requirements
- Team composition
- Risk tolerance

**For existing projects**, use `/intake-from-codebase` to auto-generate intake from code analysis.

### 2. Use Natural Language

```text
✅ "Run security review"
✅ "Transition to Elaboration"
✅ "Create test plan"

❌ /flow-security-review-cycle
❌ /flow-inception-to-elaboration
❌ /generate-test-plan
```

Claude understands natural language and maps it to the right workflows.

### 3. Provide Strategic Guidance

```text
# Generic
You: "Run security review"

# With guidance (better)
You: "Run security review with focus on authentication and HIPAA compliance, we have SOC2 audit in 3 months"
```

Guidance helps agents prioritize and contextualize their work.

### 4. Review Generated Artifacts

All artifacts are saved in `.aiwg/`:

```bash
.aiwg/
├── intake/              # Project intake forms
├── requirements/        # User stories, use cases, NFRs
├── architecture/        # SAD, ADRs, diagrams
├── testing/             # Test plans, results
├── security/            # Threat models, security artifacts
├── deployment/          # Deployment plans, runbooks
└── reports/             # Generated reports
```

**Always review** before moving to next phase.

### 5. Commit SDLC Artifacts (Optional)

**Team projects**: Commit `.aiwg/` for full audit trail and shared context.

**Solo projects**: Add `.aiwg/` to `.gitignore` if you prefer local-only use.

```gitignore
# Option: Use locally only
.aiwg/
!.aiwg/intake/          # Keep intake for context
```

---

## Troubleshooting

### "Command not found"

```bash
# Deploy commands
aiwg -deploy-commands --mode sdlc

# Verify
ls .claude/commands/
```

### "Agent not available"

```bash
# Deploy agents
aiwg -deploy-agents --mode sdlc

# Verify
ls .claude/agents/
```

### "AIWG installation not found"

```bash
# Check installation
aiwg -version

# Reinstall if needed
aiwg -reinstall
```

### "Intake generation failed"

```bash
# Provide more context
You: "Analyze codebase with focus on backend API, ignore frontend for now"
```

---

## Next Steps

1. **New Projects**: Follow "New Project Setup" above
2. **Existing Projects**: Follow "Existing Project Setup" above
3. **Learn More**: See `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/README.md`
4. **Get Help**: https://github.com/jmagly/ai-writing-guide/issues

---

## Resources

- **AIWG Repository**: https://github.com/jmagly/ai-writing-guide
- **SDLC Framework**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/`
- **Template Library**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/`
- **Natural Language Translations**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/docs/simple-language-translations.md`

---

**Last Updated**: 2025-10-17
**AIWG Version**: 1.4.0+
