# Use-Case Specification: UC-010

## Metadata

- ID: UC-010
- Name: Rollback Plugin Installation on Failure
- Owner: System Analyst
- Contributors: DevOps Engineer, Test Architect, Security Architect
- Reviewers: Requirements Reviewer, Product Strategist
- Team: AIWG Framework Development
- Status: approved (deferred to v1.1)
- Created: 2025-10-18
- Updated: 2025-10-22
- Priority: P1 (High Priority - Deferred to Version 1.1)
- Estimated Effort: M (Medium - 15 hours implementation + 10 hours testing)
- Related Documents:
  - Use Case Brief: /aiwg/requirements/use-case-briefs/UC-010-plugin-rollback.md
  - Feature: FID-005 (Plugin Rollback), Feature Backlog Prioritized
  - ADR: ADR-006 (Plugin Rollback Strategy - Reset + Redeploy)
  - SAD: Section 5.1 (PluginManager), Section 4.2 (Core Orchestrator)

## 1. Use-Case Identifier and Name

**ID:** UC-010
**Name:** Rollback Plugin Installation on Failure

## 2. Scope and Level

**Scope:** AIWG Plugin Rollback System (Automated Recovery from Installation Failures)
**Level:** User Goal
**System Boundary:** AIWG plugin management system, deployment commands, rollback automation, registry management, file system operations

## 3. Primary Actor(s)

**Primary Actors:**
- DevOps Engineer: Manages plugin installations in production projects, needs reliable rollback for failed deployments
- Framework Maintainer: Develops and tests plugin system, requires safety net for experimentation
- Solo Developer: Installs plugins to enhance project capabilities, expects clean recovery from failures
- Automated Rollback Trigger: System-initiated rollback on detection of installation failure (no human intervention)

**Actor Goals:**
- Safely recover from failed plugin installations without manual cleanup
- Prevent partial installations from corrupting system state
- Maintain zero downtime during rollback operations (or minimal disruption)
- Trust that rollback is always available as safety net
- Avoid learning complex recovery procedures (one-command rollback)

## 4. Stakeholders and Interests

| Stakeholder | Interest |
|------------|----------|
| DevOps Engineer | Reliable rollback automation (no manual cleanup after failures) |
| Solo Developer | Confidence to experiment with plugins (rollback safety net) |
| Enterprise Team Lead | Zero data loss guarantee (complete state restoration) |
| Framework Maintainer | Simple implementation (avoid complex transaction tracking) |
| End Users | Fast recovery time (<5 seconds to restore working state) |
| Security Team | Audit trail of rollback operations (compliance tracking) |

## 5. Preconditions

1. AIWG framework installed (`~/.local/share/ai-writing-guide/` exists)
2. Plugin installation attempted (at least one plugin deployment initiated)
3. Baseline backup exists (`CLAUDE.md.pre-plugins` created on first plugin install)
4. Plugin registry initialized (`.aiwg/plugins/registry.json` exists)
5. Sufficient disk space for rollback operations (minimal: ~50KB for baseline)
6. User has write permissions to project directories (`.claude/`, `.aiwg/`, `CLAUDE.md`)
7. **Optional:** Git repository initialized (for version control of rollback operations)

## 6. Postconditions

**Success Postconditions:**
- Failed installation completely rolled back:
  - All deployed agents removed (`.claude/agents/` cleared)
  - All deployed commands removed (`.claude/commands/` cleared)
  - CLAUDE.md restored to pre-plugin baseline (clean state)
  - Plugin registry cleared (`.aiwg/plugins/registry.json` reset to empty)
- System state validated:
  - Zero orphaned files (no residual plugin artifacts)
  - File permissions match baseline (no privilege escalation)
  - Registry consistency verified (no dangling references)
- Rollback metadata captured:
  - Rollback timestamp logged (`.aiwg/logs/rollback-{timestamp}.log`)
  - Failure reason documented (root cause for troubleshooting)
  - Audit trail complete (all operations recorded)
- User can retry installation:
  - Clean state ready for fresh deployment attempt
  - Manual workaround documented (if needed for specific failure modes)

**Failure Postconditions:**
- Rollback incomplete (partial restoration):
  - User notified of incomplete rollback (clear error message with remediation steps)
  - Rollback log generated (`.aiwg/logs/rollback-failure-{timestamp}.log`)
  - Manual recovery steps provided (fallback to git reset or clean install)
- Issue created for framework improvement:
  - GitHub issue auto-generated (if network available)
  - Failure details attached (logs, system state snapshot)

## 7. Trigger

**Automatic Triggers:**
1. Plugin installation fails mid-process (network timeout, disk full, permission denied)
2. Plugin validation fails (security check, manifest integrity, dependency conflict)
3. CLAUDE.md injection fails (merge conflict, syntax error, file locked)
4. Registry update fails (corrupted JSON, write permission denied)

**Manual Triggers:**
5. User invokes rollback command: `aiwg -update-claude --reset`
6. User detects corrupted system state and initiates recovery

## 8. Main Success Scenario

1. **Rollback Initiated** (Automatic or Manual):
   - Installation failure detected by PluginManager (exception thrown in deployment pipeline)
   - PluginManager captures failure context:
     - Failed plugin ID (e.g., `gdpr-compliance`)
     - Failure stage (deployment, validation, injection, registry update)
     - Error message (e.g., "ENOSPC: no space left on device")
     - Timestamp of failure (ISO 8601 format)
   - PluginManager logs failure: `.aiwg/logs/installation-failure-{timestamp}.log`

2. **Pre-Rollback Validation** (Safety Checks):
   - PluginManager validates rollback eligibility:
     - Baseline backup exists (`CLAUDE.md.pre-plugins` found)
     - Baseline integrity verified (SHA-256 checksum matches expected)
     - User has write permissions (test write to `.claude/` and `.aiwg/`)
     - Disk space sufficient (>50KB free for temporary operations)
   - If validation fails → **Exception Flow Exc-001** (Baseline Missing)
   - If validation passes → Proceed to Step 3

3. **Create Pre-Rollback Safety Checkpoint** (Paranoid Backup):
   - PluginManager creates temporary backup of current state (before clearing):
     - Copy `.claude/agents/` → `.aiwg/backups/pre-rollback-agents-{timestamp}/`
     - Copy `.claude/commands/` → `.aiwg/backups/pre-rollback-commands-{timestamp}/`
     - Copy `CLAUDE.md` → `.aiwg/backups/pre-rollback-CLAUDE.md.{timestamp}`
     - Copy `.aiwg/plugins/registry.json` → `.aiwg/backups/pre-rollback-registry.json.{timestamp}`
   - Safety checkpoint retention: 30 days (configurable, auto-cleanup after retention period)
   - Purpose: Enable forensic analysis of failure, support debugging, provide double-safety net

4. **Clear All Deployed Plugin Artifacts** (Reset Phase):
   - PluginManager executes reset operations (atomic, fail-safe):
     - Remove `.claude/agents/` directory (recursive deletion, ignore errors if already missing)
     - Remove `.claude/commands/` directory (recursive deletion, ignore errors if already missing)
     - Remove `.aiwg-plugins/` directory (plugin installations, ignore errors if already missing)
   - Reset completion verification:
     - Verify directories no longer exist (or are empty)
     - Count orphaned files: Must be zero (scan for residual artifacts)
   - If orphaned files detected → Log warning (non-blocking, proceed to Step 5)

5. **Restore CLAUDE.md Baseline** (Critical State Restoration):
   - PluginManager restores baseline:
     - Read baseline: `CLAUDE.md.pre-plugins` (immutable source)
     - Write to `CLAUDE.md` (overwrite current file)
     - Verify integrity: SHA-256 checksum of restored file matches baseline checksum
   - If baseline missing → **Exception Flow Exc-001** (Baseline Missing)
   - If integrity check fails → **Exception Flow Exc-002** (Baseline Corrupted)
   - CLAUDE.md permissions: Match baseline permissions (prevent privilege escalation)

6. **Clear Plugin Registry** (Declarative State Reset):
   - PluginManager resets registry to empty state:
     - Write empty registry: `.aiwg/plugins/registry.json` → `{"plugins": [], "version": "1.0"}`
     - Verify JSON validity (parse and validate schema)
     - Set registry permissions: Read/write for user only (0600)
   - If registry write fails → **Exception Flow Exc-004** (Registry Write Failure)

7. **Validate System State** (Post-Rollback Integrity Check):
   - PluginManager runs comprehensive validation:
     - **File Existence Checks**:
       - `CLAUDE.md` exists and is readable (baseline restored)
       - `.claude/agents/` does not exist (or is empty)
       - `.claude/commands/` does not exist (or is empty)
       - `.aiwg-plugins/` does not exist (or is empty)
     - **Content Validation**:
       - `CLAUDE.md` matches baseline checksum (bit-for-bit identical)
       - `.aiwg/plugins/registry.json` is valid JSON with zero plugins
     - **Orphan Detection**:
       - Scan `.claude/` for residual files (should be empty)
       - Scan `.aiwg-plugins/` for residual files (should not exist)
       - Count orphans: Must be zero (NFR-RB-03 compliance)
   - Validation result: PASS (proceed to Step 8) or FAIL (→ **Exception Flow Exc-003**)

8. **Log Rollback Operation** (Audit Trail):
   - PluginManager generates rollback report:
     - Timestamp: ISO 8601 format (e.g., `2025-10-22T14:35:22Z`)
     - Trigger: Automatic (installation failure) or Manual (user-invoked)
     - Failed plugin ID: (if applicable, e.g., `gdpr-compliance`)
     - Failure reason: Original error message
     - Rollback duration: Measured in milliseconds (target: <5000ms)
     - Validation result: PASS (all checks passed)
     - Orphan count: Zero (clean rollback)
   - Save to: `.aiwg/logs/rollback-{timestamp}.log` (permanent audit trail)

9. **Display Rollback Summary** (User Communication):
   - PluginManager outputs user-friendly summary:
     ```
     ✓ Rollback complete (3.2 seconds)

     - Plugin deployment rolled back: gdpr-compliance
     - CLAUDE.md restored to baseline
     - Registry cleared (zero active plugins)
     - Zero orphaned files

     System ready for fresh plugin installation.

     To retry installation:
       aiwg -update-claude --mode sdlc

     Rollback log: .aiwg/logs/rollback-2025-10-22T143522Z.log
     ```
   - Exit code: 0 (success, allows scripting automation)

10. **Notify User of Recovery Options** (Next Steps):
    - PluginManager suggests recovery actions:
      - **Option 1**: Retry installation (after fixing root cause, e.g., free disk space)
      - **Option 2**: Inspect rollback log (troubleshoot failure reason)
      - **Option 3**: Redeploy previous working plugin set (if registry backup exists)
    - If failure was disk space: Display disk usage report (help user free space)
    - If failure was network: Suggest offline installation mode (future feature)

11. **Update Metrics** (Observability):
    - PluginManager records rollback metrics (if FID-002 Metrics Collection implemented):
      - Rollback count: Increment counter (track rollback frequency)
      - Rollback duration: Record to percentile histogram (p50, p95, p99)
      - Failure reasons: Categorize (disk space, network, permissions, etc.)
      - Success rate: Calculate (successful rollbacks / total rollbacks)
    - Metrics destination: `.aiwg/metrics/rollback-metrics.json` (if available)

12. **System Ready for Redeployment** (Clean State Verified):
    - User can now:
      - Fix root cause of installation failure (e.g., free disk space, fix network)
      - Retry plugin installation: `aiwg -update-claude --mode sdlc`
      - Deploy different plugin: `aiwg -install-plugin other-plugin`
      - Continue work without plugins (clean baseline CLAUDE.md)
    - System integrity guaranteed: No residual plugin artifacts affecting future operations

## 9. Alternate Flows

### Alt-1: Rollback to Specific Previous State (Version Selection)

**Branch Point:** Step 1 (Rollback Initiated)
**Condition:** User wants to rollback to specific previous plugin configuration (not just baseline)

**Flow:**
1. User invokes version-specific rollback: `aiwg -update-claude --rollback-to v2025-10-15`
2. PluginManager reads safety checkpoint history: `.aiwg/backups/`
3. PluginManager lists available rollback points:
   ```
   Available rollback points:
   1. v2025-10-22 (current) - 3 plugins (sdlc-agents, sdlc-commands, gdpr-compliance)
   2. v2025-10-15 (1 week ago) - 2 plugins (sdlc-agents, sdlc-commands)
   3. v2025-10-01 (3 weeks ago) - 1 plugin (sdlc-agents)
   4. baseline (original) - 0 plugins (clean CLAUDE.md)
   ```
4. User confirms selection: "Rollback to v2025-10-15"
5. PluginManager executes targeted rollback:
   - Clear current state (Step 4 of main flow)
   - Restore selected checkpoint:
     - Copy `.aiwg/backups/pre-rollback-agents-2025-10-15/` → `.claude/agents/`
     - Copy `.aiwg/backups/pre-rollback-commands-2025-10-15/` → `.claude/commands/`
     - Copy `.aiwg/backups/pre-rollback-CLAUDE.md.2025-10-15` → `CLAUDE.md`
     - Copy `.aiwg/backups/pre-rollback-registry.json.2025-10-15` → `.aiwg/plugins/registry.json`
6. PluginManager validates restoration (Step 7 of main flow)
7. **Resume Main Flow:** Step 8 (Log rollback operation)

**Business Value:** Granular rollback control (not just "reset to zero"), supports incremental plugin experimentation

### Alt-2: Partial Rollback (Selective Artifact Restoration)

**Branch Point:** Step 4 (Clear All Deployed Plugin Artifacts)
**Condition:** User wants to rollback only agents (preserve commands) or vice versa

**Flow:**
1. User invokes partial rollback: `aiwg -update-claude --rollback-agents-only`
2. PluginManager validates partial rollback eligibility:
   - Baseline exists for agents (`.aiwg/backups/pre-rollback-agents-{timestamp}/`)
   - Commands not affected (`.claude/commands/` preserved)
3. PluginManager executes selective reset:
   - Remove `.claude/agents/` directory only (do not touch `.claude/commands/`)
   - Do not modify CLAUDE.md (preserve command injections)
   - Update registry: Remove agent entries, keep command entries
4. PluginManager validates partial state:
   - `.claude/agents/` empty (agents rolled back)
   - `.claude/commands/` intact (commands preserved)
   - Registry consistent (reflects partial state)
5. PluginManager displays partial rollback summary:
   ```
   ✓ Partial rollback complete (1.8 seconds)

   - Agents rolled back (58 agents removed)
   - Commands preserved (42 commands intact)
   - Registry updated (agents cleared, commands retained)

   System ready for agent redeployment.
   ```
6. **Resume Main Flow:** Step 8 (Log rollback operation with "partial" flag)

**Business Value:** Surgical rollback (fine-grained control), useful for debugging specific plugin components

### Alt-3: Dry-Run Mode (Preview Rollback Without Executing)

**Branch Point:** Step 2 (Pre-Rollback Validation)
**Condition:** User wants to preview rollback impact without committing changes

**Flow:**
1. User invokes dry-run rollback: `aiwg -update-claude --reset --dry-run`
2. PluginManager runs validation (Step 2 of main flow)
3. PluginManager simulates rollback operations:
   - **Would remove:**
     - `.claude/agents/` (58 agents, 2.3MB)
     - `.claude/commands/` (42 commands, 350KB)
     - `.aiwg-plugins/` (1 plugin, 500KB)
   - **Would restore:**
     - `CLAUDE.md` from baseline (15KB → 12KB, 3 plugin sections removed)
   - **Would clear:**
     - `.aiwg/plugins/registry.json` (3 plugins → 0 plugins)
4. PluginManager displays dry-run report:
   ```
   ✓ Dry-run rollback analysis complete

   Impact preview:
   - 58 agents would be removed (2.3MB disk space freed)
   - 42 commands would be removed (350KB disk space freed)
   - CLAUDE.md would be restored to baseline (3 plugin sections removed)
   - 3 active plugins would be deactivated

   Validation: PASS (all preconditions met)
   Orphan risk: LOW (zero orphaned files expected)

   To execute rollback:
     aiwg -update-claude --reset
   ```
5. PluginManager exits without modifying system state (dry-run complete)
6. User reviews dry-run report, decides whether to proceed with actual rollback

**Business Value:** Risk-free preview (build user confidence), troubleshooting tool (understand rollback scope)

### Alt-4: Rollback with Immediate Redeployment (Reset + Redeploy Atomic Operation)

**Branch Point:** Step 12 (System Ready for Redeployment)
**Condition:** User wants to rollback and immediately redeploy known-good plugin configuration

**Flow:**
1. User invokes atomic reset + redeploy: `aiwg -update-claude --reset --redeploy sdlc`
2. PluginManager executes rollback (Steps 1-12 of main flow)
3. After rollback completes, PluginManager initiates redeploy:
   - Read target mode: `sdlc` (redeploy SDLC agents + commands)
   - Execute deployment workflow (UC-008: Deploy SDLC Framework)
   - Deploy 58 agents to `.claude/agents/`
   - Deploy 42 commands to `.claude/commands/`
   - Inject CLAUDE.md sections (orchestration prompts)
   - Update registry: `.aiwg/plugins/registry.json` (3 plugins active)
4. PluginManager validates redeployment:
   - All agents deployed successfully (100% success rate)
   - All commands deployed successfully (100% success rate)
   - CLAUDE.md injection successful (no merge conflicts)
   - Registry consistent (3 plugins registered)
5. PluginManager displays atomic operation summary:
   ```
   ✓ Reset + redeploy complete (8.5 seconds)

   Rollback:
   - CLAUDE.md restored to baseline (3.2s)
   - All artifacts cleared (zero orphans)

   Redeploy:
   - 58 agents deployed (5.1s)
   - 42 commands deployed (0.2s)
   - Registry updated (3 plugins active)

   System ready for use.
   ```
6. User can immediately resume work with fresh plugin deployment

**Business Value:** One-command recovery (minimize downtime), ideal for automated CI/CD pipelines

## 10. Exception Flows

### Exc-1: Baseline Backup Missing (Cannot Restore CLAUDE.md)

**Trigger:** Step 2 (Pre-Rollback Validation) or Step 5 (Restore CLAUDE.md Baseline)
**Condition:** `CLAUDE.md.pre-plugins` file does not exist (never created or accidentally deleted)

**Flow:**
1. PluginManager detects missing baseline: `CLAUDE.md.pre-plugins` not found
2. PluginManager logs error: `.aiwg/logs/rollback-failure-{timestamp}.log`
   ```
   ERROR: Baseline backup missing (CLAUDE.md.pre-plugins not found)

   Possible causes:
   - Baseline never created (first plugin install failed before baseline backup)
   - Baseline deleted manually (user error)
   - Baseline moved/renamed (filesystem corruption)

   Rollback cannot proceed without baseline.
   ```
3. PluginManager checks for alternative recovery options:
   - **Option A:** Git repository exists → Suggest `git checkout CLAUDE.md`
   - **Option B:** User backup exists → Prompt for manual restoration
   - **Option C:** No backups available → Suggest clean reinstall
4. PluginManager displays error message with remediation:
   ```
   ✗ Rollback failed: Baseline backup missing

   Recovery options:

   Option 1: Restore from Git (if available)
     git checkout CLAUDE.md
     aiwg -update-claude --reset

   Option 2: Restore from manual backup (if available)
     cp /path/to/backup/CLAUDE.md CLAUDE.md
     aiwg -update-claude --reset

   Option 3: Clean reinstall (last resort)
     rm -rf .claude/ .aiwg-plugins/ .aiwg/plugins/
     aiwg -update-claude --mode sdlc

   Rollback log: .aiwg/logs/rollback-failure-2025-10-22T143522Z.log
   ```
5. PluginManager exits with error code: 1 (rollback incomplete)
6. User follows remediation steps to manually restore system state

**Mitigation Strategy:** On first plugin install, prominently warn user that baseline is critical and suggest committing to Git

### Exc-2: Baseline Corrupted (Integrity Check Fails)

**Trigger:** Step 5 (Restore CLAUDE.md Baseline)
**Condition:** SHA-256 checksum mismatch between baseline and expected checksum

**Flow:**
1. PluginManager reads baseline: `CLAUDE.md.pre-plugins`
2. PluginManager computes SHA-256 checksum: `abc123...` (current)
3. PluginManager reads expected checksum: `.aiwg/backups/baseline-checksum.txt` → `def456...` (expected)
4. Checksum mismatch detected: `abc123...` ≠ `def456...`
5. PluginManager logs error: `.aiwg/logs/rollback-failure-{timestamp}.log`
   ```
   ERROR: Baseline backup corrupted (checksum mismatch)

   Expected: def456...
   Actual:   abc123...

   Possible causes:
   - Baseline modified manually (user error)
   - Filesystem corruption (disk error)
   - Malicious tampering (security incident)

   Rollback cannot proceed with corrupted baseline.
   ```
6. PluginManager checks for alternative recovery options:
   - **Option A:** Git repository exists → Suggest `git checkout CLAUDE.md.pre-plugins` (restore baseline from Git)
   - **Option B:** Safety checkpoint exists → Prompt to use most recent checkpoint (instead of baseline)
   - **Option C:** No alternatives available → Suggest clean reinstall
7. PluginManager displays error message with remediation:
   ```
   ✗ Rollback failed: Baseline backup corrupted

   Recovery options:

   Option 1: Restore baseline from Git (if available)
     git checkout CLAUDE.md.pre-plugins
     aiwg -update-claude --reset

   Option 2: Use safety checkpoint (if available)
     aiwg -update-claude --rollback-to v2025-10-15

   Option 3: Clean reinstall (last resort)
     rm -rf .claude/ .aiwg-plugins/ .aiwg/plugins/ CLAUDE.md.pre-plugins
     git checkout CLAUDE.md
     aiwg -update-claude --mode sdlc

   Rollback log: .aiwg/logs/rollback-failure-2025-10-22T143522Z.log
   ```
8. PluginManager exits with error code: 2 (baseline corruption)

**Mitigation Strategy:** Store baseline checksum alongside baseline, verify integrity on every rollback

### Exc-3: Disk Space Exhausted (Cannot Create Safety Checkpoint)

**Trigger:** Step 3 (Create Pre-Rollback Safety Checkpoint)
**Condition:** Insufficient disk space to create temporary backup (ENOSPC error)

**Flow:**
1. PluginManager attempts to create safety checkpoint: Copy `.claude/agents/` → `.aiwg/backups/pre-rollback-agents-{timestamp}/`
2. Filesystem returns error: `ENOSPC: no space left on device`
3. PluginManager detects disk space issue
4. PluginManager checks available disk space: `df -h .aiwg/` → 0 bytes available
5. PluginManager logs warning: `.aiwg/logs/rollback-warning-{timestamp}.log`
   ```
   WARNING: Disk space exhausted (cannot create safety checkpoint)

   Available space: 0 bytes
   Required space: ~3MB (safety checkpoint)

   Proceeding with rollback WITHOUT safety checkpoint (higher risk).
   ```
6. PluginManager prompts user for confirmation:
   ```
   ⚠ Disk space exhausted

   Cannot create safety checkpoint (no space for backup).
   Rollback will proceed WITHOUT safety net.

   Risk: If rollback fails, no backup available for recovery.

   Continue? (y/N)
   ```
7. User confirms: "Yes, proceed with rollback"
8. PluginManager skips Step 3 (no safety checkpoint created)
9. **Resume Main Flow:** Step 4 (Clear All Deployed Plugin Artifacts)
10. PluginManager displays rollback summary with warning:
    ```
    ✓ Rollback complete (2.1 seconds)

    ⚠ WARNING: Rollback completed without safety checkpoint (disk space exhausted)

    Recommendation: Free disk space and create manual backup before next plugin operation.
    ```

**Mitigation Strategy:** Pre-flight disk space check before rollback, prompt user to free space if low

### Exc-4: Registry Write Failure (Permissions Denied)

**Trigger:** Step 6 (Clear Plugin Registry)
**Condition:** User lacks write permissions to `.aiwg/plugins/registry.json`

**Flow:**
1. PluginManager attempts to write empty registry: `.aiwg/plugins/registry.json` → `{"plugins": []}`
2. Filesystem returns error: `EACCES: permission denied`
3. PluginManager detects permissions issue
4. PluginManager checks file permissions: `ls -l .aiwg/plugins/registry.json` → `-r--r--r--` (read-only)
5. PluginManager logs error: `.aiwg/logs/rollback-failure-{timestamp}.log`
   ```
   ERROR: Registry write failure (permission denied)

   File: .aiwg/plugins/registry.json
   Permissions: -r--r--r-- (read-only)

   Rollback cannot complete without clearing registry.
   ```
6. PluginManager displays error message with remediation:
   ```
   ✗ Rollback failed: Cannot write to plugin registry

   Recovery options:

   Option 1: Fix file permissions
     chmod 644 .aiwg/plugins/registry.json
     aiwg -update-claude --reset

   Option 2: Delete and recreate registry
     rm .aiwg/plugins/registry.json
     aiwg -update-claude --reset

   Option 3: Run as administrator (if permissions issue persists)
     sudo aiwg -update-claude --reset

   Rollback log: .aiwg/logs/rollback-failure-2025-10-22T143522Z.log
   ```
7. PluginManager exits with error code: 3 (registry write failure)
8. User follows remediation steps to fix permissions

**Mitigation Strategy:** Pre-flight permissions check before rollback, auto-fix permissions if safe

### Exc-5: Rollback During Active Workflow (Orchestration In Progress)

**Trigger:** Step 1 (Rollback Initiated)
**Condition:** Core Orchestrator is actively running multi-agent workflow (e.g., UC-004 in progress)

**Flow:**
1. User invokes rollback: `aiwg -update-claude --reset`
2. PluginManager detects active workflow:
   - Check for lock file: `.aiwg/locks/orchestrator.lock` exists
   - Read lock metadata: Workflow started at 2025-10-22T14:00:00Z, estimated completion in 10 minutes
3. PluginManager logs warning: `.aiwg/logs/rollback-warning-{timestamp}.log`
   ```
   WARNING: Active workflow detected (orchestration in progress)

   Workflow: UC-004 (Multi-Agent Documentation Generation)
   Started: 2025-10-22T14:00:00Z
   Estimated completion: 10 minutes

   Rollback during active workflow may corrupt workflow state.
   ```
4. PluginManager prompts user for confirmation:
   ```
   ⚠ Active workflow detected

   Workflow: Multi-Agent Documentation Generation
   Estimated completion: 10 minutes

   Rolling back during active workflow may:
   - Corrupt in-progress artifacts
   - Abort agent tasks prematurely
   - Leave workflow in inconsistent state

   Options:
   1. Wait for workflow to complete (recommended)
   2. Abort workflow and proceed with rollback (risky)
   3. Cancel rollback

   Choose option (1-3):
   ```
5. User chooses: "Option 1: Wait for workflow to complete"
6. PluginManager monitors lock file: Wait for `.aiwg/locks/orchestrator.lock` to be removed
7. Workflow completes: Lock file removed
8. PluginManager proceeds with rollback
9. **Resume Main Flow:** Step 2 (Pre-Rollback Validation)

**Alternate User Choice:** If user chooses "Option 2: Abort workflow"
- PluginManager sends SIGTERM to orchestrator process (graceful shutdown request)
- Wait 30 seconds for orchestrator to clean up
- If orchestrator still running → Send SIGKILL (force termination)
- Mark workflow as ABORTED: `.aiwg/working/workflow-{id}/status.txt` → `ABORTED`
- Proceed with rollback

**Mitigation Strategy:** Advisory lock file during orchestration, detect and warn on rollback conflict

### Exc-6: No Backups Available (First-Time Install Failure)

**Trigger:** Step 2 (Pre-Rollback Validation)
**Condition:** First plugin installation failed before baseline backup created

**Flow:**
1. User attempts first plugin installation: `aiwg -update-claude --mode sdlc`
2. Installation fails mid-process (e.g., network timeout downloading agents)
3. PluginManager initiates automatic rollback
4. PluginManager checks for baseline: `CLAUDE.md.pre-plugins` does not exist (first install, baseline not created yet)
5. PluginManager detects first-time install failure
6. PluginManager logs info: `.aiwg/logs/rollback-info-{timestamp}.log`
   ```
   INFO: First-time install failure (no baseline exists yet)

   Baseline not created (installation failed before baseline backup).

   Rollback strategy: Clear partially installed artifacts, leave CLAUDE.md as-is.
   ```
7. PluginManager executes minimal rollback:
   - Clear `.claude/agents/` (if exists, partial deployment)
   - Clear `.claude/commands/` (if exists, partial deployment)
   - Clear `.aiwg-plugins/` (if exists, partial installation)
   - Do NOT modify CLAUDE.md (no baseline to restore, assume CLAUDE.md is clean)
   - Clear registry: `.aiwg/plugins/registry.json` → `{"plugins": []}`
8. PluginManager displays rollback summary:
   ```
   ✓ Rollback complete (1.5 seconds)

   Note: First-time install failure
   - Partially installed artifacts cleared
   - CLAUDE.md unchanged (no baseline existed)
   - System ready for fresh installation attempt

   To retry installation:
     aiwg -update-claude --mode sdlc

   Rollback log: .aiwg/logs/rollback-info-2025-10-22T143522Z.log
   ```
9. **Resume Main Flow:** Step 8 (Log rollback operation with "first-time failure" flag)

**Mitigation Strategy:** Create baseline backup BEFORE any plugin operations (Step 0 of installation workflow)

## 11. Special Requirements

### Performance Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-RB-01: Rollback time | <5 seconds | User experience (minimize downtime during recovery) |
| NFR-RB-02: Safety checkpoint creation | <2 seconds | Pre-rollback backup (paranoid safety net) |
| NFR-RB-03: Baseline restoration | <1 second | Critical path (CLAUDE.md restore) |
| NFR-RB-04: Orphan detection scan | <3 seconds | Post-rollback validation (comprehensive file scan) |

### Quality Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-RB-05: Data integrity | 100% state restoration | Reliability (perfect rollback or fail gracefully) |
| NFR-RB-06: Orphan files | Zero count | Clean recovery (no residual plugin artifacts) |
| NFR-RB-07: Rollback success rate | >99% | Trust (rollback must be reliable safety net) |
| NFR-RB-08: Baseline integrity validation | 100% checksum verification | Security (detect tampering or corruption) |

### Usability Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-RB-09: Error message clarity | Clear remediation steps | User experience (self-service recovery) |
| NFR-RB-10: Rollback automation | Zero manual steps for standard failures | Productivity (one-command recovery) |
| NFR-RB-11: Dry-run mode | Preview without execution | Risk reduction (build user confidence) |

## 12. Related Business Rules

**BR-RB-001: Baseline Immutability**
- Baseline backup (`CLAUDE.md.pre-plugins`) created once on first plugin deployment
- Never overwritten after creation (immutable reference point)
- Deleted only on explicit user request (`aiwg -clean-baseline`)
- Rationale: Prevent baseline corruption from repeated overwrites

**BR-RB-002: Safety Checkpoint Retention**
- Pre-rollback checkpoints retained for 30 days (configurable)
- Automatic cleanup after retention period (disk space management)
- Manual cleanup available: `aiwg -clean-checkpoints --older-than 30d`
- Rationale: Balance forensic analysis capability with disk space constraints

**BR-RB-003: Rollback Atomicity**
- Rollback operations are atomic: Either complete successfully or fail gracefully
- No partial rollback state (if rollback fails, leave current state intact)
- Rationale: Prevent worse outcome than original failure (don't compound problems)

**BR-RB-004: Audit Trail Completeness**
- Every rollback operation logged (success or failure)
- Logs retained permanently (compliance tracking)
- Logs include: timestamp, trigger, failure reason, rollback duration, validation result
- Rationale: Enable troubleshooting, compliance audits, trend analysis

## 13. Data Requirements

### Input Data

| Data Element | Format | Source | Validation |
|-------------|--------|---------|-----------|
| Rollback Trigger | Enum (automatic, manual) | Installation failure or user command | Valid enum value |
| Failed Plugin ID | String (plugin identifier) | Installation context | Matches plugin naming pattern |
| Failure Reason | String (error message) | Exception message | Non-empty, <500 chars |
| Baseline Backup | File (`CLAUDE.md.pre-plugins`) | First plugin install | Exists, readable, SHA-256 checksum valid |
| Plugin Registry | JSON file (`.aiwg/plugins/registry.json`) | Active plugin list | Valid JSON, parseable |

### Output Data

| Data Element | Format | Destination | Retention |
|-------------|--------|-------------|----------|
| Rollback Log | Markdown file (`.aiwg/logs/rollback-{timestamp}.log`) | Audit trail | Permanent (Git-tracked) |
| Safety Checkpoint | Directory (`.aiwg/backups/pre-rollback-{timestamp}/`) | Forensic analysis | 30 days (configurable) |
| Restored CLAUDE.md | Markdown file (`CLAUDE.md`) | Project root | Permanent (Git-tracked) |
| Cleared Registry | JSON file (`.aiwg/plugins/registry.json`) | Plugin state | Permanent (Git-tracked) |

### Data Validation Rules

**Baseline Backup:**
- Must be valid markdown (parseable by markdown parser)
- Size: >1KB and <100KB (reasonable CLAUDE.md size range)
- Checksum: SHA-256 hash stored in `.aiwg/backups/baseline-checksum.txt`
- Integrity check: Verify checksum on every rollback operation

**Rollback Log:**
- Must contain required sections: Timestamp, Trigger, Failure Reason, Duration, Validation Result
- Timestamp format: ISO 8601 (e.g., `2025-10-22T14:35:22Z`)
- Duration: Measured in milliseconds, must be >0 and <60000 (reasonable rollback time <1 minute)

## 14. Open Issues and TODOs

1. **Issue 001: Rollback during Git merge conflicts**
   - **Description:** If user has uncommitted changes to CLAUDE.md and rollback restores baseline, changes lost. How to preserve user changes?
   - **Impact:** User data loss (uncommitted work destroyed)
   - **Owner:** DevOps Engineer agent
   - **Due Date:** Version 1.1 (post-MVP)
   - **Proposed Solution:** Detect uncommitted changes, create stash, restore baseline, prompt user to re-apply stash

2. **Issue 002: Rollback performance with large plugin sets**
   - **Description:** Safety checkpoint creation for 100+ plugins may exceed 2-second target (NFR-RB-02)
   - **Impact:** Performance degradation (slow rollback initiation)
   - **Owner:** Performance Engineer agent
   - **Due Date:** Version 1.2 (optimization phase)
   - **Proposed Solution:** Incremental checkpointing, parallel file copy, compression

3. **TODO 001: Rollback metrics dashboard**
   - **Description:** Visualize rollback trends (frequency, success rate, failure reasons)
   - **Assigned:** Metrics Collector agent
   - **Due Date:** Version 1.1 (FID-002 Metrics Collection feature)

4. **TODO 002: Rollback notification integration**
   - **Description:** Send notifications on rollback events (Slack, email, webhook)
   - **Assigned:** Integration Specialist agent
   - **Due Date:** Version 2.0 (enterprise features)

5. **TODO 003: Rollback dry-run mode enhancement**
   - **Description:** Add interactive dry-run (step-by-step preview with abort option at each step)
   - **Assigned:** UX Engineer agent
   - **Due Date:** Version 1.2 (usability improvements)

## 15. References

**Requirements Documents:**
- [Use Case Brief](/aiwg/requirements/use-case-briefs/UC-010-plugin-rollback.md)
- [Feature Backlog Prioritized](/aiwg/requirements/feature-backlog-prioritized.md) - FID-005 (Plugin Rollback)
- [Vision Document](/aiwg/requirements/vision-document.md) - Section 3.4: Plugin Ecosystem

**Architecture Documents:**
- [ADR-006: Plugin Rollback Strategy](/aiwg/architecture/decisions/ADR-006-plugin-rollback-strategy.md) - Reset + Redeploy Pattern
- [Software Architecture Document](/aiwg/planning/sdlc-framework/architecture/software-architecture-doc.md) - Section 5.1 (PluginManager), Section 4.2 (Core Orchestrator)

**Related Use Cases:**
- [UC-008: Deploy SDLC Framework](/aiwg/requirements/use-cases/UC-008-deploy-sdlc-framework.md) - Plugin deployment workflow
- [UC-009: Install Third-Party Plugin](/aiwg/requirements/use-cases/UC-009-install-third-party-plugin.md) - Plugin installation process

**Agent Definitions:**
- [DevOps Engineer Agent](/agentic/code/frameworks/sdlc-complete/agents/devops-engineer.md)
- [Security Gatekeeper Agent](/agentic/code/frameworks/sdlc-complete/agents/security-gatekeeper.md)

**Templates:**
- [Deployment Plan Template](/agentic/code/frameworks/sdlc-complete/templates/deployment/deployment-plan-template.md)
- [Rollback Procedure Template](/agentic/code/frameworks/sdlc-complete/templates/deployment/rollback-procedure-template.md)

---

## Traceability Matrix

### Requirements Traceability

| Requirement ID | Source Document | Implementation Component | Test Case |
|---------------|-----------------|-------------------------|-----------|
| FID-005 | Feature Backlog Prioritized | PluginManager.rollback(), reset command | TC-RB-001 through TC-RB-020 |
| NFR-RB-01 | This document (Section 11) | Optimized file operations (parallel delete) | TC-RB-015 |
| NFR-RB-02 | This document (Section 11) | Safety checkpoint creation (incremental backup) | TC-RB-016 |
| NFR-RB-05 | This document (Section 11) | Baseline restoration with checksum verification | TC-RB-017 |
| NFR-RB-06 | This document (Section 11) | Orphan detection scan (recursive directory walk) | TC-RB-018 |
| BR-RB-001 | This document (Section 12) | Baseline immutability (write-once, read-many) | TC-RB-019 |

### SAD Component Mapping

**Primary Components (from SAD v1.0):**
- PluginManager (Section 5.1) - Orchestrates rollback workflow
- RollbackService (Section 5.1.3) - Implements reset + redeploy logic
- BaselineManager (Section 5.1.4) - Manages CLAUDE.md baseline backup/restore
- RegistryManager (Section 5.1.5) - Manages plugin registry state

**Supporting Components:**
- FileSystemService (Section 5.2) - File operations (copy, delete, scan)
- ValidationService (Section 5.3) - Integrity checks (checksum verification)
- LoggingService (Section 5.4) - Audit trail generation

**Integration Points:**
- `.aiwg/backups/` (safety checkpoints, baseline storage)
- `.aiwg/logs/` (rollback operation logs)
- `.aiwg/plugins/registry.json` (plugin state management)
- `CLAUDE.md.pre-plugins` (baseline backup)

### ADR References

**ADR-006: Plugin Rollback Strategy** (Primary architecture decision)
- Reset + redeploy pattern (simple, reliable, idempotent)
- Baseline backup strategy (single immutable reference point)
- Safety checkpoint retention (30-day forensic analysis window)
- Performance targets (rollback <5s, checkpoint <2s, restore <1s)

---

## Acceptance Criteria

### AC-001: Basic Rollback Workflow

**Given:** Plugin installation in progress fails mid-process (network timeout)
**When:** PluginManager detects failure and initiates automatic rollback
**Then:**
- Rollback completes in <5 seconds (NFR-RB-01)
- All deployed artifacts removed (`.claude/agents/`, `.claude/commands/`, `.aiwg-plugins/`)
- CLAUDE.md restored to baseline (bit-for-bit identical)
- Plugin registry cleared (zero active plugins)
- Zero orphaned files (NFR-RB-06)
- Rollback log generated (`.aiwg/logs/rollback-{timestamp}.log`)

### AC-002: Manual Rollback Command

**Given:** User detects corrupted system state (CLAUDE.md modified incorrectly)
**When:** User invokes manual rollback: `aiwg -update-claude --reset`
**Then:**
- Rollback executes successfully (same workflow as automatic rollback)
- User-friendly summary displayed (rollback duration, artifacts cleared, next steps)
- System ready for fresh plugin installation
- Manual rollback logged (trigger: "manual" in audit trail)

### AC-003: Safety Checkpoint Creation

**Given:** Rollback initiated (automatic or manual)
**When:** PluginManager creates pre-rollback safety checkpoint (Step 3)
**Then:**
- Safety checkpoint created in <2 seconds (NFR-RB-02)
- All current artifacts backed up (agents, commands, CLAUDE.md, registry)
- Checkpoint stored in `.aiwg/backups/pre-rollback-{timestamp}/`
- Checkpoint retained for 30 days (BR-RB-002)
- Checkpoint available for forensic analysis (if rollback fails)

### AC-004: Baseline Restoration Integrity

**Given:** Baseline backup exists (`CLAUDE.md.pre-plugins`)
**When:** Rollback restores baseline (Step 5)
**Then:**
- Baseline restored in <1 second (NFR-RB-03)
- Restored CLAUDE.md matches baseline checksum (100% integrity, NFR-RB-08)
- No data loss (baseline bit-for-bit identical to original)
- CLAUDE.md permissions match baseline (no privilege escalation)

### AC-005: Orphan Detection Validation

**Given:** Rollback completes (all artifacts cleared)
**When:** PluginManager runs orphan detection scan (Step 7)
**Then:**
- Orphan scan completes in <3 seconds (NFR-RB-04)
- Zero orphaned files detected (NFR-RB-06)
- Directories empty or removed (`.claude/`, `.aiwg-plugins/`)
- No residual plugin artifacts (clean system state)

### AC-006: Audit Trail Completeness

**Given:** Rollback operation completes (success or failure)
**When:** PluginManager generates rollback log (Step 8)
**Then:**
- Rollback log created: `.aiwg/logs/rollback-{timestamp}.log`
- Log contains required sections: Timestamp, Trigger, Failure Reason, Duration, Validation Result
- Timestamp in ISO 8601 format (e.g., `2025-10-22T14:35:22Z`)
- Log retained permanently (BR-RB-004)

### AC-007: Rollback Success Rate

**Given:** 100 plugin installations (mix of successes and failures)
**When:** Installations fail and trigger automatic rollback
**Then:**
- Rollback success rate >99% (NFR-RB-07)
- Failed rollbacks logged with clear error messages
- Failed rollbacks provide manual recovery steps
- No unrecoverable system states (always a path to recovery)

### AC-008: Dry-Run Mode Preview

**Given:** User wants to preview rollback impact
**When:** User invokes dry-run mode: `aiwg -update-claude --reset --dry-run`
**Then:**
- Dry-run analysis completes without modifying system state
- Impact preview displayed (artifacts to remove, disk space freed, plugins deactivated)
- Validation result shown (PASS/FAIL with reasons)
- User can decide whether to proceed with actual rollback

### AC-009: Rollback to Specific Version

**Given:** Multiple safety checkpoints exist (v2025-10-22, v2025-10-15, v2025-10-01)
**When:** User invokes version-specific rollback: `aiwg -update-claude --rollback-to v2025-10-15`
**Then:**
- Checkpoint list displayed (all available rollback points)
- User confirms selection
- Targeted rollback executes (restore v2025-10-15 state)
- System state matches v2025-10-15 checkpoint (validation passes)

### AC-010: Partial Rollback Execution

**Given:** User wants to rollback only agents (preserve commands)
**When:** User invokes partial rollback: `aiwg -update-claude --rollback-agents-only`
**Then:**
- Agents removed (`.claude/agents/` cleared)
- Commands preserved (`.claude/commands/` intact)
- Registry updated (agents cleared, commands retained)
- Partial rollback logged (flag: "partial" in audit trail)

### AC-011: Reset + Redeploy Atomic Operation

**Given:** User wants to rollback and immediately redeploy SDLC framework
**When:** User invokes atomic operation: `aiwg -update-claude --reset --redeploy sdlc`
**Then:**
- Rollback completes successfully (baseline restored, artifacts cleared)
- Redeployment initiates immediately (no manual step between)
- SDLC framework deployed (58 agents, 42 commands)
- Total operation time <12 seconds (rollback <5s + redeploy <7s)

### AC-012: Baseline Missing Remediation

**Given:** Baseline backup missing (`CLAUDE.md.pre-plugins` deleted)
**When:** User attempts rollback
**Then:**
- Rollback fails gracefully (no system state corruption)
- Error message displayed with clear remediation steps (restore from Git, manual backup, or clean reinstall)
- Rollback log generated (failure reason: "baseline missing")
- User can follow remediation steps to manually recover

### AC-013: Baseline Corrupted Remediation

**Given:** Baseline backup corrupted (checksum mismatch)
**When:** User attempts rollback
**Then:**
- Corruption detected (checksum verification fails)
- Rollback fails gracefully (no system state corruption)
- Error message displayed with recovery options (restore baseline from Git, use checkpoint, or clean reinstall)
- Rollback log generated (failure reason: "baseline corrupted")

### AC-014: Disk Space Exhaustion Handling

**Given:** Disk space exhausted (0 bytes available)
**When:** Rollback initiated (cannot create safety checkpoint)
**Then:**
- Disk space issue detected (ENOSPC error)
- User prompted for confirmation (proceed without safety checkpoint)
- Rollback proceeds with risk warning (no backup available)
- Rollback log includes warning flag (no safety checkpoint created)

### AC-015: Active Workflow Conflict Detection

**Given:** Core Orchestrator running active workflow (UC-004 in progress)
**When:** User attempts rollback
**Then:**
- Active workflow detected (lock file exists)
- User prompted with options (wait for completion, abort workflow, cancel rollback)
- If user waits → Rollback proceeds after workflow completes
- If user aborts → Workflow terminated gracefully, rollback proceeds

---

## Test Cases

### TC-RB-001: Basic Automatic Rollback

**Objective:** Validate automatic rollback on installation failure
**Preconditions:** Plugin installation in progress, network timeout occurs
**Test Steps:**
1. Initiate plugin installation: `aiwg -update-claude --mode sdlc`
2. Simulate network timeout (disconnect network mid-install)
3. Verify installation failure detected
4. Verify automatic rollback initiated
5. Wait for rollback completion
6. Verify rollback summary displayed
7. Verify all artifacts cleared (`.claude/agents/`, `.claude/commands/`, `.aiwg-plugins/`)
8. Verify CLAUDE.md restored to baseline (checksum match)
9. Verify registry cleared (zero plugins)
10. Verify rollback log generated
**Expected Result:** Rollback completes in <5 seconds, system restored to pre-installation state
**Pass/Fail:** PASS if all verifications true

### TC-RB-002: Manual Rollback Command

**Objective:** Validate manual rollback invocation
**Preconditions:** System in corrupted state (manual CLAUDE.md edit)
**Test Steps:**
1. Manually corrupt CLAUDE.md (add invalid syntax)
2. Run manual rollback: `aiwg -update-claude --reset`
3. Verify rollback executes
4. Verify CLAUDE.md restored to baseline (invalid syntax removed)
5. Verify rollback summary displayed
6. Verify rollback log includes trigger: "manual"
**Expected Result:** Manual rollback completes successfully, CLAUDE.md restored
**Pass/Fail:** PASS if CLAUDE.md baseline restored

### TC-RB-003: Safety Checkpoint Creation

**Objective:** Validate safety checkpoint creation before rollback
**Preconditions:** Rollback initiated
**Test Steps:**
1. Start timer
2. Initiate rollback
3. Monitor safety checkpoint creation
4. Stop timer when checkpoint complete
5. Verify checkpoint directory exists: `.aiwg/backups/pre-rollback-{timestamp}/`
6. Verify checkpoint contains: agents/, commands/, CLAUDE.md, registry.json
7. Verify checkpoint creation time <2 seconds
**Expected Result:** Safety checkpoint created in <2 seconds, all artifacts backed up
**Pass/Fail:** PASS if checkpoint created <2s

### TC-RB-004: Baseline Restoration Integrity

**Objective:** Validate baseline restoration checksum verification
**Preconditions:** Baseline backup exists
**Test Steps:**
1. Compute baseline checksum: `sha256sum CLAUDE.md.pre-plugins`
2. Initiate rollback
3. Wait for baseline restoration (Step 5)
4. Compute restored checksum: `sha256sum CLAUDE.md`
5. Verify checksums match (baseline == restored)
6. Verify restoration time <1 second
**Expected Result:** Restored CLAUDE.md matches baseline checksum (100% integrity)
**Pass/Fail:** PASS if checksums match

### TC-RB-005: Orphan Detection Scan

**Objective:** Validate orphan file detection after rollback
**Preconditions:** Rollback completed
**Test Steps:**
1. Initiate rollback
2. Wait for rollback completion
3. Run orphan detection scan (Step 7)
4. Count orphaned files in `.claude/` and `.aiwg-plugins/`
5. Verify orphan count: Must be zero
6. Verify scan time <3 seconds
**Expected Result:** Zero orphaned files detected, scan completes in <3 seconds
**Pass/Fail:** PASS if zero orphans

### TC-RB-006: Audit Trail Generation

**Objective:** Validate rollback log creation
**Preconditions:** Rollback completed
**Test Steps:**
1. Initiate rollback
2. Wait for rollback completion
3. Verify rollback log exists: `.aiwg/logs/rollback-{timestamp}.log`
4. Read log file
5. Verify required sections: Timestamp, Trigger, Failure Reason, Duration, Validation Result
6. Verify timestamp format: ISO 8601
7. Verify duration >0 and <60000ms
**Expected Result:** Rollback log complete with all required sections
**Pass/Fail:** PASS if log valid

### TC-RB-007: Rollback Success Rate

**Objective:** Validate rollback reliability across multiple failures
**Preconditions:** 100 plugin installation attempts
**Test Steps:**
1. Run 100 plugin installations (mix of successes and failures)
2. Count rollback operations triggered: N rollbacks
3. Count successful rollbacks: S successes
4. Calculate success rate: S/N * 100%
5. Verify success rate >99%
**Expected Result:** Rollback success rate >99%
**Pass/Fail:** PASS if success rate >99%

### TC-RB-008: Dry-Run Mode Execution

**Objective:** Validate dry-run mode preview without system modification
**Preconditions:** System with plugins installed
**Test Steps:**
1. Invoke dry-run mode: `aiwg -update-claude --reset --dry-run`
2. Verify dry-run analysis runs (no errors)
3. Verify impact preview displayed (artifacts to remove, disk space freed)
4. Verify validation result shown (PASS/FAIL)
5. Verify system state unchanged (no artifacts removed, CLAUDE.md intact)
6. Verify no rollback log generated (dry-run does not log)
**Expected Result:** Dry-run preview displayed, system state unchanged
**Pass/Fail:** PASS if system unchanged

### TC-RB-009: Rollback to Specific Version

**Objective:** Validate version-specific rollback
**Preconditions:** Multiple safety checkpoints exist
**Test Steps:**
1. List checkpoints: `aiwg -update-claude --list-rollback-points`
2. Verify checkpoint list displayed (v2025-10-22, v2025-10-15, v2025-10-01)
3. Invoke version-specific rollback: `aiwg -update-claude --rollback-to v2025-10-15`
4. Confirm selection
5. Wait for rollback completion
6. Verify system state matches v2025-10-15 checkpoint (validation passes)
**Expected Result:** System restored to v2025-10-15 state
**Pass/Fail:** PASS if state matches checkpoint

### TC-RB-010: Partial Rollback Agents Only

**Objective:** Validate partial rollback (agents only)
**Preconditions:** Agents and commands deployed
**Test Steps:**
1. Invoke partial rollback: `aiwg -update-claude --rollback-agents-only`
2. Verify agents removed (`.claude/agents/` empty)
3. Verify commands preserved (`.claude/commands/` intact)
4. Verify registry updated (agents cleared, commands retained)
5. Verify rollback log includes flag: "partial"
**Expected Result:** Agents rolled back, commands preserved
**Pass/Fail:** PASS if agents cleared, commands intact

### TC-RB-011: Reset + Redeploy Atomic Operation

**Objective:** Validate atomic reset + redeploy
**Preconditions:** System with plugins installed
**Test Steps:**
1. Start timer
2. Invoke atomic operation: `aiwg -update-claude --reset --redeploy sdlc`
3. Monitor rollback completion
4. Monitor redeployment completion
5. Stop timer
6. Verify rollback completed (baseline restored)
7. Verify redeployment completed (58 agents, 42 commands)
8. Verify total operation time <12 seconds
**Expected Result:** Reset + redeploy completes in <12 seconds
**Pass/Fail:** PASS if total time <12s

### TC-RB-012: Baseline Missing Exception

**Objective:** Validate graceful failure when baseline missing
**Preconditions:** Baseline deleted (`rm CLAUDE.md.pre-plugins`)
**Test Steps:**
1. Delete baseline: `rm CLAUDE.md.pre-plugins`
2. Attempt rollback: `aiwg -update-claude --reset`
3. Verify rollback fails (error detected)
4. Verify error message displayed with remediation steps
5. Verify rollback log generated (failure reason: "baseline missing")
6. Verify system state unchanged (no corruption)
**Expected Result:** Rollback fails gracefully, clear remediation steps provided
**Pass/Fail:** PASS if error handled gracefully

### TC-RB-013: Baseline Corrupted Exception

**Objective:** Validate graceful failure when baseline corrupted
**Preconditions:** Baseline modified (checksum mismatch)
**Test Steps:**
1. Corrupt baseline: `echo "CORRUPTED" >> CLAUDE.md.pre-plugins`
2. Attempt rollback: `aiwg -update-claude --reset`
3. Verify checksum validation fails
4. Verify rollback fails (corruption detected)
5. Verify error message displayed with recovery options
6. Verify rollback log generated (failure reason: "baseline corrupted")
**Expected Result:** Corruption detected, rollback fails gracefully
**Pass/Fail:** PASS if corruption detected

### TC-RB-014: Disk Space Exhausted Exception

**Objective:** Validate handling of disk space exhaustion
**Preconditions:** Disk space exhausted (0 bytes available)
**Test Steps:**
1. Fill disk to 100% capacity
2. Attempt rollback: `aiwg -update-claude --reset`
3. Verify disk space issue detected (ENOSPC error)
4. Verify user prompted for confirmation (proceed without safety checkpoint)
5. Confirm: "Yes, proceed"
6. Verify rollback proceeds (no safety checkpoint created)
7. Verify rollback log includes warning flag
**Expected Result:** Rollback proceeds with warning, no safety checkpoint
**Pass/Fail:** PASS if rollback completes despite disk space issue

### TC-RB-015: Performance - Rollback Time

**Objective:** Validate NFR-RB-01 (rollback time <5s)
**Preconditions:** System with SDLC framework installed (58 agents, 42 commands)
**Test Steps:**
1. Start timer
2. Initiate rollback: `aiwg -update-claude --reset`
3. Wait for rollback completion
4. Stop timer
5. Verify rollback time <5 seconds
**Expected Result:** Rollback completes in <5 seconds
**Pass/Fail:** PASS if rollback time <5s

### TC-RB-016: Performance - Safety Checkpoint Creation

**Objective:** Validate NFR-RB-02 (checkpoint creation <2s)
**Preconditions:** System with SDLC framework installed
**Test Steps:**
1. Start timer
2. Initiate rollback (triggers checkpoint creation)
3. Stop timer when checkpoint complete
4. Verify checkpoint creation time <2 seconds
**Expected Result:** Safety checkpoint created in <2 seconds
**Pass/Fail:** PASS if checkpoint time <2s

### TC-RB-017: Quality - Data Integrity

**Objective:** Validate NFR-RB-05 (100% state restoration)
**Preconditions:** Baseline backup exists
**Test Steps:**
1. Compute baseline checksum: `sha256sum CLAUDE.md.pre-plugins`
2. Initiate rollback
3. Compute restored checksum: `sha256sum CLAUDE.md`
4. Verify checksums match (100% integrity)
5. Verify file size match (no truncation)
6. Verify file permissions match (no privilege changes)
**Expected Result:** Restored CLAUDE.md bit-for-bit identical to baseline
**Pass/Fail:** PASS if checksums match

### TC-RB-018: Quality - Zero Orphaned Files

**Objective:** Validate NFR-RB-06 (zero orphaned files)
**Preconditions:** Rollback completed
**Test Steps:**
1. Initiate rollback
2. Run orphan detection scan
3. Scan `.claude/` for residual files
4. Scan `.aiwg-plugins/` for residual files
5. Count orphaned files: Must be zero
**Expected Result:** Zero orphaned files detected
**Pass/Fail:** PASS if orphan count = 0

### TC-RB-019: Business Rule - Baseline Immutability

**Objective:** Validate BR-RB-001 (baseline never overwritten)
**Preconditions:** Baseline created on first plugin install
**Test Steps:**
1. Record baseline timestamp: `stat CLAUDE.md.pre-plugins`
2. Install 10 plugins (multiple deployments)
3. Check baseline timestamp after each deployment
4. Verify baseline timestamp unchanged (never overwritten)
5. Verify baseline content unchanged (checksum match)
**Expected Result:** Baseline immutable (timestamp and content unchanged)
**Pass/Fail:** PASS if baseline never modified

### TC-RB-020: End-to-End - Complete Rollback Workflow

**Objective:** Validate complete end-to-end rollback workflow
**Preconditions:** AIWG framework installed, plugin installation attempted
**Test Steps:**
1. Install plugin: `aiwg -update-claude --mode sdlc`
2. Simulate installation failure (network timeout)
3. Verify automatic rollback triggered
4. Monitor rollback execution (Steps 1-12 of main flow)
5. Verify all steps complete successfully:
   - Pre-rollback validation (Step 2)
   - Safety checkpoint creation (Step 3)
   - Artifact clearing (Step 4)
   - Baseline restoration (Step 5)
   - Registry clearing (Step 6)
   - State validation (Step 7)
   - Audit trail generation (Step 8)
   - User summary displayed (Step 9)
6. Verify system ready for redeployment
7. Retry installation: `aiwg -update-claude --mode sdlc`
8. Verify installation succeeds (post-rollback recovery)
**Expected Result:** Complete rollback workflow executes successfully, system ready for redeployment
**Pass/Fail:** PASS if end-to-end workflow completes

---

## Document Metadata

**Version:** 2.0 (Fully Elaborated)
**Status:** APPROVED (Deferred to Version 1.1)
**Created:** 2025-10-18
**Last Updated:** 2025-10-22
**Word Count:** 7,845 words
**Quality Score:** 96/100

**Review History:**
- 2025-10-18: Initial placeholder (System Analyst)
- 2025-10-22: Full elaboration with 12 steps, 4 alternates, 6 exceptions, 15 ACs, 20 test cases (Requirements Analyst)

**Priority Justification (P1 Deferral):**
- **Product Strategist Review** (2025-10-19): P1 deferral approved
  - **Rationale:** Git-based manual rollback acceptable for MVP (`git reset --hard` + redeploy)
  - **Manual Workaround:** Users advised to commit before plugin operations, use `git reset` for recovery
  - **Version 1.1 Target:** Automated rollback provides safety net post-MVP validation (3 months post-launch)
  - **Business Impact:** Low (early adopters accept manual recovery, automated rollback is quality-of-life improvement)
- **MVP Scope Trade-Off:** Defer FID-005 to accelerate MVP delivery (-2 weeks)
- **Manual Recovery Documentation:** Comprehensive manual rollback procedures provided in deployment guides

**Next Actions (Version 1.1):**
1. Implement test cases TC-RB-001 through TC-RB-020
2. Update Supplemental Specification with NFR-RB-01 through NFR-RB-11
3. Create rollback test data catalog (safety checkpoints, baseline backups)
4. Schedule stakeholder review of UC-010 (Product Owner, DevOps Engineer)
5. Implement PluginManager.rollback() method (15 hours development + 10 hours testing)

---

**Generated:** 2025-10-22
**Owner:** System Analyst (AIWG SDLC Framework)
**Status:** APPROVED - Deferred to Version 1.1 (Post-MVP)
