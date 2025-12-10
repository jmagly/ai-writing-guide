# Walkthrough: Creating a Code Metrics Addon

This walkthrough demonstrates creating a complete AIWG addon from scratch using the Development Kit.

## Scenario

You want to create an addon that provides code quality metrics and analysis tools. The addon will include:
- An agent for analyzing code complexity
- A command for generating metrics reports
- A skill for on-demand quality checks

## Step 1: Scaffold the Addon

```bash
aiwg scaffold-addon code-metrics --description "Code quality metrics and analysis tools"
```

Output:
```
Scaffolding Addon: Code Metrics
───────────────────────────────
✓ Created agentic/code/addons/code-metrics/agents/
✓ Created agentic/code/addons/code-metrics/commands/
✓ Created agentic/code/addons/code-metrics/skills/
✓ Created agentic/code/addons/code-metrics/manifest.json
✓ Created agentic/code/addons/code-metrics/README.md

Addon Created Successfully
──────────────────────────
Location: ~/.local/share/ai-writing-guide/agentic/code/addons/code-metrics
```

## Step 2: Add the Complexity Analyzer Agent

```bash
aiwg add-agent complexity-analyzer --to code-metrics --template complex
```

This creates `agents/complexity-analyzer.md`. Edit it to define the agent's expertise:

```markdown
---
name: complexity-analyzer
description: Analyzes code complexity and provides improvement recommendations
model: sonnet
tools: Read, Write, Bash, Glob, Grep, WebFetch
---

# Complexity Analyzer Agent

Analyzes code complexity metrics and provides actionable recommendations.

## Domain Expertise

- Cyclomatic complexity analysis
- Cognitive complexity evaluation
- Code coupling and cohesion metrics
- Function/method length analysis
- Nesting depth analysis

## Responsibilities

1. Scan codebase for complexity hotspots
2. Calculate complexity metrics per file/function
3. Identify refactoring opportunities
4. Generate prioritized improvement recommendations

## Analysis Process

1. **Discovery**: Glob for source files by language
2. **Analysis**: Calculate metrics for each file
3. **Aggregation**: Summarize findings by module/directory
4. **Reporting**: Generate actionable recommendations

## Output Format

Provide results as:
- Summary table of highest complexity files
- Specific refactoring suggestions
- Priority ranking (critical/high/medium/low)
```

## Step 3: Add the Metrics Report Command

```bash
aiwg add-command metrics-report --to code-metrics --template utility
```

Edit `commands/metrics-report.md`:

```markdown
---
name: metrics-report
description: Generate code quality metrics report
args:
  - name: path
    description: Path to analyze (default: current directory)
    required: false
  - name: --format
    description: Output format (table|json|markdown)
    required: false
  - name: --threshold
    description: Complexity threshold for warnings (default: 10)
    required: false
---

# Metrics Report

Generate a comprehensive code quality metrics report.

## Process

1. **Scan**: Identify source files in the specified path
2. **Analyze**: Calculate complexity metrics for each file
3. **Report**: Format results according to specified format

## Metrics Collected

| Metric | Description |
|--------|-------------|
| Cyclomatic Complexity | Number of independent paths |
| Lines of Code | Total and per-function |
| Nesting Depth | Maximum nesting level |
| Function Count | Number of functions/methods |

## Example Output

```
Code Metrics Report
═══════════════════

High Complexity Files:
┌──────────────────────────┬────────────┬───────┬───────┐
│ File                     │ Complexity │ Lines │ Funcs │
├──────────────────────────┼────────────┼───────┼───────┤
│ src/utils/parser.ts      │ 25         │ 450   │ 12    │
│ src/services/auth.ts     │ 18         │ 320   │ 8     │
│ src/handlers/api.ts      │ 15         │ 280   │ 6     │
└──────────────────────────┴────────────┴───────┴───────┘

Recommendations:
1. parser.ts: Extract parseExpression() into smaller functions
2. auth.ts: Consider splitting into auth-validator and auth-handler
```
```

## Step 4: Add the Quality Check Skill

```bash
aiwg add-skill quality-check --to code-metrics
```

Edit `skills/quality-check/SKILL.md`:

```markdown
---
name: quality-check
description: On-demand code quality analysis
version: 1.0.0
---

# Quality Check Skill

Provides on-demand code quality analysis triggered by natural language.

## Trigger Phrases

This skill activates when the user says:

- "check code quality"
- "analyze complexity"
- "how complex is this code"
- "quality check"
- "find complex code"

## Execution Process

1. **Detect**: Recognize quality check request
2. **Scope**: Determine target (current file, directory, or project)
3. **Analyze**: Run complexity-analyzer agent
4. **Report**: Present findings in conversational format

## Example Interaction

**User**: "Check the quality of src/handlers"

**Response**:
"I analyzed 8 files in src/handlers/. Here's what I found:

- **api-handler.ts** has high complexity (22) in the `processRequest` function
- **auth-handler.ts** looks good (complexity 6)
- Overall health: 75% of files within acceptable thresholds

Would you like specific refactoring suggestions for api-handler.ts?"
```

## Step 5: Validate the Addon

```bash
aiwg validate code-metrics --verbose
```

Expected output:
```
Validation: code-metrics
────────────────────────

[Passed]
  ✓ manifest.json exists
  ✓ manifest.json is valid JSON
  ✓ Required field present: id
  ✓ Required field present: type
  ✓ Required field present: name
  ✓ Required field present: version
  ✓ Required field present: description
  ✓ Valid type: addon
  ✓ Directory exists: agents/
  ✓ Directory exists: commands/
  ✓ Directory exists: skills/
  ✓ agents file exists: complexity-analyzer.md
  ✓ commands file exists: metrics-report.md
  ✓ Skill exists: quality-check
  ✓ README.md exists and has content

[Summary]
  Passed:   15
  Warnings: 0
  Errors:   0

✓ PASSED: Package is valid
```

## Step 6: Deploy to a Project

```bash
cd /path/to/your/project
aiwg -deploy-agents --source agentic/code/addons/code-metrics --deploy-commands --deploy-skills
```

## Step 7: Use the Addon

In a Claude Code session:

```bash
# Use the command
/metrics-report src/ --format markdown

# Or use natural language (skill triggers)
"Check the code quality of the utils directory"
```

## Final Structure

```
code-metrics/
├── manifest.json
├── README.md
├── agents/
│   └── complexity-analyzer.md
├── commands/
│   └── metrics-report.md
└── skills/
    └── quality-check/
        ├── SKILL.md
        └── references/
```

## Key Takeaways

1. **Start with scaffold**: Creates proper structure automatically
2. **Use templates**: `--template complex` gives you a head start
3. **Validate often**: Catch issues early with `aiwg validate`
4. **Test incrementally**: Deploy and test each component as you build
5. **Document well**: Users will read your README and agent descriptions
