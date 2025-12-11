# Writing Quality Addon Migration Plan

**Status**: Proposed
**Date**: 2025-12-03
**Related ADR**: ADR-008 Plugin Type Taxonomy
**Priority**: P1 (Post-release cleanup)

---

## Overview

Migrate Writing Quality content from root directories to the standardized addon structure per ADR-008.

## Current State

```
ai-writing-guide/                   # Root level
├── core/                           # Writing philosophy
├── validation/                     # 505 banned patterns
├── examples/                       # Before/after rewrites
├── context/                        # Quick-reference guides
├── patterns/                       # Pattern JSON files
└── agents/                         # 3 writing agents
    ├── writing-validator.md
    ├── prompt-optimizer.md
    └── content-diversifier.md
```

## Target State

```
ai-writing-guide/
└── agentic/code/addons/
    └── writing-quality/
        ├── agents/                 # Moved from root agents/
        │   ├── writing-validator.md
        │   ├── prompt-optimizer.md
        │   └── content-diversifier.md
        ├── core/                   # Moved from root
        ├── validation/             # Moved from root
        ├── examples/               # Moved from root
        ├── context/                # Moved from root
        ├── patterns/               # Moved from root
        └── README.md               # New addon documentation
```

## Migration Steps

### Phase 1: Create Addon Structure
```bash
mkdir -p agentic/code/addons/writing-quality/{agents,core,validation,examples,context,patterns}
```

### Phase 2: Move Content
```bash
# Move directories
git mv core/* agentic/code/addons/writing-quality/core/
git mv validation/* agentic/code/addons/writing-quality/validation/
git mv examples/* agentic/code/addons/writing-quality/examples/
git mv context/* agentic/code/addons/writing-quality/context/
git mv patterns/* agentic/code/addons/writing-quality/patterns/

# Move writing agents (keep SDLC/MMK agents in root)
git mv agents/writing-validator.md agentic/code/addons/writing-quality/agents/
git mv agents/prompt-optimizer.md agentic/code/addons/writing-quality/agents/
git mv agents/content-diversifier.md agentic/code/addons/writing-quality/agents/

# Clean up empty directories
rmdir core validation examples context patterns
```

### Phase 3: Update deploy-agents.mjs

Add addon deployment support:
```javascript
// New mode: writing (addon)
if (mode === 'writing' || mode === 'general' || mode === 'all') {
  const addonAgentsRoot = path.join(srcRoot, 'agentic', 'code', 'addons', 'writing-quality', 'agents');
  // Deploy writing addon agents
}
```

### Phase 4: Update Imports/References

Files to update:
- `CLAUDE.md` - Update addon paths
- `USAGE_GUIDE.md` - Update documentation paths
- `tools/agents/deploy-agents.mjs` - Add addon support
- `src/writing/*.ts` - Update pattern paths
- `test/unit/writing/*.ts` - Update test paths

### Phase 5: Backward Compatibility

Create symlinks for transition period:
```bash
# Maintain backward compatibility
ln -s agentic/code/addons/writing-quality/core core
ln -s agentic/code/addons/writing-quality/validation validation
# etc.
```

Remove symlinks after 1 release cycle.

## Tooling Updates Required

### deploy-agents.mjs Changes

1. Add `--mode writing` support
2. Update source paths for addon structure
3. Add addon-specific deployment logic

### aiwg CLI Changes

1. Update `-deploy-agents --mode writing` help text
2. Add `-list-addons` command
3. Update `-help` output

### Test Updates

1. Update pattern library tests to use new paths
2. Update agent deployment tests
3. Add addon deployment tests

## Acceptance Criteria

- [ ] All writing content moved to `agentic/code/addons/writing-quality/`
- [ ] `aiwg -deploy-agents --mode writing` works correctly
- [ ] `aiwg -deploy-agents --mode all` includes writing addon
- [ ] All tests pass with new paths
- [ ] Documentation updated to reflect new structure
- [ ] Backward compatibility symlinks in place

## Timeline

**Estimated Effort**: 4-6 hours

**Dependencies**:
- ADR-008 accepted
- README.md changes committed

**Blocked By**: None

**Blocks**: Future addon additions

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking existing installations | Medium | High | Symlinks for transition |
| Test failures from path changes | High | Medium | Update all test paths |
| Documentation drift | Low | Medium | Comprehensive updates |

---

**Created**: 2025-12-03
**Author**: Architecture Designer
