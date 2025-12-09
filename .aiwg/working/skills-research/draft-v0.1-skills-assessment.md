# Claude Code Skills Assessment Report

**Draft Version**: 0.1
**Author**: Technical Researcher (Primary)
**Date**: 2025-12-06
**Status**: DRAFT - Pending Multi-Agent Review

---

## Executive Summary

Claude Code Skills represent Anthropic's newest extensibility mechanism, launched in October 2025. Skills are modular, composable capability packages that extend Claude's functionality through organized folders containing instructions, scripts, and resources. Unlike slash commands (user-invoked) or agents (parallel execution contexts), skills are **model-invoked**—Claude autonomously decides when to load them based on task context.

This report analyzes the Skills system and its implications for AIWG (AI Writing Guide) framework integration.

---

## 1. What Are Skills?

### 1.1 Definition

Skills are folders of instructions, scripts, and resources that Claude loads dynamically to improve performance on specialized tasks. They teach Claude how to complete specific tasks in a repeatable way.

**Key characteristics:**
- **Composable**: Skills stack together; Claude identifies which skills are needed and coordinates their use
- **Portable**: Same format everywhere—Claude apps, Claude Code, and API
- **Token efficient**: Only ~dozens of tokens in system prompt; full details loaded on-demand
- **Model-invoked**: Claude decides when to use them (vs. user-invoked commands)

### 1.2 Core Philosophy

Skills represent a fundamental shift in how Claude extensibility works:

> "Skills prepare Claude to solve a problem, rather than solving it directly. This is fundamentally different from traditional tools, which execute and return results."

Skills expand prompts on demand with task-specific instructions and local helpers, sitting between rigid custom commands and autonomous subagents.

---

## 2. Technical Architecture

### 2.1 SKILL.md File Structure

Every skill requires a `SKILL.md` file with YAML frontmatter:

```yaml
---
name: my-skill-name
description: Brief description of what this Skill does and when to use it
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
| `description` | What the Skill does and when to use it. Max 1024 characters. Critical for discovery. |

**Optional Fields:**
- `version`: For tracking iterations
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

Claude Code scans these locations for skills:
1. **User settings**: `~/.config/claude/skills/` or `~/.claude/skills/`
2. **Project settings**: `.claude/skills/`
3. **Plugin-provided skills**: Via marketplace registration
4. **Built-in skills**: Anthropic's pre-built skills

### 2.4 Progressive Disclosure System

Skills use a two-level disclosure model:
1. **Level 1 (Metadata)**: Name and description from frontmatter loaded into system prompt at startup
2. **Level 2 (Content)**: Full SKILL.md and resources loaded on-demand when Claude detects relevance

---

## 3. Skills vs Commands vs Agents

### 3.1 Comparison Matrix

| Feature | Commands | Skills | Agents/Subagents |
|---------|----------|--------|------------------|
| **Location** | `.claude/commands/*.md` | `.claude/skills/*/SKILL.md` | `.claude/agents/*.md` |
| **Invocation** | Explicit (`/command`) | Automatic (context-based) | Delegated via Task tool |
| **Context** | Uses main context | Uses main context | Own separate context window |
| **Purpose** | Quick shortcuts | Teaching expertise | Independent task execution |
| **Best for** | Repetitive tasks | Domain knowledge | Complex parallel work |
| **Execution** | User types command | Model detects need | Parent agent delegates |
| **State** | Stateless | Stateless | Stateless (isolated) |

### 3.2 When to Use Each

**Commands**: Repetitive tasks you do frequently. User explicitly triggers them.
- Example: `/commit`, `/review-pr`, `/intake-wizard`

**Skills**: Domain expertise Claude should apply automatically when relevant.
- Example: Brand guidelines, code style standards, document formatting rules

**Agents**: Complex multi-step tasks requiring parallel execution or specialized tools.
- Example: `architecture-designer`, `security-auditor`, `test-engineer`

### 3.3 Composability

> "Agents aren't nested in skills—they're standalone entities that can EXECUTE skills and commands as parallel workers."

Skills and agents work together:
- Agents can invoke skills and commands
- Skills provide the knowledge; agents provide the execution context
- Commands provide quick access points for users

---

## 4. Built-in Skills

Anthropic provides several pre-built skills:

### 4.1 Document Skills

| Skill | Capability |
|-------|-----------|
| **pdf** | Generate formatted PDF documents and reports |
| **docx** | Create documents, edit content, format text |
| **xlsx** | Create spreadsheets, analyze data, generate reports with charts |
| **pptx** | Create presentations, edit slides, analyze presentation content |

These skills power Claude's document creation abilities introduced with code interpreter in September 2025.

### 4.2 Example Skills (anthropics/skills repository)

- **skill-creator**: Bootstrap new skills
- **mcp-server-creator**: Generate MCP servers
- **web-tester**: Test web applications
- **internal-comms**: Corporate communications
- **slack-gif-creator**: Animated GIFs for Slack
- **algorithmic-art**: Generative art creation

---

## 5. Installation and Distribution

### 5.1 Plugin Marketplace

```bash
# Register anthropics/skills marketplace
/plugin marketplace add anthropics/skills

# Install specific skill plugins
/plugin install document-skills@anthropic-agent-skills
```

### 5.2 Manual Installation

```bash
# Copy skill folder to ~/.claude/skills/
cp -r my-skill ~/.claude/skills/
```

### 5.3 API Upload (Enterprise)

```bash
curl -X POST "https://api.anthropic.com/v1/skills" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: skills-2025-10-02" \
  -F "display_title=My Skill Name" \
  -F "files[]=@my-skill/SKILL.md;filename=my-skill/SKILL.md"
```

### 5.4 API Usage

Skills specified via `container` parameter in Messages API:
- Up to 8 Skills per request
- Specify `type`, `skill_id`, optionally `version`

---

## 6. Availability

| Plan | Skills Access |
|------|--------------|
| Free | Not available |
| Pro | Available (built-in + custom) |
| Max | Available (built-in + custom) |
| Team | Available (admin must enable first) |
| Enterprise | Available (admin must enable; API workspace-wide) |

**Note**: Custom skills uploaded to claude.ai are individual-only; API skills are workspace-wide.

---

## 7. AIWG Integration Assessment

### 7.1 Current AIWG Architecture

AIWG currently uses:
- **Agents** (`.claude/agents/*.md`): 93+ specialized agents (SDLC + Marketing)
- **Commands** (`.claude/commands/*.md`): 76+ workflow commands
- **Addons** (`agentic/code/addons/`): Utilities like aiwg-utils

### 7.2 Skills Applicability to AIWG

#### High-Value Skill Candidates

| AIWG Component | Skill Suitability | Rationale |
|----------------|-------------------|-----------|
| **Writing Quality Guidelines** | HIGH | Domain expertise Claude should apply automatically |
| **Brand Guidelines** | HIGH | Consistent formatting/voice without explicit invocation |
| **Code Style Standards** | HIGH | Auto-apply to code reviews |
| **Template Formatting Rules** | HIGH | Consistent document structure |
| **SDLC Phase Knowledge** | MEDIUM | Context-dependent; may want explicit control |
| **Security Patterns** | MEDIUM | Auto-detection valuable, but may need explicit gates |

#### Keep as Commands

| Component | Reason |
|-----------|--------|
| `/intake-wizard` | User-initiated workflow |
| `/flow-*` commands | Explicit phase transitions |
| `/project-status` | On-demand status check |
| `/aiwg-regenerate-*` | User-initiated maintenance |

#### Keep as Agents

| Component | Reason |
|-----------|--------|
| `architecture-designer` | Complex multi-step work |
| `security-auditor` | Independent parallel review |
| `test-engineer` | Separate context for test generation |
| All reviewer agents | Multi-agent parallel execution |

### 7.3 Proposed Skill Structure for AIWG

```
agentic/code/addons/aiwg-skills/
├── manifest.json
├── README.md
├── skills/
│   ├── writing-quality/
│   │   ├── SKILL.md              # AI pattern detection, authentic voice
│   │   ├── references/
│   │   │   ├── banned-patterns.md
│   │   │   └── sophistication-guide.md
│   │   └── scripts/
│   │       └── validate-patterns.py
│   │
│   ├── sdlc-conventions/
│   │   ├── SKILL.md              # SDLC artifact formatting standards
│   │   ├── references/
│   │   │   └── template-standards.md
│   │   └── assets/
│   │       └── artifact-templates/
│   │
│   ├── brand-voice/
│   │   ├── SKILL.md              # Organization voice and tone
│   │   └── references/
│   │       └── voice-guidelines.md
│   │
│   └── code-standards/
│       ├── SKILL.md              # Coding conventions
│       └── references/
│           ├── typescript-style.md
│           └── python-style.md
```

### 7.4 Benefits of Skills Integration

1. **Automatic Application**: Writing quality guidelines applied without `/writing-validator`
2. **Token Efficiency**: Only load full guidelines when relevant
3. **Composability**: Skills + Agents work together seamlessly
4. **Portability**: Same skills work in claude.ai, Claude Code, and API
5. **Marketplace Distribution**: Publish skills to anthropics/skills ecosystem

### 7.5 Implementation Considerations

#### Immediate Actions (Low Risk)
- Create `writing-quality` skill from existing banned-patterns + sophistication guide
- Test skill discovery and invocation in Claude Code

#### Medium-Term Actions
- Create `sdlc-conventions` skill for artifact formatting
- Update `aiwg use` CLI to deploy skills alongside agents/commands
- Document skill + agent interaction patterns

#### Long-Term Considerations
- Skill versioning strategy
- Enterprise deployment via API
- Marketplace publication for public skills
- Skill health monitoring in `aiwg -status`

---

## 8. Security and Governance

### 8.1 Security Model

- Skills run in Claude's secure sandboxed environment
- No data persistence between sessions
- Scripts execute with container isolation
- Code execution requires explicit enablement

### 8.2 Governance for Enterprise

- Admin must enable Skills organization-wide
- Individual members can then toggle and upload
- API-uploaded skills are workspace-wide
- Custom skill governance frameworks available via Anthropic customer success

### 8.3 Recommendations for AIWG

1. **Document trust model**: Which skills execute code?
2. **Skill review process**: Before adding to aiwg-skills
3. **Version pinning**: Pin skill versions in production
4. **Audit trail**: Track skill usage in projects

---

## 9. Roadmap Alignment

### 9.1 Anthropic's Stated Direction

> "We're working toward simplified skill creation workflows and enterprise-wide deployment capabilities, making it easier for organizations to distribute skills across teams."

### 9.2 AIWG Alignment

Skills complement AIWG's existing architecture:
- **Skills** = Domain knowledge (auto-applied)
- **Agents** = Execution capabilities (delegated)
- **Commands** = User workflows (invoked)

The tripartite model provides complete coverage:
1. User initiates with command
2. Command orchestrates agents
3. Agents leverage skills for domain expertise

---

## 10. Conclusions and Recommendations

### 10.1 Key Findings

1. Skills are a production-ready feature (October 2025 launch)
2. Skills complement, not replace, agents and commands
3. Skills are ideal for domain expertise that should apply automatically
4. AIWG's writing quality guidelines are a perfect skill candidate

### 10.2 Recommendations

| Priority | Recommendation |
|----------|---------------|
| P0 | Create `writing-quality` skill as proof-of-concept |
| P1 | Update CLI to support skill deployment (`aiwg use sdlc --with-skills`) |
| P1 | Document skill + agent interaction patterns |
| P2 | Create `sdlc-conventions` and `code-standards` skills |
| P2 | Publish skills to anthropics/skills marketplace |
| P3 | Implement skill health monitoring |
| P3 | Enterprise API skill deployment support |

### 10.3 Next Steps

1. **Validate architecture**: Multi-agent review of this assessment
2. **Proof of concept**: Implement `writing-quality` skill
3. **Integration testing**: Test skill + agent coordination
4. **Documentation**: Update AIWG docs with skill guidance
5. **CLI update**: Add skill deployment to `aiwg use`

---

## Sources

### Primary Sources (Anthropic Official)

- [Introducing Agent Skills | Claude](https://www.anthropic.com/news/skills)
- [Agent Skills - Claude Code Docs](https://code.claude.com/docs/en/skills)
- [Agent Skills Overview - Claude Docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Using Agent Skills with the API - Claude Docs](https://docs.claude.com/en/api/skills-guide)
- [How to create custom Skills | Claude Help Center](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills)
- [Skill authoring best practices - Claude Docs](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices)
- [GitHub - anthropics/skills](https://github.com/anthropics/skills)
- [Plugin marketplaces - Claude Code Docs](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces)

### Secondary Sources (Community/Analysis)

- [Claude Skills are awesome, maybe a bigger deal than MCP](https://simonwillison.net/2025/Oct/16/claude-skills/) - Simon Willison
- [Claude Agent Skills: A First Principles Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
- [Inside Claude Code Skills: Structure, prompts, invocation](https://mikhail.io/2025/10/claude-code-skills/) - Mikhail Shilkov
- [Understanding Claude Code: Skills vs Commands vs Subagents vs Plugins](https://www.youngleaders.tech/p/claude-skills-commands-subagents-plugins)
- [Skills explained: How Skills compares to prompts, Projects, MCP, and subagents](https://www.claude.com/blog/skills-explained)
- [Anthropic Introduces Skills for Custom Claude Tasks - InfoQ](https://www.infoq.com/news/2025/10/anthropic-claude-skills/)
- [GitHub - travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills)

---

## Appendix A: SKILL.md Template

```yaml
---
name: example-skill
description: A template skill demonstrating AIWG integration patterns
version: 1.0.0
---

# Example Skill

## Purpose

This skill provides [specific capability] that Claude should apply automatically when [trigger conditions].

## Instructions

1. When the user requests [task type], apply these guidelines:
   - Guideline 1
   - Guideline 2

2. For [specific scenario], follow this process:
   - Step 1
   - Step 2

## Examples

### Example 1: [Scenario Name]

**Input**: [Sample input]
**Expected Output**: [Sample output demonstrating skill application]

### Example 2: [Another Scenario]

**Input**: [Sample input]
**Expected Output**: [Sample output]

## Resources

- `references/detailed-guide.md`: Comprehensive documentation
- `scripts/validate.py`: Validation helper script
- `assets/templates/`: Output templates

## Integration Notes

This skill works with:
- `architecture-designer` agent: For architecture-related tasks
- `/flow-*` commands: For phase transitions

## Limitations

- Does not apply to [exception case]
- Requires [prerequisite] for full functionality
```

---

**End of Draft v0.1**

*Pending reviews from: Architecture Designer, Security Architect, Requirements Analyst, Technical Writer*
