# Architecture Sketch - AI Writing Guide Framework

## Document Status
- **Type**: Architecture Sketch (Initial Design)
- **Version**: v0.1
- **Date**: 2025-10-17
- **Author**: Architecture Designer
- **Phase**: Inception
- **Purpose**: High-level architecture for stakeholder alignment before detailed SAD

## Executive Summary

The AI Writing Guide is a **zero-server, client-only documentation framework** with dual purposes: writing quality validation and comprehensive SDLC lifecycle management. The architecture employs a **modular, multi-layer design** supporting deployment modes from solo developers to enterprise teams, with all processing happening locally on user machines.

**Key Architecture Characteristics**:
- **61 total agents** (58 SDLC + 3 writing)
- **156 templates** for structured artifacts
- **45 slash commands** for workflow orchestration
- **Zero data collection** (privacy-by-design)
- **Multi-platform support** (Claude Code primary, OpenAI/Codex secondary)

## High-Level Architecture

### System Context Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SYSTEMS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────────┐    │
│  │    GitHub    │  │  Claude     │  │    OpenAI/Codex    │    │
│  │  Repository  │  │    Code     │  │    Platforms       │    │
│  └──────┬───────┘  └──────┬──────┘  └─────────┬──────────┘    │
│         │                  │                    │               │
└─────────┼──────────────────┼────────────────────┼───────────────┘
          │                  │                    │
          ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│              AI WRITING GUIDE FRAMEWORK                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    CONTENT LAYER                         │   │
│  │  485+ Markdown Files | 61 Agents | 156 Templates        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    TOOLING LAYER                         │   │
│  │  22 Node.js Scripts | Deployment | Validation | CLI      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 DISTRIBUTION LAYER                       │   │
│  │  Bash Installer | aiwg CLI | Modular Deployment         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    USER WORKSPACE                                │
├─────────────────────────────────────────────────────────────────┤
│  .claude/agents/     (deployed agents)                           │
│  .claude/commands/   (deployed commands)                         │
│  .aiwg/              (SDLC artifacts)                           │
│  CLAUDE.md           (orchestration instructions)               │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Content Layer (485+ files)

**Writing Quality Framework**:
```text
├── core/                 # Philosophy & principles (3 docs)
├── validation/           # Banned patterns & detection (3 docs)
├── examples/            # Before/after rewrites (3 docs)
├── context/             # Quick-reference guides (5 docs)
├── patterns/            # Common AI tells (1 doc)
└── agents/              # Writing agents (3 agents)
```

**SDLC Complete Framework**:
```text
agentic/code/frameworks/sdlc-complete/
├── agents/              # 58 specialized SDLC agents
├── commands/            # 45 slash commands
├── templates/           # 156 artifact templates
├── flows/               # Phase-based workflows
├── add-ons/            # GDPR, legal frameworks
└── metrics/            # Health indicators
```

**Key Design Decisions**:
- **Markdown-first**: LLMs consume documentation naturally
- **Modular structure**: Load only needed subsets
- **Context-optimized**: Documents sized for LLM windows

### 2. Tooling Layer (22 Node.js scripts)

**Core Tools**:
```javascript
// Deployment automation
deploy-agents.mjs       // Deploy agents to projects
new-project.mjs        // Scaffold new SDLC projects
setup-project.mjs      // Update existing projects

// Content validation
fix-md*.mjs            // 10 markdown linters
generate-manifest.mjs  // Track documentation
sync-manifests.mjs     // Validate consistency

// Team management
prefill-cards.mjs      // Auto-populate metadata
```

**Technology Stack**:
- Node.js >=18.20.8 (ESM modules)
- No external dependencies (lightweight)
- File-based operations only

### 3. Distribution Layer

**Installation Flow**:
```bash
# One-line install
curl -fsSL https://...install.sh | bash

# Creates structure
~/.local/share/ai-writing-guide/  # Framework files
~/.local/bin/aiwg                 # CLI command

# CLI operations
aiwg -deploy-agents [--mode general|sdlc|both]
aiwg -new [--no-agents]
aiwg -update
aiwg -version
```

**Deployment Modes**:
- **General**: 3 writing agents only
- **SDLC**: 58 SDLC agents + 45 commands
- **Both**: Complete framework (61 agents)

### 4. User Workspace (.aiwg/)

**Artifact Organization**:
```text
.aiwg/
├── intake/           # Project intake forms
├── requirements/     # User stories, use cases
├── architecture/     # SAD, ADRs, diagrams
├── testing/         # Test plans, results
├── security/        # Threat models, audits
├── deployment/      # Runbooks, configs
└── working/         # Temporary drafts
```

**Design Rationale**:
- Separates user code from process artifacts
- Single .gitignore entry for privacy
- Consistent paths for tooling

## Integration Architecture

### LLM Platform Integration

**Multi-Provider Pattern**:
```text
┌──────────────┐     ┌──────────────┐
│ Claude Code  │     │ OpenAI/Codex │
└──────┬───────┘     └──────┬───────┘
       │                     │
       ▼                     ▼
┌─────────────────────────────────────┐
│     Agent Deployment Layer          │
├─────────────────────────────────────┤
│ • Platform detection                │
│ • Format conversion                 │
│ • Path mapping                      │
└─────────────────────────────────────┘
       │                     │
       ▼                     ▼
.claude/agents/        .codex/agents/
                    OR  AGENTS.md
```

### Multi-Agent Orchestration Pattern

**Collaborative Review Architecture**:
```text
┌────────────────┐
│ Primary Author │ (e.g., architecture-designer)
└───────┬────────┘
        │ Creates initial draft
        ▼
┌────────────────────────────────────────────┐
│         Parallel Review Phase              │
├────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ │Security  │ │Test      │ │Technical │   │
│ │Architect │ │Architect │ │Writer    │   │
│ └────┬─────┘ └────┬─────┘ └────┬─────┘   │
│      │            │            │          │
│      ▼            ▼            ▼          │
│   Reviews     Reviews      Reviews        │
└──────────────┬─────────────────────────────┘
               │
               ▼
        ┌──────────────┐
        │ Synthesizer  │ (merges feedback)
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │   Archive    │ (.aiwg/baselined)
        └──────────────┘
```

### CI/CD Integration

**GitHub Actions Pipeline**:
```yaml
on: [push, pull_request]
jobs:
  validate:
    - markdown-lint    # 10 custom fixers
    - manifest-sync    # Documentation tracking
    - drift-check      # Prevent regression
```

## Deployment Architecture

### Zero-Server Model

**All Processing Local**:
```text
User Machine
├── Framework Installation (~50MB)
│   └── ~/.local/share/ai-writing-guide/
├── Project Workspace
│   ├── .claude/agents/    (deployed)
│   ├── .aiwg/            (artifacts)
│   └── [user code]
└── Runtime Requirements
    ├── Node.js >=18.20.8
    ├── Bash shell
    └── Git
```

**Privacy Guarantees**:
- No network calls (except GitHub for updates)
- No telemetry or analytics
- No user data collection
- All artifacts stay local

## Scalability Architecture

### Horizontal Scaling Strategy

**Modular Loading**:
```text
Solo Developer    → Load: Writing agents only (3)
Small Team       → Load: Core SDLC subset (20 agents)
Enterprise       → Load: Full framework (61 agents)
```

**Context Optimization**:
```text
Full Docs (485 files) → Context-Optimized → Quick Refs (5-10 files)
                           │
                           ▼
                     Selective Loading
                     Based on Use Case
```

### Performance Targets

| Operation | Target | Current | At Scale (100 users) |
|-----------|--------|---------|----------------------|
| Install | <60s | ✓ 30s | Same (local) |
| Deploy Agents | <10s | ✓ 5s | Same (local) |
| Lint Repository | <30s | ✓ 15s | Same (local) |
| Generate Artifact | <5min | ✓ 2-3min | Monitor LLM latency |

## Security Architecture

### Threat Model

**Attack Surface**: Minimal (documentation framework)

```text
Threats:
├── Malicious PR injection → Mitigation: PR review
├── Dependency poisoning → Mitigation: No deps
└── LLM prompt injection → Mitigation: User responsibility
```

### Data Classification

| Data Type | Classification | Protection |
|-----------|---------------|------------|
| Framework docs | Public | MIT license |
| User artifacts | User-controlled | Local storage |
| Credentials | None handled | N/A |
| PII | None collected | Privacy-by-design |

## Key Architectural Decisions

### ADR-001: Markdown-First Architecture
**Status**: ACCEPTED
**Context**: Need format consumable by both humans and LLMs
**Decision**: Use markdown for all documentation and templates
**Consequences**:
- ✓ Natural LLM consumption
- ✓ Version control friendly
- ✗ Less interactive than web UI

### ADR-002: Zero-Server Design
**Status**: ACCEPTED
**Context**: Privacy concerns, maintenance burden
**Decision**: All processing happens locally
**Consequences**:
- ✓ Complete privacy
- ✓ No hosting costs
- ✗ No collaborative features

### ADR-003: Multi-Agent Orchestration
**Status**: ACCEPTED
**Context**: Need comprehensive artifact review
**Decision**: Primary Author → Parallel Reviewers → Synthesizer pattern
**Consequences**:
- ✓ Higher quality artifacts
- ✓ Multiple perspectives
- ✗ Slower generation time

### ADR-004: Modular Deployment
**Status**: ACCEPTED
**Context**: Different users need different subsets
**Decision**: Support general/SDLC/both deployment modes
**Consequences**:
- ✓ Avoid context overflow
- ✓ Faster deployment
- ✗ Mode selection complexity

### ADR-005: Template-Based Generation
**Status**: ACCEPTED
**Context**: Need structured artifacts vs chat logs
**Decision**: 156 pre-defined templates guide generation
**Consequences**:
- ✓ Consistent artifacts
- ✓ Compliance-ready
- ✗ Less flexibility

## Quality Attributes

### Modularity (PRIMARY)
- **Tactic**: Deployment modes (general/SDLC/both)
- **Measure**: Users load only needed subset
- **Target**: <10% unwanted content loaded

### Privacy (PRIMARY)
- **Tactic**: Zero data collection
- **Measure**: No network calls except GitHub
- **Target**: 100% local processing

### Extensibility
- **Tactic**: Markdown templates, simple scripts
- **Measure**: New agent/template addition time
- **Target**: <30 minutes to add new component

### Maintainability
- **Tactic**: Clear layer separation
- **Measure**: Solo developer support time
- **Target**: <10 hours/week at 100 users

### Performance
- **Tactic**: Context optimization, modular loading
- **Measure**: Tool execution time
- **Target**: <5s for operations, <10s for deployment

## Risk Mitigations

| Risk | Architectural Mitigation |
|------|-------------------------|
| **Solo developer burnout** | Automation (CI/CD), self-service docs |
| **Support overwhelm** | Modular deployment reduces issues |
| **Context overflow** | Context-optimized documents |
| **Platform changes** | Multi-provider abstraction layer |
| **Scale issues** | Local processing (no server bottleneck) |

## Implementation Roadmap

### Phase 1: Current (Inception)
- ✓ Core framework structure
- ✓ Basic deployment tools
- ✓ 61 agents, 156 templates
- → Architecture sketch (THIS DOCUMENT)

### Phase 2: Elaboration (Next 4-6 weeks)
- Detailed SAD with component specifications
- Performance baselines
- Security assessment
- Test strategy

### Phase 3: Construction (2-3 months)
- User testing feedback incorporation
- Community infrastructure
- Advanced tooling (if needed)

### Phase 4: Transition (3-6 months)
- Public launch
- Contributor onboarding
- Support infrastructure

## Summary

**Component Count**:
- 4 major layers (Content, Tooling, Distribution, User Workspace)
- 61 agents (58 SDLC + 3 writing)
- 156 templates
- 22 tooling scripts
- 45 slash commands

**Key Integration Points**:
- GitHub (repository, CI/CD, issues)
- Claude Code (primary LLM platform)
- OpenAI/Codex (secondary platform)
- Node.js runtime (tooling)
- Git (version control)

**Deployment Model**:
- **Zero-server**: All local processing
- **Zero-data**: No collection or telemetry
- **Modular**: Deploy only needed subsets
- **Multi-platform**: Claude primary, OpenAI secondary

This architecture sketch provides the foundation for detailed design while maintaining flexibility for user feedback and iteration during the ship-now development approach.