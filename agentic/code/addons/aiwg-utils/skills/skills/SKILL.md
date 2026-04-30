---
namespace: aiwg
name: skills
platforms: [all]
description: Manage the AIWG skills registry by listing, searching, inspecting, installing, and publishing skills

---

# Skills Registry

You manage the AIWG skills registry — listing installed skills, searching the registry, fetching skill details, installing skills, and publishing skills to ClaWHub/OpenClaw.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "what skills do I have" → list
- "find a skill for git" → search git
- "how does the deploy-gen skill work" → info deploy-gen
- "get the roko-voice skill" → install roko-voice
- "share this skill" → publish

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| List installed | "what skills are installed?" | Run `aiwg skills list` |
| Search registry | "search for skills related to voice" | Run `aiwg skills search voice` |
| Skill details | "tell me about the mention-wire skill" | Run `aiwg skills info mention-wire` |
| Install skill | "install the commit-and-push skill" | Run `aiwg skills install commit-and-push` |
| Publish skill | "publish this skill to the registry" | Run `aiwg skills publish <path>` |

## Behavior

When triggered:

1. **Identify the subcommand**:
   - Is the user listing, searching, inspecting, installing, or publishing?
   - Is a skill ID or search query mentioned?

2. **Run the appropriate command**:

   ```bash
   # List locally installed skills
   aiwg skills list

   # Search the registry
   aiwg skills search <query>

   # Show details for a specific skill
   aiwg skills info <skill-id>

   # Install a skill from the registry
   aiwg skills install <skill-id>

   # Publish a skill to the registry
   aiwg skills publish <skill-path>

   # Machine-readable output
   aiwg skills list --json
   aiwg skills search <query> --json
   ```

3. **Report the result** — confirm what was found, installed, or published.

## Examples

### Example 1: List installed skills

**User**: "What skills are installed?"

**Extraction**: List subcommand

**Action**:
```bash
aiwg skills list
```

**Response**: "47 skills installed. Categories: devkit (8), workspace (5), voice (6), mention (5), soul (7), deploy (4), other (12). Run `aiwg skills info <id>` for details."

### Example 2: Search the registry

**User**: "Search for skills related to git"

**Extraction**: Search subcommand, query = git

**Action**:
```bash
aiwg skills search git
```

**Response**: "4 registry results for 'git': commit-and-push (installed), git-flow, git-blame-analysis, repo-health-check. Run `aiwg skills install <id>` to add any."

### Example 3: Skill details

**User**: "How does the deploy-gen skill work?"

**Extraction**: Info subcommand, skill-id = deploy-gen

**Action**:
```bash
aiwg skills info deploy-gen
```

**Response**: "deploy-gen: Generates deployment plans and runbooks from SDLC artifacts. Triggers on 'generate deployment plan', 'create runbook', 'deploy prep'. Allowed tools: Read, Write, Bash. Handler: src/cli/handlers/deploy-gen.ts."

### Example 4: Install a skill

**User**: "Install the repo-health-check skill"

**Extraction**: Install subcommand, skill-id = repo-health-check

**Action**:
```bash
aiwg skills install repo-health-check
```

**Response**: "Installed repo-health-check v1.2.0 to agentic/code/addons/aiwg-utils/skills/repo-health-check/. Triggers: 'repo health', 'check repository health', 'audit repo'."

### Example 5: Publish a skill

**User**: "Publish the skill at ./my-skills/code-review to the registry"

**Extraction**: Publish subcommand, path = ./my-skills/code-review

**Action**:
```bash
aiwg skills publish ./my-skills/code-review
```

**Response**: "Published code-review v1.0.0 to the skills registry. Available as `aiwg skills install code-review`."

## Clarification Prompts

If the user's intent is ambiguous:

- "Are you looking for a skill that's already installed, or searching the registry for one to add?"
- "Which skill ID do you want to install? I can run `aiwg skills search <topic>` to find candidates."

## References

- @$AIWG_ROOT/src/cli/handlers/subcommands.ts — Skills subcommand handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference (skills section)
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/ — Installed skills directory
