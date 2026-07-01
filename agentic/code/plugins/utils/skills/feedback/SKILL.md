---
namespace: aiwg
name: feedback
platforms: [all]
description: Submit a bug report, feature request, or feedback to the AIWG GitHub repository — prefills system context automatically
---

# AIWG Feedback

Submit a bug report, feature request, doc gap, or general feedback to the AIWG GitHub repository. System context (version, OS, provider, installed frameworks) is collected and prefilled automatically.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "report a bug" → bug report
- "something isn't working" → bug report
- "aiwg is broken" → bug report with doctor output
- "request a feature" → feature request
- "this feature is missing" → feature request
- "docs are wrong" / "doc gap" → documentation issue
- "file an issue" → issue submission (type selection prompt)
- "give feedback about aiwg" → general feedback

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Bug report | "report a bug with aiwg serve" | `aiwg feedback --type bug` |
| Feature request | "request a feature for aiwg" | `aiwg feedback --type feature` |
| Doc gap | "the docs for mcp inject are wrong" | `aiwg feedback --type doc` |
| General | "I have feedback" | `aiwg feedback` |
| With context | "file this as a bug: X" | Extract title/body, run `aiwg feedback --type bug --title "..." --body "..."` |

## Behavior

When triggered:

1. **Extract from conversation** (if the user described the issue):
   - **Type**: bug | feature | doc | other
   - **Title**: short phrase summarizing the issue (max 80 chars)
   - **Body**: structured description of what happened, what was expected

2. **Run the appropriate command**:

   ```bash
   # Interactive (when type/title/body not clear from context)
   aiwg feedback

   # With extracted type
   aiwg feedback --type bug

   # Fully extracted from conversation
   aiwg feedback --type bug --title "doctor crashes when .aiwg missing" --body "Running aiwg doctor in a new project with no .aiwg directory causes an unhandled exception..."

   # Feature request
   aiwg feedback --type feature --title "add --watch flag to aiwg index build" --body "..."

   # Doc gap
   aiwg feedback --type doc --title "mcp inject workflow not documented" --body "..."
   ```

3. **Report the result** — confirm the issue was filed or provide the GitHub URL.

## Examples

### Example 1: Bug from conversation

**User**: "aiwg doctor crashes when I run it in a new project — there's an unhandled error about missing .aiwg"

**Extraction**:
- Type: bug
- Title: `doctor crashes when .aiwg directory is missing`
- Body: description from user message

**Action**:
```bash
aiwg feedback --type bug \
  --title "doctor crashes when .aiwg directory is missing" \
  --body "Running aiwg doctor in a project with no .aiwg directory causes an unhandled exception. Steps: 1) Create a new empty directory 2) Run aiwg doctor 3) Error occurs."
```

### Example 2: Feature request from conversation

**User**: "I wish aiwg session could pass extra flags directly to the provider binary"

**Extraction**:
- Type: feature
- Title: `aiwg session: pass-through flags to provider binary`
- Body: description from user message

**Action**:
```bash
aiwg feedback --type feature \
  --title "aiwg session: pass-through flags to provider binary" \
  --body "Would be useful to be able to pass provider-specific flags through aiwg session, e.g. aiwg session -- --verbose"
```

### Example 3: Ambiguous — ask

**User**: "I have some feedback"

**Clarification prompt**: "What's the feedback about? (Bug you found, feature you'd like, or something else?)"

Then run interactively:
```bash
aiwg feedback
```

## Clarification Prompts

If the user's intent is ambiguous:

- "Is this a bug you found, a feature you'd like, or something else?"
- "Can you describe what you expected vs what happened?"
- "Which aiwg command or feature is this about?"

## References

- @$AIWG_ROOT/src/cli/handlers/feedback.ts — Feedback command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference (feedback section)
- GitHub Issues: https://github.com/jmagly/aiwg/issues
