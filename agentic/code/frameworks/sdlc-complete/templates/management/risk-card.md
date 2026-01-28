# Risk Card

## Metadata

- **ID**: RSK-`id`
- **Owner**: Project Manager
- **Contributors**: Security Architect, Technical Lead
- **Reviewers**: Executive Orchestrator, Stakeholders
- **Team**: `team`
- **Status**: `draft/in-progress/blocked/approved/done`
- **Dates**: created `YYYY-MM-DD` / updated `YYYY-MM-DD` / due `YYYY-MM-DD`
- **Related**: ADR-`id`, DEP-`id`, US-`id`
- **Links**: `paths/urls`

## Phase 1: Risk Identification (ESSENTIAL)

Complete these fields immediately when identifying a risk:

### Identifier

**Risk ID**: RSK-`id`

<!-- EXAMPLE: RSK-042 -->

### Description

**Risk Statement**: [Clear description of the risk and potential impact]

<!-- EXAMPLE: Third-party payment gateway API may become unavailable during checkout, preventing users from completing purchases and resulting in revenue loss. -->

<!-- ANTI-PATTERN: "Payment issues" (too vague - specify what, when, and impact) -->

### Likelihood and Impact

**Likelihood**: [L | M | H]

<!-- EXAMPLE: M (Medium) - Gateway has 99.5% SLA, but we've experienced 3 outages in past 6 months -->

**Impact**: [L | M | H]

<!-- EXAMPLE: H (High) - Each hour of downtime results in ~$5K revenue loss and customer dissatisfaction -->

**Risk Score**: [L×L=L | L×M=M | M×M=H | H×H=CRITICAL]

<!-- EXAMPLE: M × H = HIGH -->

## Phase 2: Mitigation Strategy (EXPAND WHEN READY)

<details>
<summary>Click to expand mitigation and contingency plans</summary>

### Mitigation Actions

**Primary Mitigation**: [Actions to reduce likelihood or impact BEFORE risk occurs]

<!-- EXAMPLE:
**Primary Mitigation**:
1. Implement circuit breaker pattern to detect gateway failures quickly
2. Add retry logic with exponential backoff (3 attempts over 10 seconds)
3. Set up monitoring and alerting for gateway response times >2 seconds
4. Conduct quarterly disaster recovery drills
-->

**Mitigation Owner**: [Who is responsible for implementing mitigation]

<!-- EXAMPLE: Backend Lead (Jane Smith) -->

**Target Completion**: [When will mitigation be in place]

<!-- EXAMPLE: 2026-02-15 -->

**Cost**: [Budget required for mitigation]

<!-- EXAMPLE: $5K (engineering time) + $200/month (monitoring tools) -->

### Contingency Plan

**Contingency Actions**: [What we do IF the risk occurs despite mitigation]

<!-- EXAMPLE:
**Contingency Actions**:
1. Automatically failover to backup payment gateway (Stripe)
2. Display customer-friendly error message with retry option
3. Queue failed transactions for retry when gateway recovers
4. Notify on-call engineer via PagerDuty
5. Post status update to status page within 5 minutes
6. Contact customers with pending transactions via email
-->

**Contingency Owner**: [Who executes contingency plan]

<!-- EXAMPLE: On-Call Engineer (rotating) -->

**Activation Criteria**: [When to activate contingency plan]

<!-- EXAMPLE: When circuit breaker detects 3 consecutive gateway failures or response time >10 seconds -->

### Risk Triggers

**Early Warning Signs**: [Indicators that risk is materializing]

<!-- EXAMPLE:
- Gateway response time increasing above 1 second
- Error rate >1% for gateway API calls
- Gateway status page shows degraded performance
- Customer support tickets mentioning payment issues spike
-->

**Monitoring**: [How we detect these triggers]

<!-- EXAMPLE:
- Datadog APM monitoring gateway latency (alert at >1s)
- Synthetic transaction testing every 5 minutes
- Error rate dashboard with alert at >0.5%
- Customer support ticket volume tracking
-->

</details>

## Phase 3: Risk Analysis (ADVANCED)

<details>
<summary>Click to expand detailed risk analysis and tracking</summary>

### Risk Category

**Type**: [Technical | Business | Security | Compliance | Schedule | Budget | External]

<!-- EXAMPLE: Technical (external dependency) -->

**Subcategory**: [More specific classification]

<!-- EXAMPLE: Third-party service reliability -->

### Detailed Impact Analysis

**Financial Impact**:

<!-- EXAMPLE:
- Direct: $5K/hour revenue loss during outage
- Indirect: Potential customer churn (estimated 5% if >3 outages/year)
- Mitigation cost: $5K one-time + $200/month ongoing
-->

**Schedule Impact**:

<!-- EXAMPLE:
- Best case: No schedule impact (failover transparent to users)
- Worst case: 2-week delay if forced to switch primary gateway
-->

**Reputation Impact**:

<!-- EXAMPLE:
- Medium: Negative reviews mentioning unreliable checkout
- High: Loss of trust if customer payment data affected
-->

**Compliance Impact**:

<!-- EXAMPLE:
- PCI-DSS: Must maintain audit log of all payment failures
- SLA: May violate 99.9% uptime SLA with customers
-->

### Risk Response Strategy

**Strategy**: [Avoid | Mitigate | Transfer | Accept]

<!-- EXAMPLE: Mitigate (reduce likelihood and impact through engineering controls) -->

**Rationale**: [Why this strategy was chosen]

<!-- EXAMPLE: Cannot avoid (business requires payment processing). Transfer via insurance not cost-effective. Accept unacceptable due to revenue impact. Therefore, mitigate through redundancy and monitoring. -->

### Dependencies

**Depends On**: [Other risks or issues that affect this risk]

<!-- EXAMPLE:
- RSK-038: Cloud provider regional outage (compounds if both occur)
- ADR-012: Decision to use single payment gateway (creates risk)
-->

**Affects**: [Other risks or issues affected by this risk]

<!-- EXAMPLE:
- RSK-045: Customer retention risk (worsened by payment failures)
- US-103: Subscription feature (blocked if payment unreliable)
-->

### Risk History

**Changes Over Time**:

<!-- EXAMPLE:
- 2026-01-15: Risk identified during architecture review
- 2026-01-20: Likelihood increased M→H after 3rd outage in 6 months
- 2026-02-01: Impact assessment revised based on revenue data
- 2026-02-15: Mitigation implemented, likelihood reduced H→M
-->

**Review Dates**:

<!-- EXAMPLE:
- Last reviewed: 2026-02-15
- Next review: 2026-03-15 (monthly for HIGH risks)
- Quarterly review scheduled for 2026-05-15
-->

### Acceptance Criteria

If risk score reaches "Accept" level, document acceptance:

**Accepted By**: [Who has authority to accept this risk]

<!-- EXAMPLE: CTO and VP Engineering (for HIGH risks) -->

**Acceptance Rationale**: [Why accepting rather than mitigating further]

<!-- EXAMPLE: N/A - Risk being actively mitigated, not accepted -->

**Residual Risk**: [Risk remaining after mitigation]

<!-- EXAMPLE: Even with mitigation, residual risk of simultaneous primary + backup gateway failure (probability <0.1%/year) -->

</details>

## Current Status

**Status**: [Open | Mitigated | Closed | Accepted]

<!-- EXAMPLE: Open (mitigation in progress, target 2026-02-15) -->

**Status Rationale**: [Why this status]

<!-- EXAMPLE: Mitigation plan approved and development underway. Circuit breaker implemented, failover integration in progress. Expected completion 2026-02-15. -->

**Last Updated**: YYYY-MM-DD

<!-- EXAMPLE: 2026-01-28 -->

## References

Wire @-mentions for traceability:

- @.aiwg/architecture/adr/ADR-`id`.md - Related architectural decision
- @.aiwg/requirements/use-cases/UC-`id`.md - Use case affected by risk
- @.aiwg/management/risk-list.md - Risk register
- @src/path/to/mitigation-code.ts - Mitigation implementation

## Agent Notes

- Risk cards should be living documents - review regularly, not just at creation
- Focus on actionable mitigation, not just documenting worry
- Quantify impact when possible (revenue, schedule, reputation)
- Progressive disclosure: Identify risks early (Phase 1), plan mitigation during elaboration (Phase 2), analyze deeply during construction (Phase 3)
- Update likelihood/impact as new information emerges
- Close risks when fully mitigated or when risk no longer applies

## Related Templates

- @agentic/code/frameworks/sdlc-complete/templates/management/risk-list-template.md - Risk register
- @agentic/code/frameworks/sdlc-complete/templates/management/risk-management-plan-template.md - Overall risk strategy
- @agentic/code/frameworks/sdlc-complete/templates/governance/risk-acceptance-template.md - Formal risk acceptance
