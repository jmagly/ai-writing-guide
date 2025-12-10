# ADR-012: Template Selection via --template Flag

**Status**: Proposed
**Date**: 2025-12-10
**Deciders**: Architecture Designer, Project Owner
**Context**: AIWG Development Kit Implementation

---

## Context and Problem Statement

Different components need different starting templates based on complexity:
- Simple utility agent vs. complex domain expert vs. orchestrator
- Quick utility command vs. transformation pipeline vs. multi-agent workflow
- Detection skill vs. transformation skill vs. validation skill

Options considered:
1. **Single template per type** (one size fits all)
2. **Multiple templates via flag** (`--template <type>`)
3. **Interactive template selection** (prompt user every time)

## Decision Drivers

- **Appropriate starting point**: Users shouldn't have to delete boilerplate
- **User agency**: Users know their complexity needs
- **Speed**: Quick scaffold shouldn't require prompts
- **Discoverability**: Available templates must be documented

## Decision

Provide **multiple templates per component type** selected via `--template` flag with sensible defaults.

### Template Catalog

**Agents:**
| Template | Use Case | Default |
|----------|----------|---------|
| `simple` | Single-purpose, focused agent | ✅ |
| `complex` | Domain expert with deep knowledge | |
| `orchestrator` | Multi-agent coordination | |

**Commands:**
| Template | Use Case | Default |
|----------|----------|---------|
| `utility` | Simple operation, single action | ✅ |
| `transformation` | Content/code transformation pipeline | |
| `orchestration` | Multi-agent workflow | |

**Skills:**
| Template | Use Case | Default |
|----------|----------|---------|
| `detection` | Pattern/condition detection | ✅ |
| `transformation` | Content transformation | |
| `validation` | Quality/compliance checking | |

## Rationale

1. **Right-sized templates**: Simple agents don't need orchestrator boilerplate
2. **Clear defaults**: `simple`/`utility`/`detection` covers most cases
3. **User control**: `--template` flag gives explicit choice
4. **Self-documenting**: Template names describe purpose
5. **Extensible**: New templates can be added without breaking existing

## Consequences

### Positive

- Users get appropriate starting point
- Reduced boilerplate deletion
- Clear mental model for component types
- Templates serve as documentation

### Negative

- Multiple templates to maintain per type
- CLI help must document all options
- Users must learn template names

### Risks

**Risk: Template proliferation** (LOW)
- **Mitigation**: Limit to 3 templates per type, resist adding more
- **Acceptance**: Each new template must justify distinct use case

## Usage Examples

```bash
# Default template (simple)
aiwg add-agent code-reviewer --to my-addon

# Explicit complex template
aiwg add-agent architecture-expert --to my-addon --template complex

# Orchestrator for multi-agent workflows
aiwg add-agent deployment-coordinator --to my-addon --template orchestrator

# Command templates
aiwg add-command lint-fix --to my-addon --template transformation
aiwg add-command deploy-all --to my-addon --template orchestration
```

## Alternatives Considered

### Alternative 1: Single Template

One template per component type, users modify as needed.

**Rejected because**: Simple agents bloated with orchestrator patterns, or orchestrators missing key sections.

### Alternative 2: Interactive Selection

Always prompt user to choose template.

**Rejected because**: Slows down quick scaffolding, requires user to remember options.

## References

- **ADR-010**: Templates in aiwg-utils/templates/devkit/
- **ADR-011**: CLI and in-session commands
- **docs/commands/DEVELOPMENT_GUIDE.md**: Existing command patterns
- **AIWG Development Kit Plan**: `.aiwg/planning/aiwg-devkit-plan.md`

---

**Last Updated**: 2025-12-10
**Author**: Claude (Orchestrator)
**Reviewers**: Project Owner (pending)
