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

## Creating Commands (Advanced / Legacy)

> **Prefer `aiwg add-skill`** for new workflows. Skills are the primary extension type — AIWG generates the corresponding command file automatically during deployment. Direct command authoring is for advanced cases where you need to write command-format content that doesn't originate from a skill source.

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

Skills are natural language workflows. Claude Code uses the `description:` field for native NL matching — it reads each skill's description at session start and autonomously decides when a skill is relevant.

### NL Trigger Strategy

**The `description:` field is the primary NL signal.** Write it well — Claude matches user intent against it automatically. Anything a user says that resembles the description will match without explicit trigger lists.

**The `## Triggers` body section is for alternate expressions only** — phrases Claude would *not* naturally associate with the skill description:

| Include in `## Triggers` | Omit from `## Triggers` |
|--------------------------|------------------------|
| Domain abbreviations ("SAST", "RTM", "IOC") | Primary phrases matching the description |
| Colloquial shorthand ("ship it", "we got paged") | Rewordings of the skill name |
| Tool-specific names ("stryker", "volatility") | Obvious synonyms ("scan" for a scanning skill) |
| Auto-trigger file patterns | Questions Claude can infer from description |
| Negation patterns ("what are we NOT doing") | Generic phrases ("run this", "do that") |

**Do NOT add a `triggers:` key to frontmatter.** Triggers are expressed through:

- `description:` — primary NL signal (frontmatter)
- `## Triggers` section in body — supplementary alt expressions only

#### Description Quality Checklist

A strong description enables Claude to match user intent without explicit trigger phrases.

| Criterion | Strong | Weak |
|-----------|--------|------|
| **Specific** | "Validate phase gate criteria with multi-agent review and generate pass/fail reports" | "Check project gates" |
| **Action-oriented** | "Extract IOCs from investigation artifacts and produce STIX 2.1 output" | "Handle IOCs" |
| **Domain-scoped** | "Continuous risk identification, assessment, tracking, and retirement throughout SDLC" | "Manage risks" |
| **Includes key terms** | "STRIDE threat modeling, vulnerability scanning, and security control validation" | "Security stuff" |
| **Differentiating** | "Detects AI-generated writing patterns and suggests authentic alternatives" | "Check writing quality" |

### SKILL.md Frontmatter Reference

`name:` and `description:` are **REQUIRED** in every SKILL.md. Codex rejects
any skill whose frontmatter is missing a non-empty `description:` field, and
Claude Code cannot auto-invoke skills without it. Tooling (scaffolder,
generator, deployers) enforces this at runtime — never skip it.

| Field | Source | Required | Purpose |
|-------|--------|----------|---------|
| `name:` | Official | **Yes** | Skill name; also controls the generated command's slash-command path |
| `description:` | Official | **Yes (non-empty)** | **Primary NL signal.** Claude reads this at session start and autonomously invokes the skill when user intent matches. Codex rejects skills without it. A weak or empty description degrades discoverability and breaks deployments. |
| `effort:` | Official | Model effort override: `1` (low), `2` (medium), `3` (high) |
| `user-invocable:` | Official | `false` = background-only; not shown in `/` autocomplete |
| `disable-model-invocation:` | Official | `true` = explicit user-only; disables autonomous model invocation |
| `context:` | Official | `fork` (isolated) or `inherit` (shared context) |
| `allowed-tools:` | Official | Restrict which tools the skill may use |
| `platforms:` | AIWG-internal | Multi-provider deployment targets |
| `autoTrigger:` | AIWG-internal | AIWG-level auto-trigger annotation |
| `commandHint:` | AIWG-internal | Overrides the `argument-hint` in the generated command file |

### Skill Structure

```markdown
---
name: Security Awareness
description: Detects security-sensitive context and suggests review when editing authentication, authorization, or data-handling code
version: 1.0.0
capabilities:
  - security
  - context-awareness
  - automated-review
keywords:
  - security
  - awareness
  - context
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

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "OWASP check" → OWASP Top 10 validation
- "is the code safe" → colloquial security check
- "pentest prep" → pre-penetration-test readiness
- Auto-triggered when editing `src/auth/**`, `src/security/**`, or files containing password/token handling

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

Security-sensitive code detected

You're modifying authentication logic. Consider:

- Input validation on username/password
- Rate limiting to prevent brute force
- Secure password hashing (bcrypt, scrypt)
- Session token security (httpOnly, secure flags)
- Audit logging for failed attempts

Recommend security review before merging.
Run: /security-auditor "Review auth changes"

```
```

### Skill Metadata

```typescript
interface SkillMetadata {
  type: 'skill';
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

## Creating Souls

Souls declare agent identity — worldview, opinions, vocabulary, and
boundaries. Author souls when you need an agent or a whole project to
hold a consistent character across sessions.

### Authoring Workflow

Use the soul authoring skills rather than writing SOUL.md by hand —
they enforce the section structure and validate output.

```bash
# Generate from source material or interactive prompts
aiwg soul-create --interactive

# Improve an existing SOUL.md
aiwg soul-enhance .claude/SOUL.md

# Validate before committing
aiwg soul-validate .claude/SOUL.md

# Convert between soul and voice profile
aiwg soul-to-voice .claude/SOUL.md
aiwg voice-to-soul agentic/code/addons/voice-framework/voices/templates/technical-authority.md
```

### Required Sections

Author the SOUL.md body with these sections:

- `who-i-am` — Core identity statement
- `worldview` — Perspective and philosophy
- `opinions` — Held positions and stances
- `vocabulary` — Preferred and avoided language
- `boundaries` — What this agent will and will not do

### Project vs Agent Scope

Project-scoped souls live at the platform context root
(`.claude/SOUL.md`, `.cursor/SOUL.md`). Agent-scoped souls live next to
the agent file with a `.soul.md` suffix
(`.claude/agents/test-engineer.soul.md`). Set `scope` and (for agent
scope) `targetAgent` in the manifest.

### Wiring Souls Into Context

After authoring, run `aiwg soul-enable` to wire SOUL.md into platform
context files. `aiwg soul-disable` reverses it without deleting the
source. `aiwg soul-status` shows enforcement state across providers.

---

## Creating Behaviors

Behaviors are reactive capabilities that subscribe to system events and
optionally execute shell scripts. Reach for a behavior when the
capability needs to be always-on and event-driven, not just NL-invoked.

### Authoring Workflow

Use `aiwg add-behavior` to scaffold the directory layout — it creates
`BEHAVIOR.md` plus a `scripts/` subdirectory and registers the behavior
with the daemon.

```bash
# Scaffold a new behavior (defaults to script mode)
aiwg add-behavior security-sentinel

# Scaffold an agent-mode behavior (no scripts; AI body)
aiwg add-behavior concierge --mode agent

# Deploy to a specific provider
aiwg add-behavior security-sentinel --provider openclaw

# Lifecycle
aiwg behavior list
aiwg behavior run <name>
aiwg behavior stop <name>
```

### Choosing a Mode

- **`mode: script` (default)** — Shell scripts execute on hook events.
  Use for build monitoring, scheduled audits, deterministic checks.
- **`mode: agent`** — The BEHAVIOR.md body instructs the AI directly,
  no scripts. Use for routing, interaction-layer behaviors (Concierge),
  or anything where AI judgment is central.

### Required Frontmatter

Every BEHAVIOR.md needs `name`, `version`, `description`, `platforms`,
and at least one of `triggers` (NLP), `hooks` (events), or `scripts`.
The full frontmatter reference is in
[Extension Types — Behavior](extension-types.md#behavior-extensions).

### Cross-Platform Notes

OpenClaw is the reference implementation with native hook support.
Other providers emulate hooks via the AIWG daemon — install and run
the daemon for full behavior coverage. On platforms with no hook
support, behaviors degrade to skills (NLP triggers only) automatically.

---

## Creating Teams

Teams compose 2–8 agents into a coordinated workflow. Author a team
when a recurring multi-agent task benefits from explicit role
assignment, dispatch ordering, and handoff gates.

### Authoring Workflow

Teams are JSON files validated against a schema. Place framework teams
in `agentic/code/frameworks/{framework}/teams/{slug}.json`; place
project-local teams in `.aiwg/teams/{slug}.json` (project-local takes
precedence over framework teams with the same slug).

```bash
# List installed teams
aiwg team list

# Inspect a team
aiwg team info api-development

# Run a team
aiwg team run api-development --task "Design and ship the payments API"
```

Validate against the schema at
`agentic/code/frameworks/sdlc-complete/teams/schema.json` before
committing.

### Team Authoring Checklist

- **2–8 agents** — Smaller teams are clearer; larger teams hit context
  budget and coordination limits.
- **One `lead`** — Other roles are `contributor`, `reviewer`, `advisor`.
- **Pick a dispatch mode** — `sequential` (default) for handoff chains,
  `parallel` for independent reviews, `consensus` for joint decisions.
- **Declare handoffs explicitly** — Each handoff names the source
  agent, target agent, artifact passed, and quality gate.
- **Set `max_context_agents`** — Default is 4; lower it (2–3) for
  context-constrained sessions.

### Native vs Emulated Execution

On Claude Code, teams dispatch agents natively via the Task tool. On
all other providers, AIWG falls back to `aiwg mc` (Mission Control)
orchestration — make sure the daemon is running and the requested
agents have been deployed to that provider.

### Related Patterns

Teams complement SkillSmith (skills) and AgentSmith (agents) — author
the constituent agents first, then compose them into a team. The
`parallel-dispatch` skill is the shared primitive both team execution
modes use under the hood.

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
- **GitHub Issues**: [Report Issues](https://github.com/jmagly/aiwg/issues)
- **Documentation**: [https://aiwg.io/docs](https://aiwg.io/docs)

---

## See Also

- [Extension System Overview](overview.md)
- [Extension Types Reference](extension-types.md)
- @docs/cli-reference.md - CLI commands
- @src/extensions/types.ts - Type definitions
