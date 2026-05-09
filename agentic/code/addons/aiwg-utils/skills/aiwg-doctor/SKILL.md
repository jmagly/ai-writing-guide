---
name: aiwg-doctor
namespace: aiwg
platforms: [all]
kernel: true
description: Run a comprehensive health check on the AIWG installation and workspace with pass/fail diagnostics and remediation steps
---

# AIWG Doctor

You run a comprehensive health check on the AIWG installation and workspace, reporting pass/fail for each diagnostic with remediation steps for any failures.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "is aiwg healthy" → run `aiwg doctor`
- "something is broken" → run `aiwg doctor` to isolate the issue
- "aiwg isn't working" → run `aiwg doctor`
- "check my aiwg setup" → run `aiwg doctor`
- "run diagnostics" → run `aiwg doctor`
- "aiwg broken" → run `aiwg doctor`

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Health check | "check health" / "is aiwg healthy" | Run `aiwg doctor` |
| Diagnostic request | "diagnose" / "run diagnostics" | Run `aiwg doctor` |
| Broken install | "aiwg isn't working" | Run `aiwg doctor` |
| Setup validation | "check my aiwg setup" | Run `aiwg doctor` |
| Troubleshooting | "troubleshoot installation" | Run `aiwg doctor` |
| Verbose check | "run full diagnostics" | Run `aiwg doctor --verbose` |

## Behavior

When triggered:

1. **Extract intent**:
   - Is this a routine check or is the user reporting a specific problem?
   - Did the user mention a symptom (e.g. "commands not found", "frameworks missing")? If so, note it to help interpret the doctor output.
   - Does the user want verbose output?

2. **Run the appropriate command**:

   ```bash
   # Standard health check
   aiwg doctor

   # Verbose output (additional detail per check)
   aiwg doctor --verbose
   ```

   The doctor command (`tools/cli/doctor.mjs`) validates:
   - npm package is installed and executable
   - `.aiwg/frameworks/registry.json` exists and is valid JSON
   - Framework files are deployed to the active platform directories (e.g. `.claude/agents/`, `.claude/commands/`)
   - Node.js version meets minimum requirements
   - Required tools are available (`git`, `node`, `npm`)
   - Channel configuration is consistent

3. **Report the result** — present a summary of checks passed and failed. For each failure, include the remediation step from the doctor output. Common remediations:
   - Missing registry: run `aiwg use sdlc` (or the appropriate framework)
   - Stale deployment: run `aiwg sync` or `aiwg update`
   - Missing Node.js: direct user to https://nodejs.org
   - CLI not found: run `npm install -g aiwg`

## Examples

### Example 1: Routine health check

**User**: "Check AIWG health"

**Extraction**: Routine health check, no specific symptom

**Action**:
```bash
aiwg doctor
```

**Response**: "All checks passed. npm package v2026.3.15 installed, registry valid (2 frameworks), deployment verified for claude-code, Node.js v20.11.0 compatible."

### Example 2: Broken install investigation

**User**: "AIWG commands aren't showing up in Claude"

**Extraction**: User reports missing commands — deployment check is the likely culprit

**Action**:
```bash
aiwg doctor
```

**Response**: "Doctor found 1 issue: framework files are not deployed to `.claude/commands/`. Run `aiwg sync` to redeploy, then restart your Claude session."

### Example 3: Post-install validation

**User**: "I just installed AIWG — is everything set up correctly?"

**Extraction**: New install, full validation requested

**Action**:
```bash
aiwg doctor
```

**Response**: "Installation looks good. One note: no frameworks are deployed yet. Run `aiwg use sdlc` to deploy the SDLC framework, or `aiwg use all` to deploy everything."

### Example 4: Verbose diagnostics

**User**: "Run full diagnostics on AIWG"

**Extraction**: Verbose check requested

**Action**:
```bash
aiwg doctor --verbose
```

**Response**: "Verbose diagnostics complete. [Output summary with per-check detail, paths, and versions.]"

## Clarification Prompts

If the user mentions a specific symptom before triggering doctor:

- "I'll run `aiwg doctor` to check your installation. Can you describe what you were trying to do when it broke?"

## References

- @$AIWG_ROOT/src/cli/handlers/utilities.ts — Doctor command handler (doctorHandler)
- @$AIWG_ROOT/tools/cli/doctor.mjs — Health check implementation
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
