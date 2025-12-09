# AIWG (AI Writing Guide) Capabilities Assessment Report

**Date**: 2025-12-03
**Status**: Production-Ready Framework
**Location**: ~/dev/ai-writing-guide

## Executive Summary

AIWG is a comprehensive AI orchestration framework for software development lifecycle management. It implements a **multi-agent collaboration pattern** where specialized agents collaborate through a **Primary Author → Parallel Reviewers → Synthesizer** workflow, producing higher-quality artifacts than single-agent approaches.

## Project Scale

| Category | Count | Description |
|----------|-------|-------------|
| SDLC Agents | 53 | Architecture, requirements, security, testing, deployment |
| Marketing Agents | 37 | Campaign strategy, content, brand, analytics |
| Writing Agents | 3 | Validation, optimization, diversification |
| SDLC Commands | 48 | Phase transitions, continuous workflows, operations |
| MMK Commands | 23 | Marketing workflow commands |
| SDLC Templates | 156 | Requirements, architecture, testing, security, deployment |
| MMK Templates | 88 | Campaigns, content, brand, analytics |

**Total**: 93 agents, 76 commands, 244 templates

## Core Architecture

### Orchestrator Pattern

**Philosophy**: Commands are templates, not executors. The core platform (Claude Code) is the orchestrator.

```text
User Natural Language → Intent Recognition → Flow Template → Multi-Agent Orchestration
        ↓                      ↓                   ↓                    ↓
"transition to Elaboration"  "phase-transition"  flow-*.md      Task tool calls
```

### Multi-Agent Workflow Pattern

```text
Primary Author → Parallel Reviewers → Synthesizer → Archive
     ↓                ↓                    ↓           ↓
  Draft v0.1    Reviews (3-5)      Final merge    .aiwg/archive/
```

**Quality Impact**:

| Approach | Section Completion | Time |
|----------|-------------------|------|
| Single-Agent | 60% | 2 hours |
| Multi-Agent | 100% | 4 hours |

**5x quality improvement for 2x time investment**

### Agent Specialization

**Agent Definition Format** (YAML frontmatter):

```yaml
---
name: Architecture Designer
description: Designs scalable, maintainable system architectures
model: opus  # Shorthand: opus (reasoning), sonnet (coding), haiku (efficiency)
tools: Bash, Glob, Grep, MultiEdit, Read, WebFetch, Write
---

[Role instructions and responsibilities]
```

**Model Selection Strategy**:

| Model | Use Case | Agent Examples |
|-------|----------|----------------|
| opus | Complex reasoning, architecture | Architecture Designer, Security Architect |
| sonnet | Code generation, implementation | Software Implementer, Test Engineer |
| haiku | Quick validations, file ops | Technical Writer, Configuration Manager |

### Agent Coordination

**Role Priority Hierarchy**:

```typescript
rolePriorities = {
  'security-architect': 100,      // Security always wins
  'requirements-analyst': 90,     // Requirements traceability critical
  'test-architect': 80,           // Testability next
  'performance-engineer': 70,     // Performance considerations
  'architecture-designer': 60,    // Architecture patterns
  'devops-engineer': 50,          // Operations concerns
  'technical-writer': 40,         // Clarity and style
}
```

**Conflict Resolution**:

1. Domain authority (Security Architect decides security matters)
2. Severity escalation (Critical > Major > Minor)
3. Role priority hierarchy
4. User escalation (unresolvable conflicts)

## Command/Flow System

### Flow Command Categories

**Phase Transitions** (4 commands):

- `/flow-concept-to-inception` - Intake validation, vision alignment
- `/flow-inception-to-elaboration` - Generate SAD, ADRs, test plan
- `/flow-elaboration-to-construction` - ABM validation, construction kickoff
- `/flow-construction-to-transition` - IOC validation, deployment readiness

**Continuous Workflows** (6 commands):

- `/flow-risk-management-cycle` - Risk identification and mitigation
- `/flow-requirements-evolution` - Living requirements refinement
- `/flow-architecture-evolution` - ADR management, breaking changes
- `/flow-security-review-cycle` - Security validation, threat modeling
- `/flow-test-strategy-execution` - Test suite execution, coverage
- `/flow-performance-optimization` - Baseline, bottlenecks, optimization

**Team Coordination** (4 commands):

- `/flow-team-onboarding` - Pre-boarding, training, 30/60/90 check-ins
- `/flow-knowledge-transfer` - Assessment, documentation, shadowing
- `/flow-cross-team-sync` - Dependency mapping, sync cadence
- `/flow-retrospective-cycle` - Structured retrospective facilitation

**Operations** (4 commands):

- `/flow-deploy-to-production` - Production deployment workflow
- `/flow-hypercare-monitoring` - Post-launch monitoring
- `/flow-incident-response` - Production incident triage
- `/flow-change-control` - Change control workflow

### Natural Language Translation

**70+ Recognized Phrases**:

| User Says | Mapped Flow |
|-----------|-------------|
| "transition to Elaboration" | `flow-inception-to-elaboration` |
| "run security review" | `flow-security-review-cycle` |
| "where are we" | `project-status` |
| "deploy to production" | `flow-deploy-to-production` |
| "create architecture baseline" | Extract SAD generation |
| "start iteration 5" | `flow-iteration-dual-track` with N=5 |

**Intent Recognition**:

- Fuzzy matching (not exact strings)
- Context-aware (current phase influences interpretation)
- Parameter extraction ("iteration 5" → iteration=5)
- Clarification on ambiguity

### Guidance System

**Purpose**: Provide upfront direction to tailor orchestration

```bash
--guidance "Focus on security architecture, HIPAA compliance critical"
--guidance "Tight timeline, prioritize steel thread validation"
--guidance "Team has limited DevOps experience, need extra support"
```

**Effects**:

- Adjusts agent assignments
- Modifies artifact depth
- Influences priority ordering
- Targets specific compliance frameworks

**Interactive Mode** (`--interactive`):

- 5-8 strategic questions
- Synthesizes answers into guidance
- Adjusts orchestration dynamically

## Reliability Mechanisms

### Error Recovery System

**Error Classification**:

| Type | Description | Recovery Strategy |
|------|-------------|-------------------|
| Transient | Network timeouts, rate limits | Retry with exponential backoff |
| Recoverable | API errors, partial failures | Circuit breaker + fallback |
| Critical | Data corruption, security breach | Immediate halt + escalation |

**Retry with Exponential Backoff**:

```typescript
calculateDelay(attempt) = baseDelay * 2^attempt
maxRetries: 3 (configurable)
```

**Circuit Breaker Pattern**:

- **Threshold**: 5 failures → Open circuit
- **Timeout**: 60s before Half-Open
- **States**: Closed → Open → Half-Open → Closed
- **Auto-Recovery**: Successful Half-Open closes circuit

**Recovery Targets (NFRs)**:

| Requirement | Target |
|-------------|--------|
| NFR-RECOV-001 | Recovery time <30s for transient errors |
| NFR-RECOV-002 | 95% automatic recovery success rate |
| NFR-RECOV-003 | Zero data loss during recovery |

### Review Synthesis System

**Comment Consolidation**:

1. Group comments by section
2. Merge similar comments (40% word overlap threshold)
3. Prioritize by severity (critical → major → minor → info)

**Conflict Detection**:

- Contradictory actions: "add" vs. "remove", "enable" vs. "disable"
- Resolution uses role priority + severity
- Documents all conflicts and resolutions

**Quality Score Formula**:

```typescript
score = 1.0
score -= rejections * 0.2
score -= conflicts * 0.1
score -= criticalComments * 0.05
score += (consensusRate - 0.5) * 0.2
```

**Action Plan Generation**:

- Group by severity
- Extract action items
- Generate prioritized checklist
- Track completion status

### Gate Validation

**Phase-Specific Gate Criteria**:

| Phase | Gate | Key Criteria |
|-------|------|--------------|
| Inception | LOM (Lifecycle Objective) | Vision, risks, business case approved |
| Elaboration | LAM (Lifecycle Architecture) | SAD baselined, critical risks retired |
| Construction | IOC (Initial Operational Capability) | Features complete, tests pass |
| Transition | PR (Product Release) | Deployment complete, UAT passed |

**Validation Process**:

1. Check artifact presence
2. Verify review approvals
3. Confirm risk retirement
4. Calculate readiness score
5. Generate go/no-go recommendation

## Framework Structure

### Directory Organization

```text
agentic/code/frameworks/sdlc-complete/
├── agents/             # 53 specialized role agents
├── commands/           # 48 SDLC commands
├── templates/          # 156 artifact templates
│   ├── intake/         # Project intake forms
│   ├── requirements/   # Use cases, NFRs
│   ├── analysis-design/# SAD, ADRs, component design
│   ├── test/           # Test plans, strategies
│   ├── security/       # Threat models, security artifacts
│   └── deployment/     # Deployment plans, runbooks
├── flows/              # Phase workflows
├── docs/               # Architecture documentation
├── metrics/            # Tracking catalogs
├── config/             # models.json
└── src/                # TypeScript implementation
    ├── orchestration/  # Multi-agent coordination
    ├── traceability/   # Requirements tracing
    ├── security/       # Security validation
    └── recovery/       # Error recovery
```

### Template System

**Template Metadata (Ownership & Collaboration)**:

```markdown
## Ownership & Collaboration

- Document Owner: architecture-designer (Primary Author)
- Contributor Roles: security-architect, test-architect, requirements-analyst
- Automation Inputs: Requirements, NFRs, architectural drivers
- Automation Outputs: software-architecture-doc.md
```

**Template Categories**:

| Category | Template Count | Examples |
|----------|---------------|----------|
| Intake | 8 | project-intake, solution-profile |
| Requirements | 24 | vision-doc, use-case, nfr-catalog |
| Architecture | 32 | SAD, ADR, component-design |
| Testing | 28 | test-plan, test-strategy, test-cases |
| Security | 20 | threat-model, vuln-management |
| Deployment | 18 | deployment-plan, runbook, release-notes |
| Management | 26 | risk-list, iteration-plan, phase-plan |

### Artifact Management (.aiwg/ Directory)

**Structure**:

```text
.aiwg/
├── intake/              # Project intake forms
├── requirements/        # User stories, use cases, NFRs
├── architecture/        # SAD, ADRs, diagrams
├── planning/            # Phase and iteration plans
├── risks/               # Risk register and mitigation
├── testing/             # Test strategy, plans, results
├── security/            # Threat models, security artifacts
├── quality/             # Code reviews, retrospectives
├── deployment/          # Deployment plans, runbooks
├── team/                # Team profile, agent assignments
├── working/             # Temporary scratch (safe to delete)
└── reports/             # Generated reports and indices
```

**Benefits**:

- Clean separation from user code
- Easy to ignore (single .gitignore entry)
- Optional sharing (commit for audit vs. local use)
- Centralized and discoverable
- Consistent paths for tooling

### Traceability System

**Bidirectional Links**:

```text
Requirements → Use Cases → Components → Code → Tests → Docs
     ↑            ↑            ↑          ↑       ↑       ↑
     └────────────────────────────────────────────────────┘
```

**Validation**:

```bash
/check-traceability .aiwg/reports/traceability.csv
```

**Outputs**:

- Coverage percentages per artifact type
- Gaps (requirements without code, code without tests)
- Orphaned artifacts (no links)
- Export formats: CSV, Excel, Markdown, HTML

## Multi-Platform Support

### Deployment Targets

| Platform | Agent Path | Special Files |
|----------|------------|---------------|
| Claude Code | `.claude/agents/*.md` | - |
| Factory AI | `.factory/droids/*.md` | `AGENTS.md` |
| OpenAI/Codex | `.codex/agents/*.md` | `AGENTS.md` |
| Warp Terminal | `WARP.md` → `CLAUDE.md` | Symlink |

### Deployment Command

```bash
# Claude Code (default)
aiwg -deploy-agents --mode sdlc

# Factory AI
aiwg -deploy-agents --provider factory --mode sdlc --deploy-commands

# OpenAI/Codex
aiwg -deploy-agents --provider openai --mode sdlc

# Model override (all platforms)
aiwg -deploy-agents --provider factory \
  --reasoning-model <model> \
  --coding-model <model> \
  --efficiency-model <model>
```

### Model Translation

| AIWG Shorthand | Claude | Factory AI | OpenAI |
|----------------|--------|------------|--------|
| opus | claude-opus-4-5 | (configurable) | (configurable) |
| sonnet | claude-sonnet-4-5 | (configurable) | (configurable) |
| haiku | claude-haiku | (configurable) | (configurable) |

## Key Innovations

### 1. Multi-Agent Documentation Pattern

**Why It Works**:

- Security Architect catches security gaps
- Test Architect ensures testability
- Requirements Analyst validates traceability
- Technical Writer improves clarity
- Synthesizer merges perspectives intelligently

### 2. Natural Language Interface

**No Slash Commands Required**:

- Users speak naturally
- System interprets intent
- Maps to appropriate flow
- Extracts parameters automatically

### 3. Orchestration as Code

**Flow Commands as Declarative Templates**:

- Define artifacts, agents, criteria
- Core platform interprets and executes
- Easy to update and audit
- Version-controlled workflows

### 4. Guidance-First Architecture

**Upfront Direction vs. Post-Generation Correction**:

- Provide guidance before orchestration
- Adjusts agent assignments, depth, priorities
- Reduces rework (get it right first time)

### 5. Review Synthesis Intelligence

**Conflict Resolution Hierarchy**:

1. Domain expertise (security matters → security architect)
2. Severity (critical > major > minor)
3. Role priority (security > requirements > testing > style)
4. Escalation (unresolvable → user decision)

### 6. Error Recovery Patterns

**Built-In Resilience**:

- Automatic retry with exponential backoff
- Circuit breaker prevents cascade failures
- Fallback strategies for degraded functionality
- Complete error history for debugging

## Performance Characteristics

### Orchestration Timing

| Artifact | Expected Duration | Breakdown |
|----------|------------------|-----------|
| SAD | 15-20 minutes | Draft 5m, Reviews 3m×4 parallel, Synthesis 3m |
| ADR | 5-8 minutes | Draft 2m, Reviews 2m×2 parallel, Synthesis 2m |
| Test Plan | 10-15 minutes | Draft 4m, Reviews 3m×3 parallel, Synthesis 3m |
| Phase Transition | 15-20 minutes | Complete workflow |

### Scalability

- Multiple concurrent orchestrations
- Independent progress tracking
- Task timeouts (configurable)
- Circuit breakers prevent exhaustion
- Cancellation support

## Testing Infrastructure

### Available Mocks

| Mock | Purpose |
|------|---------|
| `filesystem-sandbox.ts` | Isolated file system testing |
| `git-sandbox.ts` | Git repository simulation |
| `github-stub.ts` | GitHub API mocking |
| `agent-orchestrator.ts` | Agent Task tool simulation |
| `test-data-factory.ts` | Generate test data |

### NFR Ground Truth Corpus

- Reference dataset for NFR validation
- Performance benchmarks
- Quality metrics baselines

## Security Features

### Pattern Detection

- Secret patterns (API keys, passwords, tokens)
- Insecure API usage patterns
- Comprehensive security checks

### Security Gates

- Pre-commit secret scanning
- Architecture security review (Security Architect)
- Threat modeling validation
- Vulnerability management

### Data Classification

- Artifact classification (public, internal, confidential, restricted)
- Audit logging (who created, who reviewed, when)
- Role-based access control (optional)

## CLI Commands

```bash
# Version and updates
aiwg -version
aiwg -update
aiwg -reinstall

# Agent deployment
aiwg -deploy-agents [--mode general|sdlc|both] [--provider claude|openai|factory]
aiwg -deploy-commands [--mode general|sdlc|both]

# Project scaffolding
aiwg -new [--no-agents] [--provider claude|openai]

# Utilities
aiwg -prefill-cards --target <path> --team <team.yaml> [--write]
aiwg -help
```

## Strengths

1. **Production-ready** - Comprehensive implementation with TypeScript source
2. **Multi-agent quality** - 5x quality improvement through collaboration
3. **Platform agnostic** - Deploy to Claude, Factory, OpenAI, Warp
4. **Natural language** - No slash commands required
5. **Comprehensive templates** - 244 templates covering full SDLC
6. **Built-in reliability** - Error recovery, circuit breakers, retries
7. **Traceability** - Requirements → Code → Tests tracking
8. **Guidance-first** - Reduce rework with upfront direction
9. **Extensible** - Add new agents, commands, templates easily
10. **Well-documented** - Extensive documentation and examples

## Areas for Enhancement

1. **Cost tracking** - No built-in API cost monitoring
2. **Caching** - No cross-session result caching
3. **Voting** - Single-pass generation (no multi-sample voting)
4. **Step atomicity** - Coarse-grained tasks (not atomic steps)
5. **Checkpoint system** - Working drafts but no git-integrated checkpoints
6. **Red-flag detection** - Manual review vs. automated output filtering

## Conclusion

AIWG represents a mature, production-ready framework for AI-assisted software development. Its multi-agent collaboration pattern produces higher-quality artifacts than single-agent approaches, while its natural language interface and guidance system make it accessible to users without requiring command memorization.

The framework's strengths lie in its comprehensive coverage (93 agents, 244 templates), platform flexibility, and built-in reliability mechanisms. Its primary focus is on **process orchestration and artifact quality** rather than execution reliability at the atomic step level.
