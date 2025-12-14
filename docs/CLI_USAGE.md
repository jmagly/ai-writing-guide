# AIWG CLI Usage Guide

## Installation

```bash
npm install -g aiwg
```

## Quick Start

```bash
# Check installation health
aiwg doctor

# Deploy SDLC framework to your project
cd your-project
aiwg use sdlc
```

## Core Commands

### doctor

Check AIWG installation health and diagnose issues.

```bash
aiwg doctor
```

Checks:
- AIWG installation location
- Version info
- Project `.aiwg/` directory
- Deployed agents and commands
- Node.js version
- MCP server availability
- Skill Seekers (optional)

### use

Deploy a framework to your project.

```bash
# SDLC framework (software development)
aiwg use sdlc

# Marketing framework
aiwg use marketing

# Writing addon (voice profiles)
aiwg use writing

# All frameworks
aiwg use all
```

**Options:**
- `--provider <name>`: Target platform (claude, factory, openai, warp)
- `--no-utils`: Skip aiwg-utils addon
- `--force`: Overwrite existing deployments

### -new

Create a new project with full SDLC scaffolding.

```bash
aiwg -new my-project
cd my-project
```

### -status

Show workspace health and installed frameworks.

```bash
aiwg -status
```

### list

List installed frameworks and addons.

```bash
aiwg list
```

### remove

Remove a framework or addon.

```bash
aiwg remove <id>
```

## MCP Server

### mcp serve

Start the AIWG MCP server.

```bash
aiwg mcp serve
```

### mcp install

Generate MCP client configuration.

```bash
# For Claude Desktop
aiwg mcp install claude

# For Cursor IDE
aiwg mcp install cursor

# For Factory AI
aiwg mcp install factory

# Preview without writing
aiwg mcp install claude --dry-run
```

### mcp info

Show MCP server capabilities.

```bash
aiwg mcp info
```

## Channel Management

### --use-main

Switch to bleeding edge (tracks main branch).

```bash
aiwg --use-main
```

### --use-stable

Switch back to stable (npm releases).

```bash
aiwg --use-stable
```

## Maintenance

### -version

Show version and channel info.

```bash
aiwg -version
```

### -update

Check for and apply updates.

```bash
aiwg -update
```

### -help

Show all available commands.

```bash
aiwg -help
```

## Commands

### validate

Validate writing quality of files.

```bash
aiwg validate <files...> [options]
```

**Options:**
- `--threshold <number>`: Minimum validation score (0-100, default: 70)
- `--context <type>`: Validation context (academic|technical|executive|casual)
- `--format <type>`: Output format (text|json|html|junit, default: text)
- `--output <path>`: Save report to file

**Example:**
```bash
aiwg validate docs/*.md --threshold 80 --format json --output validation-report.json
```

### optimize

Optimize prompt or content to improve quality.

```bash
aiwg optimize <file> [options]
```

**Options:**
- `--voice <type>`: Voice guidance (academic|technical|executive)
- `--strategies <list>`: Comma-separated optimization strategies
- `--apply`: Apply optimization to file (creates .original backup)

**Example:**
```bash
aiwg optimize prompt.txt --voice technical --strategies specificity,examples,constraints --apply
```

### workflow

Run complete validate → optimize → revalidate workflow.

```bash
aiwg workflow <files...> [options]
```

**Options:**
- `--auto-fix`: Automatically apply optimizations
- `--threshold <number>`: Minimum validation score (default: 70)
- `--format <type>`: Output format (text|json|html|junit)
- `--output <path>`: Save report to file

**Example:**
```bash
aiwg workflow docs/**/*.md --auto-fix --threshold 75
```

### watch

Watch files and auto-process changes.

```bash
aiwg watch [patterns...] [options]
```

**Options:**
- `--auto-fix`: Automatically apply optimizations
- `--debounce <ms>`: Debounce time in milliseconds (default: 500)

**Example:**
```bash
aiwg watch "**/*.md" --auto-fix --debounce 1000
```

### init

Create `.aiwgrc.json` configuration file.

```bash
aiwg init [options]
```

**Options:**
- `--force`: Overwrite existing config

**Example:**
```bash
aiwg init --force
```

### install-hooks

Install git pre-commit and/or pre-push hooks.

```bash
aiwg install-hooks [options]
```

**Options:**
- `--pre-commit`: Install pre-commit hook (default: true)
- `--pre-push`: Install pre-push hook (default: false)
- `--force`: Overwrite existing hooks
- `--append`: Append to existing hooks

**Example:**
```bash
aiwg install-hooks --pre-commit --pre-push
```

## Configuration

### .aiwgrc.json

Create a `.aiwgrc.json` file in your project root:

```json
{
  "version": "1.0",
  "validation": {
    "enabled": true,
    "threshold": 70,
    "context": "technical",
    "failOnCritical": true
  },
  "optimization": {
    "enabled": true,
    "autoApply": false,
    "strategies": ["specificity", "examples", "constraints", "anti_pattern"],
    "createBackup": true
  },
  "output": {
    "format": "text",
    "verbose": false,
    "colors": true
  },
  "watch": {
    "enabled": false,
    "patterns": ["**/*.md", "**/*.txt"],
    "debounce": 500,
    "ignorePatterns": ["**/node_modules/**", "**/.git/**", "**/dist/**"]
  },
  "hooks": {
    "preCommit": true,
    "prePush": false
  }
}
```

### package.json Integration

Alternatively, add `aiwg` section to your `package.json`:

```json
{
  "name": "my-project",
  "aiwg": {
    "validation": {
      "threshold": 80,
      "context": "technical"
    },
    "optimization": {
      "autoApply": true
    }
  }
}
```

## Output Formats

### Text (Default)

```
=== AIWG Workflow Report ===

Total Files: 5
Passed: 4
Failed: 1
Errors: 0
Optimized: 2

=== File Results ===

[PASS] docs/api.md
  Before: 45/100, After: 78/100 (+33)
  Applied optimization
  Duration: 1245ms
```

### JSON

```json
{
  "docs/api.md": {
    "filePath": "docs/api.md",
    "validation": {
      "before": { "score": 45, "issues": [...] },
      "after": { "score": 78, "issues": [...] }
    },
    "optimization": { ... },
    "applied": true,
    "duration": 1245
  }
}
```

### HTML

Interactive HTML report with color-coded results, metrics summary, and sortable table.

### JUnit XML (for CI/CD)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="AIWG Validation" tests="5" failures="1" errors="0" time="5.234">
    <testcase name="api.md" classname="AIWG.Validation" time="1.245"/>
    <testcase name="guide.md" classname="AIWG.Validation" time="0.523">
      <failure message="Score 62 below threshold 70"/>
    </testcase>
  </testsuite>
</testsuites>
```

## Context Types

### academic
- Allows formal language
- Requires citations
- Checks for academic patterns

### technical
- Requires technical specificity
- Expects metrics and performance numbers
- Checks for jargon appropriateness

### executive
- Penalizes hedging
- Expects direct assertions
- Checks for brevity

### casual
- Allows contractions
- More relaxed tone
- Less formal requirements

## Optimization Strategies

### specificity
Adds concrete details to vague prompts.

**Before**: "Write about authentication"
**After**: "Write about OAuth 2.0 authentication for mobile apps, focusing on PKCE flow"

### examples
Adds concrete examples and use cases.

**Before**: "Explain the concept"
**After**: "Explain the concept with example: [specific scenario]"

### constraints
Adds writing quality constraints for consistency.

**Adds**: "Be specific and direct. Use concrete examples where applicable."

### specificity_boost
Replaces vague language with concrete details.

**Before**: "Write a comprehensive guide"
**After**: "Write a guide covering [specific topics]"

### voice
Injects context-specific voice guidance.

**Technical**: "Write for senior developers with opinions and edge cases"
**Academic**: "Use discipline-appropriate terminology with citations"
**Executive**: "Start with bottom-line impact, no hedging"

## Voice Framework (Skills)

The Voice Framework provides positive voice definition through voice profiles—the preferred approach for consistent writing.

### Voice Profiles

Built-in profiles in `~/.local/share/ai-writing-guide/agentic/code/addons/voice-framework/voices/templates/`:

| Profile | Description | Best For |
|---------|-------------|----------|
| `technical-authority` | Direct, precise, confident | API docs, architecture |
| `friendly-explainer` | Approachable, encouraging | Tutorials, onboarding |
| `executive-brief` | Concise, outcome-focused | Business cases, reports |
| `casual-conversational` | Relaxed, personal | Blogs, newsletters |

### Voice Skills

**voice-apply**: Transform content to match a voice profile

```text
"Write this in technical-authority voice"
"Make it more casual"
"Use the executive-brief voice"
```

**voice-create**: Generate new profiles from descriptions or examples

```text
"Create a voice for API documentation"
"Make a voice profile from this sample"
```

**voice-blend**: Combine multiple voice profiles with weighted ratios

```text
"Blend 70% technical with 30% friendly"
"Mix executive and casual voices"
```

**voice-analyze**: Analyze content's current voice characteristics

```text
"What voice is this written in?"
"Analyze the tone of this document"
```

### Deploy Voice Framework

```bash
# Deploy writing addon (includes Voice Framework)
aiwg use writing

# Or deploy with all frameworks
aiwg use all
```

### Custom Voice Profiles

Create project-specific profiles in `.aiwg/voices/`:

```yaml
# .aiwg/voices/internal-docs.yaml
name: internal-docs
description: Casual but technically precise

tone:
  formality: 0.4
  confidence: 0.8
  warmth: 0.6
  energy: 0.5

vocabulary:
  prefer:
    - "specifically"
    - "for example"
  avoid:
    - "leverage"
    - "utilize"
```

Profile priority order:
1. Project: `.aiwg/voices/`
2. User: `~/.config/aiwg/voices/`
3. Built-in: Voice Framework templates

## Exit Codes

- `0`: Success (all files passed validation threshold)
- `1`: Failure (one or more files failed or errors occurred)

## Environment Variables

- `AIWG_CONFIG`: Path to custom config file
- `NO_COLOR`: Disable colored output

## Examples

### CI/CD Integration

**GitHub Actions:**
```yaml
- name: Validate Documentation
  run: aiwg workflow "docs/**/*.md" --format junit --output results.xml
- name: Upload Results
  uses: actions/upload-artifact@v2
  with:
    name: aiwg-results
    path: results.xml
```

**GitLab CI:**
```yaml
aiwg-validate:
  stage: test
  script:
    - aiwg workflow "docs/**/*.md" --format junit --output results.xml
  artifacts:
    reports:
      junit: results.xml
```

### Pre-commit Hook

Install and configure:
```bash
$ aiwg install-hooks

# Now git commit will automatically validate staged .md/.txt files
$ git commit -m "Update docs"
Running AIWG validation...
AIWG validation passed
```

Bypass when needed:
```bash
$ git commit --no-verify -m "WIP: draft content"
```

### Local Development Workflow

1. **Initial setup:**
   ```bash
   aiwg init
   aiwg install-hooks
   ```

2. **Development with watch mode:**
   ```bash
   aiwg watch "docs/**/*.md"
   # Edit files, AIWG validates automatically
   ```

3. **Pre-commit validation:**
   ```bash
   git add .
   git commit -m "Update documentation"
   # AIWG validates staged files automatically
   ```

4. **Manual validation:**
   ```bash
   aiwg workflow docs/**/*.md --threshold 80
   ```

## Troubleshooting

### "Config file already exists"
```bash
# Force overwrite
aiwg init --force
```

### "Hook already exists"
```bash
# Overwrite
aiwg install-hooks --force

# Or append to existing
aiwg install-hooks --append
```

### "Not a git repository"
```bash
# Initialize git first
git init
aiwg install-hooks
```

### Watch mode not detecting changes
```bash
# Increase debounce time
aiwg watch "**/*.md" --debounce 1000
```

### Validation too slow
```bash
# Process fewer files at once
aiwg workflow docs/*.md  # Instead of docs/**/*.md
```

## Tips

1. **Start with defaults**: Run `aiwg init` and adjust config incrementally
2. **Use watch mode**: Get instant feedback while writing
3. **Set appropriate thresholds**: 70 is good for most content, 80+ for critical docs
4. **Context matters**: Use `--context technical` for technical docs
5. **Auto-fix carefully**: Review changes before committing (check .original backups)
6. **CI integration**: Use JUnit format for test result visualization
7. **Git hooks**: Great for team consistency, but allow `--no-verify` for WIP commits

## Agent Linting

Validate agent definitions against the AIWG Agent Design Bible (10 Golden Rules).

### lint agents

```bash
aiwg lint agents [paths...] [options]
```

**Options:**
- `--json`: Output as JSON
- `--strict`: Fail on any issue (warnings become errors)
- `--verbose`: Show detailed output
- `--fix`: Auto-fix fixable issues (where possible)

**Default paths:** SDLC agents, marketing agents, project `.claude/agents/`

**Example:**
```bash
# Lint all framework agents
aiwg lint agents

# Lint specific directory
aiwg lint agents .claude/agents/

# JSON output for CI
aiwg lint agents --json --strict

# Verbose with fix attempts
aiwg lint agents --verbose --fix
```

**Rules Checked:**
| Rule | Description | Severity |
|------|-------------|----------|
| R001 | Agent must have name field | error |
| R002 | Agent must have description | error |
| R003 | Single responsibility (description length) | warning |
| R004 | Tool count (0-3 optimal) | warning |
| R005 | Model tier appropriate to task | info |
| R006 | Required frontmatter fields | error |
| R007 | Tool naming convention | warning |
| R008 | No circular dependencies | error |
| R009 | Outputs clearly defined | info |
| R010 | Error handling documented | info |

---

## @-Mention Utilities

Manage traceability through @-mention references in code and documentation.

### mention-wire

Intelligently inject @-mentions based on codebase analysis.

```bash
aiwg wire-mentions [--target <dir>] [--dry-run] [--interactive] [--auto]
```

**Options:**
- `--target`: Directory to analyze (default: `.`)
- `--dry-run`: Show what would be added
- `--interactive`: Approve each mention
- `--auto`: Apply high-confidence (>80%) mentions
- `--confidence <n>`: Set confidence threshold (default: 80)

**Example:**
```bash
# Preview what would be wired
aiwg wire-mentions --dry-run

# Wire with interactive approval
aiwg wire-mentions --interactive

# Auto-wire high confidence
aiwg wire-mentions --auto --confidence 90
```

### mention-validate

Validate that @-mentions resolve to existing files.

```bash
aiwg validate-mentions [--target <dir>] [--strict]
```

### mention-lint

Lint @-mentions for style consistency.

```bash
aiwg mention-lint [--target <dir>] [--fix] [--strict]
```

**Lint Rules:**
| Rule | Description | Auto-fix |
|------|-------------|----------|
| ML001 | Path not exist | No |
| ML002 | Wrong case | Yes |
| ML003 | Missing prefix | Yes |
| ML004 | Deprecated pattern | Yes |
| ML005 | Invalid ID format | Yes |
| ML006 | Duplicate mentions | Yes |

### mention-report

Generate traceability report from @-mentions.

```bash
aiwg mention-report [--format md|json|csv] [--output <file>]
```

### mention-conventions

Display @-mention naming conventions.

```bash
aiwg mention-conventions
```

---

## Deploy Generators

Generate production-ready deployment configurations.

### deploy-gen

```bash
# Docker deployment
/deploy-gen docker --app-name myapp --port 3000

# Kubernetes deployment
/deploy-gen k8s --app-name myapp --port 3000

# Docker Compose
/deploy-gen compose --app-name myapp --port 3000
```

**Options:**
- `--output <dir>`: Output directory (default: `deploy/`)
- `--app-name <name>`: Application name
- `--port <n>`: Application port
- `--language <lang>`: Override detected language (node|python)

**Generated Files:**
- **Docker**: Multi-stage Dockerfile with non-root user, health checks
- **Kubernetes**: Deployment + Service with SecurityContext, probes, resources
- **Compose**: docker-compose.yml with volume mounts, health checks

---

## Support

- **GitHub Issues**: https://github.com/jmagly/ai-writing-guide/issues
- **Documentation**: https://github.com/jmagly/ai-writing-guide/blob/main/README.md
- **Examples**: `.aiwgrc.example.json` in repository
