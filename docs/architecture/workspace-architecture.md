# Framework-Scoped Workspace Architecture

AIWG supports multiple concurrent frameworks (SDLC, Marketing, Legal, etc.) with automatic routing and complete isolation.

## The Problem

Traditional process frameworks force you to choose ONE methodology. SDLC for development, Marketing for launches, Legal for compliance - you can't mix them.

## The Solution

Framework-scoped workspace management lets you run multiple frameworks simultaneously with zero manual configuration.

```bash
# No framework selection needed - routes automatically based on context
"Transition to Elaboration"        → SDLC framework
"Draft launch announcement"         → Marketing framework
"Review contract compliance"        → Legal framework
"Where are we in the project?"     → Active framework
```

## 4-Tier Workspace Architecture

Each framework gets its own isolated workspace:

```
.aiwg/
├── frameworks/
│   ├── sdlc-complete/
│   │   ├── repo/              → Tier 1: Framework templates, shared docs
│   │   ├── projects/          → Tier 2: Active project artifacts
│   │   │   ├── plugin-system/
│   │   │   └── marketing-site/
│   │   ├── working/           → Tier 3: Temporary multi-agent work
│   │   └── archive/           → Tier 4: Completed projects (by month)
│   ├── marketing-flow/
│   │   ├── repo/
│   │   ├── campaigns/         → Marketing uses "campaigns" not "projects"
│   │   ├── working/
│   │   └── archive/
│   └── legal-review/
│       ├── repo/
│       ├── matters/           → Legal uses "matters" not "projects"
│       ├── working/
│       └── archive/
└── shared/                    → Cross-framework resources
```

## Key Features

### 1. Automatic Framework Detection

Commands and agents include metadata that automatically routes work:

```yaml
---
framework: sdlc-complete
output-path: frameworks/sdlc-complete/projects/{project-id}/
---
```

No manual selection. No configuration files. Just works.

### 2. Complete Isolation

Each framework writes only to its own workspace:

- ✅ SDLC artifacts → `.aiwg/frameworks/sdlc-complete/`
- ✅ Marketing artifacts → `.aiwg/frameworks/marketing-flow/`
- ✅ Legal artifacts → `.aiwg/frameworks/legal-review/`

### 3. Cross-Framework Reads

While writes are isolated, **reads are unrestricted**. This enables novel combinations:

- **Marketing reads SDLC use cases** → generates user-facing feature docs
- **SDLC security reads Marketing personas** → tailors threat models to target audience
- **Legal reads SDLC architecture** → identifies compliance risks in system design

### 4. Plugin Health Monitoring

```bash
aiwg -status

FRAMEWORKS (2 installed)
┌────────────────┬─────────┬──────────────┬──────────┬─────────────────┐
│ ID             │ Version │ Installed    │ Projects │ Health          │
├────────────────┼─────────┼──────────────┼──────────┼─────────────────┤
│ sdlc-complete  │ 1.0.0   │ 2025-10-18   │ 2        │ ✓ HEALTHY       │
│ marketing-flow │ 1.0.0   │ 2025-10-19   │ 1        │ ✓ HEALTHY       │
└────────────────┴─────────┴──────────────┴──────────┴─────────────────┘
```

## Use Cases

### Solo Developer Running Multiple Frameworks

```bash
# Morning: Technical work
"Create Software Architecture Document"    → SDLC framework
"Run security review"                      → SDLC framework

# Afternoon: Marketing work
"Draft launch announcement"                → Marketing framework
"Create content calendar"                  → Marketing framework

# All artifacts organized automatically
```

### Team Coordination Across Disciplines

```bash
# Dev team creates feature spec
.aiwg/frameworks/sdlc-complete/projects/v2-release/requirements/feature-spec.md

# Marketing team reads spec and generates launch content
"Read SDLC feature spec and draft launch announcement"
→ Marketing framework reads from SDLC (cross-framework read)
→ Writes to marketing-flow workspace (isolated write)
```

### Compliance Add-ons

```bash
aiwg -install-addon gdpr-compliance

# GDPR templates now available in SDLC workflows
"Run GDPR compliance validation"
→ Uses GDPR add-on templates
→ Writes to SDLC workspace
→ Health monitoring includes GDPR add-on
```

## Further Reading

- [Workspace Tools](../../tools/workspace/README.md) — Component documentation
- [Migration Guide](../../tools/workspace/MIGRATION_GUIDE.md) — Legacy to framework-scoped migration
- [Plugin Health](../CLI_USAGE.md#status-command) — `aiwg -status` usage
