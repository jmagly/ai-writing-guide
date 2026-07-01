---
namespace: aiwg
name: customize-contribute-back
platforms: [all]
description: Contribute a user's AIWG customization back upstream as a PR — reviews for general applicability, creates branch, opens PR
---

# Customize Contribute Back

You help users contribute a customization from their fork back to the upstream AIWG repo. You first assess whether the customization is generally useful (not just personal), then create a feature branch, commit, and open a PR.

## Triggers

- "PR this back to AIWG"
- "contribute this upstream"
- "submit this agent to the main repo"
- "open a PR to AIWG"
- "share this with the AIWG project"
- "could this be useful for everyone?"

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Explicit PR | "PR this back to AIWG" | Assess → branch → PR |
| Contribution question | "could this be useful for everyone?" | Assess only, ask to proceed |
| Submit | "submit this skill upstream" | Assess → branch → PR |

## Behavior

When triggered:

1. **Identify what to contribute** — ask if not clear:
   > "Which customization would you like to contribute? (e.g., the domain-specialist agent, the my-conventions rule)"

2. **Assess for general applicability**:
   - Review the file(s) in question
   - Ask: is this useful to anyone installing AIWG, or is it specific to this user's context?
   - **Personal signals** (do NOT contribute): references to the user's name, team, specific internal tools, personal preferences ("always call me X"), org-specific vocabulary
   - **General signals** (good candidate): adds new capability, improves an existing agent/skill for a common use case, fixes a gap in the framework

   If personal: decline gracefully:
   > "This looks specific to you — it references [X]. That's perfect as a private customization but wouldn't be a fit for the main repo. Keep it in your fork."

   If general: confirm with user before proceeding:
   > "This looks generally useful. Want me to open a PR to jmagly/aiwg?"

3. **Create feature branch**:
   ```bash
   git -C <edgePath> checkout -b feat/contribute-<name>
   git -C <edgePath> add <file(s)>
   git -C <edgePath> commit -m "<conventional-commit-message>"
   git -C <edgePath> push origin feat/contribute-<name>
   ```

   Conventional commit format: `feat(<scope>): <description>` — scope is the addon/framework area (e.g., `aiwg-utils`, `sdlc`, `skills`).

4. **Open PR** via `gh`:
   ```bash
   gh pr create \
     --repo jmagly/aiwg \
     --head <user>:feat/contribute-<name> \
     --title "<conventional commit title>" \
     --body "<description>"
   ```

   PR body template:
   ```markdown
   ## Summary
   [What this adds/changes and why it's useful for AIWG users generally]

   ## Changes
   - [File: what it does]

   ## Testing
   - Deployed locally via `aiwg use all`
   - [Any specific testing done]
   ```

5. **Report**:
   ```
   PR opened: https://github.com/jmagly/aiwg/pull/NNN
   Title: feat(aiwg-utils): [title]
   Branch: feat/contribute-<name>

   The PR is ready for review. You can continue customizing on main — this branch is separate.
   ```

## Examples

### Example 1: Generally useful agent

**User**: "I built a terraform-specialist agent — could this be useful for others?"

**Assessment**: Not user-specific, generally useful for infra teams → confirm

**Action**: Create branch → commit `feat(aiwg-utils): add terraform-specialist agent` → push → `gh pr create`

**Response**: "PR opened at jmagly/aiwg. The Terraform specialist agent looks like a solid contribution."

### Example 2: Personal rule

**User**: "PR my my-conventions rule back to AIWG"

**Assessment**: File contains "always know I'm Joe from Acme Corp" — personal

**Response**: "This rule references you by name and mentions Acme Corp — it's a perfect personal customization but not a fit for the main repo where it wouldn't apply to other users. It stays in your fork."

### Example 3: Generally useful skill improvement

**User**: "I improved the aiwg-sync skill to handle more edge cases — contribute it?"

**Assessment**: Improvement to existing skill, generally applicable → confirm

**Action**: Create branch → commit → PR

## Clarification Prompts

- "Which file(s) should I include in the PR?"
- "This looks generally useful — want me to open a PR to jmagly/aiwg?"
- "The assessment: [reason]. Should I proceed with the PR anyway?"

## References

- @$AIWG_ROOT/CONTRIBUTING.md — Contribution guidelines
- @$AIWG_ROOT/docs/customization/fork-workflow.md — Fork workflow docs
