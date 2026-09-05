# OMP session ingestion

OMP is an experimental, separate session provider. Source verification used
Oh My Pi 18.1.10 at `5964a0f7649275bcde818f20073193fd032451f2`.
The native schema remains version 3 but may start with a mutable 256-byte title
slot before the session header. Pi's header-first parser is not used.

```sh
aiwg sessions import /authorized/session.jsonl --provider omp --source-id omp-example --workspace /project
aiwg sessions discover --workspace /project --omp-root /authorized/profile/sessions
aiwg sessions import-discovered --workspace /project --confirm
```

`--provider-home` also authorizes discovery through the shared OMP path resolver,
including its environment/profile settings. Without an explicitly authorized
home or `--omp-root`, OMP shared session roots are not scanned. Discovery filters
sessions by the header's workspace and uses native session identity to keep
source IDs stable after appends. The manifest still fingerprints exact file
contents for batch import verification.

Native messages, model changes, non-transcript model usage, compactions, branch
summaries and unknown event types retain event IDs, parent IDs and useful
provenance. Header parent-session and previous-file fields retain fork/move
provenance under the standard recursive native-field sanitization policy.
Tool results, custom content, credential pins, subagent initialization content
and unknown payloads are redacted; unknown records retain opaque type/identity
and source offsets for authorized inspection.

Checkpoints exclude only a validated fixed-size title slot from the immutable
prefix digest. Header/event rewrites, truncation and file replacement still
fail with schema drift. Resume rescans through the bounded reader to preserve
absolute event sequences and native header identity, then emits events beyond
the byte cursor. This trades read throughput for deterministic replay. Title
slot contents are presentation metadata; append-only `title_change` records
carry title history into the normalized event stream.

Validation: `npx vitest run test/unit/sessions/omp-adapter.test.ts` exercises
legacy/current layouts, malformed/missing headers, unknown schema versions,
truncated tails, resource/authorization boundaries, Pi isolation, persistent
checkpoint replay, title rewrites, appends, rediscovery and batch import.
Existing OpenRouter live-test session files were also imported successfully:
5 and 8 events respectively, with zero replay receipts. This verification
reads saved sessions and does not perform a model request.
