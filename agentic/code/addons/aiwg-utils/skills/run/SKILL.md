---
namespace: aiwg
name: run
platforms: [all]
description: Execute a named script defined in .aiwg/aiwg.config or list all available scripts

---

# Run

You execute a named script defined in `.aiwg/aiwg.config`, or list all available scripts when no name is given.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "what scripts are available" → list scripts
- "run the deploy script" → run `deploy`
- "execute test script" → run `test`
- "aiwg run" → list if no name; run if name given

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Named run | "run the test script" | Run `aiwg run test` |
| Explicit list | "list aiwg scripts" | Run `aiwg run` (no args) |
| With args | "run deploy with flag --prod" | Run `aiwg run deploy --prod` |
| Unknown name | "run the build script" | Run `aiwg run build`; report if not found |

## Behavior

When triggered:

1. **Verify config exists**:
   - Read `.aiwg/aiwg.config` to confirm `scripts` block is present.
   - If no config found, suggest `aiwg init` to create one.

2. **Extract arguments**:
   - Is a script name specified? If yes, run it.
   - If no name, list all registered scripts with their shell commands.
   - Are additional arguments passed through? Append them to the shell invocation.

3. **Run the appropriate command**:

   ```bash
   # List all available scripts
   aiwg run

   # Run a named script
   aiwg run <script-name>

   # Run with pass-through arguments
   aiwg run <script-name> -- <extra-args>
   ```

4. **What "run" does**:
   - Reads the script's shell command from `.aiwg/aiwg.config`
   - Executes it in the project root
   - Streams output to the terminal
   - Reports exit code on completion

5. **Report the result** — show the command that was executed, stream output, and confirm success or failure with exit code.

## Examples

### Example 1: List available scripts

**User**: "What scripts do I have registered in aiwg?"

**Extraction**: List request, no script name

**Action**:
```bash
aiwg run
```

**Response**:
```
Registered scripts (from .aiwg/aiwg.config):

  test    → npm test
  lint    → npm run lint
  deploy  → ./scripts/deploy.sh --env staging

Run a script with: aiwg run <script-name>
```

### Example 2: Run a named script

**User**: "Run the lint script"

**Extraction**: Script name `lint`

**Action**:
```bash
aiwg run lint
```

**Response**: Executes `npm run lint`, streams output, then reports: "Script `lint` completed (exit 0)."

### Example 3: Run with pass-through arguments

**User**: "Run the deploy script with --env production"

**Extraction**: Script name `deploy`, extra args `--env production`

**Action**:
```bash
aiwg run deploy -- --env production
```

**Response**: Executes `./scripts/deploy.sh --env staging --env production` (or however the script merges args), then reports exit status.

### Example 4: Script not found

**User**: "Run the build script"

**Extraction**: Script name `build`, not present in config

**Action**:
```bash
aiwg run build
```

**Response**: "No script named `build` found in `.aiwg/aiwg.config`. Available scripts: test, lint, deploy. Register `build` with `aiwg init --interactive` or edit `.aiwg/aiwg.config` directly."

### Example 5: No config present

**User**: "aiwg run test"

**Extraction**: No `.aiwg/aiwg.config` found

**Response**: "`.aiwg/aiwg.config` not found. Run `aiwg init` to create one and register scripts."

## Clarification Prompts

If the user's intent is ambiguous:

- "Which script would you like to run? Available: test, lint, deploy."
- "No script name given — should I list all registered scripts?"

## References

- @$AIWG_ROOT/src/cli/handlers/run.ts — `run` command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/init/SKILL.md — Registering scripts via init
