---
name: repo-analyzer
description: Analyze GitHub repositories for structure, documentation, dependencies, and contribution patterns. Use for codebase understanding and health assessment.
tools: Read, Write, Bash, Glob, Grep
---

# Repository Analyzer Skill

## Purpose

Single responsibility: Analyze GitHub repository structure, documentation quality, and contribution patterns for codebase understanding. (BP-4)

## Grounding Checkpoint (Archetype 1 Mitigation)

Before executing, VERIFY:

- [ ] gh CLI is installed and authenticated
- [ ] Repository URL or local clone exists
- [ ] Access permissions verified (public or authenticated)
- [ ] Analysis scope defined (structure, docs, deps, or all)

**DO NOT analyze without confirming repository access.**

## Uncertainty Escalation (Archetype 2 Mitigation)

ASK USER instead of guessing when:

- Multiple repositories to analyze - which first?
- Private repo requires different auth
- Analysis depth unclear (quick vs deep)
- Specific aspects to focus on

**NEVER scrape repository data without user intent.**

## Context Scope (Archetype 3 Mitigation)

| Context Type | Included | Excluded |
|--------------|----------|----------|
| RELEVANT | Repo structure, README, package files | Source code details |
| PERIPHERAL | Contribution stats, issue patterns | PR content |
| DISTRACTOR | Fork network | Unrelated repos |

## Workflow Steps

### Step 1: Verify Access (Grounding)

```bash
# Check gh CLI
gh --version

# Verify authentication
gh auth status

# Check repo access
gh repo view <owner>/<repo> --json name,description,visibility
```

### Step 2: Analyze Structure

```bash
# Repository overview
gh repo view <owner>/<repo> --json name,description,defaultBranch,languages,topics

# Directory structure
gh api repos/<owner>/<repo>/contents | jq '.[].name'

# Key files present
for file in README.md LICENSE CONTRIBUTING.md .github/workflows; do
  gh api repos/<owner>/<repo>/contents/$file 2>/dev/null && echo "✅ $file" || echo "❌ $file missing"
done
```

### Step 3: Documentation Analysis

```bash
# README content and quality
gh api repos/<owner>/<repo>/readme | jq -r '.content' | base64 -d | head -100

# Check for docs directory
gh api repos/<owner>/<repo>/contents/docs 2>/dev/null | jq '.[].name'

# Contributing guide
gh api repos/<owner>/<repo>/contents/CONTRIBUTING.md 2>/dev/null
```

### Step 4: Dependency Analysis

```bash
# Package files
gh api repos/<owner>/<repo>/contents/package.json 2>/dev/null | jq -r '.content' | base64 -d | jq '.dependencies'
gh api repos/<owner>/<repo>/contents/requirements.txt 2>/dev/null | jq -r '.content' | base64 -d
gh api repos/<owner>/<repo>/contents/go.mod 2>/dev/null

# Dependency graph (if available)
gh api repos/<owner>/<repo>/dependency-graph/sbom 2>/dev/null | head -50
```

### Step 5: Contribution Analysis

```bash
# Contributors
gh api repos/<owner>/<repo>/contributors --jq '.[0:10] | .[] | "\(.login): \(.contributions) commits"'

# Recent activity
gh api repos/<owner>/<repo>/commits --jq '.[0:5] | .[] | "\(.commit.author.date): \(.commit.message | split("\n")[0])"'

# Issue/PR stats
gh api repos/<owner>/<repo> --jq '{issues: .open_issues_count, forks: .forks_count, stars: .stargazers_count}'
```

## Recovery Protocol (Archetype 4 Mitigation)

On error:

1. **PAUSE** - Note what data was collected
2. **DIAGNOSE** - Check error type:
   - `404` → Check repo name, visibility
   - `401` → Re-authenticate with gh auth login
   - `403` → Check rate limits or permissions
   - `API error` → Fall back to local clone analysis
3. **ADAPT** - Use alternative data sources
4. **RETRY** - With different approach (max 3 attempts)
5. **ESCALATE** - Report partial analysis

## Checkpoint Support

State saved to: `.aiwg/working/checkpoints/repo-analyzer/`

```
checkpoints/repo-analyzer/
├── structure.json           # Directory structure
├── documentation.json       # Docs assessment
├── dependencies.json        # Dependency analysis
├── contributions.json       # Contributor stats
└── health_report.md         # Overall health
```

## Output Format

```markdown
# Repository Analysis: <owner>/<repo>

## Overview
- **Name**: repository-name
- **Description**: Short description
- **Language**: TypeScript (85%), JavaScript (15%)
- **Stars**: 1,234 | Forks: 156 | Issues: 23

## Structure Assessment
- [x] README.md (comprehensive)
- [x] LICENSE (MIT)
- [ ] CONTRIBUTING.md (missing)
- [x] .github/workflows (3 workflows)

## Documentation Quality: 7/10
- Clear installation instructions
- API documentation present
- Missing: troubleshooting guide

## Dependency Health
- Total: 45 dependencies
- Outdated: 8
- Vulnerabilities: 0

## Activity Level: Active
- Last commit: 2 days ago
- Contributors: 12
- Monthly commits: ~45

## Recommendations
1. Add CONTRIBUTING.md guide
2. Update 8 outdated dependencies
3. Add troubleshooting section to docs
```

## Common Analysis Queries

| Query | Purpose |
|-------|---------|
| `gh repo view` | Basic info |
| `gh api /repos/{}/languages` | Language breakdown |
| `gh api /repos/{}/contributors` | Contributor list |
| `gh api /repos/{}/commits` | Recent commits |
| `gh api /repos/{}/releases` | Release history |
| `gh api /repos/{}/pulls` | Open PRs |

## References

- GitHub CLI: https://cli.github.com/
- GitHub API: https://docs.github.com/en/rest
- REF-001: Production-Grade Agentic Workflows (BP-4)
- REF-002: LLM Failure Modes (Archetype 1 grounding)
