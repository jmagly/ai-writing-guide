# Agentic Smiths

AgentSmith, SkillSmith, and CommandSmith are specialized Smith agents that create agentic artifacts on-demand and deploy them directly to platform directories for immediate use.

## Overview

| Smith | Creates | Deploys To | Invocation |
|-------|---------|------------|------------|
| **AgentSmith** | Agent definitions | `.claude/agents/` | `Task(AgentSmith)` |
| **SkillSmith** | Skill definitions | `.claude/skills/` | `Task(SkillSmith)` |
| **CommandSmith** | Slash commands | `.claude/commands/` | `Task(CommandSmith)` |

**Key Difference from ToolSmith/MCPSmith**: These Smiths deploy to platform-native locations so the system picks them up immediately, rather than storing in `.aiwg/smiths/` for later use.

## Getting Started

### 1. Generate Agentic Definition

Before using the Agentic Smiths, generate the environment definition:

```
/smith-agenticdef
```

This creates `.aiwg/smiths/agentic-definition.yaml` with:
- Platform provider (claude, factory, etc.)
- Available models (haiku, sonnet, opus)
- Available tools
- Deployment paths
- Capability flags

### 2. Request an Artifact

Orchestrating agents can request artifacts via the Task tool:

```
Task(AgentSmith) -> "Create an agent that reviews PRs for accessibility issues"
```

The Smith will:
1. Check if a matching artifact exists in the catalog
2. If not, design and implement the artifact
3. Deploy to the platform directory
4. Register in the catalog
5. Return usage instructions

### 3. Use the Artifact

**Agents** are invoked via Task:
```
Task(accessibility-reviewer) -> "Review src/components/"
```

**Skills** are triggered by natural language:
```
"convert this JSON to YAML"
```

**Commands** are invoked with `/`:
```
/lint-fix src/ --fix
```

## Directory Structure

```
.aiwg/smiths/
├── agentic-definition.yaml    # Shared environment definition
├── agentsmith/
│   ├── catalog.yaml           # Index of created agents
│   └── specs/                 # Agent specifications
├── skillsmith/
│   ├── catalog.yaml           # Index of created skills
│   └── specs/                 # Skill specifications
└── commandsmith/
    ├── catalog.yaml           # Index of created commands
    └── specs/                 # Command specifications

.claude/                       # DEPLOYMENT TARGET
├── agents/                    # AgentSmith deploys here
├── skills/                    # SkillSmith deploys here
└── commands/                  # CommandSmith deploys here
```

## When to Use Each Smith

### AgentSmith

Use when you need:
- A specialist for complex multi-step tasks
- Isolated context for a specific domain
- Reusable expertise that can be invoked via Task

**Examples**:
- Security reviewer for OWASP vulnerabilities
- Accessibility auditor for WCAG compliance
- Performance analyzer for bottleneck detection

### SkillSmith

Use when you need:
- Natural language triggered capabilities
- Inline transformations during conversation
- Auto-activated behaviors based on context

**Examples**:
- JSON to YAML conversion
- Code formatting on paste
- Automatic spell checking

### CommandSmith

Use when you need:
- Explicit, parameterized workflows
- Repeatable automation with arguments
- Commands that appear in `/` completion

**Examples**:
- `/lint-fix [target] [--fix]` - Run linter with auto-fix
- `/db-migrate [--rollback]` - Database migrations
- `/deploy-preview [branch]` - Deploy preview environment

## Artifact Formats

### Agent Definition

```markdown
---
name: Agent Name
description: Brief description
model: sonnet
tools: Read, Write, Glob, Grep
category: analysis
---

# Agent Name

## Purpose
[What this agent does]

## Operating Rhythm
1. Step 1
2. Step 2

## Deliverables
[What this agent produces]
```

### Skill Definition

```markdown
---
name: skill-name
description: When to use and what it does
version: 1.0.0
tools: Read, Write
---

# Skill Name

## When This Skill Applies
[Trigger conditions]

## Trigger Phrases
- "phrase 1"
- "phrase 2"

## Process
1. Step 1
2. Step 2
```

### Command Definition

```markdown
---
description: Brief description for help
category: development
argument-hint: "<required> [optional]"
allowed-tools: Bash, Read, Write
model: haiku
---

# Command Name

## Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| target | path | Yes | Target file |

## Workflow
1. Step 1
2. Step 2
```

## Catalog and Reuse

Each Smith maintains a catalog for reuse:

```yaml
# catalog.yaml
version: "1.0.0"
last_updated: "2025-12-13"

artifacts:
  - name: artifact-name
    version: "1.0.0"
    description: "What it does"
    spec_path: specs/artifact-name.yaml
    deployed_path: .claude/agents/artifact-name.md
    created: "2025-12-13"
    tags: [tag1, tag2]
    capabilities:
      - Capability 1
      - Capability 2

capability_index:
  "natural language query": artifact-name
  "alternative query": artifact-name
```

When a request comes in:
1. Smith searches `capability_index` for semantic matches
2. If >80% match found, existing artifact is returned
3. Otherwise, new artifact is created and registered

## Operating Rhythm

All Agentic Smiths follow an 8-step rhythm:

1. **Receive Request** - Parse requirements from orchestrating agent
2. **Check Catalog** - Search for existing artifact (>80% match → reuse)
3. **Consult Definition** - Verify platform capabilities
4. **Design Artifact** - Define specification
5. **Generate Definition** - Create markdown with frontmatter
6. **Deploy** - Write to platform directory
7. **Register** - Update catalog
8. **Return Result** - Provide usage instructions

## Grounding Checkpoints

### Before Creating

- [ ] Agentic definition exists
- [ ] No existing artifact >80% match
- [ ] Requested capabilities are supported
- [ ] Deployment path exists

### Before Returning

- [ ] Artifact deployed to correct path
- [ ] Frontmatter is valid
- [ ] Catalog updated
- [ ] Usage example provided

## Commands

### /smith-agenticdef

Generate or verify the agentic environment definition:

```bash
# Generate full definition
/smith-agenticdef

# Verify existing definition
/smith-agenticdef --verify-only

# Update with changes
/smith-agenticdef --update
```

## Best Practices

### For Orchestrating Agents

1. **Be specific in requests**: "Create an agent that reviews React components for accessibility" is better than "create a reviewer"
2. **Include context**: Mention relevant technologies, standards, or constraints
3. **Check catalog first**: The Smith may already have what you need

### For Artifact Design

1. **Single responsibility**: Each artifact should do one thing well
2. **Minimal tools**: Only request tools that are actually needed
3. **Clear triggers**: Skills need unambiguous activation phrases
4. **Documented arguments**: Commands need clear parameter documentation

## Troubleshooting

### "Agentic definition not found"

Run `/smith-agenticdef` to generate the environment definition.

### "Similar artifact exists"

The Smith found an existing artifact with >80% match. Review the returned artifact and either use it or request something more specific.

### "Deployment path missing"

Ensure `.claude/agents/`, `.claude/skills/`, and `.claude/commands/` directories exist.

### "Invalid tool requested"

The tool isn't in the available tools list. Check `agentic-definition.yaml` for valid tools.

## References

- AgentSmith Agent: `agentic/code/frameworks/sdlc-complete/agents/agentsmith.md`
- SkillSmith Agent: `agentic/code/frameworks/sdlc-complete/agents/skillsmith.md`
- CommandSmith Agent: `agentic/code/frameworks/sdlc-complete/agents/commandsmith.md`
- Definition Command: `agentic/code/frameworks/sdlc-complete/commands/smith-agenticdef.md`
- ToolSmith (sibling): `docs/smithing/README.md`
- MCPSmith (sibling): `docs/smithing/mcpsmith.md`
