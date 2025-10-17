# Flow Command Cleanup Checklist

**Purpose**: Track which flow commands have been updated with workspace cleanup pattern.

**Reference**: See `workspace-cleanup-pattern.md` for standard cleanup implementation.

---

## Status Legend

- ✅ **COMPLETE**: Cleanup step added, quality gates updated
- 🔄 **IN PROGRESS**: Partially updated
- ⏳ **PENDING**: Not yet started
- ❌ **NOT NEEDED**: Command doesn't use `.aiwg/working/` (read-only or simple operations)

---

## High Priority (Multi-Agent Workflows)

These flows use Primary Author → Parallel Reviewers → Synthesizer pattern and MUST have cleanup:

| Command | Status | Notes |
|---------|--------|-------|
| `flow-concept-to-inception.md` | ✅ COMPLETE | Step 10 added, quality gates updated |
| `flow-inception-to-elaboration.md` | ⏳ PENDING | Needs Step N for SAD/requirements/test plan cleanup |
| `flow-elaboration-to-construction.md` | ⏳ PENDING | Needs cleanup for iteration planning artifacts |
| `flow-iteration-dual-track.md` | ⏳ PENDING | Needs cleanup for discovery+delivery working files |
| `flow-discovery-track.md` | ⏳ PENDING | Needs cleanup for requirements/design drafts |
| `flow-delivery-track.md` | ⏳ PENDING | Needs cleanup for code review/test working files |
| `flow-architecture-evolution.md` | ⏳ PENDING | Needs cleanup for ADR drafts, architecture reviews |
| `flow-test-strategy-execution.md` | ⏳ PENDING | Needs cleanup for test plan drafts, coverage analysis |
| `flow-security-review-cycle.md` | ⏳ PENDING | Needs cleanup for threat model drafts, security reviews |

---

## Medium Priority (Some Working Files)

These flows generate intermediate artifacts that should be archived:

| Command | Status | Notes |
|---------|--------|-------|
| `flow-risk-management-cycle.md` | ⏳ PENDING | Archive risk assessment working files |
| `flow-requirements-evolution.md` | ⏳ PENDING | Archive requirements change drafts |
| `flow-deploy-to-production.md` | ⏳ PENDING | Archive deployment planning working files |
| `flow-performance-optimization.md` | ⏳ PENDING | Archive performance analysis working files |
| `flow-compliance-validation.md` | ⏳ PENDING | Archive compliance assessment working files |
| `flow-change-control.md` | ⏳ PENDING | Archive change request working files |
| `flow-construction-to-transition.md` | ⏳ PENDING | Archive transition planning working files |
| `flow-retrospective-cycle.md` | ⏳ PENDING | Archive retrospective working files |

---

## Low Priority (Minimal Working Files)

These flows may generate some working files but less critical:

| Command | Status | Notes |
|---------|--------|-------|
| `flow-gate-check.md` | ⏳ PENDING | May generate assessment working files |
| `flow-handoff-checklist.md` | ⏳ PENDING | May generate checklist working files |
| `flow-team-onboarding.md` | ⏳ PENDING | May generate training material working files |
| `flow-knowledge-transfer.md` | ⏳ PENDING | May generate knowledge capture working files |
| `flow-cross-team-sync.md` | ⏳ PENDING | May generate sync notes working files |
| `flow-hypercare-monitoring.md` | ⏳ PENDING | May generate monitoring data working files |
| `flow-incident-response.md` | ⏳ PENDING | May generate incident analysis working files |

---

## Not Needed (Read-Only or No Working Files)

These commands don't use `.aiwg/working/` and don't need cleanup:

| Command | Status | Notes |
|---------|--------|-------|
| N/A | ❌ NOT NEEDED | All flow commands generate some working files during orchestration |

**Note**: Even simple flows should clean up to maintain workspace hygiene.

---

## Standard Cleanup Template

For each flow command, add this as the **final step before presenting summary**:

### Step N: Archive Working Files and Clean Up

```markdown
### Step N: Archive Working Files and Clean Up

**Purpose**: Clean up `.aiwg/working/` directory, archiving important artifacts

**Your Actions**:

```bash
# 1. Create archive directory for this phase/iteration
mkdir -p .aiwg/archive/{phase-or-iteration-name}/

# 2. Archive working files (adjust paths based on what this flow generates)
cp -r .aiwg/working/requirements/ .aiwg/archive/{phase}/requirements-development/ 2>/dev/null || true
cp -r .aiwg/working/architecture/ .aiwg/archive/{phase}/architecture-development/ 2>/dev/null || true
cp -r .aiwg/working/risks/ .aiwg/archive/{phase}/risk-assessment/ 2>/dev/null || true
cp -r .aiwg/working/testing/ .aiwg/archive/{phase}/test-development/ 2>/dev/null || true
# Add more cp commands for other artifact types this flow generates

# 3. Clean working directory
rm -rf .aiwg/working/*

# 4. Verify cleanup
ls -la .aiwg/working/  # Should be empty
ls -la .aiwg/archive/{phase}/  # Should contain archived materials
\```

**What Gets Archived**:
- [List specific artifact types for this flow]
- Drafts, reviews, synthesis reports from multi-agent workflows
- Intermediate analysis, assessment notes
- Conflict resolutions, decision rationale

**Communicate Progress**:
```
⏳ Archiving working files and cleaning up...
✓ Archived {artifact-type} development
✓ Archived {artifact-type} assessment
✓ Working directory cleaned
✓ Audit trail preserved in .aiwg/archive/{phase}/
\```
```

### And update Quality Gates:

```markdown
## Quality Gates

Before marking workflow complete, verify:
- [ ] All required artifacts generated
- [ ] All reviewers provided sign-off
- [ ] Final artifacts saved to .aiwg/{category}/
- [ ] Working drafts archived to .aiwg/archive/{phase}/
- [ ] Working directory cleaned (.aiwg/working/ empty)
- [ ] LOM/gate criteria validated: PASS
- [ ] Audit trail preserved (archived files contain full review history)
```

---

## Batch Update Strategy

### Phase 1: High Priority (Week 1)
Update 9 multi-agent workflow commands that generate the most working files.

### Phase 2: Medium Priority (Week 2)
Update 8 commands with moderate working file generation.

### Phase 3: Low Priority (Week 3)
Update remaining 7 commands for complete coverage.

### Phase 4: Testing (Week 4)
- Run each flow command
- Verify `.aiwg/working/` is empty after completion
- Verify `.aiwg/archive/{phase}/` contains expected materials
- Spot-check archived content is not corrupted

---

## Testing Checklist (Per Command)

After adding cleanup to a flow command:

- [ ] Run the flow command
- [ ] Check `.aiwg/working/` is empty: `ls -la .aiwg/working/`
- [ ] Check archive exists: `ls -la .aiwg/archive/{phase}/`
- [ ] Verify archived content: `cat .aiwg/archive/{phase}/*/synthesis-report.md`
- [ ] Run flow again (should work with clean working directory)
- [ ] Archive from second run should be separate (if iterative flow) or merged (if phase-based)

---

## Archive Naming Conventions

### Phase-Based Flows (Single Execution Per Phase)

Archive to same directory each time (overwrites previous if re-run):
- `flow-concept-to-inception` → `.aiwg/archive/inception/`
- `flow-inception-to-elaboration` → `.aiwg/archive/elaboration/`
- `flow-elaboration-to-construction` → `.aiwg/archive/construction/`

### Iteration-Based Flows (Multiple Executions)

Archive to iteration-specific directories:
- `flow-iteration-dual-track 1` → `.aiwg/archive/construction-iteration-1/`
- `flow-iteration-dual-track 2` → `.aiwg/archive/construction-iteration-2/`
- `flow-discovery-track 3` → `.aiwg/archive/discovery-iteration-3/`

### Event-Based Flows (Triggered by Events)

Archive to timestamped directories:
- `flow-incident-response INC-001` → `.aiwg/archive/incident-INC-001-2025-10-17/`
- `flow-retrospective-cycle iteration 5` → `.aiwg/archive/retrospective-iteration-5-2025-10-17/`
- `flow-deploy-to-production v1.2.0` → `.aiwg/archive/deployment-v1.2.0-2025-10-17/`

---

## Progress Tracking

**Last Updated**: 2025-10-17

**Completed**: 1/24 (4%)

**Next Up**:
1. `flow-inception-to-elaboration.md` (high priority)
2. `flow-iteration-dual-track.md` (high priority)
3. `flow-discovery-track.md` (high priority)

**Target Completion**: 4 weeks (6 commands/week)
