# DeepSeek Harness session import

AIWG imports native, uncompressed DeepSeek Harness `session.v2.jsonl` files.
Discovery is opt-in and bounded to an explicitly authorized root:

```bash
aiwg sessions discover --workspace . --dsh-root "$DSH_HOME/sessions"
aiwg sessions import-discovered --workspace . --confirm
```

Harness stores sessions below a normalized-working-directory directory and a
session-id directory. The importer validates the v2 header, requires contiguous
unique event sequence numbers, checks cursor record boundaries, and applies the
shared record, file, and discovery limits. Symlinks and paths outside the
authorized root are refused.

User and final assistant text are retained. Request headers/context, tool
arguments/results, reasoning blocks, and unknown plugin events are redacted by
default; unknown types remain represented as opaque events. Parent-session,
delegation-depth, preset, turn, step, route, and model topology is preserved as
native metadata. `turn/end` becomes a high-confidence activity boundary.

The upstream default may write `session.v2.jsonl.zstd` as checksummed,
concatenated Zstd frames. AIWG deliberately does not guess at or shell out for
decompression. Use `.dsh/aiwg.cordis.patch.yml` to produce raw JSONL for new
runs, or create a reviewed raw export before import.

Verification fixtures exercise valid v2 input, malformed records, unknown
schema majors, redaction, stable event identifiers, and authorization failures
in `test/fixtures/sessions/deepseek-harness/`.
