# Creating Custom Extensions

Learn how to create custom agents, commands, skills, and other extensions for AIWG.

**References:**
- @docs/extensions/overview.md - Extension system overview
- @docs/extensions/extension-types.md - Type reference
- @src/extensions/types.ts - Type definitions
- @agentic/code/frameworks/sdlc-complete/agents/README.md - Agent examples

---

## Quick Start

### Scaffolding

Use CLI scaffolding commands to generate extension stubs:

```bash
# Create new agent
aiwg add-agent "Security Auditor"

# Create new command
aiwg add-command "security-scan"

# Create new skill
aiwg add-skill "security-awareness"

# Create new addon
aiwg scaffold-addon "security-tools"

# Create new framework
aiwg scaffold-framework "security-framework"
```

### Manual Creation

Create extension manifest manually:

```json
{
  "id": "security-auditor",
  "type": "agent",
  "name": "Security Auditor",
  "description": "Reviews code for security vulnerabilities",
  "version": "1.0.0",
  "capabilities": ["security", "code-review", "vulnerability-detection"],
  "keywords": ["security", "audit", "vulnerabilities"],
  "category": "sdlc/security",
  "platforms": {
    "claude": "full",
    "generic": "full"
  },
  "deployment": {
    "pathTemplate": ".{platform}/agents/{id}.md"
  },
  "metadata": {
    "type": "agent",
    "role": "Security Review and Vulnerability Detection",
    "model": {
      "tier": "sonnet"
    },
    "tools": ["Read", "Grep", "Bash"]
  }
}
```

---

## Creating Agents

Agents are specialized AI personas with defined roles and capabilities.

### Agent Structure

```markdown
---
name: Security Auditor
description: Reviews code for security vulnerabilities
version: 1.0.0
capabilities:
  - security
  - code-review
  - vulnerability-detection
keywords:
  - security
  - audit
  - vulnerabilities
category: sdlc/security
model: sonnet
tools:
  - Read
  - Grep
  - Bash
---

# Security Auditor

You are a Security Auditor specializing in vulnerability detection and security best practices.

## Role

Review code for security vulnerabilities including:
- Injection attacks (SQL, XSS, Command Injection)
- Authentication and authorization flaws
- Sensitive data exposure
- Security misconfigurations
- Known vulnerable dependencies

## Workflow

1. **Identify sensitive code paths**
   - Authentication mechanisms
   - Data validation points
   - External API calls
   - Database queries

2. **Review for common vulnerabilities**
   - Use OWASP Top 10 as checklist
   - Check for input validation
   - Verify output encoding
   - Review access controls

3. **Document findings**
   - Severity (Critical/High/Medium/Low)
   - Location (file:line)
   - Vulnerability type
   - Recommended fix

4. **Generate security report**
   - Executive summary
   - Detailed findings
   - Remediation plan
   - Risk assessment

## Tools

- **Read**: Examine source code
- **Grep**: Search for patterns (e.g., `eval(`, `exec(`)
- **Bash**: Run security scanners (npm audit, bandit, etc.)

## Example Usage

```
"Review authentication code in src/auth/ for security issues"
"Scan for SQL injection vulnerabilities"
"Generate security report for production deployment"
```

## References

- @.aiwg/security/threat-model.md
- @.aiwg/security/security-checklist.md
- @docs/architecture/security-architecture.md
```

### Agent Metadata

```typescript
interface AgentMetadata {
  type: 'agent';
  role: string;                     // Agent's primary role
  model: {
    tier: 'haiku' | 'sonnet' | 'opus';
    override?: string;              // Specific model ID
  };
  tools: string[];                  // Available tools
  template?: string;                // Complexity template
  maxTools?: number;                // Tool count limit
  canDelegate?: boolean;            // Can call other agents
  readOnly?: boolean;               // No Write/Bash allowed
  workflow?: string[];              // Step-by-step process
  expertise?: string[];             // Areas of expertise
  responsibilities?: string[];      // What agent does
}
```

### Best Practices

**DO:**
- Define clear, specific roles
- List required tools explicitly
- Provide step-by-step workflows
- Include concrete examples
- Add relevant references
- Use appropriate model tier (haiku for simple, opus for complex)

**DON'T:**
- Make agents too generic
- Omit tool requirements
- Skip workflow documentation
- Forget platform compatibility

---

## Creating Commands

Commands are CLI and slash commands with argument parsing.

### Command Structure

```markdown
---
name: Security Scan
description: Run security vulnerability scan
version: 1.0.0
capabilities:
  - security
  - scanning
  - vulnerability-detection
keywords:
  - security
  - scan
  - vulnerabilities
category: security
argumentHint: "[--fix] [path]"
allowedTools:
  - Read
  - Bash
  - Write
---

# Security Scan Command

Run comprehensive security vulnerability scan.

## Usage

```bash
aiwg security-scan                  # Scan current directory
aiwg security-scan src/             # Scan specific path
aiwg security-scan --fix            # Auto-fix issues
aiwg security-scan --report         # Generate report
```

## Arguments

- `path` - Directory to scan (optional, defaults to current directory)

## Options

- `--fix` - Automatically fix issues where possible
- `--report` - Generate detailed security report
- `--severity <level>` - Filter by severity (critical/high/medium/low)

## What It Does

1. Detects language/framework
2. Runs appropriate scanners:
   - `npm audit` for Node.js
   - `pip-audit` for Python
   - `bundle audit` for Ruby
3. Checks for:
   - Known vulnerable dependencies
   - Security misconfigurations
   - Code patterns (hardcoded secrets, etc.)
4. Generates report in `.aiwg/security/scan-report.md`

## Examples

```bash
# Basic scan
aiwg security-scan

# Scan with auto-fix
aiwg security-scan --fix

# Critical issues only
aiwg security-scan --severity critical

# Generate detailed report
aiwg security-scan --report
```

## Output

```
Security Scan Results:
  ✓ Dependencies scanned: 156
  ⚠ Critical issues: 2
  ⚠ High issues: 5
  ℹ Medium issues: 12

Critical Issues:
  1. lodash@4.17.20 - Prototype Pollution (CVE-2020-8203)
     Fix: npm install lodash@4.17.21

  2. axios@0.21.0 - SSRF (CVE-2020-28168)
     Fix: npm install axios@0.21.4

Report saved to: .aiwg/security/scan-report.md
```
```

### Command Metadata

```typescript
interface CommandMetadata {
  type: 'command';
  template: 'utility' | 'transformation' | 'orchestration';
  arguments?: CommandArgument[];
  options?: CommandOption[];
  argumentHint?: string;            // For help display
  allowedTools?: string[];
  model?: string;
  executionSteps?: string[];
  successCriteria?: string[];
}

interface CommandArgument {
  name: string;
  description: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean';
  default?: string | number | boolean;
  position?: number;
}

interface CommandOption {
  name: string;
  description: string;
  type: 'string' | 'boolean' | 'number' | 'array';
  default?: string | boolean | number;
  short?: string;                   // e.g., "-f"
  long?: string;                    // e.g., "--fix"
}
```

### Command Templates

**Utility** - Simple operations:
- Single file operations
- Status checks
- Information display
- Quick transformations

**Transformation** - Data processing:
- File format conversion
- Code generation
- Report generation
- Data validation

**Orchestration** - Complex workflows:
- Multi-step processes
- Agent coordination
- Framework deployment
- Migration operations

---

## Creating Skills

Skills are natural language workflows triggered by phrases.

### Skill Structure

```markdown
---
name: Security Awareness
description: Detects security-sensitive context and suggests review
version: 1.0.0
capabilities:
  - security
  - context-awareness
  - automated-review
keywords:
  - security
  - awareness
  - context
triggerPhrases:
  - "security review needed"
  - "is this secure"
  - "check security"
  - "security implications"
autoTrigger: true
autoTriggerConditions:
  - "modifying-auth-code"
  - "handling-sensitive-data"
tools:
  - Read
  - Grep
---

# Security Awareness Skill

Automatically detects security-sensitive context and provides guidance.

## When It Triggers

### Manual:
- "Is this code secure?"
- "Security review needed"
- "What are the security implications?"

### Automatic:
- Editing authentication code
- Handling sensitive data (passwords, tokens, PII)
- Making external API calls
- Database query modifications

## What It Does

1. **Detect sensitive context**
   - Authentication/authorization code
   - Data validation and sanitization
   - Cryptographic operations
   - External integrations

2. **Check for common issues**
   - Missing input validation
   - Improper error handling
   - Insecure defaults
   - Missing access controls

3. **Provide guidance**
   - Security best practices
   - OWASP recommendations
   - Framework-specific guidance
   - Link to security docs

4. **Suggest review if needed**
   - Flag high-risk changes
   - Recommend security agent review
   - Point to threat model

## References

- @.aiwg/security/threat-model.md
- @.aiwg/security/security-checklist.md
- @docs/architecture/security-architecture.md

## Example

**User edits:** `src/auth/login.ts`

**Skill activates:**
```
🛡️ Security-sensitive code detected

You're modifying authentication logic. Consider:
  ✓ Input validation on username/password
  ✓ Rate limiting to prevent brute force
  ✓ Secure password hashing (bcrypt, scrypt)
  ✓ Session token security (httpOnly, secure flags)
  ✓ Audit logging for failed attempts

Recommend security review before merging.
Run: /security-auditor "Review auth changes"
```
```

### Skill Metadata

```typescript
interface SkillMetadata {
  type: 'skill';
  triggerPhrases: string[];         // Natural language triggers
  autoTrigger?: boolean;            // Auto-activate
  autoTriggerConditions?: string[]; // When to auto-activate
  tools?: string[];
  references?: SkillReference[];
  inputRequirements?: string[];
  outputFormat?: string;
}

interface SkillReference {
  filename: string;
  description: string;
  path: string;
}
```

---

## Creating Hooks

Hooks respond to lifecycle events.

### Hook Structure

```typescript
{
  "id": "security-pre-commit",
  "type": "hook",
  "name": "Security Pre-Commit Hook",
  "description": "Runs security checks before git commit",
  "version": "1.0.0",
  "capabilities": ["security", "git-hooks", "validation"],
  "keywords": ["security", "pre-commit", "validation"],
  "category": "security/hooks",
  "platforms": {
    "claude": "full",
    "generic": "full"
  },
  "deployment": {
    "pathTemplate": ".{platform}/hooks/{id}.md"
  },
  "metadata": {
    "type": "hook",
    "event": "pre-write",
    "priority": 10,
    "canBlock": true
  }
}
```

### Hook Events

| Event | When | Can Block |
|-------|------|-----------|
| `pre-session` | Session start | No |
| `post-session` | Session end | No |
| `pre-command` | Before command runs | Yes |
| `post-command` | After command completes | No |
| `pre-agent` | Before agent invocation | Yes |
| `post-agent` | After agent completes | No |
| `pre-write` | Before file write | Yes |
| `post-write` | After file write | No |
| `pre-bash` | Before bash execution | Yes |
| `post-bash` | After bash completes | No |

---

## Creating Templates

Templates are document scaffolds with variables.

### Template Structure

```markdown
---
name: Security Review Template
description: Template for security review documentation
version: 1.0.0
capabilities:
  - documentation
  - security
  - templates
keywords:
  - template
  - security
  - review
category: security/templates
format: markdown
variables:
  - name: reviewDate
    description: Date of security review
    type: string
    required: true
  - name: reviewer
    description: Name of security reviewer
    type: string
    required: true
  - name: severity
    description: Overall severity rating
    type: string
    required: true
    default: "Medium"
---

# Security Review: {{project}}

**Review Date:** {{reviewDate}}
**Reviewer:** {{reviewer}}
**Overall Severity:** {{severity}}

## Executive Summary

<!-- Brief overview of security posture -->

## Scope

- **Components Reviewed:**
  - {{componentList}}

- **Review Type:**
  - [ ] Code Review
  - [ ] Architecture Review
  - [ ] Configuration Review
  - [ ] Dependency Review

## Findings

### Critical Issues

<!-- Issues requiring immediate attention -->

### High Priority

<!-- Important issues to address soon -->

### Medium Priority

<!-- Issues to address in next sprint -->

### Low Priority / Informational

<!-- Nice-to-have improvements -->

## Recommendations

1. **Immediate Actions:**
   -

2. **Short-term (1-2 sprints):**
   -

3. **Long-term:**
   -

## Risk Assessment

**Current Risk Level:** {{riskLevel}}

**Residual Risk (after fixes):** {{residualRisk}}

## References

- @.aiwg/security/threat-model.md
- @.aiwg/architecture/security-architecture.md
- OWASP Top 10: https://owasp.org/www-project-top-ten/
```

---

## Validation

Validate your extension before deployment:

```bash
aiwg validate-metadata path/to/extension.json
```

**Checks:**
- All required fields present
- ID follows kebab-case convention
- Version format valid (semver or CalVer)
- Capabilities and keywords provided
- Platform compatibility declared
- Metadata type matches extension type

---

## Testing Extensions

### Agent Testing

```bash
# Test agent manually
/security-auditor "Review src/auth/login.ts"

# Verify workflow
# 1. Does agent follow defined workflow?
# 2. Does agent use only declared tools?
# 3. Does agent produce expected output format?
```

### Command Testing

```bash
# Test command execution
aiwg security-scan src/

# Verify argument parsing
aiwg security-scan --fix --severity critical

# Check error handling
aiwg security-scan /nonexistent/path
```

### Skill Testing

```bash
# Test manual trigger
"Security review needed for this code"

# Test auto-trigger
# 1. Edit file matching conditions
# 2. Verify skill activates
# 3. Confirm guidance appears
```

---

## Publishing Extensions

### Package Structure

```
my-security-addon/
├── manifest.json           # Addon manifest
├── README.md               # Documentation
├── LICENSE                 # License file
├── agents/
│   ├── security-auditor.md
│   └── manifest.json
├── commands/
│   ├── security-scan.md
│   └── manifest.json
├── skills/
│   ├── security-awareness/
│   │   ├── SKILL.md
│   │   └── references/
│   └── manifest.json
└── templates/
    ├── security-review.md
    └── manifest.json
```

### Publishing to npm

```bash
# Package addon
cd my-security-addon
npm init

# Add to package.json
{
  "name": "@myorg/aiwg-security",
  "version": "1.0.0",
  "keywords": ["aiwg", "security", "addon"],
  "aiwg": {
    "type": "addon",
    "entry": "./manifest.json"
  }
}

# Publish
npm publish
```

### Using Published Addons

```bash
# Install from npm
npm install -g @myorg/aiwg-security

# Deploy to project
aiwg use @myorg/aiwg-security
```

---

## Best Practices

### General

- **Clear naming**: Use descriptive, unique IDs
- **Accurate metadata**: Capabilities and keywords match functionality
- **Platform testing**: Test on all declared platforms
- **Documentation**: Include usage examples and references
- **Versioning**: Follow semantic versioning

### Agents

- **Focused roles**: One agent, one responsibility
- **Tool minimalism**: Use minimum necessary tools
- **Workflow clarity**: Step-by-step processes
- **Example usage**: Show common invocations

### Commands

- **Argument clarity**: Clear argument descriptions
- **Error handling**: Graceful failure messages
- **Progress feedback**: Show what's happening
- **Dry-run support**: Allow preview without changes

### Skills

- **Trigger specificity**: Precise trigger phrases
- **Context awareness**: Activate in right situations
- **Helpful guidance**: Actionable recommendations
- **Non-intrusive**: Don't interrupt flow unnecessarily

### Templates

- **Variable clarity**: Clear variable descriptions
- **Sensible defaults**: Provide defaults where appropriate
- **Structure**: Logical section organization
- **Examples**: Show filled-in template

---

## Examples

See:
- @agentic/code/frameworks/sdlc-complete/agents/ - Agent examples
- @agentic/code/frameworks/sdlc-complete/commands/ - Command examples
- @agentic/code/frameworks/sdlc-complete/skills/ - Skill examples
- @agentic/code/frameworks/sdlc-complete/templates/ - Template examples

---

## Support

- **Discord**: [Join Server](https://discord.gg/BuAusFMxdA)
- **GitHub Issues**: [Report Issues](https://github.com/jmagly/ai-writing-guide/issues)
- **Documentation**: [https://aiwg.io/docs](https://aiwg.io/docs)

---

## See Also

- [Extension System Overview](overview.md)
- [Extension Types Reference](extension-types.md)
- @docs/cli-reference.md - CLI commands
- @src/extensions/types.ts - Type definitions
