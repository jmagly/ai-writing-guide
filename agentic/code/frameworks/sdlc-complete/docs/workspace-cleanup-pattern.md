# Workspace Cleanup Pattern

**Purpose**: Standard pattern for cleaning up `.aiwg/working/` directory after flow orchestration completes.

**Applies to**: All flow commands that use multi-agent workflows generating intermediate artifacts.

---

## Cleanup Principles

1. **Archive First, Delete Second**: Never delete working files until they're safely archived
2. **Preserve Audit Trail**: Multi-agent review cycles (drafts, reviews, synthesis) must be archived
3. **Clean Slate for Next Flow**: `.aiwg/working/` should be empty after each flow completes
4. **Phase-Specific Archives**: Each phase gets its own archive subdirectory

---

## Standard Cleanup Workflow

### Step 1: Create Archive Directory

```bash
# Create phase-specific archive directory
mkdir -p .aiwg/archive/{phase-name}/

# Examples:
# .aiwg/archive/inception/
# .aiwg/archive/elaboration/
# .aiwg/archive/construction-iteration-1/
# .aiwg/archive/transition/
```

### Step 2: Archive Working Files

**Archive Categories**:

| Workflow Type | Archive Path | What to Archive |
|---------------|--------------|-----------------|
| **Vision/Requirements** | `.aiwg/archive/{phase}/vision-development/` | drafts/, reviews/, synthesis-report.md |
| **Risk Assessment** | `.aiwg/archive/{phase}/risk-assessment/` | drafts/, parallel agent inputs |
| **Architecture** | `.aiwg/archive/{phase}/architecture-development/` | sketches/, reviews/, ADR drafts |
| **Security** | `.aiwg/archive/{phase}/security-assessment/` | classification drafts, compliance notes |
| **Testing** | `.aiwg/archive/{phase}/test-development/` | test plan drafts, coverage analysis |
| **Deployment** | `.aiwg/archive/{phase}/deployment-planning/` | deployment plan drafts, runbook reviews |

**Standard Archive Commands**:

```bash
# Archive all working subdirectories for the phase
cp -r .aiwg/working/requirements/ .aiwg/archive/{phase}/requirements-development/ 2>/dev/null || true
cp -r .aiwg/working/risks/ .aiwg/archive/{phase}/risk-assessment/ 2>/dev/null || true
cp -r .aiwg/working/architecture/ .aiwg/archive/{phase}/architecture-development/ 2>/dev/null || true
cp -r .aiwg/working/security/ .aiwg/archive/{phase}/security-assessment/ 2>/dev/null || true
cp -r .aiwg/working/testing/ .aiwg/archive/{phase}/test-development/ 2>/dev/null || true
cp -r .aiwg/working/deployment/ .aiwg/archive/{phase}/deployment-planning/ 2>/dev/null || true

# Note: 2>/dev/null || true ensures command doesn't fail if directory doesn't exist
```

### Step 3: Clean Working Directory

```bash
# Remove all working files (now safely archived)
rm -rf .aiwg/working/*

# Verify cleanup
ls -la .aiwg/working/  # Should show only . and .. (empty)
```

### Step 4: Verify Archive Integrity

```bash
# Check archive was created successfully
ls -la .aiwg/archive/{phase}/

# Expected output: Multiple subdirectories with archived materials
# Example for inception:
# - vision-development/
# - risk-assessment/
# - architecture-development/
# - security-assessment/
```

---

## What to Archive vs Delete

### Always Archive (Audit Trail Required)

- **Multi-agent drafts**: All v0.1, v0.2, etc. drafts from Primary Authors
- **Review feedback**: All reviewer comments, APPROVED/CONDITIONAL/NEEDS_WORK decisions
- **Synthesis reports**: Documentation of how final artifact was assembled
- **Parallel agent inputs**: Separate inputs from Architecture Designer, Security Architect, etc.
- **Conflict resolutions**: Notes on how conflicting feedback was resolved

### Safe to Delete (Not Archived)

- **Empty directories**: Working subdirectories with no files
- **Temporary notes**: Scratch files, personal notes not part of audit trail
- **Duplicate content**: Files that are exact copies of final baselined artifacts

**When in Doubt**: Archive it. Disk space is cheap, lost audit trail is expensive.

---

## Archive Directory Structure (Example)

```
.aiwg/archive/
├── inception/
│   ├── vision-development/
│   │   ├── drafts/
│   │   │   ├── v0.1-primary-draft.md
│   │   │   ├── v0.1-primary-draft-with-comments.md
│   │   │   └── process-context.md
│   │   ├── reviews/
│   │   │   ├── product-strategist-review.md
│   │   │   ├── business-process-analyst-review.md
│   │   │   └── technical-writer-review.md
│   │   └── synthesis-report.md
│   ├── risk-assessment/
│   │   └── drafts/
│   │       ├── v0.1-primary-draft.md
│   │       ├── technical-risks.md
│   │       └── security-risks.md
│   ├── architecture-development/
│   │   └── reviews/
│   │       └── security-review.md
│   └── security-assessment/
│       └── (draft classifications, if any)
├── elaboration/
│   ├── sad-development/
│   ├── requirements-elaboration/
│   └── test-strategy-development/
└── construction-iteration-1/
    ├── feature-implementation/
    └── test-execution/
```

---

## Integration with Flow Commands

### Add Cleanup as Final Step

All flow orchestration commands should include cleanup as the **last step before presenting final summary**:

```markdown
### Step N: Archive Working Files and Clean Up

**Purpose**: Clean up `.aiwg/working/` directory, archiving important artifacts

**Your Actions**:

[Standard bash commands from this template]

**Communicate Progress**:
```
⏳ Archiving working files and cleaning up...
✓ Archived {workflow-name} development
✓ Working directory cleaned
✓ Audit trail preserved in .aiwg/archive/{phase}/
```
```

### Update Quality Gates

Include cleanup verification in quality gates:

```markdown
## Quality Gates

Before marking workflow complete, verify:
- [ ] All required artifacts generated
- [ ] All reviewers provided sign-off
- [ ] Final artifacts saved to .aiwg/{category}/
- [ ] Working drafts archived to .aiwg/archive/{phase}/
- [ ] Working directory cleaned (.aiwg/working/ empty)
- [ ] Audit trail preserved (archived files contain full review history)
```

---

## Benefits of This Pattern

1. **Clean Workspace**: Each flow starts with empty `.aiwg/working/`, preventing confusion
2. **Complete Audit Trail**: All multi-agent interactions preserved for compliance/review
3. **Debugging Enabled**: Can review archived drafts/reviews if final artifact has issues
4. **Disk Space Management**: Working directory doesn't accumulate files indefinitely
5. **Phase Isolation**: Each phase's work products clearly separated in archive
6. **Reproducibility**: Can reconstruct how decisions were made from archived materials

---

## Flow Commands to Update

**High Priority** (multi-agent workflows):
- `flow-concept-to-inception.md` ✓ (UPDATED)
- `flow-inception-to-elaboration.md`
- `flow-elaboration-to-construction.md`
- `flow-iteration-dual-track.md`
- `flow-discovery-track.md`
- `flow-delivery-track.md`
- `flow-architecture-evolution.md`
- `flow-test-strategy-execution.md`
- `flow-security-review-cycle.md`

**Medium Priority** (some working files):
- `flow-risk-management-cycle.md`
- `flow-requirements-evolution.md`
- `flow-deploy-to-production.md`

**Low Priority** (minimal working files):
- `flow-gate-check.md`
- `flow-handoff-checklist.md`
- `project-status.md` (read-only, no cleanup needed)

---

## Exception: Single-Agent Workflows

For flows that use **single agents** (no multi-agent review pattern):
- Archive only if there are drafts/intermediate files
- If agent generates final artifact directly → no cleanup needed
- Example: Simple risk list updates, minor requirement changes

---

## Testing Cleanup Pattern

After implementing cleanup in a flow command, test with:

```bash
# 1. Run the flow
/flow-{name}

# 2. Verify working is empty
ls -la .aiwg/working/
# Should show: total 8, drwxr-xr-x 2 ... (empty)

# 3. Verify archive exists
ls -la .aiwg/archive/{phase}/
# Should show: multiple subdirectories with files

# 4. Spot-check archived content
cat .aiwg/archive/{phase}/vision-development/synthesis-report.md
# Should contain: readable content, not empty or corrupted
```

---

## Troubleshooting

**Problem**: `cp: cannot stat '.aiwg/working/X': No such file or directory`

**Solution**: Use `2>/dev/null || true` to suppress errors for missing directories:
```bash
cp -r .aiwg/working/X/ .aiwg/archive/{phase}/X/ 2>/dev/null || true
```

**Problem**: Archive directory too large (>100MB)

**Solution**: Compress older archives:
```bash
cd .aiwg/archive
tar -czf inception.tar.gz inception/
rm -rf inception/
```

**Problem**: Need to reference archived file

**Solution**: Archives are persistent, use full path:
```bash
cat .aiwg/archive/inception/vision-development/synthesis-report.md
```

---

## Future Enhancements

1. **Automated archive compression**: After 30 days, compress phase archives
2. **Archive index**: Generate `.aiwg/archive/INDEX.md` listing all archived materials
3. **Selective archive**: Archive only files >1KB (skip empty/tiny files)
4. **Archive metadata**: Include timestamp, agent versions, flow duration in archive
