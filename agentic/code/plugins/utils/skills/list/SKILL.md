---
namespace: aiwg
name: list
platforms: [all]
description: List the frameworks and addons currently installed in the workspace registry
---

# AIWG List

You list the frameworks and addons currently installed in the workspace.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "what's deployed" → show installed frameworks
- "which frameworks are active" → show installed frameworks
- "do I have sdlc installed" → check registry for specific framework
- "is the marketing framework here" → check registry for specific framework

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| List all | "list frameworks" | Run `aiwg list` |
| Show addons | "list addons" | Run `aiwg list` |
| Existence check | "is sdlc installed?" | Run `aiwg list` and filter output |
| Version check | "what version of sdlc is deployed?" | Run `aiwg list` and extract version |

## Behavior

When triggered:

1. **Extract intent**:
   - Is the user asking about all installed items or a specific one?
   - Are they asking about frameworks, addons, or both?

2. **Run the command**:

   ```bash
   # List all installed frameworks and addons
   aiwg list
   ```

3. **Report the result** inline — summarize installed frameworks and addons, their versions, and which providers they are deployed to. For existence checks, answer the specific question directly.

## Examples

### Example 1: List all installed

**User**: "What frameworks do I have installed?"

**Extraction**: List all installed frameworks and addons

**Action**:
```bash
aiwg list
```

**Response**: "Installed frameworks: sdlc-complete (v2026.3.15, deployed to claude-code). Installed addons: ralph (v2026.3.15), aiwg-utils (v2026.3.15)."

### Example 2: Check for a specific framework

**User**: "Is the marketing framework installed?"

**Extraction**: Existence check for `media-marketing-kit`

**Action**:
```bash
aiwg list
```

**Response**: "media-marketing-kit is not installed. Run `aiwg use media-marketing-kit` to deploy it."

### Example 3: Check deployment status across providers

**User**: "Show me what's installed and where it's deployed"

**Extraction**: Full listing including provider deployment status

**Action**:
```bash
aiwg list
```

**Response**: "sdlc-complete v2026.3.15 — deployed to: claude-code. aiwg-utils v2026.3.15 — deployed to: claude-code, copilot."

## Clarification Prompts

If the user's intent is ambiguous:

- "Are you looking for a specific framework, or would you like to see everything that's installed?"

## References

- @$AIWG_ROOT/src/cli/handlers/subcommands.ts — List subcommand handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
