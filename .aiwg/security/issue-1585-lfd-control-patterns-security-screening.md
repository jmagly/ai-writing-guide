# Security Screening: LFD Control Patterns for AIWG Agent Loops

**Document Type**: Security Screening / Threat Note  
**Issue**: `roctinam/aiwg#1585`  
**Status**: Draft for pre-construction review  
**Date**: 2026-06-17  

## Scope

This screening covers the proposed adoption of LFD-style controls in AIWG agent
loops: holdout isolation, VOID-on-violation, budget stop conditions,
hypothesis-before-change logs, exploration quotas, and mechanical-vs-cooperative
rule tiering.

It does not approve construction. It identifies security-sensitive constraints
that implementation must preserve if construction proceeds.

## Assets

| Asset | Sensitivity | Why It Matters |
|---|---|---|
| Holdout answers | High | Exposure lets the optimizer memorize instead of generalize |
| Lint details touching eval content | High | Detailed messages can become a membership oracle |
| Score history and holdout call logs | Medium | Can leak gradient information across repeated calls |
| Budget/spend data | Medium | Can expose provider usage or account details |
| Progress logs | Medium | May contain hypotheses, failed attacks, or sensitive context |
| Harness/scorer files | High integrity | If modified, the measurement layer is no longer trustworthy |

## Trust Boundaries

| Zone | Trust Level | Examples |
|---|---|---|
| Optimizer-readable workspace | Untrusted | Agent code, normal logs, dev inputs |
| Harness/eval control surface | Trusted for integrity | scorer, lint, probe, status scripts |
| Human-only diagnostics | Restricted | detailed lint matches, holdout errors |
| External provider billing/logs | External dependency | token/spend data, API usage |

## Key Threats

### T-1585-001: Holdout Answer Disclosure

An agent reads holdout answers directly from the workspace, from logs, or from
verbose scorer errors.

**Required controls**:

- Store holdout answers outside optimizer-readable paths when possible.
- Keep scorer output aggregate-only for holdout.
- Add tests that fail if holdout answers appear in optimizer-readable logs.

### T-1585-002: Oracle-Mining Through VOID Diagnostics

A lint check says which literal or pattern matched hidden eval content. The
agent probes candidate strings and reconstructs membership one call at a time.

**Required controls**:

- Optimizer-visible output must be only `VOID: constraint violation` or an
  equivalent non-diagnostic status.
- Detailed diagnostics must go to human-only logs.
- Holdout-touching checks must be rate-limited and audited.

### T-1585-003: Harness Tampering

The optimizer edits score/lint/probe/status scripts, thresholds, checksums, or
eval loaders to improve the metric without solving the task.

**Required controls**:

- Declare harness/eval files read-only in loop instructions.
- Use checksums or version control evidence where practical.
- Treat modified harness files as a failed gate unless explicitly approved by a
  human.

### T-1585-004: Budget Stop Bypass

The optimizer continues after a budget stop, resets local counters, or
under-reports token/spend use.

**Required controls**:

- Derive wall-clock externally from runtime timestamps.
- Mark token/spend as `unknown` when not observable.
- Preserve budget state in durable progress files.
- Emit a stop report when budget is exhausted.

### T-1585-005: Self-Report Substitutes for Mechanical Evidence

A high-criticality workflow closes work based on narrative claims rather than
test output, checksums, holdout score, or other mechanical evidence.

**Required controls**:

- Rule-tier docs must identify controls that are not substitutable by
  self-report.
- Completion reports for high-criticality loops must cite mechanical evidence.

## Security Requirements for Construction

- [ ] No holdout answer is stored in optimizer-readable locations.
- [ ] VOID/lint output does not reveal matching hidden data.
- [ ] Human-only diagnostic path is documented.
- [ ] Harness/eval integrity is protected or checked.
- [ ] Budget observations report uncertainty honestly.
- [ ] Mechanical gates are explicitly marked as load-bearing under adversarial
  or high-criticality conditions.

## Open Security Questions

1. Where should human-only diagnostics live for local filesystem workflows?
2. Should holdout scoring be rate-limited in docs only, or enforced by a helper?
3. What is the minimum acceptable harness integrity check: read-only policy,
   git diff checks, checksums, or signed scorer manifests?
4. Which AIWG loop surfaces can observe provider token/spend data without
   leaking credentials or billing details?
