# ADR-010: Development Kit Templates in aiwg-utils/templates/devkit/

**Status**: Proposed
**Date**: 2025-12-10
**Deciders**: Architecture Designer, Project Owner
**Context**: AIWG Development Kit Implementation

---

## Context and Problem Statement

The Development Kit requires template files for scaffolding addons, frameworks, extensions, agents, commands, and skills. These templates need a well-defined location that:
- Is discoverable by CLI tools
- Is deployable with the addon
- Doesn't pollute documentation directories

Options considered:
1. **Inline in CLI scripts** (hardcoded strings)
2. **docs/templates/** (documentation location)
3. **agentic/code/addons/aiwg-utils/templates/devkit/** (addon co-located)
4. **Separate templates addon**

## Decision Drivers

- **Deployability**: Templates should deploy with the addon
- **Discoverability**: CLI tools must find templates reliably
- **Maintainability**: Templates should be editable separately from code
- **Consistency**: Follow AIWG directory conventions

## Decision

Store templates in **agentic/code/addons/aiwg-utils/templates/devkit/**.

## Rationale

1. **Co-located with commands**: Templates are used by devkit commands in same addon
2. **Deployable**: Templates directory can be included in addon deployment
3. **Manifest support**: Can reference templates in manifest.json
4. **Discoverable path**: CLI tools use `${AIWG_ROOT}/agentic/code/addons/aiwg-utils/templates/devkit/`
5. **Not documentation**: Templates are addon content, not docs

## Consequences

### Positive

- Templates travel with addon during deployment
- Single source of truth for scaffolding templates
- CLI and in-session commands share same templates
- Easy to version templates with addon

### Negative

- Need to update deploy-agents.mjs to handle templates directory
- Templates directory adds to addon size
- Must coordinate template and addon versions

### Risks

**Risk: Templates not deployed correctly** (LOW)
- **Mitigation**: Add templates/ to deploy-agents.mjs copy logic
- **Acceptance**: Test deployment with templates

## Template Structure

```
agentic/code/addons/aiwg-utils/templates/devkit/
├── addon-manifest.json
├── framework-manifest.json
├── extension-manifest.json        # NEW: Extension manifest template
├── agent-simple.md
├── agent-complex.md
├── agent-orchestrator.md
├── command-utility.md
├── command-transformation.md
├── command-orchestration.md
├── skill-template/
│   └── SKILL.md
├── README-addon.md
├── README-framework.md
└── README-extension.md            # NEW: Extension readme template
```

## Alternatives Considered

### Alternative 1: Inline Templates

Hardcode templates as strings in JavaScript files.

**Rejected because**: Hard to maintain, difficult to review, no syntax highlighting when editing.

### Alternative 2: docs/templates/

Put templates in documentation directory.

**Rejected because**: Templates are not documentation, wouldn't deploy with addon, confuses purpose of docs/ directory.

### Alternative 3: Separate templates-addon

Create dedicated templates addon.

**Rejected because**: Over-engineering, templates are tightly coupled to devkit commands.

## References

- **ADR-009**: Devkit extends aiwg-utils (parent decision)
- **deploy-agents.mjs**: Deployment tool that needs updating
- **AIWG Development Kit Plan**: `.aiwg/planning/aiwg-devkit-plan.md`

---

**Last Updated**: 2025-12-10
**Author**: Claude (Orchestrator)
**Reviewers**: Project Owner (pending)
