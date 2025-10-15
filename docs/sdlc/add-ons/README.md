# SDLC Add-Ons

## Purpose

SDLC add-ons are **modular extensions** to the core software development lifecycle that address specific:
- **Regulatory compliance** (GDPR, HIPAA, SOC 2, etc.)
- **Legal constraints** (export controls, IP management, contracts)
- **Industry standards** (PCI DSS, ISO 27001, ITAR/EAR)
- **Technical constraints** (tech stack-specific patterns, architecture styles)
- **Domain-specific requirements** (healthcare, finance, government)

## Design Philosophy

### Core SDLC: Universal Process
The core SDLC (`docs/sdlc/templates/`, `docs/sdlc/flows/`) is **technology-agnostic, compliance-neutral, and universally applicable**. It defines:
- How to gather requirements
- How to design solutions
- How to test and deploy
- How to measure and improve

### Add-Ons: Context-Specific Constraints
Add-ons **augment** the core SDLC with specific constraints, standards, or patterns relevant to:
- **Your regulatory environment** (GDPR for EU, HIPAA for healthcare)
- **Your legal obligations** (export controls, contract commitments)
- **Your technical stack** (React patterns, PostgreSQL best practices)
- **Your industry** (financial services, healthcare, government)

## When to Use Add-Ons

### During Planning (Inception/Elaboration)
**Identify which add-ons apply to your project:**
- Review project intake (region, industry, tech stack, contracts)
- Select applicable compliance add-ons (GDPR, HIPAA, SOC 2, etc.)
- Select applicable legal add-ons (export controls, IP requirements)
- Select applicable technical add-ons (architecture style, tech stack)

**Examples:**
- EU-based SaaS → Apply GDPR add-on
- Healthcare data → Apply HIPAA add-on
- Government contract → Apply export control add-on
- Microservices architecture → Apply microservices add-on
- React frontend → Apply React patterns add-on

### To Address Deficiencies (Construction/Transition)
**Apply add-ons when gaps are discovered:**
- Compliance audit identifies GDPR gaps → Apply GDPR add-on mid-project
- Legal review identifies missing IP protections → Apply IP management add-on
- Architecture review identifies security gaps → Apply security architecture add-on
- Code review identifies poor React patterns → Apply React patterns add-on

## Add-On Categories

### 1. Compliance Add-Ons (`add-ons/compliance/`)

Regulatory and privacy compliance requirements.

**Available Add-Ons:**
- `gdpr/` - EU General Data Protection Regulation
- `ccpa/` - California Consumer Privacy Act
- `hipaa/` - Health Insurance Portability and Accountability Act
- `soc2/` - Service Organization Control 2
- `iso27001/` - Information Security Management
- `pci-dss/` - Payment Card Industry Data Security Standard
- `fedramp/` - Federal Risk and Authorization Management Program

**What's Included:**
- Compliance requirements and controls
- Template extensions (DPIA, consent management, etc.)
- Gate criteria additions
- Audit preparation guidance

### 2. Legal Add-Ons (`add-ons/legal/`)

Legal obligations and constraints.

**Available Add-Ons:**
- `export-control/` - ITAR/EAR compliance
- `ip-management/` - Patent, trademark, copyright management
- `contract-compliance/` - SLA and contract obligation tracking
- `license-compliance/` - Open source and commercial licensing
- `data-sovereignty/` - Data residency and localization requirements

**What's Included:**
- Legal requirements and obligations
- Contract-to-requirements traceability
- Risk assessment frameworks
- Approval workflow extensions

### 3. Technical Add-Ons (`add-ons/technical/`)

Technology stack-specific patterns and best practices.

**Available Add-Ons:**
- `react/` - React patterns and best practices
- `postgresql/` - PostgreSQL design patterns
- `kubernetes/` - Kubernetes deployment patterns
- `microservices/` - Microservices architecture patterns
- `event-driven/` - Event-driven architecture patterns
- `serverless/` - Serverless architecture patterns

**What's Included:**
- Technology-specific design patterns
- Best practices and anti-patterns
- Configuration templates
- Performance and security guidance

### 4. Architecture Add-Ons (`add-ons/architecture/`)

Architecture style-specific guidance.

**Available Add-Ons:**
- `microservices/` - Microservices decomposition and communication
- `event-driven/` - Event sourcing and CQRS patterns
- `monolith/` - Modular monolith patterns
- `serverless/` - Serverless architecture patterns
- `cloud-native/` - Cloud-native design principles

**What's Included:**
- Architecture decision templates
- Communication patterns
- Data consistency strategies
- Deployment patterns

### 5. Industry Add-Ons (`add-ons/industry/`)

Industry-specific requirements and patterns.

**Available Add-Ons:**
- `healthcare/` - Healthcare-specific requirements (HIPAA, FHIR, HL7)
- `finance/` - Financial services (PCI DSS, PSD2, SOX)
- `government/` - Government contracting (FedRAMP, NIST, ATO)
- `saas/` - SaaS-specific patterns (multi-tenancy, subscription management)

**What's Included:**
- Industry-specific requirements
- Domain-specific patterns
- Regulatory compliance mappings
- Reference architectures

## How Add-Ons Work

### 1. Add-On Structure

Each add-on follows a standard structure:

```
add-ons/<category>/<add-on-name>/
├── README.md                    # Add-on overview
├── requirements.md              # Requirements this add-on adds
├── templates/                   # Template extensions
│   ├── requirements/            # Requirements templates (if any)
│   ├── design/                  # Design templates (if any)
│   ├── test/                    # Test templates (if any)
│   └── deployment/              # Deployment templates (if any)
├── gate-criteria.md             # Additional gate criteria
├── integration-guide.md         # How to integrate with core SDLC
└── examples/                    # Worked examples (optional)
```

### 2. Core SDLC References Add-Ons

Core SDLC templates include **optional add-on sections**:

**Example: Project Intake Template**
```markdown
## Compliance Requirements (Optional - Select Applicable Add-Ons)

- [ ] GDPR (EU operations) → Apply `add-ons/compliance/gdpr/`
- [ ] HIPAA (healthcare data) → Apply `add-ons/compliance/hipaa/`
- [ ] SOC 2 (SaaS product) → Apply `add-ons/compliance/soc2/`
- [ ] Export Controls (international) → Apply `add-ons/legal/export-control/`

See `docs/sdlc/add-ons/README.md` for full add-on catalog.
```

**Example: Architecture Template**
```markdown
## Architecture Style (Optional - Select Applicable Add-On)

- [ ] Microservices → Apply `add-ons/architecture/microservices/`
- [ ] Event-Driven → Apply `add-ons/architecture/event-driven/`
- [ ] Serverless → Apply `add-ons/architecture/serverless/`

See `docs/sdlc/add-ons/README.md` for architecture add-on guidance.
```

### 3. Add-Ons Extend, Don't Replace

Add-ons **extend** core templates with additional requirements:

**Core Requirement**: "System must authenticate users"
**HIPAA Add-On**: "+ Multi-factor authentication required for PHI access"
**SOC 2 Add-On**: "+ Password complexity: 12+ chars, rotation every 90 days"

**Core Test**: "Verify user can log in"
**HIPAA Add-On**: "+ Verify MFA enforcement for PHI endpoints"
**Penetration Test Add-On**: "+ Verify authentication bypass attempts fail"

## Add-On Selection Guide

### Step 1: Identify Applicable Add-Ons (During Intake)

**Ask these questions:**

**Compliance:**
- Do we process EU personal data? → GDPR
- Do we process US healthcare data? → HIPAA
- Are we a SaaS vendor with enterprise customers? → SOC 2
- Do we process payment cards? → PCI DSS
- Is this a US government contract? → FedRAMP

**Legal:**
- Do we export software/technology internationally? → Export Control
- Do we use open source software? → License Compliance
- Do we have customer SLA commitments? → Contract Compliance
- Do we have patents or trademarks? → IP Management
- Do we operate in multiple countries? → Data Sovereignty

**Technical:**
- What's our frontend framework? → React/Vue/Angular add-on
- What's our database? → PostgreSQL/MongoDB/etc. add-on
- What's our architecture style? → Microservices/Event-Driven/etc. add-on
- What's our deployment platform? → Kubernetes/Serverless/etc. add-on

**Industry:**
- Are we in healthcare? → Healthcare add-on
- Are we in finance? → Finance add-on
- Are we selling to government? → Government add-on
- Are we building SaaS? → SaaS add-on

### Step 2: Apply Add-Ons to Templates

**For each selected add-on:**

1. Read `add-ons/<category>/<name>/integration-guide.md`
2. Apply template extensions to core templates
3. Add gate criteria to phase gates
4. Update requirements with add-on requirements
5. Update test plans with add-on test cases

### Step 3: Verify Add-On Coverage

**At each phase gate, verify add-on requirements are met:**

**Inception Gate:**
- All applicable add-ons identified
- Add-on requirements documented
- Expertise gaps identified (e.g., need HIPAA consultant)

**Elaboration Gate:**
- Add-on requirements incorporated into design
- Add-on gate criteria understood
- Add-on compliance approach validated

**Construction Gate:**
- Add-on requirements implemented
- Add-on tests passing
- Add-on evidence collected

**Transition Gate:**
- Add-on compliance verified
- Add-on audit trail complete
- Add-on sign-offs obtained

## Add-On Conflicts

**Some add-ons may conflict or have overlapping requirements:**

**Example: GDPR + CCPA**
- **Conflict**: Different data subject rights (GDPR Art. 17 vs CCPA right to delete)
- **Resolution**: Apply most restrictive requirement (honor both)

**Example: Export Control + Cloud Deployment**
- **Conflict**: ITAR restricts foreign access, but cloud may route through foreign regions
- **Resolution**: Use US-only cloud regions, apply encryption, verify compliance

**The integration guide for each add-on documents known conflicts and resolutions.**

## Maintenance

### Core SDLC Stability
The core SDLC remains stable and universal. Changes are rare and well-considered.

### Add-On Evolution
Add-ons evolve independently:
- GDPR add-on updates when regulations change
- React add-on updates when React best practices evolve
- SOC 2 add-on updates when controls change

**This separation enables:**
- Core SDLC simplicity (not bloated with every possible requirement)
- Add-on agility (update compliance without touching core process)
- Team clarity (know what's universal vs. context-specific)

## Creating New Add-Ons

**Teams can create custom add-ons for:**
- Company-specific compliance (internal security policies)
- Proprietary tech stacks (custom frameworks)
- Unique industry requirements (niche regulations)

**To create a new add-on:**

1. Copy template structure from existing add-on
2. Fill in requirements, templates, gate criteria
3. Write integration guide
4. Test with sample project
5. Document in add-on catalog

## Migration Guide

**If you have existing privacy/legal/technical templates mixed into core SDLC:**

1. Identify which templates are context-specific (compliance, legal, tech)
2. Move to appropriate add-on directory
3. Update core templates to reference add-ons as optional
4. Create add-on integration guides
5. Update project intake to select applicable add-ons

## Summary

**Core SDLC** = Universal process (requirements, design, test, deploy, measure)
**Add-Ons** = Context-specific constraints (GDPR, HIPAA, React, microservices, etc.)

**Benefits:**
- Core SDLC remains simple and universal
- Teams apply only relevant add-ons
- Add-ons evolve independently
- Clear separation: process vs. constraints
- Reduces cognitive load (don't need to know HIPAA if not healthcare)

**Result:** A flexible, modular SDLC that adapts to any project without bloat.

---

**Version**: 1.0
**Last Updated**: 2025-10-15
**Owner**: Executive Orchestrator
