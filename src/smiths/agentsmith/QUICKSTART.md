# AgentSmith Quick Start

Generate custom agents following the 10 Golden Rules in 3 steps.

## Installation

AgentSmith is part of the AIWG Smiths ecosystem. No separate installation needed.

```typescript
import { AgentGenerator } from './smiths/agentsmith/index.js';
```

## Quick Start

### Step 1: Create Generator

```typescript
import { AgentGenerator } from './smiths/agentsmith/index.js';

const generator = new AgentGenerator();
```

### Step 2: Generate Agent

```typescript
const agent = await generator.generateAgent({
  name: 'security-scanner',
  description: 'Scans code for security vulnerabilities',
  template: 'validator',
  platform: 'claude',
  projectPath: '/path/to/project',
});
```

### Step 3: Deploy

```typescript
await generator.deployAgent(agent);
// Agent deployed to .claude/agents/security-scanner.md
```

## Templates

Choose the template that matches your use case:

| Template | When to Use | Model | Tools | Constraints |
|----------|-------------|-------|-------|-------------|
| `simple` | Single-purpose tasks | haiku | Read, Write | 2 tools max |
| `complex` | Analysis, decision-making | sonnet | Read, Write, Grep | 3 tools max |
| `orchestrator` | Multi-agent coordination | opus | Task | Delegation only |
| `validator` | Quality checks, validation | sonnet | Read, Grep | Read-only |

## Common Patterns

### Pattern 1: Simple Agent

```typescript
const agent = await generator.generateAgent({
  name: 'api-documenter',
  description: 'Generates API documentation from code',
  template: 'simple',
  platform: 'claude',
  projectPath: '/my/project',
});
```

### Pattern 2: With Guidance

```typescript
const agent = await generator.generateAgent({
  name: 'security-validator',
  description: 'Validates code security',
  template: 'validator',
  platform: 'claude',
  projectPath: '/my/project',
  guidance: `
    Expert in OWASP Top 10 and secure coding.
    Must scan for SQL injection, XSS, CSRF.
    Should flag hardcoded secrets.
    Output format: JSON with severity, file, line.
  `,
});
```

### Pattern 3: Custom Tools

```typescript
const agent = await generator.generateAgent({
  name: 'dependency-checker',
  description: 'Checks outdated dependencies',
  template: 'simple',
  platform: 'claude',
  projectPath: '/my/project',
  tools: ['Read', 'Bash'], // Override default
});
```

### Pattern 4: Dry Run

```typescript
const agent = await generator.generateAgent({
  name: 'test-agent',
  description: 'Test agent',
  platform: 'claude',
  projectPath: '/my/project',
  dryRun: true, // Preview only
});

console.log(agent.content); // See generated content
```

### Pattern 5: Multi-Platform

```typescript
const platforms = ['claude', 'cursor', 'codex'];

for (const platform of platforms) {
  const agent = await generator.generateAgent({
    name: 'my-agent',
    description: 'Multi-platform agent',
    platform,
    projectPath: '/my/project',
  });

  await generator.deployAgent(agent);
}
```

## Supported Platforms

| Platform | Path | Format |
|----------|------|--------|
| claude | `.claude/agents/` | YAML + Markdown |
| cursor | `.cursor/agents/` | JSON |
| codex | `.codex/agents/` | YAML + Markdown |
| factory | `.factory/droids/` | YAML + Markdown |
| windsurf | `.windsurf/agents/` | Plain Markdown |
| generic | `agents/` | Minimal YAML + Markdown |

## Guidance Extraction

AgentSmith extracts structured info from natural language:

```typescript
guidance: `
  Expert in GraphQL and REST APIs.           → Expertise
  Knowledge of OpenAPI 3.0 spec.             → Expertise
  Must validate endpoint naming.             → Responsibility
  Should flag inconsistencies.               → Responsibility
  Example: GET /users/:id returns 200.       → Example
  Output format: List with severity.         → Output Format
`
```

## Template Selection Guide

### Choose `simple` when:
- Task is well-defined and focused
- Needs basic file read/write
- No complex analysis required
- Example: format code, add comments, rename files

### Choose `complex` when:
- Needs analysis across multiple files
- Requires pattern matching or search
- Makes decisions based on code structure
- Example: refactoring, code quality checks, dependency analysis

### Choose `orchestrator` when:
- Coordinates multiple agents
- Delegates subtasks
- Synthesizes results from other agents
- Example: test suite runner, deployment pipeline, multi-stage validation

### Choose `validator` when:
- Performs quality/compliance checks
- Read-only operations
- Reports findings without modification
- Example: security scanning, lint checking, standards compliance

## 10 Golden Rules

All agents automatically follow these rules:

1. **Single Responsibility** - One clear purpose
2. **Minimal Tools** - 0-3 tools maximum
3. **Explicit I/O** - Clear inputs and outputs
4. **Grounding** - Verifies before acting
5. **Uncertainty** - Escalates ambiguity
6. **Context Scope** - Filters distractors
7. **Recovery** - Handles errors
8. **Model Tier** - Matches complexity
9. **Parallel Ready** - Concurrent-safe
10. **Observable** - Traceable output

## Advanced Options

### Model Override

```typescript
const agent = await generator.generateAgent({
  name: 'complex-task',
  description: 'Complex formatting task',
  template: 'simple',  // Default: haiku
  model: 'opus',       // Override: use opus
  platform: 'claude',
  projectPath: '/my/project',
});
```

### Version & Category

```typescript
const agent = await generator.generateAgent({
  name: 'versioned-agent',
  description: 'Agent with metadata',
  platform: 'claude',
  projectPath: '/my/project',
  category: 'testing',
  version: '2.1.0',
});
```

## Troubleshooting

### Error: "Agent name must be kebab-case"
Use lowercase with hyphens: `my-agent` not `MyAgent` or `my_agent`

### Error: "Maximum 2 tools allowed"
Simple template allows max 2 tools. Use `complex` template or reduce tools.

### Error: "Description must be at least 10 characters"
Provide more descriptive text: "Validates code" → "Validates code for security vulnerabilities"

## Next Steps

- Read [README.md](./README.md) for complete documentation
- See [examples.ts](./examples.ts) for 10 usage examples
- Check [cli-integration-example.md](./cli-integration-example.md) for CLI usage
- Review [IMPLEMENTATION.md](./IMPLEMENTATION.md) for architecture details

## API Reference

### `generateAgent(options: AgentOptions): Promise<GeneratedAgent>`

Generate agent with options:
- `name` (required): Kebab-case name
- `description` (required): Agent description
- `platform` (required): Target platform
- `projectPath` (required): Project root
- `template` (optional): simple|complex|orchestrator|validator
- `guidance` (optional): Natural language guidance
- `model` (optional): haiku|sonnet|opus
- `tools` (optional): Custom tool list
- `dryRun` (optional): Preview without deployment
- `category` (optional): Agent category
- `version` (optional): Agent version

### `deployAgent(agent: GeneratedAgent): Promise<void>`

Deploy generated agent to filesystem.

### `listTemplates(): Array<{ name: AgentTemplate; config: TemplateConfig }>`

List all available templates.

### `getTemplateConfig(template: AgentTemplate): TemplateConfig`

Get configuration for a specific template.
