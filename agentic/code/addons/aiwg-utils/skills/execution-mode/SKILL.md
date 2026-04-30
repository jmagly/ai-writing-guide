---
namespace: aiwg
name: execution-mode
platforms: [all]
description: Set or report the reproducibility mode governing how AIWG workflows execute, from standard to fully auditable
---

# Execution Mode

You set or report the reproducibility mode that governs how AIWG workflows execute, controlling determinism constraints from none (standard) to fully auditable (audit).

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "make runs deterministic" → set strict mode
- "pin the seed" → set seeded mode with provided seed value
- "what mode are we in" → report current execution mode
- "reset to default" → set standard mode
- "enable audit logging" → set audit mode

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Set standard | "use default execution mode" | Run `aiwg execution-mode standard` |
| Set seeded | "use a fixed seed for this run" | Run `aiwg execution-mode seeded --seed <value>` |
| Set strict | "make execution deterministic" | Run `aiwg execution-mode strict --seed <value>` |
| Set audit | "enable audit mode" | Run `aiwg execution-mode audit --seed <value>` |
| Status check | "what execution mode is active?" | Run `aiwg execution-mode` (no args) |
| Seed only | "set seed to 42" | Run `aiwg execution-mode seeded --seed 42` |

## Behavior

When triggered:

1. **Extract intent**:
   - Is this a status check or a mode change?
   - Which mode is requested: `standard`, `seeded`, `strict`, or `audit`?
   - Is a `--seed` value provided or should one be generated?

2. **Run the appropriate command**:

   ```bash
   # Report current mode (no args)
   aiwg execution-mode

   # Standard — no reproducibility constraints
   aiwg execution-mode standard

   # Seeded — fixed random seed for all operations
   aiwg execution-mode seeded --seed 42

   # Strict — seeded + no external calls + pinned versions
   aiwg execution-mode strict --seed 42

   # Audit — strict + decision logging for replay
   aiwg execution-mode audit --seed 42
   ```

3. **Mode summary**:

   | Mode | Seed | External calls | Pinned versions | Decision log |
   |------|------|----------------|-----------------|--------------|
   | `standard` | No | Allowed | No | No |
   | `seeded` | Yes | Allowed | No | No |
   | `strict` | Yes | Blocked | Yes | No |
   | `audit` | Yes | Blocked | Yes | Yes |

4. **Persistence**: Mode is written to `.aiwg/execution-mode.json` and persists across sessions until explicitly changed.

5. **Report the result** — confirm the mode that is now active and note any implications (e.g., external calls will be blocked in strict/audit mode).

## Examples

### Example 1: Status check

**User**: "What execution mode are we in?"

**Extraction**: Status check, no change requested

**Action**:
```bash
aiwg execution-mode
```

**Response**: "Current execution mode: `seeded` (seed: 1234). External calls are allowed and versions are not pinned. To increase determinism, switch to `strict` or `audit` mode."

### Example 2: Enable strict mode

**User**: "Make the workflow fully deterministic with seed 42"

**Extraction**: Strict mode requested, seed 42 provided

**Action**:
```bash
aiwg execution-mode strict --seed 42
```

**Response**: "Execution mode set to `strict` with seed 42. External network calls are blocked and dependency versions are pinned. Mode saved to `.aiwg/execution-mode.json`."

### Example 3: Enable audit mode for compliance

**User**: "Enable audit mode so we can replay every decision"

**Extraction**: Audit mode requested, no seed provided — generate one

**Action**:
```bash
aiwg execution-mode audit --seed 7391
```

**Response**: "Execution mode set to `audit` with seed 7391. All decisions will be logged for replay. Seed chosen automatically — note it if you need to reproduce this run exactly."

### Example 4: Reset to default

**User**: "Reset execution mode back to default"

**Extraction**: Reset to standard mode

**Action**:
```bash
aiwg execution-mode standard
```

**Response**: "Execution mode reset to `standard`. No reproducibility constraints are active."

## Clarification Prompts

If the user's intent is ambiguous:

- "Should I generate a random seed or would you like to specify one?"
- "Which mode would you like? `seeded` (fixed seed only), `strict` (seed + pinned versions + no external calls), or `audit` (strict + decision logging)?"

## References

- @$AIWG_ROOT/src/cli/handlers/subcommands.ts — Execution mode command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/schemas/reproducibility/ — Reproducibility schemas
