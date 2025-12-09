# AIWG CLI Usage Guide

## Installation

```bash
npm install -g ai-writing-guide
```

## Quick Start

### Validate Files

```bash
# Validate single file
aiwg validate article.md

# Validate multiple files
aiwg validate docs/*.md

# Validate with custom threshold
aiwg validate README.md --threshold 80

# Validate with context
aiwg validate technical-doc.md --context technical
```

### Optimize Content

```bash
# Analyze and show optimization suggestions
aiwg optimize prompt.txt

# Apply optimization (creates .original backup)
aiwg optimize prompt.txt --apply

# Optimize with voice guidance
aiwg optimize article.md --voice technical --apply
```

### Full Workflow (Validate → Optimize → Re-validate)

```bash
# Run full workflow on files
aiwg workflow docs/*.md

# Auto-apply optimizations
aiwg workflow docs/*.md --auto-fix

# Custom threshold and output
aiwg workflow src/**/*.md --threshold 75 --format json --output report.json
```

### Watch Mode

```bash
# Watch markdown files with auto-fix
aiwg watch "**/*.md" --auto-fix

# Watch with custom debounce
aiwg watch "**/*.md" "**/*.txt" --debounce 1000

# Watch without auto-fix (validation only)
aiwg watch "docs/**/*.md"
```

### Initialize Project

```bash
# Create .aiwgrc.json config file
aiwg init

# Force overwrite existing config
aiwg init --force
```

### Git Hooks

```bash
# Install pre-commit hook
aiwg install-hooks

# Install both pre-commit and pre-push
aiwg install-hooks --pre-commit --pre-push

# Force overwrite existing hooks
aiwg install-hooks --force

# Append to existing hooks
aiwg install-hooks --append
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
Adds AI Writing Guide constraints to avoid patterns.

**Adds**: "Avoid phrases like 'delve into', 'it's important to note', etc."

### anti_pattern
Removes AI trigger words (comprehensive, robust, seamless, etc.)

**Before**: "Write a comprehensive guide"
**After**: "Write a guide covering [specific topics]"

### voice
Injects context-specific voice guidance.

**Technical**: "Write for senior developers with opinions and edge cases"
**Academic**: "Use discipline-appropriate terminology with citations"
**Executive**: "Start with bottom-line impact, no hedging"

## Voice Framework (Skills)

The Voice Framework provides positive voice definition through voice profiles, replacing pattern-avoidance approaches.

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

## Support

- **GitHub Issues**: https://github.com/jmagly/ai-writing-guide/issues
- **Documentation**: https://github.com/jmagly/ai-writing-guide/blob/main/README.md
- **Examples**: `.aiwgrc.example.json` in repository
