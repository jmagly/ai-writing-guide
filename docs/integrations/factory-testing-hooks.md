# Factory AI Testing Automation Hooks

> This guide covers how to use Factory's lifecycle hooks for testing automation, with AIWG integration patterns. For a general hooks overview, see the [Factory Quickstart — Hooks section](factory-quickstart.md#hooks).

---

## Overview

Factory provides 9 lifecycle hook events. A subset of 7 are well-suited to **testing automation**: running test suites, enforcing coverage, blocking destructive operations, and capturing coverage artifacts. The remaining two (`Notification`, `SessionEnd`) are general-purpose lifecycle hooks.

### Hooks vs AIWG Skills for Testing

| Mechanism | When to Use |
|-----------|-------------|
| **Hooks** | Deterministic triggers — run tests on every file save, block operations, pre-flight checks. No AI judgment needed. |
| **AIWG Skills** | Intelligent workflows — analyze test failures, fix flaky tests, suggest coverage improvements. AI reasoning required. |

Use both: hooks handle the mechanical triggers, AIWG skills handle the remediation.

### Prerequisites

- Factory CLI installed and authenticated
- `jq` (for JSON processing in shell hooks)
- Test framework installed (`npm test`, `pytest`, `cargo test`, etc.)
- AIWG deployed to your project: `aiwg use sdlc --provider factory`

---

## Quick Setup

Deploy AIWG with testing hooks:

```bash
aiwg use sdlc --provider factory
```

Then add hook configuration to `~/.factory/settings.json` or `.factory/settings.json`. The sections below cover each pattern.

---

## Hook-by-Hook Guide

### 1. PostToolUse — Run Tests After Code Changes

**What it does**: Fires after every tool invocation. Use it to automatically run tests when source files change.

**AIWG context**: Complements the `/generate-tests` and `/flaky-fix` skills — hooks run tests mechanically; AIWG skills fix them intelligently.

**Configuration**:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|MultiEdit|Create",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'if echo \"$FACTORY_TOOL_INPUT\" | jq -e \".file_path\" | grep -qE \"\\.(ts|js|py|rs)$\"; then npm test --silent 2>&1 | tail -20; fi'"
          }
        ]
      }
    ]
  }
}
```

**With MD5 caching** (skip redundant runs):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|MultiEdit|Create",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'HASH=$(find src -name \"*.ts\" | sort | xargs md5sum 2>/dev/null | md5sum | cut -c1-8); CACHE_FILE=\"/tmp/factory_test_cache_$HASH\"; if [ ! -f \"$CACHE_FILE\" ]; then npm test --silent && touch \"$CACHE_FILE\"; fi'"
          }
        ]
      }
    ]
  }
}
```

**Customization options**:
- Change matcher to specific tools: `"Edit"` (single-file only)
- Adjust file extension filter to match your project: `\.(go|java|rb)$`
- Replace `npm test` with your project's test command

---

### 2. SessionStart — Pre-flight Checks

**What it does**: Fires when a new Factory session starts. Use it to ensure a clean testing environment before the droid begins work.

**AIWG context**: This is where `aiwg refresh --dry-run` fits to check for AIWG framework updates before a long session.

**Configuration**:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'aiwg refresh --dry-run; npm ci --silent 2>/dev/null || npm install --silent; echo \"Pre-flight complete\"'"
          }
        ]
      }
    ]
  }
}
```

**With coverage baseline** (establish baseline before changes):

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'npm run test:coverage --silent 2>/dev/null | grep -E \"^(All files|Statements)\" > /tmp/factory_coverage_baseline.txt; echo \"Coverage baseline captured\"'"
          }
        ]
      }
    ]
  }
}
```

**Customization options**:
- Add environment-specific checks: `node --version`, `docker ps`
- Seed test databases for integration test environments
- Load environment variables from `.env.test`

---

### 3. Stop — Full Test Suite on Task Completion

**What it does**: Fires when the droid finishes its primary task. Use it to run a complete test suite and report results before the session ends.

**AIWG context**: Works with the `/auto-test-execution` and `/test-coverage` AIWG skills — the hook confirms the baseline passes; AIWG skills investigate failures.

**Configuration**:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "npm test 2>&1 | tail -30"
          }
        ]
      }
    ]
  }
}
```

**With configurable minimum coverage** (uses `DROID_MIN_COVERAGE` env var):

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'MIN_COV=${DROID_MIN_COVERAGE:-80}; RESULT=$(npm run test:coverage --silent 2>/dev/null | grep \"All files\" | awk \"{print \\$10}\"); echo \"Coverage: ${RESULT}% (min: ${MIN_COV}%)\"; [ $(echo \"${RESULT} >= ${MIN_COV}\" | bc) -eq 1 ] && echo \"PASS\" || echo \"WARN: Coverage below threshold\"'"
          }
        ]
      }
    ]
  }
}
```

**Customization options**:
- Set `DROID_MIN_COVERAGE=90` in your shell profile for stricter enforcement
- Add `|| echo "WARN: Tests failed"` to make failures non-blocking (hook failure blocks the session)
- Timeout: add `timeout 120` prefix for test suites that may hang

---

### 4. PreToolUse — Block Dangerous Operations

**What it does**: Fires before every tool call. Use it to prevent destructive operations that would corrupt test state.

**AIWG context**: Acts as a safety layer beneath the `/security-gate` AIWG skill — the hook enforces hard blocks mechanically.

**Configuration** (block deletion of test files):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'CMD=$(echo \"$FACTORY_TOOL_INPUT\" | jq -r \".command // empty\"); if echo \"$CMD\" | grep -qE \"^(rm|del|rmdir).*test\"; then echo \"BLOCKED: Cannot delete test files\"; exit 1; fi'"
          }
        ]
      }
    ]
  }
}
```

**Block force-push during active test runs**:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'CMD=$(echo \"$FACTORY_TOOL_INPUT\" | jq -r \".command // empty\"); if echo \"$CMD\" | grep -qE \"git push.*--force\"; then echo \"BLOCKED: Force push not allowed\"; exit 1; fi'"
          }
        ]
      }
    ]
  }
}
```

**Customization options**:
- Expand the blocked pattern list for your project
- Use exit code 0 for warnings (non-blocking), exit 1 for hard blocks
- Log blocked attempts: `echo "$(date): BLOCKED $CMD" >> /tmp/factory_blocks.log`

---

### 5. SubagentStop — Validate Subagent Results

**What it does**: Fires when a subagent finishes. Use it to run targeted tests on files the subagent modified and accumulate a coverage trace.

**AIWG context**: Enables AIWG trace logging — the `/regression-report` and `/cross-task-learner` skills can read these traces.

**Configuration**:

```json
{
  "hooks": {
    "SubagentStop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'echo \"{\\\"timestamp\\\": \\\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\\\", \\\"event\\\": \\\"subagent_stop\\\"}\" >> .aiwg/working/factory-trace.jsonl; npm run test:changed --silent 2>/dev/null || echo \"No changed-file tests available\"'"
          }
        ]
      }
    ]
  }
}
```

**With AIWG smart hooks** (conditional based on `AIWG_SMART_HOOKS` flag):

```json
{
  "hooks": {
    "SubagentStop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'if [ \"${AIWG_SMART_HOOKS:-true}\" = \"true\" ]; then npm run test:changed --silent 2>&1 | tail -15; fi'"
          }
        ]
      }
    ]
  }
}
```

**Customization options**:
- Set `AIWG_SMART_HOOKS=false` to disable during rapid iteration sessions
- Replace `test:changed` with `jest --onlyChanged` or `pytest --lf` for your framework
- Extend the JSONL log schema to capture task metadata from `$FACTORY_SESSION_ID`

---

### 6. UserPromptSubmit — Parse Test Targets from Prompts

**What it does**: Fires when the user submits a prompt. Use it to extract test file paths mentioned in the prompt and set up targeted test runs.

**AIWG context**: Works with the `/setup-tdd` and `/test-sync` AIWG skills — the hook handles the mechanical extraction; skills handle test generation.

**Configuration**:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'PROMPT=$(echo \"$FACTORY_PROMPT\" | tr -d \"\\n\"); FILES=$(echo \"$PROMPT\" | grep -oE \"[a-zA-Z0-9_/.-]+\\.(ts|js|py|go|rs)\"); if [ -n \"$FILES\" ]; then echo \"Test targets detected: $FILES\" > /tmp/factory_test_targets.txt; fi'"
          }
        ]
      }
    ]
  }
}
```

**Coverage ignore pattern extraction**:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'PROMPT=$(echo \"$FACTORY_PROMPT\"); if echo \"$PROMPT\" | grep -qi \"skip.*test\\|no test\\|ignore.*coverage\"; then echo \"AIWG_SKIP_COVERAGE=true\" >> /tmp/factory_session_env.sh; echo \"Coverage enforcement suspended for this prompt\"; fi'"
          }
        ]
      }
    ]
  }
}
```

**Customization options**:
- Extend file extension list: `\\.(ts|js|py|go|rs|java|rb|cpp)$`
- Parse ticket/issue references to look up test requirements
- Set environment variables read by later hooks

---

### 7. PreCompact — Preserve Test Artifacts

**What it does**: Fires before Factory compacts the context window. Use it to persist test results and coverage data that would otherwise be lost from context.

**AIWG context**: Coverage artifacts preserved here can be read by `/regression-baseline` and `/regression-report` AIWG skills in subsequent sessions.

**Configuration**:

```json
{
  "hooks": {
    "PreCompact": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'STAMP=$(date +%Y%m%d_%H%M%S); mkdir -p .aiwg/working/test-snapshots; [ -f coverage/coverage-summary.json ] && cp coverage/coverage-summary.json \".aiwg/working/test-snapshots/coverage-${STAMP}.json\"; [ -f /tmp/factory_coverage_baseline.txt ] && cp /tmp/factory_coverage_baseline.txt \".aiwg/working/test-snapshots/baseline-${STAMP}.txt\"; echo \"Test artifacts preserved\"'"
          }
        ]
      }
    ]
  }
}
```

**With configurable coverage per directory** (using `DROID_MIN_COVERAGE`):

```json
{
  "hooks": {
    "PreCompact": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'STAMP=$(date +%Y%m%d_%H%M%S); mkdir -p .aiwg/working/test-snapshots; npm run test:coverage --silent 2>/dev/null && cp coverage/coverage-summary.json \".aiwg/working/test-snapshots/pre-compact-${STAMP}.json\" 2>/dev/null; echo \"Coverage snapshot saved\"'"
          }
        ]
      }
    ]
  }
}
```

**Customization options**:
- Adjust snapshot directory to match your artifact retention policy
- Add `git stash` before compaction to preserve unstaged test changes
- Emit a coverage summary to stdout — it appears in the droid's compact context

---

## Configuration Reference

### settings.json Structure

```json
{
  "hooks": {
    "<EventName>": [
      {
        "matcher": "<ToolNameOrGlob>",
        "hooks": [
          {
            "type": "command",
            "command": "<shell command>",
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

**Scopes**:
- `~/.factory/settings.json` — applies to all projects
- `.factory/settings.json` — project-local, committed to git (team-shared)

Project-local overrides user-level when both are present.

### Matcher Patterns

| Pattern | Matches |
|---------|---------|
| `"*"` | All tool invocations |
| `"Edit"` | Single-file edit only |
| `"Edit\|MultiEdit\|Create"` | All file-write operations |
| `"Bash"` | Shell command execution |
| `"Edit:*.ts"` | Edit of TypeScript files only (path glob) |

### Timeout

Default: 60 seconds. For test suites:

```json
{
  "type": "command",
  "command": "npm test",
  "timeout": 120
}
```

Set `"timeout": 0` for non-blocking async execution (hook result is ignored).

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DROID_MIN_COVERAGE` | `80` | Minimum coverage threshold (%) for Stop hook enforcement |
| `AIWG_SMART_HOOKS` | `true` | Enable/disable AIWG-aware hook logic |

Set in your shell profile:

```bash
export DROID_MIN_COVERAGE=90
export AIWG_SMART_HOOKS=true
```

---

## AIWG vs Vanilla Factory: What Changes

| Feature | Vanilla Factory | AIWG-Enhanced |
|---------|----------------|---------------|
| Test runner | Shell command only | Shell command + `/auto-test-execution` skill for failure analysis |
| Coverage enforcement | Manual threshold check | `DROID_MIN_COVERAGE` env var + AIWG artifact snapshots |
| Failure remediation | Re-prompt manually | `/flaky-fix` and `/test-sync` skills read trace logs |
| Cross-session coverage | Lost on session end | Persisted to `.aiwg/working/test-snapshots/` via PreCompact |
| Subagent tracking | Not tracked | JSONL trace in `.aiwg/working/factory-trace.jsonl` |

---

## Best Practices

### Async Execution for Non-Blocking Workflows

Long test suites can block the droid mid-task. For non-critical hooks, run async:

```bash
# Async (fire-and-forget, hook doesn't block)
"command": "npm test > /tmp/factory_test_out.txt 2>&1 &"
```

Use synchronous (blocking) hooks only for hard gates (Stop, PreToolUse blocks).

### MD5 Caching to Skip Redundant Runs

Avoid re-running tests when source hasn't changed:

```bash
HASH=$(find src -name "*.ts" | sort | xargs md5sum | md5sum | cut -c1-8)
CACHE_FILE="/tmp/factory_test_cache_$HASH"
[ ! -f "$CACHE_FILE" ] && npm test && touch "$CACHE_FILE"
```

### Configurable Coverage per Directory

Use `jest --collectCoverageFrom` or `pytest --cov=<module>` for targeted coverage:

```bash
# Frontend-only coverage
npm test -- --coverage --collectCoverageFrom="src/ui/**"

# Backend-only coverage  
npm test -- --coverage --collectCoverageFrom="src/api/**"
```

### Coverage Ignore Patterns

Configure in your test framework, not in hooks:

```json
// jest.config.json
{
  "coveragePathIgnorePatterns": [
    "/node_modules/",
    "/test/fixtures/",
    "/.aiwg/"
  ]
}
```

---

## Troubleshooting

**Hook not firing**
Check `hooksDisabled` in settings:
```text
/settings
# Verify hooksDisabled is false or absent
```

**Coverage false positives from AIWG working files**
Add `.aiwg/` to your coverage ignore list in jest/pytest config (see above).

**Environment discrepancies between hook and test run**
Hooks run in a minimal shell environment. Use your project's test scripts:
```bash
# Preferred — uses project's npm/package.json test env
"command": "npm test"

# Avoid — may miss PATH, env vars
"command": "node --experimental-vm-modules jest"
```

**Hook timeout on large test suites**
Increase the timeout:
```json
{ "type": "command", "command": "npm test", "timeout": 180 }
```
Or split into unit tests (fast, synchronous) and integration tests (async background).

**SubagentStop fires too frequently**
Use the `AIWG_SMART_HOOKS` flag to disable during rapid iteration:
```bash
export AIWG_SMART_HOOKS=false
```

---

## Cross-References

- [Factory Quickstart — Hooks](factory-quickstart.md#hooks) — 9 hook events overview
- [Factory MCP Reference](factory-mcp-sidecar.md) — MCP + hooks integration
- [Testing Quality Addon](https://github.com/jmagly/aiwg/blob/main/agentic/code/addons/testing-quality/README.md) — AIWG testing skills
- [Auto Test Execution Skill](https://github.com/jmagly/aiwg/blob/main/agentic/code/addons/agent-loop/skills/auto-test-execution/SKILL.md) — Automated test loop
- [Flaky Fix Skill](https://github.com/jmagly/aiwg/blob/main/agentic/code/addons/testing-quality/skills/flaky-fix/SKILL.md) — Fix flaky tests
- [Factory Official Docs](https://docs.factory.ai/guides/hooks/testing-automation) — Vendor documentation
