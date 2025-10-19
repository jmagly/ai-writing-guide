# ADR-006: Plugin Rollback Strategy

**Status**: Accepted (Updated 2025-10-18)
**Date**: 2025-10-18 (Originally), 2025-10-18 (Revised)
**Deciders**: Architecture Designer, Test Architect, DevOps Engineer
**Context**: AIWG SDLC Framework - Plugin System Architecture

## Context and Problem Statement

Plugin installation failures can leave the system in an inconsistent state with partial installations, corrupted registry entries, orphaned files, or broken CLAUDE.md injections. Without proper rollback capabilities, users must manually clean up failed installations, which is error-prone and damages user trust. We need a reliable rollback mechanism that ensures system consistency even when installations fail.

**Update (2025-10-18)**: The original transaction-based file tracking approach added significant complexity for managing individual plugin modifications. A simpler "reset + redeploy" strategy provides better reliability, easier implementation, and clearer recovery guarantees.

## Decision Drivers

- **System integrity**: Prevent partial installations from corrupting system
- **User confidence**: Build trust through reliable recovery mechanisms
- **Automation**: Minimize manual intervention for failure recovery
- **Performance**: Rollback must be fast (<5 seconds)
- **Completeness**: All installation artifacts must be reversible
- **Simplicity**: Avoid complex file-tracking overhead (NEW)
- **Idempotency**: Support repeated rollback operations safely (NEW)

## Considered Options

1. ~~**Transaction-based with filesystem snapshots**~~ - Snapshot before install, rollback on failure (REJECTED: Too complex)
2. **Reset + redeploy strategy** - Clear all plugins, restore baseline, redeploy from registry (CHOSEN)
3. **Manual rollback procedures** - Document cleanup steps for users (REJECTED: Error-prone)
4. **Immutable installations** - Never modify existing files, only add new ones (REJECTED: Incompatible with CLAUDE.md injection)
5. **Backup-based recovery** - Full system backup before each plugin operation (REJECTED: Excessive disk usage)
6. **Versioned snapshots** - Maintain version history for all changes (REJECTED: Over-engineered)

## Decision Outcome

**Chosen option**: "Reset + redeploy strategy"

**Rationale**: Instead of tracking individual plugin modifications and reversing them (complex, error-prone), we maintain a single baseline state (pre-plugin CLAUDE.md) and provide atomic reset operations. Rollback becomes: clear all plugins → restore baseline → redeploy active plugins from registry. This approach is simpler to implement, more reliable (always returns to known-good state), and idempotent (safe to repeat).

**Changed from**: Transaction-based file tracking (too complex, difficult to handle merge conflicts, high maintenance burden)

## Consequences

### Positive

- **Simplicity**: Single backup file (CLAUDE.md.pre-plugins) vs tracking every modified file
- **Reliability**: Always returns to known-good baseline, no partial states
- **Idempotent**: Can run reset multiple times safely
- **Faster implementation**: No complex transaction tracking required
- **Easier testing**: Fewer edge cases to test
- **Better user experience**: Single command to recover (`aiwg -update-<platform> --reset`)
- **Infrastructure as code**: Declarative redeploy from registry (not imperative file tracking)

### Negative

- **Full redeploy required**: Cannot selectively rollback single plugin (must reset all)
- **Temporary unavailability**: Brief window where no plugins active during reset
- **Registry dependency**: Redeploy requires valid plugin registry
- **Lost manual edits**: Any manual changes to deployed files lost on reset

### Risks

- **Registry corruption**: If registry corrupted, cannot redeploy (mitigated: backup registry)
- **Network failure during redeploy**: Partial redeploy after reset (mitigated: local caching)
- **CLAUDE.md baseline lost**: Cannot restore if baseline deleted (mitigated: warn on baseline deletion)

## Implementation Notes

### Baseline Backup Strategy

**First Plugin Deployment**:
```bash
# Before any plugin touches CLAUDE.md
if [ ! -f CLAUDE.md.pre-plugins ]; then
  cp CLAUDE.md CLAUDE.md.pre-plugins
fi
```

**Baseline Protection**:
- Created once on first plugin deployment
- Never overwritten (immutable after creation)
- Stored alongside CLAUDE.md in project root
- Excluded from version control (add to .gitignore)

### Reset Command

**Command**: `aiwg -update-<platform> --reset`

**Actions**:
```bash
# 1. Clear all deployed artifacts
rm -rf .claude/agents/
rm -rf .claude/commands/
rm -rf .aiwg-plugins/

# 2. Restore CLAUDE.md baseline
if [ -f CLAUDE.md.pre-plugins ]; then
  cp CLAUDE.md.pre-plugins CLAUDE.md
else
  echo "WARNING: Baseline not found, CLAUDE.md not restored"
fi

# 3. Clear plugin registry
echo '{"plugins": []}' > .aiwg/plugins/registry.json
```

**Exit State**: System returned to pre-plugin state (clean CLAUDE.md, no deployed agents/commands)

### Redeploy Command

**Command**: `aiwg -update-<platform> --mode <mode>`

**Actions**:
```bash
# 1. Read active plugins from registry
# 2. For each plugin:
#    - Deploy agents to .claude/agents/
#    - Deploy commands to .claude/commands/
#    - Inject CLAUDE.md sections (if applicable)
# 3. Update registry with deployment timestamps
```

**Combined Reset + Redeploy**:
```bash
# Single command: reset then redeploy SDLC framework
aiwg -update-claude --reset && aiwg -update-claude --mode sdlc
```

### File Structure

```
project-root/
├── CLAUDE.md                    # Current (may include plugin injections)
├── CLAUDE.md.pre-plugins        # Baseline (immutable)
├── .claude/
│   ├── agents/                  # Deployed agents (reset clears)
│   └── commands/                # Deployed commands (reset clears)
├── .aiwg-plugins/               # Plugin installations (reset clears)
└── .aiwg/
    └── plugins/
        └── registry.json        # Active plugin list (reset clears)
```

### Recovery Scenarios

#### Scenario 1: Plugin Installation Fails

**Automatic Recovery** (built into deployment):
```javascript
try {
  await deployPlugin(pluginId);
} catch (error) {
  // Auto-rollback: reset + redeploy previous state
  await resetPlatform();
  await redeployFromRegistry(previousRegistry);
  throw error;
}
```

#### Scenario 2: CLAUDE.md Corrupted

**Manual Recovery**:
```bash
# Restore from baseline
cp CLAUDE.md.pre-plugins CLAUDE.md

# Redeploy all plugins
aiwg -update-claude --mode sdlc
```

#### Scenario 3: Unknown System State

**Full Reset**:
```bash
# Nuclear option: return to clean state
aiwg -update-claude --reset

# Then redeploy desired plugins
aiwg -update-claude --mode sdlc
```

#### Scenario 4: Registry Corrupted

**Recovery**:
```bash
# 1. Reset to baseline
aiwg -update-claude --reset

# 2. Manually rebuild registry by redeploying known plugins
aiwg -update-claude --mode sdlc
aiwg -install-plugin gdpr-compliance
```

### Performance Targets

| Operation | Target Time | Rationale |
|-----------|------------|-----------|
| Reset (clear all) | <2 seconds | File deletion only, no complex logic |
| Redeploy SDLC (58 agents + 45 commands) | <10 seconds | File copying, CLAUDE.md injection |
| Full reset + redeploy | <12 seconds | Combined operation |

### Testing Requirements

**Unit Tests** (15+ tests):
- Reset command clears all artifacts
- Baseline restoration works correctly
- Registry cleared properly
- Idempotent reset (repeated calls safe)

**Integration Tests** (10+ tests):
- Reset + redeploy full workflow
- Recovery from corrupted CLAUDE.md
- Recovery from corrupted registry
- Multiple platform resets (Claude, OpenAI)

**Edge Case Tests** (8+ tests):
- Baseline missing (warn user)
- Registry missing (create empty)
- Concurrent reset operations
- Disk space exhaustion during redeploy

**Performance Tests** (5+ tests):
- Reset completes <2s
- Redeploy SDLC <10s
- Full cycle <12s

### Command Interface

```bash
# Reset to baseline (clear all plugins)
aiwg -update-claude --reset
aiwg -update-openai --reset

# Redeploy from registry
aiwg -update-claude --mode sdlc
aiwg -update-claude --mode both

# Combined: reset + redeploy
aiwg -update-claude --reset && aiwg -update-claude --mode sdlc

# Status check
aiwg -plugin-status
# Output: "3 plugins active (sdlc-agents, sdlc-commands, gdpr-compliance)"
```

### Migration from Old Strategy

**For existing ADR-006 implementations**:

If transaction-based rollback already implemented:
1. Deprecate transaction snapshot logic
2. Remove per-plugin backup directories
3. Implement baseline backup on first plugin install
4. Add reset command
5. Update tests to new strategy

**Backward Compatibility**: Not required (ADR-006 implementation not yet released)

## Comparison: Old vs New Strategy

| Aspect | Transaction-Based (Old) | Reset + Redeploy (New) |
|--------|------------------------|------------------------|
| **Complexity** | High (track every file change) | Low (single baseline file) |
| **Disk Space** | ~2x plugin size per install | ~50KB (CLAUDE.md baseline) |
| **Rollback Speed** | <5s (restore snapshots) | <2s (delete files) |
| **Idempotency** | No (snapshot consumed on rollback) | Yes (repeatable) |
| **Implementation Effort** | 40 hours (InstallationTransaction class) | 15 hours (reset + redeploy) |
| **Testing Complexity** | 20+ unit + 15+ integration tests | 15+ unit + 10+ integration tests |
| **Failure Recovery** | Partial (individual plugin rollback) | Complete (always returns to baseline) |
| **User Mental Model** | Complex (understand transactions) | Simple (reset = start over) |

## Related Decisions

- **ADR-002**: Plugin Isolation Strategy (rollback operates within same filesystem boundaries)
- **ADR-001**: Plugin Manifest Format (registry enables declarative redeploy)
- **ADR-007**: Framework-Scoped Workspace Architecture (reset affects framework directories)
- **SAD Section 5.1**: PluginManager component (implements reset + redeploy)

## References

- SAD v1.0: `.aiwg/planning/sdlc-framework/architecture/software-architecture-doc.md`
- Test Architect Recommendations: Section 11.3 of SAD
- PluginManager Component: Section 5.1 of SAD
- Testing Roadmap: 10-week plan in Section 11.3

## Decision History

**2025-10-18 (Original)**: Accepted transaction-based snapshot strategy
**2025-10-18 (Revision)**: Changed to reset + redeploy strategy for simplicity and reliability
