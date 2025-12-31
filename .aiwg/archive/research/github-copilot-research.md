# GitHub Copilot Custom Agents Configuration Research

**Research Date:** 2025-12-11
**Researcher:** Claude Code (Technical Research Agent)
**Purpose:** Document GitHub Copilot custom agents configuration format for AIWG multi-platform deployment

---

## Executive Summary

**Status:** GitHub Copilot Custom Agents is an active feature (as of 2024-2025) that allows repository-specific AI agent configurations.

**Key Findings:**
1. Agent definitions stored in `.github/agents/` directory
2. Two primary formats: YAML and Markdown (`.agent.md`)
3. No dedicated `copilot-instructions.md` format found - appears to be community convention
4. MCP server integration is evolving (GitHub sunset Copilot Extensions in favor of MCP)
5. Configuration is simpler than AIWG SDLC framework - no multi-agent orchestration built-in

**Recommendation:** **ASSESS** - GitHub Copilot Custom Agents is suitable for single-agent tasks but lacks the orchestration capabilities of AIWG's SDLC framework. Consider as complementary deployment target, not replacement.

---

## Configuration Format

### File Locations

**Repository-Level Agents:**
```
.github/agents/
├── agent-name.agent.md          # Markdown format with YAML frontmatter
├── another-agent.yaml           # Pure YAML format
├── copilot-instructions.md      # Optional global instructions
└── README.md                    # Documentation (recommended)
```

**CLI/User-Level Agents:**
```
~/.copilot/agents/               # User-wide agent definitions (unconfirmed)
```

---

## Format 1: YAML Configuration

### Structure

```yaml
name: agent-name
description: Brief description of agent purpose
metadata:
  version: 1.0.0
  author: Team Name
  updated: 2025-12-11

instructions: |
  Multi-line instruction block using Markdown formatting.

  This is where you define:
  - Agent persona and role
  - Core responsibilities
  - Guidelines and constraints
  - Output templates
  - Reference documents

model:
  name: gpt-4                    # Model selection
  temperature: 0.2               # Creativity (0.0-1.0)
  max_tokens: 8000               # Response length limit
```

### Real-World Example: Business Analyst Agent

```yaml
name: business-analyst-agent
description: Technical Business Analyst Agent for DoR-compliant user stories
metadata:
  version: 2.0.0
  author: Legends Ascend Team
  updated: 2025-11-06

instructions: |
  You are the Technical Business Analyst Agent for the Legends Ascend project.

  CRITICAL OUTPUT FORMAT:
  - Generate ONE comprehensive user story in a SINGLE markdown document
  - DO NOT create separate files or suggest file creation
  - The output will be posted as a GitHub issue, not as repository files

  Your objective is to transform unrefined requirements into fully fledged,
  Definition of Ready (DoR)-compliant user stories aligned with all foundation
  documents.

  Mandatory References (do not duplicate content; reference and enforce):
  - /docs/DEFINITION_OF_READY.md
  - /docs/TECHNICAL_ARCHITECTURE.md
  - /docs/BRANDING_GUIDELINE.md
  - /docs/ACCESSIBILITY_REQUIREMENTS.md

  Core Responsibilities:

  1) Requirements Elicitation & Clarification
  - Normalize the raw input into clear problem statements and goals
  - Identify implicit assumptions, domain terminology, and missing data

  2) DoR-Compliant User Story Authoring
  - Produce stories in the format: "As a [role], I want [goal], so that [benefit]"
  - Include: Title, MoSCoW priority, Story points (Fibonacci), Epic linkage
  - Provide Acceptance Criteria with testable pass/fail conditions

  Output Template (ALL IN ONE DOCUMENT):

  # [Story Title]

  **ID:** US-XXX
  **Points:** [1|2|3|5|8|13]
  **Priority:** [MUST|SHOULD|COULD|WON'T]

  ## User Story
  As a [role], I want [goal], so that [benefit].

  ## Acceptance Criteria
  - **[AC-1]** Given [context], When [action], Then [expected result]

  ## Technical Notes
  - **API:** [Paths, methods, versioning]
  - **Data Model:** [Tables/types changes]

  ## Task Breakdown
  - [ ] Design API stubs and schema updates
  - [ ] Implement feature logic
  - [ ] Create unit tests
  - [ ] Documentation updates

model:
  name: gpt-4
  temperature: 0.2
  max_tokens: 8000
```

---

## Format 2: Markdown with YAML Frontmatter

### Structure

```markdown
---
name: agent-name
description: Brief description
status: draft|ready|polish|deprecated
tools: [
  "createFile",
  "editFiles",
  "search",
  "fetch",
  "runSubagent",
  "githubRepo"
]
---

# Agent Name

<persona>
<character>

## Character Description

Describe the agent's personality and approach.

</character>
</persona>

<constraints>

## Decision Rules

- When given alternatives, pick one
- Provide rationale

## Execution Rules

- Do not process input line-by-line unless requested
- Generate only the requested artifact

</constraints>
```

### Real-World Example: Principal Pragmatist Agent

```markdown
---
status: "draft"
description: "A no-nonsense, get-it-done chat mode for engineers who value results over fluff."
tools: [
  "createFile",
  "createDirectory",
  "editFiles",
  "search",
  "fetch",
  "runSubagent",
  "problems",
  "changes",
  "githubRepo",
  "todos"
]
---

# Principal Pragmatist Chat Mode

<persona>
<character>

## Character

This mode embodies the **Principal Pragmatist** — a senior-to-principal engineer
who's been around long enough to know when to cut the fluff and when to crack the joke.

</character>

<persona>

## Persona

You are a senior-to-principal engineer.
You follow user instructions exactly.
You never reinterpret or pad the request.
You assume the user is competent.
You deliver the artifact first.
You may add one short dry or humorous comment **after** the artifact.

</persona>

<constraints>

## Decision Rules

- When given alternatives, pick one.
- Provide at most one sentence of rationale.
- Never re-ask the user's question.

## Execution Rules

- Do not process input line-by-line unless requested.
- Do not create summaries or outlines unless requested.
- Generate only the requested artifact.

## Formatting Constraints

- Sentences: 10–20 words.
- Bullet points: 4–8 words.
- Code blocks: Match requested format.
- Markdown: Use GitHub-flavored Markdown.

</constraints>
```

---

## Format 3: Developer Agent with Workflow Integration

### Example: BMAD Developer Agent

```markdown
---
name: "dev"
description: "Developer Agent"
---

<agent id="dev.agent.yaml" name="Amelia" title="Developer Agent" icon="💻">
<activation critical="MANDATORY">
  <step n="1">Load persona from this current agent file</step>
  <step n="2">Load project config from {project-root}/.bmad/core/config.yaml</step>
  <step n="3">READ the entire story file BEFORE any implementation</step>
  <step n="4">Execute tasks IN ORDER as written in story file</step>
  <step n="5">Follow red-green-refactor cycle</step>
  <step n="6">Mark task complete ONLY when tests pass</step>
  <step n="7">Show greeting, then display menu and WAIT for user input</step>

  <menu-handlers>
    <handler type="workflow">
      When menu item has: workflow="path/to/workflow.yaml"
      1. Load {project-root}/.bmad/core/tasks/workflow.xml
      2. Execute workflow instructions precisely
      3. Save outputs after EACH workflow step
    </handler>
  </menu-handlers>
</activation>

<persona>
  <role>Senior Software Engineer</role>
  <identity>Executes approved stories with strict adherence to acceptance criteria</identity>
  <communication_style>Ultra-succinct. Speaks in file paths and AC IDs</communication_style>
  <principles>
    - The Story File is the single source of truth
    - Follow red-green-refactor cycle
    - All existing tests must pass 100%
  </principles>
</persona>

<menu>
  <item cmd="*develop-story" workflow="{project-root}/.bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml">
    Execute Dev Story workflow
  </item>
  <item cmd="*code-review" workflow="{project-root}/.bmad/bmm/workflows/4-implementation/code-review/workflow.yaml">
    Perform code review
  </item>
</menu>
</agent>
```

---

## Format 4: Complex Agent with Self-Healing CI

### Example: Nexus Coding Agent (YAML)

```yaml
name: Nexus Coding Agent
description: >
  Self-healing, iterative coding agent. Focus: simulation UI, treasury modules,
  docs, CI reliability. Plans small changes, auto-writes tests, retries with backoff.

capabilities:
  - code_changes
  - documentation_updates
  - test_generation
  - issue_triage
  - pr_creation
  - continuous_improvement

guardrails:
  - Always write deterministic tests for nontrivial changes
  - Never modify secrets or deploy keys
  - Keep changes under 300 lines unless refactoring is unavoidable
  - Prefer incremental PRs with clear diffs and provenance notes

inputs:
  repo_path: "."
  primary_branch: "main"
  focus_areas:
    - "simulator frontend (Flask + templates)"
    - "safe_core.py robustness: timelock, signature, budget enforcement"
    - "CI reliability with backoff and re-run on transient failures"

task_plan:
  - id: scan
    summary: Read repo state, open issues, last CI run logs
    actions:
      - read_files: ["README.md", "simulator/app.py", ".github/workflows/*.yml"]
      - list_open_issues: true
      - fetch_ci_logs: true
      - analyze_failures: true

  - id: propose
    summary: Propose a minimal, testable change set with rollout plan
    actions:
      - write_plan_md: ".agent/plans/plan-{{timestamp}}.md"
      - list_target_files: true
      - estimate_risk: true

  - id: implement
    summary: Apply changes with tests and documentation
    actions:
      - modify_files: true
      - add_tests: ["tests/test_simulator_ui.py"]
      - update_docs: ["docs/simulator.md"]
      - run_ci_locally: true

  - id: verify
    summary: Run CI, collect logs; if failing, enter self-heal loop
    actions:
      - run_ci: true
      - parse_ci_output: true
      - attach_provenance: ".agent/provenance/{{timestamp}}.json"

  - id: selfheal
    summary: Retry with adaptive backoff; reduce change scope; add diagnostics
    actions:
      - retry_strategy: {max_attempts: 3, backoff_seconds: [30, 120, 300]}
      - revert_last_chunk_if_needed: true
      - add_logging: true

  - id: finalize
    summary: Create PR with clear summary, evidence, and risk notes
    actions:
      - create_pr: {title: "Agent: {{timestamp}}", branch: "agent/iteration-{{timestamp}}"}
      - summarize_changes: true
```

---

## Tool Configuration

### Available Tools (from examples)

**File Operations:**
- `createFile` - Create new files
- `createDirectory` - Create directories
- `editFiles` - Modify existing files
- `deleteFile` - Remove files

**Code Analysis:**
- `search` - Search codebase
- `problems` - Analyze code issues
- `changes` - Review uncommitted changes
- `githubRepo` - Access repository metadata

**Execution:**
- `runSubagent` - Invoke other agents
- `runInTerminal` - Execute shell commands

**External:**
- `fetch` - HTTP requests
- `get-library-docs` - Fetch library documentation
- `resolve-library-id` - Resolve package identifiers

**Task Management:**
- `todos` - Manage TODO items

### Tool Declaration Format

```yaml
tools: [
  "createFile",
  "editFiles",
  "search",
  "fetch",
  "runSubagent"
]
```

---

## MCP Server Integration

**Status:** GitHub is transitioning from Copilot Extensions to Model Context Protocol (MCP).

### Current State (as of 2024-2025)

- GitHub announced **sunset of Copilot Extensions** in favor of MCP
- The [github/awesome-copilot](https://github.com/github/awesome-copilot) repo supports MCP
- MCP servers can be configured alongside custom agents
- Integration points still evolving

### Expected MCP Configuration Location

```
.github/copilot/
├── mcp-servers.json             # MCP server configuration
└── config.json                  # Copilot settings
```

### MCP Server Configuration Format (speculative)

```json
{
  "mcp_servers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed"]
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://connection-string"]
    },
    "custom-aiwg": {
      "command": "node",
      "args": ["~/.local/share/ai-writing-guide/src/mcp/server.mjs"]
    }
  }
}
```

**Note:** No concrete examples found in GitHub search. This is based on standard MCP configuration patterns.

---

## copilot-instructions.md Format

**Status:** Community convention, not officially documented.

### Purpose

Global instructions that apply to all Copilot interactions within a repository, similar to `.claude/CLAUDE.md` or `WARP.md`.

### Observed Format

```markdown
# [Project Name] Development Guidelines

Auto-generated from all feature plans. Last updated: [DATE]

## Active Technologies
- Technology stack and version requirements

## Project Structure

```text
src/
tests/
```

## Commands

# List of available commands

## Code Style

Language-specific style guidelines

## Recent Changes
- Changelog entries
```

### Example: foundagent copilot-instructions.md

```markdown
# foundagent Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-09

## Active Technologies
- Go 1.21+ + Cobra (CLI framework with native completion support)

## Project Structure

```text
src/
tests/
```

## Commands

# Add commands for Go 1.21+

## Code Style

Go 1.21+: Follow standard conventions

## Recent Changes
- 013-completion: Added Go 1.21+ + Cobra
```

---

## Usage Patterns

### 1. Invoke Agent via PR Comment

```markdown
@copilot coding-agent

Please review this PR for:
- Architecture and coding standards compliance
- TECHNICAL_ARCHITECTURE.md adherence
- Code quality and best practices
```

### 2. Invoke Agent via Agents Panel

1. Click **Agents** button in GitHub top navigation
2. Select repository from dropdown
3. Choose **Custom agent** from agent list
4. Enter task description
5. Click **Start task**

### 3. Assign Agent to Issue

1. Navigate to GitHub issue
2. Open **Copilot panel** (right sidebar)
3. Select agent from list
4. Click **Run**

### 4. Agent Output

- Copilot creates **child pull request** with results
- Posts comment linking to PR
- Requests review when complete

---

## Comparison: GitHub Copilot vs AIWG SDLC

| Feature | GitHub Copilot Custom Agents | AIWG SDLC Framework |
|---------|----------------------------|---------------------|
| **Agent Definition** | `.github/agents/*.yaml` or `.agent.md` | `.claude/agents/*.md` |
| **Multi-Agent Orchestration** | No built-in support | Yes - Primary Author → Reviewers → Synthesizer |
| **Parallel Execution** | Manual via runSubagent | Built-in parallel Task() launches |
| **Traceability** | Manual | Automatic @-mention wiring |
| **Phase Gates** | Not supported | Built-in gate validation |
| **Artifact Management** | GitHub Issues/PRs | `.aiwg/` directory structure |
| **Template System** | Instructions only | 50+ templates across SDLC phases |
| **Natural Language** | Basic | Advanced translation table |
| **Model Selection** | Per-agent configuration | Per-category (reasoning/coding/efficiency) |
| **Platform Support** | GitHub only | Claude, Warp, Factory, OpenAI/Codex |

---

## Integration Recommendations

### Option 1: Deploy AIWG Agents to GitHub Copilot

**Approach:** Create GitHub Copilot YAML configs from AIWG agent definitions.

**Conversion Pattern:**

```bash
# AIWG Agent (.claude/agents/requirements-analyst.md)
---
name: requirements-analyst
description: Analyzes and documents requirements
model: sonnet
tools: Read, Write, MultiEdit, Glob, Grep
---

# Requirements Analyst

[Agent instructions...]

# ↓ Convert to ↓

# GitHub Copilot Agent (.github/agents/requirements-analyst.yaml)
name: requirements-analyst
description: Analyzes and documents requirements
model:
  name: gpt-4
  temperature: 0.2
  max_tokens: 4000

instructions: |
  [Agent instructions from AIWG agent...]

  Reference Documents:
  - docs/requirements/user-stories.md
  - .aiwg/requirements/use-cases/*.md
```

**Challenges:**
- No multi-agent orchestration
- No phase gate support
- Limited to GitHub platform
- Manual traceability management

### Option 2: Hybrid Approach

**GitHub Copilot for:**
- Issue triage and initial analysis
- PR code review
- Single-agent tasks

**AIWG SDLC for:**
- Multi-agent workflows
- Phase transitions
- Requirements → Architecture → Tests traceability
- Complex orchestration (iterations, deployments)

### Option 3: Use AIWG MCP Server with GitHub Copilot

**Approach:** Configure GitHub Copilot to use AIWG MCP server for workflow orchestration.

**Configuration:**

```json
{
  "mcp_servers": {
    "aiwg": {
      "command": "node",
      "args": ["~/.local/share/ai-writing-guide/src/mcp/server.mjs"]
    }
  }
}
```

**Benefits:**
- Leverage AIWG's orchestration via MCP tools
- Keep GitHub Copilot as primary interface
- Best of both worlds

**Challenges:**
- MCP integration still evolving
- GitHub Copilot MCP support unclear

---

## Best Practices (from examples)

### 1. Output Format Clarity

**Bad:**
```yaml
instructions: |
  Generate user stories.
```

**Good:**
```yaml
instructions: |
  CRITICAL OUTPUT FORMAT:
  - Generate ONE comprehensive user story in a SINGLE markdown document
  - DO NOT create separate files or suggest file creation
  - The output will be posted as a GitHub issue, not as repository files
```

### 2. Reference Foundation Documents

**Bad:**
```yaml
instructions: |
  Follow coding standards.
```

**Good:**
```yaml
instructions: |
  Mandatory References (do not duplicate content; reference and enforce):
  - /docs/TECHNICAL_ARCHITECTURE.md
  - /docs/BRANDING_GUIDELINE.md
  - /docs/ACCESSIBILITY_REQUIREMENTS.md
```

### 3. Explicit Constraints

**Bad:**
```yaml
instructions: |
  Be concise.
```

**Good:**
```yaml
instructions: |
  Guardrails:
  - Keep changes under 300 lines unless refactoring is unavoidable
  - Never modify secrets or deploy keys
  - Prefer incremental PRs with clear diffs and provenance notes
```

### 4. Structured Templates

Include output templates in instructions:

```yaml
instructions: |
  Output Template:

  # [Story Title]

  **ID:** US-XXX
  **Points:** [1|2|3|5|8|13]

  ## User Story
  As a [role], I want [goal], so that [benefit].

  ## Acceptance Criteria
  - **[AC-1]** Given [context], When [action], Then [expected result]
```

### 5. README for Documentation

Include `.github/agents/README.md` with:
- Overview of all agents
- Usage instructions
- Example invocations
- Reference to foundation documents

---

## Implementation Checklist

For deploying AIWG agents to GitHub Copilot:

- [ ] Convert agent Markdown to YAML or `.agent.md` format
- [ ] Map AIWG tools to GitHub Copilot tools
- [ ] Extract model configuration (default to gpt-4, temp 0.2-0.3)
- [ ] Include references to `.aiwg/` artifacts
- [ ] Add output format constraints
- [ ] Create `.github/agents/README.md`
- [ ] Test agent invocation via PR comment
- [ ] Test agent invocation via Agents Panel
- [ ] Document multi-agent workflow limitations
- [ ] Provide fallback to AIWG orchestration for complex workflows

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| No multi-agent orchestration | High | Use AIWG for complex workflows, GitHub Copilot for single-agent |
| Platform lock-in | Medium | Maintain AIWG as primary, GitHub Copilot as deployment target |
| MCP integration unclear | Medium | Monitor GitHub announcements, test MCP server integration |
| Limited phase gate support | High | Use AIWG `/flow-gate-check` for gate validation |
| Manual traceability | High | Continue using AIWG @-mention wiring, export to GitHub |

---

## Next Steps

1. **Prototype Conversion Script**
   - Create `aiwg -deploy-agents --provider github` command
   - Convert AIWG agents to GitHub Copilot YAML
   - Map tool names (Read → search, Write → createFile, etc.)

2. **Test Integration**
   - Deploy 3-5 agents to `.github/agents/`
   - Test invocation via PR comments
   - Measure response quality vs AIWG native

3. **Document Limitations**
   - Create comparison guide for users
   - Explain when to use GitHub Copilot vs AIWG orchestration
   - Provide fallback patterns

4. **Explore MCP Integration**
   - Test AIWG MCP server with GitHub Copilot (when supported)
   - Create `.github/copilot/mcp-servers.json` template
   - Document benefits and limitations

---

## References

### Example Repositories

- **Legends-Ascend/legends-ascend-mvp** - Comprehensive BA/Coding/Testing agents
  - https://github.com/Legends-Ascend/legends-ascend-mvp/tree/main/.github/agents

- **anchildress1/awesome-github-copilot** - Community agent collection
  - https://github.com/anchildress1/awesome-github-copilot/tree/main/.github/agents

- **chrisjowen/agent-hub** - Multi-agent hub pattern
  - https://github.com/chrisjowen/agent-hub/tree/main/.github/agents

- **FuzzysTodd/The-Nexus-Protocol-Token-DOA** - Self-healing CI agent
  - https://github.com/FuzzysTodd/The-Nexus-Protocol-Token-DOA/tree/main/.github/agents

### Documentation

- **GitHub Copilot Custom Agents** (official docs - unable to fetch)
  - https://docs.github.com/en/copilot/reference/custom-agents-configuration

- **GitHub Blog: Custom Agents Changelog** (unable to fetch)
  - https://github.blog/changelog/2025-10-28-custom-agents-for-github-copilot/

- **awesome-copilot** - Official GitHub repository for MCP-based agents
  - https://github.com/github/awesome-copilot

---

## Appendix: Tool Mapping

AIWG → GitHub Copilot tool equivalents:

| AIWG Tool | GitHub Copilot Tool | Notes |
|-----------|-------------------|-------|
| Read | search, fetch | Read file contents |
| Write | createFile, editFiles | Create or modify files |
| MultiEdit | editFiles | Batch edits |
| Bash | runInTerminal | Execute commands |
| WebFetch | fetch | HTTP requests |
| Glob | search | File pattern matching |
| Grep | search | Content search |
| Task | runSubagent | Launch other agents |

---

**Research Status:** Complete
**Confidence Level:** High for agent format, Medium for MCP integration
**Last Updated:** 2025-12-11
