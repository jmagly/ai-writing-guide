# Option Matrix (Stakeholder Priorities & Constraints)

**Purpose**: Capture stakeholder priorities and constraints to determine the appropriate SDLC profile (Prototype → MVP → Production → Enterprise) and tailor process rigor accordingly.

## Instructions

This matrix helps balance competing priorities and understand constraints. It drives decisions about:
- Which **solution profile** to adopt (Prototype, MVP, Production, Enterprise)
- What level of **process rigor** is appropriate (lightweight docs vs. full traceability)
- Which **quality gates** to enforce (basic testing vs. comprehensive validation)
- What **security/compliance** controls are needed (minimal vs. enterprise-grade)

**How to use**:
1. **Assign weights** to criteria based on project context (must sum to 1.0)
2. **Rate scenarios** (0-5) for how well they meet each criterion
3. **Calculate totals** (weighted scores) to identify best-fit profile
4. **Document constraints** that override scoring (regulatory, contractual, etc.)

---

## Step 1: Stakeholder Context

**Primary Stakeholders**:
- [ ] Internal team (personal project, R&D, innovation lab)
- [ ] Business unit (departmental tool, internal product)
- [ ] External customers (B2B SaaS, consumer app, public service)
- [ ] Regulatory bodies (compliance-driven, audit requirements)
- [ ] Other: `_________________`

**Project Type**:
- [ ] Proof of concept / Prototype
- [ ] Minimum viable product (MVP)
- [ ] Production service (established users)
- [ ] Mission-critical system (enterprise-grade)
- [ ] Uncertain: `_________________`

**Known Constraints**:
- Budget: `$ ___ or constrained/unconstrained`
- Timeline: `___ weeks/months or time-to-market pressure`
- Team size: `___ developers, ___ other roles`
- Regulatory: `GDPR | HIPAA | PCI-DSS | SOX | FedRAMP | None | Other: ___`
- Contractual: `SLA commitments | security requirements | audit obligations | None`
- Technical debt: `Greenfield | Brownfield with tech debt | Legacy migration`

---

## Step 2: Priority Weighting (must sum to 1.0)

Assign weights based on what matters most for **this specific project**.

| Criterion | Weight | Guidance |
|-----------|--------|----------|
| **Delivery speed** | `0.00` | Time-to-market pressure, competitive urgency, rapid iteration needs |
| **Cost efficiency** | `0.00` | Budget constraints, resource limitations, operational costs |
| **Quality/security** | `0.00` | User trust, data sensitivity, regulatory requirements, brand risk |
| **Reliability/scale** | `0.00` | User base size, uptime requirements, performance expectations |
| **TOTAL** | **1.00** | ← Must sum to 1.0 |

**Weighting Examples**:

- **Prototype/R&D**: Speed 0.50, Cost 0.30, Quality 0.10, Reliability 0.10 (prioritize learning fast)
- **MVP Startup**: Speed 0.40, Cost 0.30, Quality 0.20, Reliability 0.10 (launch before runway ends)
- **Production SaaS**: Speed 0.20, Cost 0.20, Quality 0.30, Reliability 0.30 (balance growth and stability)
- **Enterprise/Regulated**: Speed 0.10, Cost 0.20, Quality 0.40, Reliability 0.30 (compliance and trust critical)

---

## Step 3: Profile Scoring (0-5 scale)

Rate how well each profile fits your project's needs for each criterion.

**Scoring Guide**:
- **5** = Excellent fit (strongly supports this criterion)
- **4** = Good fit (supports this criterion well)
- **3** = Adequate (acceptable for this criterion)
- **2** = Poor fit (struggles with this criterion)
- **1** = Very poor fit (actively hinders this criterion)
- **0** = Unacceptable (fails this criterion completely)

| Profile | Speed | Cost | Quality | Reliability | **Weighted Total** |
|---------|------:|-----:|--------:|------------:|-------------------:|
| **Prototype** (lightweight, rapid iteration) | | | | | |
| **MVP** (basic controls, traceability) | | | | | |
| **Production** (full gates, SLOs, runbooks) | | | | | |
| **Enterprise** (comprehensive compliance, audits) | | | | | |

**Calculation**: Weighted Total = (Speed score × Speed weight) + (Cost score × Cost weight) + (Quality score × Quality weight) + (Reliability score × Reliability weight)

---

## Step 4: Profile Characteristics Reference

Use this to inform your scoring in Step 3.

### Prototype Profile

**When to use**: POC, R&D, innovation experiments, throwaway prototypes

**Characteristics**:
- **Speed**: ⭐⭐⭐⭐⭐ (Fastest - minimal overhead, rapid iteration)
- **Cost**: ⭐⭐⭐⭐⭐ (Lowest - minimal documentation, no compliance overhead)
- **Quality**: ⭐⭐ (Basic - manual testing, no gates)
- **Reliability**: ⭐ (Best-effort - no SLOs, no monitoring)

**Process Rigor**:
- Documentation: Lightweight (README, sketches, notes)
- Testing: Manual exploration, no coverage requirements
- Security: Basic auth, no PII storage, placeholder secrets
- Deployment: Local/dev environments only
- Gates: None (move fast, learn, iterate)

**Best For**: Learning, validating ideas, technical spikes, demos

---

### MVP Profile

**When to use**: Early-stage startups, internal tools, beta releases, time-sensitive launches

**Characteristics**:
- **Speed**: ⭐⭐⭐⭐ (Fast - streamlined process, essential docs only)
- **Cost**: ⭐⭐⭐⭐ (Low - efficient, automated where possible)
- **Quality**: ⭐⭐⭐ (Moderate - baseline controls, SBOM, basic testing)
- **Reliability**: ⭐⭐⭐ (Acceptable - p95 targets, basic alerts)

**Process Rigor**:
- Documentation: Cards/briefs, minimal plans (user stories, basic architecture)
- Testing: Automated tests for critical paths, basic coverage (>50%)
- Security: Baseline controls (secrets management, HTTPS, input validation)
- Deployment: Staging + production, basic CI/CD
- Gates: Security basics, automated tests passing

**Best For**: Validated ideas ready for market, small user bases (<1k users), rapid growth phases

---

### Production Profile

**When to use**: Established products, growing user bases, revenue-generating services

**Characteristics**:
- **Speed**: ⭐⭐⭐ (Moderate - balanced process, quality gates slow releases)
- **Cost**: ⭐⭐⭐ (Moderate - investment in quality pays off over time)
- **Quality**: ⭐⭐⭐⭐ (High - SAST/DAST, threat model, zero critical vulnerabilities)
- **Reliability**: ⭐⭐⭐⭐ (High - SLO/SLI, ORR, runbooks, incident response)

**Process Rigor**:
- Documentation: Full traceability (requirements → code → tests → releases)
- Testing: Comprehensive coverage (>80%), integration + e2e tests
- Security: Threat modeling, SAST/DAST, security gates, penetration testing
- Deployment: Multi-stage (dev/staging/production), blue-green or canary
- Gates: Security review, performance validation, operational readiness

**Best For**: Products with >1k users, revenue-critical services, customer commitments (SLAs)

---

### Enterprise Profile

**When to use**: Regulated industries, compliance requirements, mission-critical systems, large organizations

**Characteristics**:
- **Speed**: ⭐⭐ (Slower - comprehensive gates, audit requirements)
- **Cost**: ⭐⭐ (Higher - extensive documentation, compliance overhead)
- **Quality**: ⭐⭐⭐⭐⭐ (Highest - comprehensive SDL, compliance frameworks, audits)
- **Reliability**: ⭐⭐⭐⭐⭐ (Highest - error budgets, chaos drills, 24/7 on-call, DR)

**Process Rigor**:
- Documentation: Comprehensive (all SDLC artifacts, audit trails, compliance evidence)
- Testing: Exhaustive (unit, integration, e2e, performance, security, chaos)
- Security: Comprehensive SDL (threat model, SAST/DAST/IAST, pen tests, bug bounty, IR playbooks)
- Deployment: Automated with rollback, multi-region DR, zero-downtime
- Gates: Strict (security review, compliance check, legal review, change advisory board)

**Best For**: Healthcare (HIPAA), finance (PCI-DSS, SOX), government (FedRAMP), enterprise contracts with audit requirements

---

## Step 5: Decision & Rationale

**Recommended Profile** (based on highest weighted score): `__________________`

**Rationale**:
```
Explain why this profile fits best based on:
- Weighted scoring results
- Stakeholder constraints (regulatory, contractual, budget, timeline)
- Risk tolerance and consequences of failure
- Team capacity and skills
```

**Overrides** (constraints that override scoring):
- [ ] Regulatory compliance mandates Enterprise profile (e.g., HIPAA, FedRAMP)
- [ ] Contractual SLA requires Production or Enterprise profile
- [ ] Budget/timeline constraints force Prototype or MVP despite quality needs
- [ ] Team size/skills limit ability to execute higher-rigor profiles
- [ ] Other: `_________________`

**Tailoring Notes** (adjustments to standard profile):
```
Document any deviations from the selected profile's defaults:
- Areas where you'll apply MORE rigor (e.g., "MVP with Production-level security due to PII")
- Areas where you'll apply LESS rigor (e.g., "Production but skip chaos drills initially")
- Phased approach (e.g., "Start as MVP, evolve to Production after 6 months")
```

---

## Step 6: Profile Evolution Plan

Many projects **start at one profile and evolve** as they mature. Document the planned trajectory:

**Current Profile**: `____________` (based on Step 5)

**Planned Evolution**:
- [ ] No evolution planned (stays at current profile)
- [ ] Prototype → MVP (when: `_________________`, trigger: `_________________`)
- [ ] MVP → Production (when: `_________________`, trigger: `_________________`)
- [ ] Production → Enterprise (when: `_________________`, trigger: `_________________`)

**Evolution Triggers** (what events drive profile upgrades):
- User base growth (e.g., ">10k users → Production", ">100k users → Enterprise")
- Revenue milestones (e.g., "$1M ARR → Production")
- Regulatory requirements (e.g., "First enterprise customer with SOC2 requirement → Enterprise")
- Security incidents (e.g., "Data breach → immediate Production/Enterprise upgrade")
- Compliance deadlines (e.g., "GDPR compliance required by Q4 → Production")

---

## Step 7: Implications & Trade-offs

Understanding what you're **gaining** and **giving up** with the selected profile:

**Selected Profile**: `__________________`

**What You're Optimizing For** (strengths of this profile):
- ✓ `_________________`
- ✓ `_________________`
- ✓ `_________________`

**What You're Sacrificing** (weaknesses of this profile):
- ✗ `_________________`
- ✗ `_________________`
- ✗ `_________________`

**Risks to Monitor**:
- `Risk:` `_________________` → `Mitigation:` `_________________`
- `Risk:` `_________________` → `Mitigation:` `_________________`

**Acceptance Criteria** (when to revisit this decision):
- Revisit profile if: `_________________`
- Reassess in: `___ weeks/months or milestone: ___`

---

## Example: Filled Option Matrix

**Project**: Internal employee directory (B2B SaaS startup, 500 employees)

**Constraints**:
- Budget: Limited (seed stage)
- Timeline: 6 weeks to launch
- Team: 2 developers
- Regulatory: GDPR (EU employees)
- Contractual: None (internal tool)

**Weights**:
- Speed: 0.40 (launch pressure)
- Cost: 0.30 (limited budget)
- Quality: 0.20 (internal tool, not mission-critical)
- Reliability: 0.10 (best-effort acceptable)

**Scoring**:

| Profile | Speed | Cost | Quality | Reliability | Weighted Total |
|---------|------:|-----:|--------:|------------:|---------------:|
| Prototype | 5 | 5 | 1 | 1 | (5×0.4)+(5×0.3)+(1×0.2)+(1×0.1) = **3.8** |
| **MVP** | **4** | **4** | **3** | **3** | **(4×0.4)+(4×0.3)+(3×0.2)+(3×0.1) = 4.1** ⭐ |
| Production | 2 | 2 | 4 | 4 | (2×0.4)+(2×0.3)+(4×0.2)+(4×0.1) = 2.6 |
| Enterprise | 1 | 1 | 5 | 5 | (1×0.4)+(1×0.3)+(5×0.2)+(5×0.1) = 2.2 |

**Decision**: MVP Profile with GDPR tailoring

**Rationale**: MVP scores highest (4.1). Provides baseline controls for GDPR (consent, deletion, data mapping) while maintaining speed and cost efficiency. Will upgrade to Production if tool becomes customer-facing.

**Tailoring**: MVP + Production-level data privacy (due to GDPR) but skip chaos drills and 24/7 on-call (internal tool).

**Evolution**: MVP → Production if we white-label for customers (trigger: first external sales conversation).
