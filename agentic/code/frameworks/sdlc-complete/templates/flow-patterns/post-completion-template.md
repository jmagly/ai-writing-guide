# Post-Completion Pattern for Flow Commands

This pattern should be included at the end of all phase transition and major workflow flow commands.

## Standard Post-Completion Section

Add this section to the end of flow commands:

```markdown
## Post-Completion

After this flow completes successfully:

### 1. Workspace Health Check (Recommended)

Run a workspace health assessment to ensure alignment:

```
/project-status
```

Or ask: "check workspace health"

This will:
- Verify artifacts are properly archived
- Check for stale files in .aiwg/working/
- Confirm documentation alignment with current phase
- Suggest any cleanup actions

### 2. Common Follow-up Actions

**If workspace needs cleanup**:
- `/workspace-prune-working` - Remove stale draft files
- `/workspace-realign` - Reorganize misaligned documentation

**If documentation is out of sync**:
- `/aiwg-regenerate` - Regenerate context files
- `/check-traceability` - Verify requirement links

### 3. Notify Stakeholders

Consider updating stakeholders on phase completion:
- Update project status board
- Send completion notification
- Schedule next phase kickoff

### 4. Archive Confirmation

Verify final artifacts are in correct locations:
```
.aiwg/archive/{phase-name}/
├── final artifacts...
└── completion-report.md
```
```

## Trigger Points

Include this pattern at the end of:
- All `flow-*-to-*` phase transition commands
- `flow-delivery-track` and `flow-discovery-track` after iteration completion
- `flow-gate-check` after successful gate passage
- Any flow that generates multiple artifacts

## Integration with Skills

The workspace-health skill should be invokable both:
1. Explicitly via "check workspace health"
2. Implicitly as a suggestion at flow completion

The orchestrator may choose to automatically invoke workspace-health based on:
- Number of artifacts generated (>3 suggests health check)
- Phase transition complexity
- Time since last health check (>1 week)
