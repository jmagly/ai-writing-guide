# Claude Code Skills Assessment Report - Final

**Version**: 1.1 (Synthesized + Stakeholder Feedback)
**Date**: 2025-12-06
**Status**: BASELINED
**Review Cycle**: Multi-Agent (4 reviewers) + Stakeholder Review

---

## Executive Summary

Claude Code Skills represent Anthropic's newest extensibility mechanism, launched in October 2025. Skills are modular, composable capability packages that extend Claude's functionality through organized folders containing instructions, scripts, and resources. Unlike slash commands (user-invoked) or agents (parallel execution contexts), skills are **model-invoked**—Claude autonomously decides when to load them based on task context.

This report provides a comprehensive analysis of the Skills system and its implications for AIWG (AI Writing Guide) framework integration, incorporating feedback from Architecture, Security, Requirements, Technical Writing reviews, and stakeholder input.

**Key Recommendations**:
1. Skills should align with AIWG's existing **framework/addon model** (SDLC skills in SDLC framework, Marketing skills in Marketing framework, core utilities in aiwg-utils)
2. Skills can **functionally replace natural language mapping** by binding commands to skills with rich context
3. Complex skills leverage **Code Execution Tool** for file generation, evaluation automation, and system commands

---

## 1. What Are Skills?

### 1.1 Definition

Skills are folders of instructions, scripts, and resources that Claude loads dynamically to improve performance on specialized tasks. They teach Claude how to complete specific tasks in a repeatable way.

**Characteristics:**
- **Composable**: Skills stack together; Claude identifies which skills are needed and coordinates their use
- **Portable**: Same format everywhere—claude.ai, Claude Code, and API
- **Token efficient**: Only ~10-50 tokens in system prompt for metadata; full details (500-5000 tokens) loaded on-demand
- **Model-invoked**: Claude decides when to use them based on the `description` field (vs. user-invoked commands)

### 1.2 Core Philosophy

Skills represent a fundamental shift in extensibility:

> "Skills prepare Claude to solve a problem, rather than solving it directly. This is fundamentally different from traditional tools, which execute and return results."

Skills expand prompts on demand with task-specific instructions and local helpers, sitting between rigid custom commands and autonomous subagents.

### 1.3 How Complex Skills Work (Code Execution)

**Key Finding**: Skills like PDF/DOCX/XLSX generation are NOT calling external APIs—they use Claude's **Code Execution Tool** (code interpreter) to run Python/Bash scripts in a sandboxed environment.

**Architecture**:
```
Skill SKILL.md → Instructions for Claude
     ↓
Skill scripts/ → Python/Bash code Claude can execute
     ↓
Code Execution Tool (sandbox) → Runs scripts, generates files
     ↓
Output artifacts → PDFs, spreadsheets, documents
```

**Capabilities via Code Execution**:
- Run Bash commands and manipulate files
- Write and execute Python code
- Create visualizations (matplotlib, etc.)
- Perform complex calculations
- Process uploaded files
- Generate document artifacts (PDF, DOCX, XLSX, PPTX)

**Requirements**:
- Code Execution Tool beta header: `code-execution-2025-08-25`
- Pro, Max, Team, or Enterprise plan
- Code execution enabled in settings

**Implication for AIWG**: Complex skills that generate files, automate evaluation of outputs, or perform system operations are achievable through the Code Execution Tool—no external API integration required.

---

## 2. Technical Architecture

### 2.1 SKILL.md File Structure

Every skill requires a `SKILL.md` file with YAML frontmatter:

```yaml
---
name: my-skill-name
description: Brief description of what this Skill does and when to use it
version: 1.0.0
---

# My Skill Name

## Instructions
Provide clear, step-by-step guidance for Claude.

## Examples
Show concrete examples of using this Skill.

## Guidelines
- Guideline 1
- Guideline 2
```

**Required Fields:**

| Field | Requirements |
|-------|-------------|
| `name` | Lowercase letters, numbers, hyphens only. Max 64 characters. |
| `description` | What the Skill does and when to use it. Max 1024 characters. Claude uses this text to determine skill relevance—make it descriptive. |

**Optional Fields:**
- `version`: For tracking iterations (recommended: semver)
- `dependencies`: Required software packages

### 2.2 Directory Structure

```
my-skill/
├── SKILL.md          # Required: Core prompt and instructions
├── scripts/          # Optional: Executable Python/Bash scripts
├── references/       # Optional: Documentation loaded into context
└── assets/           # Optional: Templates and binary files
```

**Best Practice**: Keep SKILL.md under 5,000 words to avoid overwhelming context window.

### 2.3 Discovery Locations

Claude Code scans these locations for skills (in precedence order):
1. **Project settings**: `.claude/skills/`
2. **User settings**: `~/.claude/skills/` or `~/.config/claude/skills/`
3. **Plugin-provided skills**: Via marketplace registration
4. **Built-in skills**: Anthropic's pre-built skills

### 2.4 Progressive Disclosure System

Skills use a two-level disclosure model:

**Level 1 (Metadata)**: Name and description from frontmatter loaded into system prompt at startup (~10-50 tokens per skill)

**Level 2 (Content)**: Full SKILL.md and resources loaded on-demand when Claude detects relevance (~500-5000 tokens)

**Example**: When a user discusses PDF generation, Claude:
1. Checks metadata: "pdf skill - Generate formatted PDF documents"
2. If relevant, loads full SKILL.md with detailed PDF generation instructions
3. If needed, loads scripts from `scripts/` directory for execution

---

## 3. Skills vs Commands vs Agents

### 3.1 Comparison Matrix

| Feature | Commands | Skills | Agents/Subagents |
|---------|----------|--------|------------------|
| **Location** | `.claude/commands/*.md` | `.claude/skills/*/SKILL.md` | `.claude/agents/*.md` |
| **Invocation** | Explicit (`/command`) | Automatic (context-based) | Delegated via Task tool |
| **Context** | Uses main context | Uses main context | Own separate context window |
| **Purpose** | Quick shortcuts | Domain expertise | Independent task execution |
| **Best for** | Repetitive workflows | Automatic guidelines | Complex parallel work |
| **User awareness** | User explicitly types | User may not know it applied | User delegates explicitly |

### 3.2 Decision Criteria: When to Use Each

| Use Skill When... | Use Command When... | Use Agent When... |
|-------------------|---------------------|-------------------|
| Knowledge should apply automatically based on context | User explicitly requests action | Task requires isolated context |
| Content is domain expertise (writing style, code standards) | Content is a workflow (step-by-step process) | Task benefits from parallel execution |
| Guidance is passive (influences output quality) | Guidance is active (generates specific artifacts) | Task requires specialized tools |
| Applicable across many different tasks | Applicable to specific use case | Task is complex multi-step work |

### 3.3 Skills as Command Bridges (Natural Language Mapping Replacement)

**Key Insight from Stakeholder Feedback**: Skills can functionally replace AIWG's natural language mapping system by binding commands to skills with rich context.

**Current Approach** (simple-language-translations.md):
```
"Run security review" → maps to → /flow-security-review-cycle
```

**Skills-Based Approach**:
```yaml
---
name: security-review-skill
description: Triggers comprehensive security review including threat modeling, SAST/DAST, dependency audit. Use when user mentions security review, audit, vulnerability scan, or compliance check.
---

# Security Review Skill

## When to Apply
- User mentions "security review", "security audit", "vulnerability"
- User asks about compliance (SOC2, HIPAA, PCI-DSS)
- User discusses pre-release security checks

## Command Binding
This skill maps to: `/flow-security-review-cycle`

## Context Enhancement
When triggering security review:
- Check `.aiwg/security/` for existing threat models
- Reference project's compliance requirements from intake
- Consider current SDLC phase for appropriate depth

## Examples
- "Run security review" → Execute /flow-security-review-cycle
- "Check for vulnerabilities before release" → Execute with pre-release focus
- "SOC2 audit prep" → Execute with compliance framework=SOC2
```

**Benefits**:
1. **Richer context**: Each skill provides domain-specific triggering criteria
2. **Self-documenting**: Skill files explain when/why commands fire
3. **Maintainable**: Update skill description to refine natural language detection
4. **Composable**: Multiple skills can reference same command with different contexts

---

## 4. Framework-Aligned Skill Architecture

### 4.1 AIWG Plugin Model Alignment

**Stakeholder Requirement**: Skills must align with AIWG's existing framework/addon model where related agents, commands, and skills are packaged together as vertically-complete processes.

**Current AIWG Structure**:
```
agentic/code/frameworks/
├── sdlc-complete/           # SDLC framework
│   ├── agents/              # 53 SDLC agents
│   ├── commands/            # 48 SDLC commands
│   └── skills/              # NEW: SDLC skills
│
├── media-marketing-kit/     # Marketing framework
│   ├── agents/              # 37 marketing agents
│   ├── commands/            # 23 marketing commands
│   └── skills/              # NEW: Marketing skills
│
agentic/code/addons/
├── aiwg-utils/              # Core utilities (always deployed)
│   ├── agents/
│   ├── commands/
│   └── skills/              # NEW: Core utility skills
│
└── writing-quality/         # Writing quality addon
    ├── agents/              # 3 writing agents
    └── skills/              # NEW: Writing quality skills
```

### 4.2 Skill Distribution by Framework

| Framework/Addon | Skill Examples | Purpose |
|-----------------|---------------|---------|
| **sdlc-complete** | `phase-transitions`, `gate-checks`, `artifact-generation` | SDLC workflow automation |
| **media-marketing-kit** | `campaign-triggers`, `brand-consistency`, `content-review` | Marketing workflow automation |
| **aiwg-utils** | `project-status`, `regenerate-context`, `health-check` | Core utilities (always available) |
| **writing-quality** | `ai-pattern-detection`, `voice-consistency`, `sophistication` | Writing quality enforcement |

### 4.3 Proposed Skill Structure (Framework-Aligned)

```
agentic/code/frameworks/sdlc-complete/
├── agents/                   # Existing 53 agents
├── commands/                 # Existing 48 commands
├── skills/
│   ├── phase-transition/
│   │   ├── SKILL.md          # Detects phase transition intent, triggers flow-* commands
│   │   └── references/
│   │       └── phase-criteria.md
│   │
│   ├── security-review/
│   │   ├── SKILL.md          # Maps "security audit", "compliance", etc.
│   │   └── scripts/
│   │       └── quick-scan.py  # Lightweight pre-check
│   │
│   ├── artifact-generation/
│   │   ├── SKILL.md          # Detects "create SAD", "generate test plan", etc.
│   │   └── references/
│   │       └── artifact-templates.md
│   │
│   └── sdlc-conventions/
│       ├── SKILL.md          # Auto-applies SDLC formatting standards
│       └── references/
│           └── artifact-standards.md

agentic/code/frameworks/media-marketing-kit/
├── agents/                   # Existing 37 agents
├── commands/                 # Existing 23 commands
├── skills/
│   ├── campaign-workflow/
│   │   ├── SKILL.md          # Maps campaign-related natural language
│   │   └── references/
│   │
│   ├── brand-voice/
│   │   ├── SKILL.md          # Auto-applies brand consistency
│   │   └── references/
│   │
│   └── content-review/
│       ├── SKILL.md          # Triggers content review workflows
│       └── scripts/

agentic/code/addons/aiwg-utils/
├── agents/                   # context-regenerator
├── commands/                 # aiwg-regenerate-*
├── skills/
│   ├── project-awareness/
│   │   ├── SKILL.md          # "Where are we?", "What's next?"
│   │   └── references/
│   │
│   └── context-management/
│       ├── SKILL.md          # Context file regeneration triggers
│       └── scripts/

agentic/code/addons/writing-quality/
├── core/                     # Philosophy docs
├── validation/               # Banned patterns
├── agents/                   # writing-validator, etc.
├── skills/
│   ├── ai-pattern-detection/
│   │   ├── SKILL.md          # Auto-detects AI patterns in content
│   │   ├── references/
│   │   │   └── banned-patterns-summary.md
│   │   └── scripts/
│   │       └── pattern-scanner.py
│   │
│   └── voice-consistency/
│       ├── SKILL.md          # Maintains authentic voice
│       └── references/
│           └── sophistication-quick-ref.md
```

### 4.4 Deployment Model Update

**Current CLI**:
```bash
aiwg use sdlc                 # Deploys agents + commands
aiwg use marketing            # Deploys agents + commands
```

**Proposed CLI Update**:
```bash
aiwg use sdlc                 # Deploys agents + commands + skills
aiwg use sdlc --no-skills     # Deploys agents + commands only (backward compat)
aiwg use sdlc --skills-only   # Deploys skills only (for testing)
```

**Manifest Schema Update**:
```json
{
  "id": "sdlc-complete",
  "type": "framework",
  "entry": {
    "agents": "agents/",
    "commands": "commands/",
    "skills": "skills/"
  }
}
```

---

## 5. Complex Skill Patterns

### 5.1 File Generation Skills

Skills can generate complex file types by leveraging the Code Execution Tool:

```yaml
---
name: report-generator
description: Generates formatted PDF/DOCX reports from project data. Use when user requests reports, summaries, or documentation exports.
---

# Report Generator Skill

## Capabilities
- Generate PDF reports with charts and tables
- Create DOCX documents with formatted sections
- Export project status to presentation format

## Scripts
- `scripts/generate_pdf.py`: Uses reportlab/weasyprint for PDF generation
- `scripts/generate_docx.py`: Uses python-docx for Word documents
- `scripts/chart_generator.py`: Creates matplotlib visualizations

## Workflow
1. Collect data from `.aiwg/` artifacts
2. Apply appropriate template
3. Execute generation script
4. Return artifact path to user
```

### 5.2 Evaluation Automation Skills

Skills can automate output evaluation:

```yaml
---
name: quality-evaluator
description: Automatically evaluates generated artifacts against quality criteria. Use after document generation or code review.
---

# Quality Evaluator Skill

## Evaluation Types
- Document completeness (required sections present)
- Code quality metrics (complexity, coverage)
- Writing quality (AI pattern detection)
- Compliance checks (required fields, formatting)

## Scripts
- `scripts/doc_evaluator.py`: Checks document structure
- `scripts/code_metrics.py`: Calculates code metrics
- `scripts/pattern_checker.py`: Runs AI pattern detection

## Auto-Trigger Conditions
- After `/flow-*` command completion
- After artifact generation
- Before phase gate checks
```

### 5.3 System Automation Skills

Skills can perform system operations:

```yaml
---
name: project-health
description: Monitors project health metrics and reports status. Use when user asks about project status, health, or readiness.
---

# Project Health Skill

## Checks Performed
- Git status and branch health
- Dependency freshness (npm outdated, pip list --outdated)
- Test coverage thresholds
- Security vulnerability scans
- AIWG artifact completeness

## Scripts
- `scripts/git_health.sh`: Git repository analysis
- `scripts/dep_check.py`: Dependency analysis
- `scripts/coverage_check.py`: Test coverage verification
```

---

## 6. Skills as Natural Language Command Bridges

### 6.1 Replacing simple-language-translations.md

**Current State**: AIWG maintains `simple-language-translations.md` with 70+ phrase mappings:
```markdown
| Natural Language | Command |
|------------------|---------|
| "Transition to Elaboration" | /flow-inception-to-elaboration |
| "Run security review" | /flow-security-review-cycle |
```

**Proposed State**: Each relevant command gets a companion skill that:
1. Defines natural language triggers in the `description` field
2. Provides context for how/when to invoke the command
3. Enhances the command with pre-flight checks or context gathering

### 6.2 Skill-Command Binding Pattern

```yaml
---
name: inception-to-elaboration
description: Transitions project from Inception to Elaboration phase. Triggers when user says "transition to elaboration", "move to elaboration", "start elaboration", "ready for architecture", or similar phase transition language.
---

# Inception to Elaboration Transition

## Trigger Phrases
- "Transition to Elaboration"
- "Move to Elaboration"
- "Start Elaboration phase"
- "Ready for architecture baseline"
- "Inception complete, what's next?"

## Pre-Flight Checks
Before triggering `/flow-inception-to-elaboration`:
1. Verify Inception artifacts exist in `.aiwg/`
2. Check gate criteria from `.aiwg/gates/inception-criteria.md`
3. Warn if missing required artifacts

## Command Binding
Execute: `/flow-inception-to-elaboration`

## Post-Execution
- Update `.aiwg/planning/phase-status.md`
- Suggest next steps for Elaboration
```

### 6.3 Migration Path

1. **Phase 1**: Create skills for highest-traffic commands (phase transitions, status checks)
2. **Phase 2**: Migrate remaining commands to skill-backed invocation
3. **Phase 3**: Deprecate `simple-language-translations.md` in favor of skill-based discovery
4. **Phase 4**: Remove hardcoded language mapping from CLAUDE.md orchestrator section

---

## 7. Built-in Skills Reference

Anthropic provides ten pre-built skills:

### 7.1 Document Skills (4)

| Skill | Capability | Implementation |
|-------|-----------|----------------|
| **pdf** | Generate formatted PDF documents and reports | Python scripts (reportlab, weasyprint) |
| **docx** | Create documents, edit content, format text | Python scripts (python-docx) |
| **xlsx** | Create spreadsheets, analyze data, generate charts | Python scripts (openpyxl, pandas) |
| **pptx** | Create presentations, edit slides | Python scripts (python-pptx) |

### 7.2 Example Skills (6)

| Skill | Capability |
|-------|-----------|
| **skill-creator** | Bootstrap new skills |
| **mcp-server-creator** | Generate MCP servers |
| **web-tester** | Test web applications |
| **internal-comms** | Corporate communications |
| **slack-gif-creator** | Animated GIFs for Slack |
| **algorithmic-art** | Generative art creation |

---

## 8. Availability

| Plan | Skills Access |
|------|--------------|
| Free | Not available |
| Pro | Available (built-in + custom) |
| Max | Available (built-in + custom) |
| Team | Available (admin must enable first) |
| Enterprise | Available (admin must enable; API skills are workspace-wide) |

**Note**: Custom skills uploaded to claude.ai are individual-only; API skills are workspace-wide.

---

## 9. Security and Governance

### 9.1 Trust Model

AIWG should implement a tiered trust model:

| Tier | Source | Verification | Capabilities |
|------|--------|--------------|--------------|
| **Tier 1** | Anthropic built-in | Implicit trust | Full sandbox access |
| **Tier 2** | AIWG Official | Signed, security reviewed | Full sandbox + audit logging |
| **Tier 3** | Community | Manual review required | Restricted sandbox |
| **Tier 4** | Untrusted | Blocked by default | None |

### 9.2 Code Execution Security

Since complex skills use Code Execution Tool:
- Scripts run in sandboxed environment
- No persistent storage between sessions
- Network access restricted
- Resource limits enforced (CPU, memory, time)

### 9.3 Governance for Enterprise

- Admin must enable Skills organization-wide
- Skill approval workflow: Submit → Review → Approve → Deploy
- Audit log schema with timestamp, skill, user, workspace, action

---

## 10. Implementation Roadmap

### Phase 0: Proof of Concept (P0)

| Task | Owner | Effort | Deliverable |
|------|-------|--------|-------------|
| Create `writing-quality` skill in writing-quality addon | Technical Researcher | 4-8 hours | `writing-quality/skills/ai-pattern-detection/` |
| Create `project-status` skill in aiwg-utils | Technical Researcher | 4-6 hours | `aiwg-utils/skills/project-awareness/` |
| Update manifest schema to include `skills` entry | CLI Developer | 2-4 hours | Updated manifest.json spec |
| Test skill discovery and invocation | QA | 4-6 hours | Test report |

### Phase 1: Command Bridge Skills (P1)

| Task | Owner | Effort | Deliverable |
|------|-------|--------|-------------|
| Create phase transition skills (6 skills) | Technical Researcher | 12-16 hours | `sdlc-complete/skills/phase-*` |
| Create security review skill | Technical Researcher | 4-6 hours | `sdlc-complete/skills/security-review/` |
| Update `aiwg use` to deploy skills | CLI Developer | 8-12 hours | CLI update |
| Create skill-command binding documentation | Technical Writer | 4-6 hours | Docs |

### Phase 2: Complex Skills (P2)

| Task | Owner | Effort | Deliverable |
|------|-------|--------|-------------|
| Create report generation skill | Developer | 16-24 hours | `sdlc-complete/skills/report-generator/` |
| Create quality evaluation skill | Developer | 12-16 hours | `sdlc-complete/skills/quality-evaluator/` |
| Create marketing workflow skills | Developer | 12-16 hours | `media-marketing-kit/skills/` |
| Deprecate simple-language-translations.md | Technical Writer | 4-6 hours | Migration guide |

### Phase 3: Full Integration (P3)

| Task | Owner | Effort | Deliverable |
|------|-------|--------|-------------|
| Migrate all commands to skill-backed invocation | Developer | 24-32 hours | Complete skill coverage |
| Remove hardcoded language mapping from CLAUDE.md | Technical Writer | 4-6 hours | Simplified CLAUDE.md |
| Enterprise API skill deployment | Developer | 16-24 hours | API integration |
| Skill health monitoring | Developer | 8-12 hours | `aiwg -status` updates |

---

## 11. Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| How do complex skills generate files? | Via Code Execution Tool (sandbox Python/Bash) |
| Do skills call external APIs? | No—they execute local scripts in sandbox |
| Where should skills live in AIWG? | Framework-aligned: SDLC skills in sdlc-complete, Marketing in mmk, etc. |
| Can skills replace language mapping? | Yes—skill descriptions provide natural language triggers |
| How do skills handle file generation? | Python scripts (reportlab, python-docx, etc.) in sandbox |

---

## 12. Conclusions and Recommendations

### Key Findings

1. Skills are production-ready (October 2025) and complement agents/commands
2. Complex skills use **Code Execution Tool**—no external API needed
3. Skills should align with **AIWG framework model** (SDLC, Marketing, Utils, Writing)
4. Skills can **replace natural language mapping** by binding commands with rich context
5. Quadripartite model (Commands + Agents + Skills + Addons) enables vertically-complete processes

### Recommended Actions

| Priority | Action | Rationale |
|----------|--------|-----------|
| **P0** | Create POC skills in writing-quality and aiwg-utils | Validate architecture |
| **P0** | Update manifest schema for skills | Enable deployment |
| **P1** | Create command-bridge skills for phase transitions | Replace language mapping |
| **P1** | Update `aiwg use` CLI to deploy skills | Enable distribution |
| **P2** | Create complex skills (report generation, evaluation) | Leverage Code Execution |
| **P2** | Create marketing framework skills | Complete MMK integration |
| **P3** | Deprecate simple-language-translations.md | Skills provide richer mapping |
| **P3** | Full skill coverage for all commands | Complete migration |

### Final Status

**APPROVED** for implementation with framework-aligned approach.

---

## Sources

### Primary Sources (Anthropic Official)

- [Introducing Agent Skills | Claude](https://www.anthropic.com/news/skills)
- [Agent Skills - Claude Code Docs](https://code.claude.com/docs/en/skills)
- [Using Agent Skills with the API - Claude Docs](https://docs.claude.com/en/api/skills-guide)
- [Code execution tool - Claude Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool)
- [How to create custom Skills | Claude Help Center](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills)
- [GitHub - anthropics/skills](https://github.com/anthropics/skills)

### Secondary Sources (Community/Analysis)

- [Claude Skills are awesome, maybe a bigger deal than MCP](https://simonwillison.net/2025/Oct/16/claude-skills/) - Simon Willison
- [Claude's new Code Interpreter](https://simonw.substack.com/p/claudes-new-code-interpreter) - Simon Willison
- [Claude Agent Skills: A First Principles Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
- [Inside Claude Code Skills: Structure, prompts, invocation](https://mikhail.io/2025/10/claude-code-skills/) - Mikhail Shilkov
- [GitHub - travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills)

---

## Appendix A: Review Artifacts

- `.aiwg/working/skills-research/draft-v0.1-skills-assessment.md`
- `.aiwg/working/skills-research/reviews/architecture-review.md`
- `.aiwg/working/skills-research/reviews/security-review.md`
- `.aiwg/working/skills-research/reviews/requirements-review.md`
- `.aiwg/working/skills-research/reviews/technical-writing-review.md`

---

**Document Status**: BASELINED
**Approved By**: Documentation Synthesizer + Stakeholder Review
**Date**: 2025-12-06
**Next Review**: Upon P0 completion
