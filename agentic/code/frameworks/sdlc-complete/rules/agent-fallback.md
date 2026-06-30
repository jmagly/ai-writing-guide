---
enforcement: high
---

# Agent Fallback Rules

**Enforcement Level**: HIGH
**Scope**: All agent invocations and routing decisions
**Research Basis**: REF-001 Production Agentic Systems
**Issue**: #141

## Overview

Graceful degradation when a specialized agent fails or is unavailable: continue with reduced capability rather than failing completely.

## Agent Capability Matrix

Route by capability, falling through the chain when an agent is unavailable. Each fallback carries a lower capability-coverage %; the generic fallback (`general-purpose`) is the floor.

| Capability | Primary | Fallback 1 | Fallback 2 | Generic |
|------------|---------|-----------|-----------|---------|
| requirements | Requirements Analyst | System Analyst | Product Strategist | general-purpose |
| architecture | Architecture Designer | Technical Researcher | Domain Expert | general-purpose |
| testing | Test Engineer | Test Architect | Debugger | general-purpose |
| security | Security Auditor | Security Architect | Security Gatekeeper | general-purpose |
| code | Software Implementer | Debugger | Code Reviewer | general-purpose |
| documentation | Technical Writer | Documentation Synthesizer | API Documenter | general-purpose |
| devops | DevOps Engineer | Build Engineer | Cloud Architect | general-purpose |
| review | Code Reviewer | Security Auditor | Test Engineer | general-purpose |

The canonical machine-readable matrix (with per-fallback coverage % and required tools) lives at `@$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/schemas/flows/agent-capability-matrix.yaml`.

## Fallback Triggers

| Trigger | Action |
|---------|--------|
| Agent unavailable (not in registry) | Use next in chain (immediate) |
| Tool permission denied | Downgrade to a fallback with lesser tools |
| Timeout exceeded (~5 min) | Cancel and retry with fallback (1 retry) |
| >3 consecutive errors | Switch to a more general agent (60s cooldown) |
| Output quality <70% | Try an alternative specialist (max 2 alternatives) |

## Routing Logic

Identify the required capability → if the primary is available (registered, tools permitted, not in cooldown), use it and monitor for triggers → else iterate the fallback chain, select the first available, log the activation, and notify the user of degradation → invoke, monitor, and on failure log the reason and activate the next fallback.

## Degradation Modes

| Mode | Trigger | User Notice |
|------|---------|-------------|
| Full | all specialists available | none |
| Reduced | 1–2 specialists unavailable | "Some specialized agents unavailable. Using fallbacks." |
| Minimal | >50% specialists unavailable | "Operating in degraded mode. Quality may be reduced." |
| Emergency | critical agents unavailable | "Emergency mode: only essential operations available." (disable non-critical workflows, alert operators) |

## Logging

Every fallback activation MUST log: timestamp, original agent, fallback agent, trigger, capability, capability-coverage %, degradation mode, task context. Aggregate to detect frequent fallbacks (>10/hr same agent), cascading failures (>3 consecutive), and any emergency-mode entry.

## User Communication

Surface degradation honestly: standard ("Using [fallback] instead of [primary]; some capabilities reduced"), significant ("degraded mode, [primary] unavailable, ~X% coverage"), emergency ("only essential operations available"). Avoid alarm emoji for routine fallbacks.

## Checklist

Fallback chain correctly ordered; capability coverage accurately reported; user notifications appropriate; logging captures all events; recovery returns to primary when it becomes available again.

## References

- @.aiwg/research/findings/REF-001-production-agentic.md
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/schemas/flows/agent-capability-matrix.yaml
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/failure-mitigation.md
- #141

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
