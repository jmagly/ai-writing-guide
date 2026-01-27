# AIWG Enhancement Issue Template

Template for agents filing, planning, and completing AIWG enhancement issues. Use this to ensure every proposal includes proper component integration from the start.

**Before using this template**, read @docs/development/aiwg-development-guide.md — specifically the "What Wired Means" and "Integration Checklist" sections. Every enhancement must produce wired, operational components, not standalone documentation.

## When to Use This Template

Use these templates when:

- Filing a new issue proposing an AIWG enhancement or addition
- Commenting on an existing issue with an implementation plan
- Posting a completion summary after implementing an enhancement

These templates apply to any work that adds or modifies AIWG components: agents, commands, skills, hooks, schemas, rules, templates, or flows.

---

## Template 1: Issue Filing

Use when creating a new issue for an AIWG enhancement.

````markdown
## Title Format

`feat(<scope>): <description>`

Examples:
- `feat(agents): add provenance tracking to artifact generation`
- `feat(commands): add /grade-assess for evidence quality evaluation`
- `feat(hooks): add post-write citation verification`

---

## Problem / Motivation

[What gap or need does this address? Why is this enhancement needed?]

## Research Basis (if applicable)

- REF-XXX: [Paper title and key finding]
- Related issues: #NNN

## Proposed Solution

[Brief description of the approach]

### Component Breakdown

**REQUIRED** — List every component this enhancement will create or modify.

| Type | Name | Location | Purpose |
|------|------|----------|---------|
| agent | [name] | `agentic/code/frameworks/{fw}/agents/` or `addons/{addon}/agents/` | [what it does] |
| command | [name] | `agentic/code/frameworks/{fw}/commands/` or `addons/{addon}/commands/` | [what it does] |
| skill | [name] | `agentic/code/frameworks/{fw}/skills/` or `addons/{addon}/skills/` | [what it does] |
| hook | [name] | `agentic/code/frameworks/{fw}/hooks/` or `addons/{addon}/hooks/` | [what it does] |
| schema | [name] | `.aiwg/{area}/schemas/` | [what it defines] |
| rule | [name] | `.claude/rules/` | [what it enforces] |
| template | [name] | `agentic/code/frameworks/{fw}/templates/` | [what it scaffolds] |
| flow | [name] | `agentic/code/frameworks/{fw}/flows/` | [what it orchestrates] |

Remove rows that don't apply. **At least one agent, command, or skill row is expected** — if your proposal has none, you may be creating documentation-only content (see anti-pattern check below).

### Wiring Plan

**REQUIRED** — List which existing components get modified to integrate the new capability.

| Existing Component | File | Change |
|-------------------|------|--------|
| [agent name] | `agents/[name].md` | Add reference to new schema/rule in ## References |
| [manifest] | `manifest.json` | Add new command/skill/hook entries |
| [agent name] | `agents/[name].md` | Add instructions for using new capability |

### Placement Decision

Where do these components belong? (See @docs/development/aiwg-development-guide.md#three-tier-plugin-taxonomy)

- [ ] **Framework** (`agentic/code/frameworks/sdlc-complete/`) — Part of core SDLC workflow
- [ ] **Extension** (`frameworks/{id}/extensions/`) — Domain-specific addition to existing framework
- [ ] **Addon** (`agentic/code/addons/{name}/`) — Standalone feature bundle
- [ ] **Existing addon** (`agentic/code/addons/{name}/`) — Extends an existing addon (specify which)

### Integration Checklist

From @docs/development/aiwg-development-guide.md#integration-checklist:

- [ ] Files created in correct source location (not platform folders)
- [ ] `manifest.json` updated with new entries
- [ ] At least one agent definition references the new component
- [ ] Command or skill created if capability should be user-invocable
- [ ] Hook defined if automatic enforcement needed
- [ ] @-mentions added connecting new files to related artifacts
- [ ] `aiwg validate-metadata` passes

## References

- @docs/development/aiwg-development-guide.md — Development lifecycle and wiring requirements
- @docs/development/file-placement-guide.md — Source vs deployment locations
- [Add specific references to related agents, schemas, requirements]
````

---

## Template 2: Implementation Plan Comment

Use when commenting on an issue with the planned implementation approach, before starting work.

````markdown
## Implementation Plan

### Files to Create

| File | Type | Purpose |
|------|------|---------|
| `agentic/code/.../agents/[name].md` | Agent definition | [purpose] |
| `agentic/code/.../commands/[name].md` | Command definition | [purpose] |
| `agentic/code/.../skills/[name]/SKILL.md` | Skill definition | [purpose] |
| `agentic/code/.../hooks/[name].md` | Hook definition | [purpose] |
| `.aiwg/.../schemas/[name].yaml` | Schema | [purpose] |
| `.claude/rules/[name].md` | Rule file | [purpose] |

### Files to Modify

| File | Change |
|------|--------|
| `agentic/code/.../agents/[name].md` | Add ## References entry, update instructions |
| `agentic/code/.../manifest.json` | Add entries for new commands/skills/hooks |

### Anti-Pattern Check

Per @docs/development/aiwg-development-guide.md#the-anti-pattern-documentation-only — verify this plan does NOT stop at creating schemas, guides, or rules without wiring:

- [ ] At least one agent will reference every new schema/rule
- [ ] At least one command or skill makes new capability user-invocable
- [ ] Every manifest affected gets updated
- [ ] No component exists in isolation

### Approach

[Describe the implementation approach: which components first, how they connect, any dependencies between them]
````

---

## Template 3: Completion Summary Comment

Use when commenting on an issue after implementation is complete.

````markdown
## Implementation Complete

### Components Created

| Type | Name | File |
|------|------|------|
| agent | [name] | `agentic/code/.../agents/[name].md` |
| command | [name] | `agentic/code/.../commands/[name].md` |
| skill | [name] | `agentic/code/.../skills/[name]/SKILL.md` |
| hook | [name] | `agentic/code/.../hooks/[name].md` |
| schema | [name] | `.aiwg/.../schemas/[name].yaml` |
| rule | [name] | `.claude/rules/[name].md` |

### Components Modified

| File | Change |
|------|--------|
| `agents/[name].md` | Added reference to [new component] |
| `manifest.json` | Added [N] commands, [N] skills, [N] hooks |

### Wiring Verification

- [ ] Every new schema is referenced by at least one agent
- [ ] Every new rule is referenced by at least one agent or hook
- [ ] Every new command/skill is registered in manifest.json
- [ ] Every new hook is registered in manifest.json
- [ ] @-mentions connect all new files to related artifacts
- [ ] No component exists without at least one consumer

### Manifest Changes

```json
// Commands added:
["command-1", "command-2"]

// Skills added:
["skill-1"]

// Hooks added:
["hook-1"]
```

### Validation

- [ ] All manifests are valid JSON
- [ ] All referenced files exist
- [ ] Agent definitions load without errors

### Commit

`[commit hash]` — [commit message summary]
````

---

## Anti-Pattern Quick Check

Before filing or completing any enhancement issue, verify you are NOT falling into the documentation-only trap described in @docs/development/aiwg-development-guide.md#the-anti-pattern-documentation-only.

**Ask yourself:**

1. **Did I create any schemas?** → Which agent references them?
2. **Did I create any rules?** → Which agent or hook enforces them?
3. **Did I create any guides or docs?** → Which command or skill loads them?
4. **Did I create any templates?** → Which agent uses them for generation?
5. **Can a user invoke this capability?** → What command or skill triggers it?

If any answer is "none" or "nobody," you have unwired components. Go back and complete the wiring per @docs/development/aiwg-development-guide.md#what-wired-means.

---

## Examples

### Good: Properly Structured Enhancement

```
Title: feat(research): add GRADE quality assessment for evidence evaluation

Component Breakdown:
| Type    | Name            | Location                          | Purpose                          |
|---------|-----------------|-----------------------------------|----------------------------------|
| command | grade-assess    | sdlc-complete/commands/           | User invokes /grade-assess       |
| command | grade-report    | sdlc-complete/commands/           | Generate quality report          |
| skill   | grade-on-ingest | sdlc-complete/skills/             | Auto-assess on source addition   |
| hook    | pre-cite-grade  | sdlc-complete/hooks/              | Block low-quality citations      |
| schema  | grade-result    | .aiwg/research/schemas/           | Defines assessment output format |
| rule    | citation-policy | .claude/rules/                    | Enforces quality-based hedging   |

Wiring Plan:
| Existing Component       | Change                                             |
|--------------------------|----------------------------------------------------|
| technical-researcher.md  | Add GRADE instructions and schema reference         |
| requirements-analyst.md  | Add evidence quality checking                       |
| manifest.json (commands) | Add grade-assess, grade-report                     |
| manifest.json (skills)   | Add grade-on-ingest                                |
| manifest.json (hooks)    | Add pre-cite-grade                                 |
```

This is good because every schema and rule has an agent consumer, every capability is user-invocable via commands, and the skill provides automatic triggering.

### Bad: Documentation-Only Proposal

```
Title: feat(research): add GRADE quality assessment methodology

Proposed Solution:
Create a comprehensive GRADE assessment guide with schemas
and rules for evidence quality evaluation.

Files to create:
- .aiwg/research/docs/grade-assessment-guide.md
- .aiwg/research/schemas/grade-result.yaml
- .claude/rules/citation-quality.md
```

This is bad because:
- No agent is modified to use the guide, schema, or rule
- No command makes GRADE assessment invocable
- No skill provides automatic triggering
- No hook enforces the rule
- No manifest.json is updated
- Result: three inert files that nothing in the system ever loads

---

## References

- @docs/development/aiwg-development-guide.md — Authoritative development lifecycle guide
- @docs/development/file-placement-guide.md — Source vs deployment location rules
- @docs/development/devkit-overview.md — Three-tier taxonomy and scaffolding tools
- @docs/extensions/creating-extensions.md — Detailed extension creation guides
