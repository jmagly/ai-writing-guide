# Ops-Complete Rules Index

Rules owned by the ops-complete framework. Each entry provides a summary sufficient to determine relevance — load the full rule via @-link only when needed.

**How to use**: Scan summaries below. When a rule is relevant to your current task, load the full rule file for detailed enforcement instructions. Rules are grouped by enforcement level (CRITICAL > HIGH > MEDIUM).

---

## CRITICAL (2 rules)

#### ops-safety
**Summary**: Interactive command detection and destructive operation gates.
**Full rule**: @$AIWG_ROOT/agentic/code/frameworks/ops-complete/rules/ops-safety.md

#### ops-information-governance
**Summary**: Mandatory minimization, redaction, classification/publication, retention, and disposal boundary for every operational sink.
**Full rule**: @$AIWG_ROOT/agentic/code/frameworks/ops-complete/rules/ops-information-governance.md

---

## HIGH (2 rules)

#### ops-documentation
**Summary**: Executable, idempotent, verified procedure format.
**Full rule**: @$AIWG_ROOT/agentic/code/frameworks/ops-complete/rules/ops-documentation.md

#### ops-cross-repo
**Summary**: Scope validation and cross-repo reference format.
**Full rule**: @$AIWG_ROOT/agentic/code/frameworks/ops-complete/rules/ops-cross-repo.md

---

## MEDIUM (1 rule)

#### ops-issue-tracking
**Summary**: Label conventions, dependency tracking, and phased work patterns.
**Full rule**: @$AIWG_ROOT/agentic/code/frameworks/ops-complete/rules/ops-issue-tracking.md

---

## Quick Reference by Context

| Task Type | Relevant Rules |
|-----------|---------------|
| **Executing commands on hosts** | ops-safety, ops-documentation, ops-information-governance |
| **Writing runbooks/procedures** | ops-documentation, ops-safety, ops-information-governance |
| **Destructive operations** | ops-safety |
| **Cross-host config changes** | ops-safety, ops-cross-repo |
| **Creating/triaging issues** | ops-issue-tracking, ops-cross-repo, ops-information-governance |
| **Committing to ops repos** | ops-cross-repo, ops-issue-tracking, ops-information-governance |
| **Multi-step migrations** | ops-issue-tracking, ops-documentation, ops-safety |
| **Cross-repo references** | ops-cross-repo, ops-issue-tracking, ops-information-governance |
| **Host standup/decommission** | ops-documentation, ops-safety, ops-issue-tracking |
| **Service impact assessment** | ops-cross-repo, ops-safety |

---

*5 rules across 3 enforcement levels*
*Full rule files: @$AIWG_ROOT/agentic/code/frameworks/ops-complete/rules/*
