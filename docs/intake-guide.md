# Getting Started with Intake

Intake is how AI agents learn about your project. It generates structured documents that guide all future operations - from architecture decisions to test strategies to deployment plans.

These same documents serve your human team too: stakeholder alignment, onboarding new developers, planning sessions, and project documentation. One intake process, dual purpose.

Just describe what you're building and let the system handle the rest.

---

## New Project

**Natural language:**

```text
"Start a new project for a payment processing API"
```

**Slash command:**

```text
/intake-wizard "payment processing API"
```

The system:
1. Asks clarifying questions (--interactive by default)
2. Generates intake documents
3. Validates completeness
4. Kicks off inception phase
5. Assigns agents and begins work

---

## Existing Codebase

**Natural language:**

```text
"Analyze this codebase and start a project from it"
```

**Slash command:**

```text
/intake-from-codebase ./src
```

The system:
1. Scans your code for patterns, dependencies, architecture
2. Generates intake reflecting what exists
3. Identifies gaps and technical debt
4. Kicks off with full context of current state

---

## Add Context with --guidance

Shape the entire project with upfront context.

**Natural language:**

```text
"Start a new inventory management system" --guidance "must integrate with SAP, team is new to microservices"
```

**Slash command:**

```text
/intake-wizard "inventory management system" --guidance "must integrate with SAP, team is new to microservices"
```

The guidance flows through everything:
- Intake questions focus on SAP integration points
- Architecture considers team experience level
- Risk assessment flags microservices learning curve
- All generated artifacts reflect these constraints

### More Examples

```text
"Analyze this codebase" --guidance "preparing for SOC2 audit"
/intake-from-codebase . --guidance "preparing for SOC2 audit"
→ Focuses on security posture, access controls, logging

"Start a mobile app project" --guidance "offline-first, rural users with poor connectivity"
/intake-wizard "mobile app" --guidance "offline-first, rural users with poor connectivity"
→ Prioritizes sync strategies, local storage, graceful degradation
```

---

## Interactive Mode

Ask for maximum collaboration with `--interactive`.

**Natural language:**

```text
"Start intake for a healthcare app" --interactive
```

**Slash command:**

```text
/intake-wizard "healthcare app" --interactive
```

**Example conversation:**

```text
Agent: Healthcare apps often have compliance requirements. Which apply?
  1. HIPAA (US patient data)
  2. GDPR (EU users)
  3. Both
  4. Not sure yet - help me figure it out
> 4

Agent: Let's work through this. Will the app store any of these?
  - Patient names or contact info
  - Medical diagnoses or conditions
  - Prescription information
> Yes, patient names and prescriptions

Agent: That's Protected Health Information under HIPAA. I'll include:
  - HIPAA compliance requirements in intake
  - Security controls for PHI
  - Audit logging requirements
  - BAA considerations for third-party services
```

---

## Combine --guidance and --interactive

The most powerful pattern:

**Natural language:**

```text
"Start a fintech project" --interactive --guidance "Series A startup, need to move fast but can't compromise on security"
```

**Slash command:**

```text
/intake-wizard "fintech project" --interactive --guidance "Series A startup, move fast, security non-negotiable"
```

Agent understands the context and asks smart questions:
- "PCI compliance needed, or just general financial data?"
- "In-house security team, or need automated tooling?"
- "MVP scope - what's the minimum for launch?"

---

## Resume or Complete Intake

**Natural language:**

```text
"Continue with the intake we started"
```

**Slash command:**

```text
/intake-wizard --complete
```

---

## Start from Existing Intake Files

If you already have intake documents in `.aiwg/intake/`:

**Natural language:**

```text
"Start the project from the intake files"
```

**Slash command:**

```text
/intake-start .aiwg/intake
```

With guidance:

```text
/intake-start .aiwg/intake --guidance "prioritize security requirements"
```

---

## Marketing Projects

For marketing campaigns instead of software:

**Natural language:**

```text
"Start a marketing campaign for our product launch"
```

**Slash command:**

```text
/marketing-intake-wizard "Product launch campaign for Q1"
```

From existing materials:

```text
/intake-from-campaign ./marketing-assets --interactive
```

---

## What Happens Behind the Scenes

```
Your description
      ↓
┌─────────────────────────────┐
│  Intake Wizard              │
│                             │
│  - Parses your description  │
│  - Identifies project type  │
│  - Asks clarifying questions│
│  - Generates intake docs    │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│  Validation                 │
│                             │
│  - Checks completeness      │
│  - Identifies gaps          │
│  - Suggests clarifications  │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│  Inception Kickoff          │
│                             │
│  - Assigns specialist agents│
│  - Creates phase plan       │
│  - Begins orchestrated work │
└─────────────────────────────┘
```

---

## Quick Reference

| Action | Natural Language | Slash Command |
|--------|------------------|---------------|
| New project | "Start a new project for X" | `/intake-wizard "X"` |
| From codebase | "Analyze this codebase" | `/intake-from-codebase .` |
| With guidance | + `--guidance "context"` | + `--guidance "context"` |
| Interactive | + `--interactive` | + `--interactive` |
| Resume | "Continue intake" | `/intake-wizard --complete` |
| From files | "Start from intake files" | `/intake-start .aiwg/intake` |
| Marketing | "Start marketing campaign" | `/marketing-intake-wizard "X"` |

---

## Tips for Best Results

1. **Be specific about the domain** - "payment API" vs "payment API for recurring SaaS subscriptions"

2. **Include key constraints upfront** - Compliance, timeline, team size, integrations

3. **Use --guidance for context that affects everything** - Not just features, but business context

4. **Let --interactive ask questions** - The AI often identifies things you haven't thought about

5. **Don't worry about format** - Natural language works. The system figures out what you need.
