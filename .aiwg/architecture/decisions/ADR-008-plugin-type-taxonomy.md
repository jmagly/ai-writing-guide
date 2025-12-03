# ADR-008: Plugin Type Taxonomy (Frameworks, Addons, Extensions)

**Status**: Proposed
**Date**: 2025-12-03
**Deciders**: Architecture Designer, Project Owner
**Context**: AIWG Modular Architecture Clarification

---

## Context and Problem Statement

AIWG has grown from a single-purpose writing guide into a multi-module toolkit containing:
- SDLC Complete (53 agents, 48 commands, 156 templates)
- Media/Marketing Kit (37 agents, 23 commands, 88 templates)
- Writing Quality utilities (3 agents, 505 patterns)
- Framework-specific compliance modules (GDPR, FTC)

The current terminology conflates "frameworks," "plugins," and "add-ons" without clear definitions. Users and developers need a consistent taxonomy to understand:
1. What type of module they're installing/using
2. How modules interact with each other
3. What dependencies exist between module types

ADR-007 introduced framework-scoped workspaces but didn't define the type hierarchy. This ADR establishes the formal taxonomy.

## Decision Drivers

- **Clarity**: Users must understand what they're installing
- **Composability**: Modules should combine predictably
- **Independence**: Some modules work standalone, others require a parent
- **Discoverability**: Clear categories aid documentation and CLI help
- **Extensibility**: New modules should fit clearly into one category

## Decision

We adopt a **three-tier plugin taxonomy**:

### Tier 1: Frameworks (Complete Lifecycle Solutions)

**Definition**: A framework is a comprehensive, self-contained system that manages an entire lifecycle or process domain.

**Characteristics**:
- Has its own workspace scope (`.aiwg/frameworks/{framework-id}/`)
- Contains agents, commands, templates, and flows
- Defines its own phases, gates, and artifacts
- Can exist independently (no parent required)
- Supports extensions (framework-specific modules)

**Examples**:
- `sdlc-complete` - Software development lifecycle (Inception → Transition)
- `media-marketing-kit` - Marketing campaign lifecycle (Strategy → Analysis)
- Future: `business-process`, `research-synthesis`, `decision-making`

**Installation**:
```bash
aiwg -deploy-agents --mode sdlc           # Deploy SDLC framework
aiwg -deploy-agents --mode marketing      # Deploy MMK framework
aiwg -deploy-agents --mode all            # Deploy all frameworks
```

**Directory Structure**:
```
agentic/code/frameworks/
├── sdlc-complete/
│   ├── agents/
│   ├── commands/
│   ├── templates/
│   ├── flows/
│   └── extensions/       # Framework-specific extensions
└── media-marketing-kit/
    ├── agents/
    ├── commands/
    ├── templates/
    └── extensions/
```

### Tier 2: Addons (Standalone Utilities)

**Definition**: An addon is a self-contained utility that works independently or enhances any framework.

**Characteristics**:
- Framework-agnostic (works with SDLC, MMK, or standalone)
- Does NOT require a framework to function
- Provides specific, focused functionality
- Has minimal or no dependencies
- Deployed separately from frameworks

**Examples**:
- `writing-quality` - AI pattern detection and content improvement
- Future: `code-metrics`, `security-scanner`, `documentation-lint`

**Installation**:
```bash
aiwg -deploy-agents --mode writing        # Deploy writing addon only
aiwg -deploy-agents --mode general        # Alias for writing addon
```

**Directory Structure**:
```
agentic/code/addons/
└── writing-quality/
    ├── agents/           # writing-validator, prompt-optimizer, content-diversifier
    ├── core/             # Philosophy and principles
    ├── validation/       # 505 banned patterns
    ├── examples/         # Before/after rewrites
    └── context/          # Quick-reference guides
```

### Tier 3: Extensions (Framework-Specific Modules)

**Definition**: An extension is a module that enhances a specific framework with additional capabilities.

**Characteristics**:
- Requires a parent framework to function
- Extends framework with domain-specific rules/templates
- Inherits framework workspace and context
- Deployed alongside or after framework
- Cannot operate standalone

**Examples**:
- `sdlc-complete/gdpr` - GDPR compliance for SDLC
- `sdlc-complete/legal` - Legal review templates for SDLC
- `media-marketing-kit/ftc` - FTC compliance for marketing
- `media-marketing-kit/healthcare` - HIPAA marketing guidelines

**Installation**:
```bash
aiwg -deploy-extension gdpr --framework sdlc          # Deploy GDPR for SDLC
aiwg -deploy-extension ftc --framework marketing      # Deploy FTC for MMK
```

**Directory Structure**:
```
agentic/code/frameworks/sdlc-complete/extensions/
├── gdpr/
│   ├── templates/
│   └── checklists/
└── legal/
    ├── templates/
    └── review-criteria/

agentic/code/frameworks/media-marketing-kit/extensions/
├── ftc/
│   ├── guidelines/
│   └── checklists/
└── healthcare/
    ├── hipaa-templates/
    └── review-criteria/
```

## Type Comparison Matrix

| Attribute | Framework | Addon | Extension |
|-----------|-----------|-------|-----------|
| Standalone | ✅ Yes | ✅ Yes | ❌ No |
| Requires Parent | ❌ No | ❌ No | ✅ Yes |
| Has Workspace | ✅ Yes (scoped) | ❌ No | ✅ Inherits parent |
| Agents | ✅ Many (10-60) | ✅ Few (1-10) | ❌ Usually none |
| Commands | ✅ Many (20-50) | ❌ Usually none | ❌ Usually none |
| Templates | ✅ Many (50-200) | ❌ Usually none | ✅ Some (5-30) |
| Cross-framework | ❌ Isolated | ✅ Works with any | ❌ Parent only |
| Deploy Mode | `--mode {name}` | `--mode writing` | `--extension {name}` |

## Consequences

### Positive

- **Clear mental model**: Users know exactly what they're installing
- **Predictable behavior**: Addons always work, extensions need frameworks
- **Composability**: Mix frameworks + addons freely
- **Documentation clarity**: Each type has distinct docs
- **CLI consistency**: Deployment flags match taxonomy
- **Future-proof**: New modules fit clearly into categories

### Negative

- **Migration required**: Writing Guide content moves from root to `addons/writing-quality/`
- **Tooling updates**: deploy-agents.mjs needs addon support
- **Directory restructure**: Breaking change for existing installations
- **Learning curve**: Users must understand three types vs "plugins"

### Risks

**Risk 1: Migration Breaks Existing Installations** (MEDIUM)
- **Mitigation**: Provide migration command, backward compatibility period
- **Acceptance**: Migration tested before release

**Risk 2: Addon/Extension Confusion** (LOW)
- **Mitigation**: Clear documentation, CLI help text, error messages
- **Acceptance**: User testing confirms clarity

## Implementation Plan

### Phase 1: Documentation (This PR)
1. ✅ Update README.md with taxonomy
2. ✅ Create ADR-008 (this document)
3. Update USAGE_GUIDE.md, CLAUDE.md

### Phase 2: Directory Restructure (Future PR)
1. Create `agentic/code/addons/` directory
2. Move writing content: `core/`, `validation/`, `examples/`, `context/`, `patterns/` → `addons/writing-quality/`
3. Move writing agents: `agents/*.md` → `addons/writing-quality/agents/`
4. Update imports and symlinks

### Phase 3: Tooling Updates (Future PR)
1. Update `deploy-agents.mjs` for `--mode writing`
2. Add `--deploy-extension` flag
3. Update `aiwg` CLI help text
4. Add validation for extension dependencies

### Phase 4: Extension Support (Future)
1. Extract GDPR/Legal from SDLC add-ons to extensions/
2. Create extension manifest format
3. Implement extension dependency checking

## Alternatives Considered

### Alternative 1: Two-Tier (Frameworks + Plugins)
Everything that isn't a framework is a "plugin."

**Rejected because**: Conflates standalone utilities (writing) with framework-dependent modules (GDPR). Users wouldn't know if a "plugin" works without SDLC.

### Alternative 2: Four-Tier (Add Libraries)
Add "Libraries" as shared code between frameworks.

**Rejected because**: Over-engineering. Current use cases don't require shared code libraries. Can add later if needed.

### Alternative 3: Flat Structure (No Taxonomy)
Keep everything in root or single plugins/ directory.

**Rejected because**: Current growth already shows need for organization. 90+ agents, 70+ commands need clear categories.

## References

- **ADR-007**: Framework-Scoped Workspace Architecture (workspace structure)
- **ADR-002**: Plugin Isolation Strategy (security model applies to all types)
- **ADR-001**: Plugin Manifest Format (will need type field)
- **README.md**: User-facing taxonomy documentation

---

**Last Updated**: 2025-12-03
**Author**: Architecture Designer
**Reviewers**: Project Owner (pending)
