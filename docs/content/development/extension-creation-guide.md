# Creating AIWG Extensions

Extensions are "expansion packs" that add domain-specific capabilities to existing frameworks. They cannot operate standalone - they require their parent framework.

## When to Create an Extension

Create an extension when you need:

- Compliance modules (GDPR, HIPAA, SOX, PCI-DSS)
- Industry-specific adaptations (healthcare, fintech, government)
- Regional/legal variations (EU, US, APAC regulations)
- Specialized workflows that build on framework foundations

Examples:

- `hipaa` extension for `sdlc-complete` - Healthcare compliance
- `ftc` extension for `media-marketing-kit` - FTC advertising guidelines
- `gdpr` extension for any framework - Data protection requirements

## Extension vs Addon

| Aspect | Extension | Addon |
|--------|-----------|-------|
| Standalone? | No - requires parent | Yes - works anywhere |
| Location | `frameworks/{id}/extensions/` | `addons/` |
| Manifest | Has `requires` field | No `requires` field |
| Deploy | `aiwg -deploy-extension` | `aiwg -deploy-agents` |
| Scope | Framework-specific | Universal |

## Quick Start

### Using CLI

```bash
# Create extension structure
aiwg scaffold-extension hipaa --for sdlc-complete --description "HIPAA compliance templates"

# Result:
# agentic/code/frameworks/sdlc-complete/extensions/hipaa/
# ├── manifest.json
# ├── README.md
# ├── templates/
# └── checklists/

# Add components
aiwg add-template phi-handling --to sdlc-complete/extensions/hipaa --type checklist
aiwg add-agent compliance-reviewer --to sdlc-complete/extensions/hipaa --template complex
```

### Using In-Session Commands

```bash
/devkit-create-extension hipaa --for sdlc-complete --interactive
```

Claude will ask about:

1. **Compliance domain**: What regulations/standards does this cover?
2. **Parent integration**: Which framework phases does this extend?
3. **Artifacts**: What checklists, templates, or agents are needed?
4. **Validation**: How will compliance be verified?

## Extension Structure

```
frameworks/sdlc-complete/extensions/hipaa/
├── manifest.json       # Package metadata with "requires" field
├── README.md           # Documentation
├── agents/             # Compliance-focused agents
│   └── phi-reviewer.md
├── commands/           # Compliance workflows
│   └── hipaa-audit.md
├── templates/          # Compliance documents
│   ├── phi-inventory.md
│   ├── baa-template.md
│   └── breach-response.md
├── checklists/         # Audit checklists
│   ├── technical-safeguards.md
│   ├── administrative-safeguards.md
│   └── physical-safeguards.md
└── flows/              # Extension-specific workflows (optional)
    └── compliance-review.md
```

## Manifest Configuration

```json
{
  "id": "hipaa",
  "type": "extension",
  "name": "HIPAA Compliance Extension",
  "version": "1.0.0",
  "description": "Healthcare compliance templates and checklists for SDLC",
  "author": "Your Name",
  "license": "MIT",
  "requires": ["sdlc-complete"],
  "entry": {
    "agents": "agents",
    "commands": "commands",
    "templates": "templates",
    "checklists": "checklists"
  },
  "agents": ["phi-reviewer"],
  "commands": ["hipaa-audit"],
  "templates": ["phi-inventory", "baa-template", "breach-response"],
  "checklists": ["technical-safeguards", "administrative-safeguards", "physical-safeguards"]
}
```

### Key Fields

| Field | Purpose |
|-------|---------|
| `type` | Must be `"extension"` |
| `requires` | Array of parent framework IDs |
| `checklists` | Extension-specific component type |

## Creating Compliance Checklists

```bash
aiwg add-template security-controls --to sdlc-complete/extensions/hipaa --type checklist
```

```markdown
# HIPAA Security Controls Checklist

## Technical Safeguards (45 CFR 164.312)

### Access Control (§164.312(a)(1))

- [ ] Unique user identification implemented
- [ ] Emergency access procedure documented
- [ ] Automatic logoff configured
- [ ] Encryption and decryption mechanisms in place

### Audit Controls (§164.312(b))

- [ ] Hardware audit mechanisms implemented
- [ ] Software audit mechanisms implemented
- [ ] Procedural audit mechanisms documented

### Integrity (§164.312(c)(1))

- [ ] Electronic mechanisms to corroborate data integrity
- [ ] Transmission security measures in place

## Evidence

| Control | Implementation | Evidence Location |
|---------|---------------|-------------------|
| Access Control | | |
| Audit Logging | | |
```

## Creating Compliance Templates

```bash
aiwg add-template risk-assessment --to sdlc-complete/extensions/hipaa --type document
```

Document templates provide structure for compliance artifacts that integrate with parent framework workflows.

## Creating Compliance Agents

```bash
aiwg add-agent compliance-auditor --to sdlc-complete/extensions/hipaa --template complex
```

Compliance agents should:

1. Reference parent framework artifacts (requirements, architecture)
2. Apply domain-specific validation rules
3. Generate compliance evidence and reports
4. Integrate with parent framework gates

Example agent prompt structure:

```markdown
## Domain Expertise

- HIPAA Security Rule (45 CFR 164.302-318)
- HIPAA Privacy Rule (45 CFR 164.500-534)
- HITECH Act requirements
- OCR audit protocols

## Integration Points

This agent integrates with parent SDLC framework:

- **Requirements phase**: Validate PHI handling requirements
- **Architecture phase**: Review security architecture for compliance
- **Testing phase**: Verify security control implementation
- **Deployment phase**: Validate production security posture
```

## Integration with Parent Framework

Extensions inherit and extend parent framework capabilities:

### Workflow Integration

Extensions can hook into parent framework phases:

```markdown
# hipaa-audit.md command

---
name: hipaa-audit
description: HIPAA compliance audit for current phase
args:
  - name: phase
    description: SDLC phase to audit (inception, elaboration, construction, transition)
    required: true
---

## Process

1. Read parent framework phase artifacts from `.aiwg/`
2. Apply HIPAA-specific validation rules
3. Generate compliance report
4. Update `.aiwg/security/hipaa/` with audit results
```

### Template Inheritance

Extension templates can reference parent templates:

```markdown
<!-- Extends: sdlc-complete/templates/security/threat-model-template.md -->

# HIPAA Threat Model

This extends the standard threat model with HIPAA-specific threats.

## Standard Threats
<!-- Include base threat categories from parent -->

## PHI-Specific Threats

### Unauthorized PHI Access
- Threat: Unauthorized access to Protected Health Information
- HIPAA Reference: §164.312(a)(1)
- Mitigation: [specific controls]
```

## Deployment

```bash
# Deploy extension to project (requires parent framework)
aiwg -deploy-extension hipaa --framework sdlc-complete --target ./my-project

# This copies:
# - Extension agents to .claude/agents/
# - Extension commands to .claude/commands/
# - Extension templates to .aiwg/templates/hipaa/
```

## Validation

```bash
# Validate extension structure
aiwg validate sdlc-complete/extensions/hipaa --verbose

# Checks:
# - Parent framework exists
# - "requires" field is valid
# - All referenced components exist
# - Extension-specific directories present
```

## Best Practices

1. **Keep extensions focused** - One compliance domain per extension
2. **Reference parent artifacts** - Don't duplicate, extend
3. **Provide clear traceability** - Map requirements to controls to evidence
4. **Include audit checklists** - Make compliance verification actionable
5. **Document regulatory references** - Cite specific regulations/sections
6. **Version with regulations** - Update when regulations change

## Examples

### Existing Extensions

- `sdlc-complete/extensions/gdpr` - GDPR data protection
- `sdlc-complete/extensions/legal` - Legal review templates
- `media-marketing-kit/extensions/ftc` - FTC advertising compliance

### Common Extension Patterns

**Compliance Extension**:

- Checklists for each control family
- Templates for required documentation
- Agents for automated validation
- Commands for audit workflows

**Industry Extension**:

- Domain-specific terminology
- Industry workflow variations
- Regulatory requirements
- Best practice templates

**Regional Extension**:

- Localized templates
- Regional regulatory requirements
- Language/cultural considerations
