# External Ralph Loop: Security and Safety Guide

> **WARNING**: External Ralph spawns headless Claude Code sessions with `--dangerously-skip-permissions`. This bypasses all permission prompts, enabling unsupervised file system access, command execution, and network requests. Use with extreme caution.

## Table of Contents

1. [Security Model](#security-model)
2. [Threat Analysis](#threat-analysis)
3. [Prerequisites and Access Control](#prerequisites-and-access-control)
4. [Environment Isolation](#environment-isolation)
5. [Cost and Resource Controls](#cost-and-resource-controls)
6. [Monitoring and Observability](#monitoring-and-observability)
7. [Incident Response](#incident-response)
8. [Best Practices Checklist](#best-practices-checklist)
9. [Operational Runbook](#operational-runbook)

---

## Security Model

### What External Ralph Does

External Ralph is a crash-resilient supervisor that:
1. Spawns Claude Code sessions as detached background processes
2. Monitors progress via heartbeats and state files
3. Automatically resumes after crashes
4. Iterates until completion criteria are met

### The `--dangerously-skip-permissions` Flag

**This is the critical security consideration.** When Claude Code runs with this flag:

| Capability | Normal Mode | Dangerous Mode |
|------------|-------------|----------------|
| Read files | Prompts user | **Automatic** |
| Write files | Prompts user | **Automatic** |
| Execute shell commands | Prompts user | **Automatic** |
| Network requests | Prompts user | **Automatic** |
| Install packages | Prompts user | **Automatic** |
| Modify system files | Prompts user | **Automatic** |
| Access environment variables | Prompts user | **Automatic** |

### Why This Flag Is Used

External Ralph runs as a background daemon without an interactive terminal. Since there's no user to respond to permission prompts, the flag is required for autonomous operation.

**This is a deliberate trade-off**: autonomous operation in exchange for bypassed safety prompts.

---

## Threat Analysis

### Threat Categories

#### 1. Unintended Destructive Actions

**Risk Level**: HIGH

Claude may misinterpret instructions and:
- Delete important files (`rm -rf`)
- Overwrite critical configurations
- Break working code while "improving" it
- Remove tests to make tests "pass"

**Mitigations**:
- Git-based recovery (ensure clean working tree before starting)
- Explicit completion criteria that validate correctness
- Regular checkpoints for rollback
- Anti-laziness rules prevent test deletion

#### 2. Excessive Resource Consumption

**Risk Level**: MEDIUM

Unsupervised sessions may:
- Consume excessive API tokens (cost)
- Fill disk with logs/artifacts
- Create infinite loops of file generation
- Exhaust memory with large context

**Mitigations**:
- Budget caps per iteration (`--budget`)
- Iteration limits (`--max-iterations`)
- Timeout per session (`--timeout`)
- Disk space monitoring
- Early stopping on high confidence

#### 3. Sensitive Data Exposure

**Risk Level**: MEDIUM-HIGH

The session can access:
- `.env` files with secrets
- Private keys and certificates
- Database credentials
- API tokens

**Mitigations**:
- Run in isolated environments (containers, VMs)
- Use `.gitignore` and `.claudeignore` patterns
- Audit file access in session transcripts
- Never run against production data

#### 4. Supply Chain Attacks

**Risk Level**: LOW-MEDIUM

Malicious prompts could instruct Claude to:
- Install compromised packages
- Add malicious dependencies
- Modify build scripts

**Mitigations**:
- Review all `package.json` changes
- Lock file integrity (`package-lock.json`)
- Run in network-isolated environments for sensitive code
- Audit all commits before merging

#### 5. Prompt Injection

**Risk Level**: LOW

If processing untrusted input, malicious content could:
- Override objectives
- Exfiltrate data via file writes
- Modify behavior through injected instructions

**Mitigations**:
- Never use untrusted input as objectives
- Sanitize any external data in prompts
- Review prompts before execution

---

## Prerequisites and Access Control

### User Authorization

External Ralph should only be run by authorized users who:

1. **Understand the risks** - Read this entire document
2. **Have appropriate permissions** - Admin/developer access to the target codebase
3. **Accept responsibility** - For all actions taken by the autonomous session

### System Requirements

```yaml
requirements:
  claude_code: ">=1.0.0"  # Claude Code CLI must be installed
  node: ">=18.0.0"        # Node.js for orchestrator
  git: ">=2.0.0"          # Git for state tracking

permissions:
  file_system: "read/write to project directory"
  network: "outbound to api.anthropic.com"
  process: "spawn child processes"
```

### Pre-Flight Checks

Before starting an external Ralph loop:

```bash
# 1. Verify clean git state
git status
# Should show clean working tree or only expected changes

# 2. Create safety branch
git checkout -b ralph-session-$(date +%Y%m%d-%H%M%S)

# 3. Verify no sensitive files are accessible
cat .gitignore  # Should include .env, *.pem, etc.

# 4. Check Claude Code installation
claude --version

# 5. Verify completion criteria is testable
# Example: "npm test" should be runnable
```

### Access Control Recommendations

| Environment | Recommendation |
|-------------|----------------|
| Local development | Acceptable with caution |
| Shared dev server | Requires team notification |
| CI/CD pipeline | Requires security review |
| Production-adjacent | NOT RECOMMENDED |
| Production | PROHIBITED |

---

## Environment Isolation

### Recommended: Container Isolation

Run External Ralph in an isolated container:

```dockerfile
# Dockerfile.ralph-sandbox
FROM node:20-bookworm

# Install Claude Code
RUN npm install -g @anthropic-ai/claude-code

# Create non-root user
RUN useradd -m ralph
USER ralph
WORKDIR /workspace

# Copy only necessary project files
COPY --chown=ralph:ralph . .

# Limit capabilities
# No network access except Anthropic API
# No access to host filesystem
# Limited memory and CPU
```

```yaml
# docker-compose.ralph.yml
version: '3.8'
services:
  ralph-sandbox:
    build:
      context: .
      dockerfile: Dockerfile.ralph-sandbox
    volumes:
      - ./workspace:/workspace
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    # Network policy: only allow api.anthropic.com
    networks:
      - ralph-isolated
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2'
```

### VM Isolation

For higher security requirements:

```bash
# Create isolated VM (example with multipass)
multipass launch --name ralph-sandbox --memory 4G --disk 20G

# Transfer project (sanitized)
multipass transfer ./project ralph-sandbox:/home/ubuntu/

# Run inside VM
multipass exec ralph-sandbox -- npm run ralph-external
```

### Network Isolation

Restrict network access to only required endpoints:

```yaml
# Required outbound connections
allowed_endpoints:
  - api.anthropic.com:443        # Claude API
  - registry.npmjs.org:443       # npm packages (if needed)
  - github.com:443               # git operations (if needed)

# Block everything else
blocked:
  - internal networks
  - localhost services
  - file transfer protocols
```

### File System Sandboxing

Limit file system access:

```yaml
# .claudeignore - Files Claude should not access
.env*
*.pem
*.key
credentials/
secrets/
~/.ssh/
~/.aws/
~/.config/
```

---

## Cost and Resource Controls

### Budget Controls

Always set explicit budget limits:

```bash
# Start with conservative limits
ralph-external "Fix tests" \
  --completion "npm test passes" \
  --budget 2.0 \           # $2 per iteration max
  --max-iterations 5 \     # 5 iterations max ($10 total worst case)
  --timeout 30             # 30 minutes per iteration
```

### Cost Estimation

| Model | Approx. Cost/Hour | 8-Hour Session |
|-------|-------------------|----------------|
| Haiku | $0.50 - $2 | $4 - $16 |
| Sonnet | $2 - $8 | $16 - $64 |
| Opus | $10 - $40 | $80 - $320 |

**Recommendation**: Start with Sonnet, use Opus only for complex tasks.

### Resource Limits Configuration

```javascript
// Orchestrator configuration
const config = {
  // Cost controls
  budgetPerIteration: 2.0,      // USD
  maxIterations: 5,              // Hard limit

  // Time controls
  timeoutMinutes: 60,            // Per iteration
  maxTotalHours: 8,              // Total session

  // Progress controls
  enableEarlyStopping: true,     // Stop at high confidence
  stallThreshold: 3,             // Iterations without progress

  // Resource controls
  memory: 3,                     // Reflection memory capacity
  checkpointIntervalMinutes: 15, // Checkpoint frequency
};
```

### Early Stopping

Enable early stopping to prevent runaway sessions:

```javascript
// EarlyStopping configuration
{
  minConfidence: 0.95,        // Stop if 95% confident
  minIterations: 2,           // But run at least 2 iterations
  progressThreshold: 0.1,     // Require 10% progress per iteration
  stallLimit: 3,              // Stop after 3 iterations without progress
}
```

---

## Monitoring and Observability

### Real-Time Monitoring

Monitor running sessions:

```bash
# Check status
aiwg ralph-status

# Watch session output (if attached)
tail -f .aiwg/ralph-external/loops/{loop-id}/daemon-output.log

# Monitor heartbeats
watch -n 5 'cat .aiwg/ralph-external/loops/{loop-id}/state.json | jq .lastHeartbeat'
```

### Heartbeat Monitoring

External Ralph records heartbeats every 30 seconds:

```json
{
  "loopId": "ralph-fix-tests-abc123",
  "status": "running",
  "currentIteration": 3,
  "lastHeartbeat": "2026-02-03T12:34:56Z",
  "currentPid": 12345
}
```

**Alert conditions**:
- No heartbeat for > 2 minutes (stale)
- PID no longer alive (crashed)
- Iteration stuck for > timeout duration

### Log Analysis

Key logs to monitor:

```bash
# Daemon output (main log)
.aiwg/ralph-external/loops/{loop-id}/daemon-output.log

# Per-iteration logs
.aiwg/ralph-external/iterations/{N}/
├── stdout.log           # Claude's output
├── stderr.log           # Errors
├── pre-snapshot.json    # State before
├── post-snapshot.json   # State after
└── analysis.json        # Iteration analysis
```

### Metrics to Track

| Metric | Normal Range | Alert Threshold |
|--------|--------------|-----------------|
| Iteration duration | 10-60 min | > 90 min |
| Tool calls per iteration | 20-100 | > 500 |
| Error count per iteration | 0-5 | > 20 |
| Files modified per iteration | 1-20 | > 100 |
| Progress per iteration | 5-30% | 0% for 2+ iterations |

### Alerting Configuration

```yaml
# Example monitoring configuration
alerts:
  heartbeat_stale:
    condition: "no heartbeat for > 2 minutes"
    action: "notify + investigate"

  excessive_errors:
    condition: "error_count > 20 in iteration"
    action: "pause + review"

  no_progress:
    condition: "0% progress for 3 iterations"
    action: "abort + review"

  budget_exceeded:
    condition: "iteration cost > budget"
    action: "auto-abort"

  excessive_file_changes:
    condition: "files_modified > 100"
    action: "pause + human review"
```

---

## Incident Response

### Immediate Actions

#### Session Running Amok

```bash
# 1. Abort immediately
aiwg ralph-abort

# 2. Verify process killed
ps aux | grep claude
pkill -9 -f "claude.*dangerously"  # Force kill if needed

# 3. Assess damage
git status
git diff

# 4. Revert if necessary
git checkout -b backup-before-revert
git reset --hard HEAD~N  # Or specific commit
```

#### Cost Runaway

```bash
# 1. Abort session
aiwg ralph-abort

# 2. Check actual usage
# Visit Anthropic console for actual costs

# 3. Review iteration history
cat .aiwg/ralph-external/session-state.json | jq '.iterations | length'
```

#### Suspected Security Issue

```bash
# 1. Abort immediately
aiwg ralph-abort

# 2. Isolate environment
# Disconnect network if in VM/container

# 3. Preserve evidence
tar -czf ralph-incident-$(date +%s).tar.gz \
  .aiwg/ralph-external/ \
  ~/.claude/projects/

# 4. Review session transcripts
cat .aiwg/ralph-external/iterations/*/session-transcript.jsonl | \
  jq 'select(.tool_use) | .tool_use.name' | \
  sort | uniq -c | sort -rn

# 5. Check for suspicious activity
git log --oneline -20
git diff HEAD~10..HEAD
```

### Recovery Procedures

#### From Crash

```bash
# 1. Check crash state
aiwg ralph-status

# 2. Review last iteration
cat .aiwg/ralph-external/iterations/*/analysis.json | jq '.shouldContinue'

# 3. Resume if appropriate
aiwg ralph-resume

# Or start fresh
aiwg ralph-abort
git reset --hard
```

#### From Bad Changes

```bash
# 1. Identify good state
git log --oneline -20

# 2. Create backup branch
git checkout -b recovery-backup

# 3. Reset to good state
git checkout main
git reset --hard {good-commit-hash}

# 4. Cherry-pick good changes if any
git cherry-pick {good-change-hash}
```

---

## Best Practices Checklist

### Before Starting

- [ ] **Read this document** in full
- [ ] **Understand the risks** of `--dangerously-skip-permissions`
- [ ] **Clean git state** - commit or stash all changes
- [ ] **Create safety branch** for easy recovery
- [ ] **Set budget limits** appropriate for the task
- [ ] **Set iteration limits** (start conservative)
- [ ] **Verify completion criteria** is testable
- [ ] **Check `.gitignore`** excludes sensitive files
- [ ] **Notify team** if on shared infrastructure
- [ ] **Have rollback plan** ready

### During Execution

- [ ] **Monitor periodically** - check status every 15-30 minutes
- [ ] **Watch for stalls** - no progress for multiple iterations
- [ ] **Review git changes** - `git diff` between iterations
- [ ] **Check logs for errors** - excessive errors indicate problems
- [ ] **Be ready to abort** - don't let bad sessions continue

### After Completion

- [ ] **Review all changes** - `git diff` before committing
- [ ] **Run tests** - verify completion criteria actually met
- [ ] **Check for anti-patterns** - test deletion, feature removal
- [ ] **Review costs** - check actual API usage
- [ ] **Clean up** - remove working files if not needed
- [ ] **Document learnings** - what worked, what didn't

### For Production-Adjacent Work

- [ ] **Use isolated environment** (container, VM)
- [ ] **No production credentials** in environment
- [ ] **No production data** accessible
- [ ] **Network isolation** from production systems
- [ ] **Security review** of completion criteria
- [ ] **Human review** before merging any changes

---

## Operational Runbook

### Starting a Session

```bash
# 1. Pre-flight checks
git status                    # Verify clean state
git checkout -b ralph-$(date +%Y%m%d)  # Safety branch

# 2. Review objective and criteria
echo "Objective: Fix all failing tests"
echo "Criteria: npm test exits 0"

# 3. Start with conservative limits
aiwg ralph-external "Fix all failing tests" \
  --completion "npm test exits 0" \
  --max-iterations 5 \
  --budget 2.0 \
  --timeout 30

# 4. Note the loop ID
# Output: Started loop ralph-fix-tests-abc123
```

### Monitoring a Session

```bash
# Quick status
aiwg ralph-status

# Detailed state
cat .aiwg/ralph-external/session-state.json | jq

# Watch progress
watch -n 30 'aiwg ralph-status'

# Tail logs
tail -f .aiwg/ralph-external/loops/*/daemon-output.log
```

### Aborting a Session

```bash
# Graceful abort
aiwg ralph-abort

# Verify stopped
aiwg ralph-status

# Force kill if needed
pkill -9 -f "ralph-external"
pkill -9 -f "claude.*dangerously"
```

### Resuming a Session

```bash
# Check if resumable
aiwg ralph-status

# Resume with increased iterations if needed
aiwg ralph-resume --max-iterations 10
```

### Post-Session Review

```bash
# Review all changes
git diff origin/main

# Check test status
npm test

# Review iteration history
for f in .aiwg/ralph-external/iterations/*/analysis.json; do
  echo "=== $f ==="
  jq '.completionPercentage, .learnings' "$f"
done

# Clean up if satisfied
git checkout main
git merge ralph-$(date +%Y%m%d)
git branch -d ralph-$(date +%Y%m%d)
```

---

## Summary

External Ralph is a powerful tool for autonomous, long-running task execution. The `--dangerously-skip-permissions` flag makes this possible but introduces significant security considerations.

**Key Takeaways**:

1. **Understand the risks** - All permission checks are bypassed
2. **Isolate when possible** - Containers/VMs provide defense in depth
3. **Set limits** - Budget, iterations, and timeouts are mandatory
4. **Monitor actively** - Don't leave sessions completely unattended
5. **Have recovery plans** - Git branches and rollback procedures ready
6. **Review before merging** - Human oversight of all changes

**When NOT to use External Ralph**:
- Against production systems or data
- With production credentials accessible
- On untrusted or shared infrastructure
- Without understanding the risks
- Without ability to monitor and abort

**When External Ralph is appropriate**:
- Local development with clean git state
- Isolated test environments
- Well-defined, testable objectives
- Tasks that benefit from persistence across crashes
- When human is available to monitor and intervene

---

## References

- `tools/ralph-external/README.md` - Technical documentation
- `tools/ralph-external/session-launcher.mjs` - Session spawning implementation
- `.claude/rules/anti-laziness.md` - Safeguards against destructive shortcuts
- Claude Code documentation - `--dangerously-skip-permissions` flag details
