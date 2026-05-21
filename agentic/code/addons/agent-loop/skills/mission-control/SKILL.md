---
namespace: aiwg
name: mission-control
platforms: [all]
description: Orchestrate multi-loop background operations via the Mission Control dashboard — start sessions, dispatch missions, monitor, and stop
---

# Mission Control

You orchestrate multi-loop background operations using the Mission Control dashboard.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "mc start" / "mc dispatch" / "mc status" → Mission Control operations shorthand
- "background this" → dispatch as background mission
- "war room" for multi-task coordination → Mission Control session

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Background tasks | "run these tasks in the background" | Start session + dispatch |
| Parallel orchestration | "orchestrate X and Y in parallel" | Start session + dispatch each |
| Monitor loops | "monitor background tasks" | `aiwg mc status` or `aiwg mc watch` |
| Start session | "start a mission control session" | `aiwg mc start` |
| Check status | "how are the background tasks doing?" | `aiwg mc status --json` |
| Stop missions | "stop background work" | `aiwg mc stop` |

## Behavior

When triggered:

1. **Determine intent**:
   - Starting new background work → `aiwg mc start` + `aiwg mc dispatch`
   - Checking on existing work → `aiwg mc status`
   - Stopping work → `aiwg mc stop`

2. **For new background orchestration** — Mission Control has a four-step lifecycle: start → dispatch → **run** → status. Missions stay `queued` until `mc run` launches them as ralph loops; status syncs back to mc.session.json automatically when `mc status` or `mc watch` is called.

   ```bash
   # 1. Start a named session (creates the state file)
   aiwg mc start --name "Sprint 4 Construction"

   # 2. Dispatch missions (queues them — does NOT execute)
   #    --completion is REQUIRED; `mc run` will skip missions without one.
   aiwg mc dispatch <session-id> "Fix auth service" --completion "npm test passes" --priority high
   aiwg mc dispatch <session-id> "Add pagination" --completion "all list endpoints paginated"
   aiwg mc dispatch <session-id> "Write integration tests" --completion "coverage > 80%"

   # 3. RUN — drains the queue by launching each mission as a detached ralph
   #    loop. Without this step missions sit in QUEUED forever (#1439).
   aiwg mc run <session-id>

   # 4. Monitor — `mc status` polls each ralph loop's session-state.json and
   #    syncs progress back to mc (queued → running → done|failed|aborted).
   aiwg mc status <session-id>
   aiwg mc watch <session-id>
   ```

3. **For monitoring**:

   ```bash
   # Dashboard view
   aiwg mc status

   # Machine-readable for agent orchestration
   aiwg mc status --json

   # List all sessions
   aiwg mc list
   ```

4. **For lifecycle management**:

   ```bash
   # Pause all running missions
   aiwg mc pause <session-id>

   # Resume paused session
   aiwg mc resume <session-id>

   # Stop (abort all)
   aiwg mc stop <session-id>

   # Stop (let running missions finish, cancel queued)
   aiwg mc stop <session-id> --drain
   ```

5. **Report the result** inline — summarize session state and mission progress.

## Examples

### Example 1: Parallel construction tasks

**User**: "Run these three features in parallel: auth fix, pagination, and test coverage"

**Action**:
```bash
aiwg mc start --name "Parallel Features"
aiwg mc dispatch <id> "Fix auth service" --completion "auth tests pass"
aiwg mc dispatch <id> "Add pagination to list endpoints" --completion "paginated responses"
aiwg mc dispatch <id> "Increase test coverage" --completion "coverage > 80%"
```

**Response**: "Started Mission Control session 'Parallel Features' with 3 missions queued. Use `aiwg mc status` to monitor progress."

### Example 2: Check background progress

**User**: "How are the background tasks doing?"

**Action**:
```bash
aiwg mc status
```

**Response**: "Mission Control 'Parallel Features': 1/3 done, 2 running (auth fix complete, pagination at loop 3/10, coverage at loop 2/10)."

### Example 3: Stop and clean up

**User**: "Stop the background tasks, let running ones finish"

**Action**:
```bash
aiwg mc stop <session-id> --drain
```

**Response**: "Draining session: 1 queued mission cancelled, 2 running missions will complete naturally."

## Clarification Prompts

If the user's intent is ambiguous:

- "Would you like me to start a new Mission Control session, or check on an existing one?"
- "How many parallel missions should I dispatch? (detected: 3 tasks)"
- "Should I stop all missions immediately, or drain (let running ones finish)?"

## References

- @$AIWG_ROOT/src/cli/handlers/mc.ts — Mission Control command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/self-maintenance.md — Self-maintenance rule
