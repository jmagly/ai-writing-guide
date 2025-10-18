# ADR-006: Plugin Rollback Strategy

**Status**: Accepted
**Date**: 2025-10-18
**Deciders**: Architecture Designer, Test Architect, DevOps Engineer
**Context**: AIWG SDLC Framework - Plugin System Architecture

## Context and Problem Statement

Plugin installation failures can leave the system in an inconsistent state with partial installations, corrupted registry entries, orphaned files, or broken CLAUDE.md injections. Without proper rollback capabilities, users must manually clean up failed installations, which is error-prone and damages user trust. We need a reliable rollback mechanism that ensures system consistency even when installations fail.

## Decision Drivers

- **System integrity**: Prevent partial installations from corrupting system
- **User confidence**: Build trust through reliable recovery mechanisms
- **Automation**: Minimize manual intervention for failure recovery
- **Performance**: Rollback must be fast (<5 seconds)
- **Completeness**: All installation artifacts must be reversible
- **Testing requirements**: Must be thoroughly testable

## Considered Options

1. **Transaction-based with filesystem snapshots** - Snapshot before install, rollback on failure
2. **Manual rollback procedures** - Document cleanup steps for users
3. **Immutable installations** - Never modify existing files, only add new ones
4. **Backup-based recovery** - Full system backup before each plugin operation
5. **Versioned snapshots** - Maintain version history for all changes
6. **Database transactions** - Use transactional database for all metadata

## Decision Outcome

**Chosen option**: "Transaction-based installation with filesystem snapshots"

**Rationale**: Filesystem snapshots provide a simple, reliable mechanism for capturing system state before modifications. The transaction model ensures either complete success or complete rollback with no intermediate states. This approach is efficient (minimal overhead), fast (<5 seconds rollback), and requires no external dependencies. The implementation is straightforward to test and maintain.

## Consequences

### Positive

- Zero orphaned files after failed installations
- Complete system state preservation and recovery
- Fast rollback time (<5 seconds empirical target)
- User confidence in plugin installation reliability
- Supports manual rollback via CLI command
- Testable with comprehensive failure scenarios
- No external dependencies required

### Negative

- Temporary disk space required for backups (~2x plugin size)
- Additional complexity in PluginManager implementation
- Snapshot creation adds ~1 second to installation time
- Concurrent installations must be serialized
- Backup cleanup required after successful installation

### Risks

- Snapshot corruption could prevent rollback
- Disk space exhaustion during snapshot creation
- Concurrent modification during rollback
- Incomplete snapshot leading to partial rollback

## Implementation Notes

**Transaction Architecture**:

```javascript
class InstallationTransaction {
  async snapshot() {
    // Backup: installed.json, CLAUDE.md, .claude/agents/, .aiwg-plugins/
    // Store in: .aiwg/backups/{plugin-id}-{timestamp}/
  }

  async rollback() {
    // Restore all files from backup
    // Delete plugin directory
    // Remove registry entry
    // Clean up backup
  }

  async commit() {
    // Delete backup directory after success
  }
}
```

**Rollback Scope and Actions**:

| Installation Step | Rollback Action | Verification |
|------------------|----------------|--------------|
| Download plugin | Delete downloaded archive | Verify file removed |
| Extract files | Delete `.aiwg-plugins/{plugin}/` | Verify directory removed |
| Update installed.json | Restore previous version | Verify JSON integrity |
| Deploy agents | Delete deployed agents | Verify `.claude/agents/` clean |
| Inject CLAUDE.md | Restore CLAUDE.md backup | Verify content unchanged |
| Update commands | Restore command files | Verify commands intact |

**Backup Structure**:
```
.aiwg/backups/
└── gdpr-compliance-1730123456/
    ├── manifest.json         # Transaction metadata
    ├── installed.json        # Registry backup
    ├── CLAUDE.md            # CLAUDE.md backup
    ├── agents/              # Agent files backup
    └── commands/            # Command files backup
```

**Manual Rollback Command**:
```bash
aiwg -rollback-plugin <pluginId>  # Manual rollback if needed
```

**Testing Requirements**:
- 20+ unit tests covering snapshot, rollback, commit operations
- 15+ integration tests for failure scenarios
- Edge case tests: concurrent rollback, backup corruption, disk space exhaustion
- Performance tests: verify <5 second rollback time

## Related Decisions

- ADR-002: Plugin Isolation Strategy (rollback operates within same boundaries)
- ADR-001: Plugin Manifest Format (versioning enables rollback)
- SAD Section 5.1: PluginManager component (implements transaction)

## References

- SAD v1.0: `/home/manitcor/dev/ai-writing-guide/.aiwg/planning/sdlc-framework/architecture/software-architecture-doc.md`
- Test Architect Recommendations: Section 11.3 of SAD
- InstallationTransaction Component: Section 5.1 of SAD
- Testing Roadmap: 10-week plan in Section 11.3