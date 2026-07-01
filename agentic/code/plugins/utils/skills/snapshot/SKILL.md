---
namespace: aiwg
name: snapshot
platforms: [all]
description: Capture, list, show, or replay point-in-time workflow snapshots so execution state can be preserved and reproduced
---

# Snapshot

You capture, list, show, or replay point-in-time workflow snapshots so that any execution state can be preserved and reproduced exactly.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "freeze this state" → capture a snapshot
- "show me all snapshots" → list snapshots
- "what's in snapshot X" → show snapshot details
- "run from that snapshot" → replay a snapshot
- "save current state" → capture a snapshot

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Capture (named) | "snapshot this as baseline-v1" | Run `aiwg snapshot capture --name baseline-v1` |
| Capture (anonymous) | "take a snapshot" | Run `aiwg snapshot capture` |
| List | "what snapshots exist?" | Run `aiwg snapshot list` |
| Show details | "show snapshot abc123" | Run `aiwg snapshot show abc123` |
| Replay | "replay snapshot baseline-v1" | Run `aiwg snapshot replay baseline-v1` |

## Behavior

When triggered:

1. **Extract intent**:
   - Which subcommand: `capture`, `list`, `show`, or `replay`?
   - Is a name or snapshot ID provided?
   - For replay, does the user want to preview first or go directly?

2. **Run the appropriate subcommand**:

   ```bash
   # Capture — anonymous
   aiwg snapshot capture

   # Capture — named
   aiwg snapshot capture --name <name>

   # List all snapshots
   aiwg snapshot list

   # Show details of a specific snapshot
   aiwg snapshot show <id>

   # Replay from a snapshot
   aiwg snapshot replay <id>
   ```

3. **Snapshot contents**: Each snapshot records:
   - AIWG version at capture time
   - Installed frameworks and their versions
   - Active execution mode and seed
   - Artifact checksums (`.aiwg/` directory)
   - Timestamp and optional name

4. **Storage**: Snapshots are stored in `.aiwg/snapshots/` as JSON files with a short content-addressed ID.

5. **Report the result** — on capture, confirm the snapshot ID and name; on list, summarize available snapshots; on replay, confirm what is being restored.

## Examples

### Example 1: Capture a named snapshot

**User**: "Take a snapshot before we start the architecture phase — call it pre-arch"

**Extraction**: Capture subcommand, name `pre-arch`

**Action**:
```bash
aiwg snapshot capture --name pre-arch
```

**Response**: "Snapshot `pre-arch` captured (ID: `snap_a3f92d`). Recorded AIWG v2026.3.15, 2 frameworks, execution mode `strict`, seed 42, and checksums for 14 artifacts. Stored at `.aiwg/snapshots/snap_a3f92d.json`."

### Example 2: List available snapshots

**User**: "What snapshots do we have?"

**Extraction**: List subcommand

**Action**:
```bash
aiwg snapshot list
```

**Response**:
```
ID            Name           Date                  AIWG Version
snap_a3f92d   pre-arch       2026-03-28 14:22:05   2026.3.15
snap_c71b4e   post-sad       2026-03-29 09:11:42   2026.3.15
snap_00f813   (unnamed)      2026-03-30 16:05:17   2026.3.15
```

### Example 3: Show snapshot details

**User**: "What's in snapshot post-sad?"

**Extraction**: Show subcommand, ID/name `post-sad`

**Action**:
```bash
aiwg snapshot show post-sad
```

**Response**: "Snapshot `post-sad` (ID: `snap_c71b4e`) captured 2026-03-29 09:11:42. AIWG v2026.3.15, frameworks: sdlc-complete v2026.3.15, ring-methodology v2026.3.10. Execution mode: `strict`, seed: 42. 18 artifacts checksummed."

### Example 4: Replay a snapshot

**User**: "Replay from pre-arch"

**Extraction**: Replay subcommand, name `pre-arch`

**Action**:
```bash
aiwg snapshot replay pre-arch
```

**Response**: "Restoring from snapshot `pre-arch` (snap_a3f92d). AIWG v2026.3.15 verified. Execution mode reset to `strict`, seed 42. Artifact state restored. Ready to re-run the workflow from this point."

## Clarification Prompts

If the user's intent is ambiguous:

- "Should I capture a new snapshot, list existing ones, or replay a specific one?"
- "Which snapshot would you like to replay? Run `aiwg snapshot list` to see what's available."

## References

- @$AIWG_ROOT/src/cli/handlers/subcommands.ts — Snapshot command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/checkpoint/SKILL.md — Lightweight mid-workflow checkpoints (compare to snapshots)
