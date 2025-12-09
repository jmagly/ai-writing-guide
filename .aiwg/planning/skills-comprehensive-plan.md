# Comprehensive Skills Plan: SDLC, MMK, and General Utilities

> **Status**: Planning Document
> **Created**: 2025-12-08
> **Scope**: Skills implementation across all AIWG frameworks and addons

---

## Executive Summary

This document outlines a comprehensive skills strategy for the AIWG ecosystem, covering:
- **SDLC Framework**: 10 specialized skills for software development lifecycle
- **MMK Framework**: 8 specialized skills for marketing campaigns
- **General Utilities (aiwg-utils)**: 6 cross-cutting skills usable in any context

**Total New Skills**: 24
**Migration/Enhancement**: 2 existing skills to be enhanced

---

## Part 1: SDLC Framework Skills

### Location: `agentic/code/frameworks/sdlc-complete/skills/`

### 1.1 Multi-Agent Artifact Generation

**Skill ID**: `artifact-orchestration`
**Priority**: P0 (Critical)
**Triggers**:
- "generate [artifact-type]"
- "create [SAD/test plan/deployment plan]"
- "draft [requirements/architecture]"

**Purpose**: Orchestrate the Primary Author → Parallel Reviewers → Synthesizer → Archive pattern that appears in 10+ artifact generation scenarios.

**Behavior**:
1. Parse artifact type and identify primary author agent
2. Set up workspace (`.aiwg/working/{type}/{name}/`)
3. Dispatch primary author to create draft v0.1
4. Launch 3-5 parallel reviewers based on artifact type
5. Collect reviews and invoke Documentation Synthesizer
6. Archive final artifact with metadata

**Artifact-to-Agent Mapping**:
| Artifact | Primary Author | Reviewers |
|----------|---------------|-----------|
| SAD | Architecture Designer | Security Architect, Test Architect, Requirements Analyst, Technical Writer |
| Test Plan | Test Architect | Security Auditor, Requirements Analyst, DevOps Engineer |
| Requirements | Requirements Analyst | Domain Expert, System Analyst, Test Architect |
| Deployment Plan | Deployment Manager | DevOps Engineer, Security Architect, Reliability Engineer |

**Output**: Baselined artifact at `.aiwg/{category}/{artifact}.md`

---

### 1.2 Phase Gate Evaluation

**Skill ID**: `gate-evaluation`
**Priority**: P0 (Critical)
**Triggers**:
- "check gate for [phase]"
- "can we transition to [phase]"
- "validate [LOM/ABM/IOC/PRM]"
- "are we ready for [phase]"

**Purpose**: Validate phase gate criteria with multi-agent review and generate pass/fail report.

**Behavior**:
1. Load gate criteria for specified phase
2. Inventory required artifacts and check existence
3. Dispatch parallel validators:
   - Architecture Designer (architecture criteria)
   - Test Architect (test coverage criteria)
   - Security Gatekeeper (security criteria)
   - Requirements Analyst (traceability criteria)
4. Aggregate results and calculate gate score
5. Generate gate report with recommendations

**Gate Criteria by Phase**:
| Gate | Key Criteria |
|------|-------------|
| LOM (Inception) | Vision, business case, scope, funding, stakeholder agreement |
| ABM (Elaboration) | Architecture baseline, requirements baseline, risks retired |
| IOC (Construction) | Features complete, tests passing, defects triaged |
| PRM (Transition) | Deployment proven, users trained, support ready |

**Output**: Gate report at `.aiwg/gates/{phase}-gate-report.md`

---

### 1.3 Security Assessment Cycle

**Skill ID**: `security-assessment`
**Priority**: P0 (Critical)
**Triggers**:
- "run security review"
- "security assessment"
- "threat model [component]"
- "validate security controls"

**Purpose**: Execute threat modeling, vulnerability scanning, and control validation.

**Behavior**:
1. Identify assessment scope (component, system, or full)
2. Load existing threat model (if any)
3. Execute STRIDE threat enumeration via Security Architect
4. Run vulnerability scan patterns via Security Auditor
5. Validate controls against requirements via Security Gatekeeper
6. Calculate CVSS scores for identified vulnerabilities
7. Generate security assessment report

**Security Agents Orchestration**:
```
Security Architect (threat model)
    ↓
Security Auditor (vulnerability scan)
    ↓
Security Gatekeeper (control validation)
    ↓
Privacy Officer (if PII involved)
    ↓
Assessment Report
```

**Output**: Security assessment at `.aiwg/security/assessment-{date}.md`

---

### 1.4 Requirements Traceability Validation

**Skill ID**: `traceability-check`
**Priority**: P1 (High)
**Triggers**:
- "check traceability"
- "validate requirements coverage"
- "trace requirements to code"
- "find orphan requirements"

**Purpose**: Verify bidirectional traceability from requirements to code to tests.

**Behavior**:
1. Extract requirement IDs from `.aiwg/requirements/`
2. Scan codebase for requirement references (comments, annotations)
3. Scan test files for requirement coverage
4. Build traceability matrix
5. Identify gaps:
   - Requirements without code
   - Code without requirements
   - Requirements without tests
6. Generate coverage report

**Traceability Matrix Format**:
```
REQ-ID | Code Files | Test Files | Status
-------|------------|------------|--------
UC-001 | auth.ts    | auth.test.ts | COVERED
UC-002 | -          | -           | ORPHAN
```

**Output**: Traceability report at `.aiwg/reports/traceability-{date}.md`

---

### 1.5 Interactive Decision Support

**Skill ID**: `decision-support`
**Priority**: P1 (High)
**Triggers**:
- "help me decide"
- "what should we choose"
- "evaluate options for [topic]"
- "trade-off analysis"

**Purpose**: Guide decision-making with structured analysis and recommendations.

**Behavior**:
1. Gather decision context (what, why, constraints)
2. Generate strategic questions (5-8)
3. Present options with pros/cons
4. Invoke Decision Matrix Expert for weighted scoring
5. Generate recommendation with rationale
6. Record decision in ADR format (optional)

**Decision Categories**:
- Architecture choices (patterns, technologies)
- Risk mitigation strategies
- Resource allocation
- Scope trade-offs
- Compliance approaches

**Output**: Decision record at `.aiwg/decisions/decision-{topic}-{date}.md`

---

### 1.6 Incident Triage Workflow

**Skill ID**: `incident-triage`
**Priority**: P1 (High)
**Triggers**:
- "production incident"
- "critical issue"
- "triage [incident-id]"
- "outage response"

**Purpose**: Structure incident response with severity assessment and resolution tracking.

**Behavior**:
1. Capture incident details (symptoms, impact, timeline)
2. Assess severity (P0-P4) based on impact matrix
3. Assign ownership and notify stakeholders
4. Dispatch Incident Responder for triage
5. Coordinate with DevOps Engineer for resolution
6. Track resolution progress
7. Generate post-mortem template

**Severity Matrix**:
| Severity | Impact | Response Time |
|----------|--------|---------------|
| P0 | System down, data loss | Immediate |
| P1 | Major feature broken | < 1 hour |
| P2 | Feature degraded | < 4 hours |
| P3 | Minor issue | Next business day |

**Output**: Incident record at `.aiwg/incidents/INC-{id}.md`

---

### 1.7 Test Coverage Analysis

**Skill ID**: `test-coverage`
**Priority**: P2 (Medium)
**Triggers**:
- "analyze test coverage"
- "coverage report"
- "what needs more tests"
- "test gaps"

**Purpose**: Analyze test coverage and identify gaps based on risk profile.

**Behavior**:
1. Run coverage tools (if available)
2. Parse coverage reports
3. Map coverage to requirements
4. Identify high-risk uncovered areas
5. Prioritize test recommendations
6. Generate coverage improvement plan

**Coverage Categories**:
- Unit test coverage (line/branch)
- Integration test coverage (API endpoints)
- E2E test coverage (user journeys)
- Security test coverage (OWASP)

**Output**: Coverage report at `.aiwg/testing/coverage-analysis-{date}.md`

---

### 1.8 Architecture Evolution Analysis

**Skill ID**: `architecture-evolution`
**Priority**: P2 (Medium)
**Triggers**:
- "architecture change"
- "evaluate migration"
- "breaking change analysis"
- "evolution impact"

**Purpose**: Analyze impact of proposed architecture changes.

**Behavior**:
1. Load current architecture baseline (SAD)
2. Parse proposed changes
3. Identify affected components
4. Assess breaking changes
5. Estimate migration effort
6. Generate ADR for significant changes
7. Update architecture documentation

**Impact Assessment Dimensions**:
- Breaking changes (API, data, behavior)
- Migration complexity
- Team capacity requirements
- Risk introduction
- Dependency impacts

**Output**: Evolution analysis at `.aiwg/architecture/evolution-{topic}-{date}.md`

---

### 1.9 Risk Management Cycle

**Skill ID**: `risk-cycle`
**Priority**: P2 (Medium)
**Triggers**:
- "update risks"
- "risk review"
- "new risk identified"
- "retire risk [id]"

**Purpose**: Manage risk identification, assessment, and retirement.

**Behavior**:
1. Load current risk register
2. For new risks: capture, assess likelihood × impact
3. For existing risks: update status, mitigation progress
4. Identify risks ready for retirement
5. Escalate high-severity risks
6. Generate risk report

**Risk Lifecycle**:
```
Identified → Assessed → Mitigating → Retired
                ↓
            Escalated (if severity increases)
```

**Output**: Updated risk register at `.aiwg/risks/risk-register.md`

---

### 1.10 Report Generation

**Skill ID**: `sdlc-reports`
**Priority**: P3 (Low)
**Triggers**:
- "generate status report"
- "project health check"
- "iteration summary"
- "metrics report"

**Purpose**: Generate standardized SDLC reports from project state.

**Behavior**:
1. Collect metrics from artifacts
2. Calculate health indicators
3. Summarize iteration progress
4. Format report from template
5. Archive report

**Report Types**:
- Project status (phase, milestones, blockers)
- Health check (DORA metrics, quality indicators)
- Iteration summary (velocity, burndown, defects)
- Gate readiness (criteria checklist)

**Output**: Reports at `.aiwg/reports/{report-type}-{date}.md`

---

## Part 2: MMK Framework Skills

### Location: `agentic/code/frameworks/media-marketing-kit/skills/`

### 2.1 Brand Compliance Validation

**Skill ID**: `brand-compliance`
**Priority**: P0 (Critical)
**Triggers**:
- "brand review"
- "check brand compliance"
- "validate against brand guidelines"
- "brand audit"

**Purpose**: Unified brand compliance validation across visual, verbal, and legal dimensions.

**Behavior**:
1. Load brand guidelines (voice, visual identity, messaging)
2. Analyze asset against guidelines:
   - Visual identity (colors, logos, typography)
   - Verbal identity (tone, voice, terminology)
   - Claims validation (substantiation, disclosures)
3. Run accessibility check (WCAG 2.1 AA)
4. Generate compliance report with issues

**Validation Agents**:
```
Brand Guardian (visual) ─┐
Brand Guardian (verbal) ─┼→ Compliance Report
Legal Reviewer ──────────┤
Accessibility Checker ───┘
```

**Output**: Compliance report at `.aiwg/marketing/reviews/brand-{asset}-{date}.md`

---

### 2.2 Quality Assurance Protocol

**Skill ID**: `qa-protocol`
**Priority**: P0 (Critical)
**Triggers**:
- "QA check"
- "quality review"
- "pre-publish check"
- "validate asset"

**Purpose**: Standardized QA workflow with universal checklist library.

**Behavior**:
1. Identify asset type (email, social, video, print)
2. Load appropriate checklist
3. Run automated checks (links, rendering, specs)
4. Dispatch Quality Controller for manual review
5. Classify issues by severity
6. Generate QA report

**Checklist Categories**:
- Email: links, rendering, personalization, unsubscribe
- Social: image specs, character limits, hashtags
- Video: duration, captions, aspect ratio
- Print: bleed, resolution, color mode

**Output**: QA report at `.aiwg/marketing/qa/{asset}-qa-{date}.md`

---

### 2.3 Multi-Agent Review Synthesis

**Skill ID**: `review-synthesis`
**Priority**: P0 (Critical)
**Triggers**:
- "synthesize reviews"
- "merge feedback"
- "consolidate review comments"

**Purpose**: Automate parallel review collection and conflict resolution.

**Behavior**:
1. Launch parallel reviewers (configurable list)
2. Collect reviews with timeout
3. Identify conflicts and agreements
4. Invoke synthesizer for conflict resolution
5. Generate consolidated feedback
6. Create revision checklist

**Conflict Resolution Strategy**:
- Brand issues: Brand Guardian has final say
- Legal issues: Legal Reviewer has final say
- Creative differences: Creative Director arbitrates
- Technical specs: Quality Controller has final say

**Output**: Synthesized review at `.aiwg/marketing/reviews/synthesis-{asset}-{date}.md`

---

### 2.4 Content Approval Workflow

**Skill ID**: `approval-workflow`
**Priority**: P1 (High)
**Triggers**:
- "submit for approval"
- "approval status"
- "route for sign-off"
- "escalate approval"

**Purpose**: Track approvals with status, escalation, and revision management.

**Behavior**:
1. Identify required approvers (based on asset type)
2. Route asset to approvers
3. Track approval status
4. Handle revision requests
5. Escalate stalled approvals
6. Generate approval certificate

**Approval Chains**:
| Asset Type | Approvers |
|------------|-----------|
| External content | Brand Guardian → Legal → Stakeholder |
| Internal content | Editor → Manager |
| Paid media | Legal → Finance → Manager |

**Output**: Approval record at `.aiwg/marketing/approvals/{asset}-approval.md`

---

### 2.5 Data Pipeline Orchestration

**Skill ID**: `data-pipeline`
**Priority**: P1 (High)
**Triggers**:
- "collect campaign data"
- "run analytics pipeline"
- "data refresh"
- "performance data update"

**Purpose**: Reusable ETL patterns for marketing analytics.

**Behavior**:
1. Identify data sources (platform APIs, exports)
2. Execute collection scripts
3. Validate and clean data
4. Transform to standard schema
5. Load to analysis workspace
6. Trigger dependent reports

**Data Sources**:
- Social platforms (engagement, reach)
- Email platforms (opens, clicks, conversions)
- Web analytics (traffic, behavior)
- Ad platforms (impressions, spend, conversions)

**Output**: Processed data at `.aiwg/marketing/data/{campaign}-{date}/`

---

### 2.6 Audience Research Synthesis

**Skill ID**: `audience-synthesis`
**Priority**: P2 (Medium)
**Triggers**:
- "audience research"
- "build personas"
- "segment analysis"
- "audience insights"

**Purpose**: Consolidate market research, persona development, and segmentation.

**Behavior**:
1. Gather research inputs (surveys, analytics, interviews)
2. Dispatch Market Researcher for analysis
3. Develop persona profiles
4. Identify segments and characteristics
5. Generate audience brief

**Persona Components**:
- Demographics
- Psychographics
- Pain points
- Goals and motivations
- Content preferences
- Channel preferences

**Output**: Audience brief at `.aiwg/marketing/research/audience-{date}.md`

---

### 2.7 Competitive Intelligence Briefing

**Skill ID**: `competitive-intel`
**Priority**: P2 (Medium)
**Triggers**:
- "competitive analysis"
- "competitor update"
- "market positioning check"
- "competitive landscape"

**Purpose**: Automate competitive analysis and positioning insights.

**Behavior**:
1. Identify competitors (from config or input)
2. Gather competitive data (web, social, news)
3. Analyze positioning and messaging
4. Compare feature/benefit claims
5. Identify differentiation opportunities
6. Generate competitive brief

**Analysis Dimensions**:
- Messaging and positioning
- Product/feature comparison
- Pricing and packaging
- Channel presence
- Content strategy

**Output**: Competitive brief at `.aiwg/marketing/research/competitive-{date}.md`

---

### 2.8 Campaign Performance Digest

**Skill ID**: `performance-digest`
**Priority**: P2 (Medium)
**Triggers**:
- "campaign report"
- "performance summary"
- "weekly digest"
- "campaign metrics"

**Purpose**: Generate standardized performance reports with insights.

**Behavior**:
1. Collect performance data via data-pipeline skill
2. Calculate KPIs vs targets
3. Identify trends and anomalies
4. Generate insights via Marketing Analyst
5. Create recommendations
6. Format report from template

**Report Sections**:
- Executive summary
- KPI dashboard
- Channel breakdown
- Top performers
- Underperformers
- Recommendations
- Next period outlook

**Output**: Performance report at `.aiwg/marketing/reports/performance-{campaign}-{date}.md`

---

## Part 3: General Utility Skills (aiwg-utils)

### Location: `agentic/code/addons/aiwg-utils/skills/`

### 3.1 Project Context Detection

**Skill ID**: `project-awareness`
**Priority**: P0 (Exists - Enhance)
**Status**: Enhancement of existing skill from PR #51

**Current State**: Basic project structure detection
**Enhancement**: Add framework-specific context, team detection, history awareness

**Enhanced Behavior**:
1. Detect project type (monorepo, library, app, service)
2. Identify installed frameworks (SDLC, MMK, addons)
3. Parse team configuration (if present)
4. Load recent activity (git log, artifact changes)
5. Build rich project context object

**New Capabilities**:
- Framework state awareness (phase, iteration)
- Team roster detection
- Recent artifact summary
- Active work detection (branches, PRs)

---

### 3.2 Parallel Agent Dispatcher

**Skill ID**: `parallel-dispatch`
**Priority**: P0 (Critical - New)
**Triggers**:
- "launch parallel [agents]"
- "concurrent review by [agents]"
- "multi-agent [task]"

**Purpose**: Generic parallel agent orchestration utility.

**Behavior**:
1. Parse agent list and common task
2. Prepare agent-specific prompts
3. Launch agents in parallel (single message, multiple Task calls)
4. Collect results with timeout
5. Return structured results

**Configuration**:
```yaml
agents:
  - name: security-architect
    prompt_template: "Review {artifact} for security concerns"
  - name: test-architect
    prompt_template: "Review {artifact} for testability"
timeout: 300  # seconds
result_format: structured  # or raw
```

**Output**: Structured results object with per-agent responses

---

### 3.3 Artifact Metadata Manager

**Skill ID**: `artifact-metadata`
**Priority**: P1 (High - New)
**Triggers**:
- "update artifact metadata"
- "track artifact version"
- "artifact history"
- "who owns [artifact]"

**Purpose**: Manage artifact metadata, versioning, and ownership.

**Behavior**:
1. Load or create metadata.json for artifact
2. Update fields (version, status, owner, reviewers)
3. Track history (changes, reviews, approvals)
4. Generate metadata report
5. Validate against schema

**Metadata Schema**:
```json
{
  "artifact_id": "SAD-001",
  "name": "Software Architecture Document",
  "version": "1.2.0",
  "status": "baselined",
  "owner": "architecture-designer",
  "created": "2025-01-15",
  "modified": "2025-02-20",
  "reviewers": ["security-architect", "test-architect"],
  "history": [...]
}
```

**Output**: Updated metadata at `.aiwg/{category}/{artifact}/metadata.json`

---

### 3.4 Template Instantiation Engine

**Skill ID**: `template-engine`
**Priority**: P1 (High - New)
**Triggers**:
- "create from template [name]"
- "instantiate [template]"
- "new [artifact-type] from template"

**Purpose**: Load, validate, and populate templates consistently.

**Behavior**:
1. Locate template (framework templates, project templates)
2. Parse template structure and placeholders
3. Gather required inputs (from context or prompts)
4. Populate template sections
5. Validate structure
6. Save instantiated artifact

**Template Discovery Order**:
1. `.aiwg/templates/` (project-specific)
2. Framework templates (sdlc-complete/templates/, media-marketing-kit/templates/)
3. AIWG installation templates

**Output**: Instantiated artifact at configured location

---

### 3.5 Configuration Validator

**Skill ID**: `config-validator`
**Priority**: P2 (Medium - New)
**Triggers**:
- "validate config"
- "check configuration"
- "config health"

**Purpose**: Validate AIWG configuration files and detect issues.

**Behavior**:
1. Scan for config files (manifest.json, settings, etc.)
2. Validate against schemas
3. Check for common issues:
   - Missing required fields
   - Invalid references (agents, commands)
   - Path resolution errors
4. Generate validation report

**Config Files Validated**:
- `manifest.json` (addons, frameworks)
- `.claude/settings.local.json`
- `.aiwg/config/` files
- `CLAUDE.md` structure

**Output**: Validation report with issues and fixes

---

### 3.6 Natural Language Router

**Skill ID**: `nl-router`
**Priority**: P2 (Medium - New)
**Triggers**: (Always active - routes other triggers)

**Purpose**: Route natural language requests to appropriate skills/commands.

**Behavior**:
1. Parse user intent from natural language
2. Match against skill triggers and command patterns
3. Extract parameters from natural language
4. Route to appropriate handler
5. Return routing decision

**Routing Database**:
```yaml
patterns:
  - pattern: "transition to {phase}"
    handler: flow-{phase-transition}
    params: [phase]
  - pattern: "security review"
    handler: security-assessment
  - pattern: "brand check"
    handler: brand-compliance
```

**Integration**: Works with `simple-language-translations.md` patterns

---

## Part 4: Migration & Enhancement Plan

### 4.1 Existing Skills to Enhance

| Skill | Addon | Current State | Enhancement |
|-------|-------|---------------|-------------|
| `project-awareness` | aiwg-utils | Basic detection | Add framework state, team, history |
| `ai-pattern-detection` | writing-quality | Pattern matching | Integrate with voice-framework |

### 4.2 Voice Framework Integration

The voice-framework skills (voice-apply, voice-create, voice-blend, voice-analyze) should integrate with:

**SDLC Integration**:
- Technical documentation voice for SAD, test plans
- Requirements voice for use cases, user stories
- Executive voice for business case, status reports

**MMK Integration**:
- Brand voice application to all marketing content
- Voice consistency validation in brand compliance
- Voice analysis of competitor content

**Recommended Integration Points**:
1. Add `--voice` parameter to documentation-generating commands
2. Include voice profile in brand guidelines
3. Voice consistency check in brand-compliance skill

---

## Part 5: Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
**General Utilities - Critical Infrastructure**

| Skill | Addon | Priority | Effort |
|-------|-------|----------|--------|
| `parallel-dispatch` | aiwg-utils | P0 | 2 days |
| `artifact-metadata` | aiwg-utils | P1 | 2 days |
| `template-engine` | aiwg-utils | P1 | 2 days |
| `project-awareness` enhancement | aiwg-utils | P0 | 1 day |

**Deliverables**: Core infrastructure skills that other skills depend on

### Phase 2: SDLC Core (Week 3-4)
**SDLC Framework - Critical Path**

| Skill | Framework | Priority | Effort |
|-------|-----------|----------|--------|
| `artifact-orchestration` | sdlc-complete | P0 | 3 days |
| `gate-evaluation` | sdlc-complete | P0 | 2 days |
| `security-assessment` | sdlc-complete | P0 | 2 days |
| `traceability-check` | sdlc-complete | P1 | 2 days |

**Deliverables**: Core SDLC skills for artifact generation and validation

### Phase 3: MMK Core (Week 5-6)
**MMK Framework - Critical Path**

| Skill | Framework | Priority | Effort |
|-------|-----------|----------|--------|
| `brand-compliance` | media-marketing-kit | P0 | 2 days |
| `qa-protocol` | media-marketing-kit | P0 | 2 days |
| `review-synthesis` | media-marketing-kit | P0 | 2 days |
| `approval-workflow` | media-marketing-kit | P1 | 2 days |

**Deliverables**: Core MMK skills for brand validation and review

### Phase 4: Extended SDLC (Week 7-8)
**SDLC Framework - High Value**

| Skill | Framework | Priority | Effort |
|-------|-----------|----------|--------|
| `decision-support` | sdlc-complete | P1 | 2 days |
| `incident-triage` | sdlc-complete | P1 | 2 days |
| `test-coverage` | sdlc-complete | P2 | 1 day |
| `architecture-evolution` | sdlc-complete | P2 | 2 days |

### Phase 5: Extended MMK (Week 9-10)
**MMK Framework - High Value**

| Skill | Framework | Priority | Effort |
|-------|-----------|----------|--------|
| `data-pipeline` | media-marketing-kit | P1 | 2 days |
| `audience-synthesis` | media-marketing-kit | P2 | 2 days |
| `competitive-intel` | media-marketing-kit | P2 | 2 days |
| `performance-digest` | media-marketing-kit | P2 | 1 day |

### Phase 6: Utilities & Polish (Week 11-12)
**Final utilities and integration**

| Skill | Addon | Priority | Effort |
|-------|-------|----------|--------|
| `config-validator` | aiwg-utils | P2 | 1 day |
| `nl-router` | aiwg-utils | P2 | 2 days |
| `risk-cycle` | sdlc-complete | P2 | 1 day |
| `sdlc-reports` | sdlc-complete | P3 | 1 day |
| Voice integration points | all | P2 | 2 days |

---

## Part 6: Skill Dependency Graph

```
                    ┌─────────────────────┐
                    │  parallel-dispatch  │ (Foundation)
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│artifact-metadata│  │ template-engine │  │project-awareness│
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                     │                     │
         └──────────┬──────────┴──────────┬──────────┘
                    │                     │
         ┌──────────▼──────────┐         │
         │artifact-orchestration│◄────────┘
         └──────────┬──────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
    ▼               ▼               ▼
┌────────┐   ┌───────────┐   ┌───────────────┐
│gate-   │   │security-  │   │traceability-  │
│evaluation│  │assessment │   │check          │
└────────┘   └───────────┘   └───────────────┘

MMK Branch:
         ┌─────────────────┐
         │ parallel-dispatch│
         └────────┬────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌────────┐  ┌──────────┐  ┌──────────┐
│brand-  │  │qa-       │  │review-   │
│compliance│ │protocol  │  │synthesis │
└────────┘  └──────────┘  └────┬─────┘
                               │
                               ▼
                        ┌──────────────┐
                        │approval-     │
                        │workflow      │
                        └──────────────┘
```

---

## Part 7: File Structure After Implementation

```
agentic/code/
├── addons/
│   ├── aiwg-utils/
│   │   ├── skills/
│   │   │   ├── project-awareness/     # Enhanced
│   │   │   ├── parallel-dispatch/     # NEW
│   │   │   ├── artifact-metadata/     # NEW
│   │   │   ├── template-engine/       # NEW
│   │   │   ├── config-validator/      # NEW
│   │   │   └── nl-router/             # NEW
│   │   └── manifest.json              # Updated
│   │
│   ├── voice-framework/               # Already implemented
│   │   └── skills/
│   │       ├── voice-apply/
│   │       ├── voice-create/
│   │       ├── voice-blend/
│   │       └── voice-analyze/
│   │
│   └── writing-quality/
│       └── skills/
│           └── ai-pattern-detection/  # Existing
│
├── frameworks/
│   ├── sdlc-complete/
│   │   ├── skills/                    # NEW DIRECTORY
│   │   │   ├── artifact-orchestration/
│   │   │   ├── gate-evaluation/
│   │   │   ├── security-assessment/
│   │   │   ├── traceability-check/
│   │   │   ├── decision-support/
│   │   │   ├── incident-triage/
│   │   │   ├── test-coverage/
│   │   │   ├── architecture-evolution/
│   │   │   ├── risk-cycle/
│   │   │   └── sdlc-reports/
│   │   └── manifest.json              # Updated
│   │
│   └── media-marketing-kit/
│       ├── skills/                    # NEW DIRECTORY
│       │   ├── brand-compliance/
│       │   ├── qa-protocol/
│       │   ├── review-synthesis/
│       │   ├── approval-workflow/
│       │   ├── data-pipeline/
│       │   ├── audience-synthesis/
│       │   ├── competitive-intel/
│       │   └── performance-digest/
│       └── manifest.json              # Updated
```

---

## Part 8: Success Metrics

### Skill Adoption Metrics
- Skills invoked per session
- Time saved vs manual orchestration
- Error rate reduction

### Quality Metrics
- Artifact consistency score
- Review cycle time
- Gate pass rate

### Coverage Metrics
- % of workflows with skill support
- Cross-cutting concern coverage
- Natural language trigger coverage

---

## Appendix A: Skill Template

Each skill should follow this structure:

```
skills/{skill-id}/
├── SKILL.md           # Triggers, behavior, examples
├── scripts/           # Supporting scripts (Python, JS)
│   └── {skill}.py
├── templates/         # Skill-specific templates (optional)
├── config/            # Default configuration (optional)
│   └── defaults.yaml
└── tests/             # Skill tests (optional)
    └── {skill}.test.ts
```

---

## Appendix B: Integration Points with Voice Framework

| Skill | Voice Integration |
|-------|-------------------|
| artifact-orchestration | Apply document-type voice to generated artifacts |
| brand-compliance | Validate voice consistency against brand voice profile |
| decision-support | Use executive voice for recommendation summaries |
| performance-digest | Apply report voice profile |
| audience-synthesis | Extract voice preferences by segment |

---

## Next Steps

1. Review and approve this plan
2. Create skills directories in frameworks
3. Implement Phase 1 (Foundation) skills
4. Update manifest.json files
5. Create PR with Phase 1 deliverables
6. Continue with subsequent phases

---

*Document generated by AIWG Planning System*
