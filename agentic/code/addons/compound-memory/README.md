# Compound Memory addon

Governed orchestration for persistent project memory across semantic-memory,
llm-wiki, line-memory, session candidates, and generated artifacts.

```bash
aiwg use compound-memory --provider <provider>
aiwg compound-memory status
aiwg compound-memory capture-output output/report.md \
  --media-type text/markdown \
  --context-pack-id context-pack:<opaque-id> \
  --context-pack-digest sha256:<digest> \
  --source-ref session:<opaque-id> \
  --source-digest sha256:<digest> --json
```

`capture-output` is a two-step operation. Its default mode is a mutation-free
preview. Re-run it with `--confirm --operation-id <preview-operation-id>` to
write the durable registration, derived index entry, and receipt. Registration
records exact minimized lineage but never promotes generated text into the wiki
or line memory; proposed knowledge must pass the independent review workflow.

See [docs/overview.md](docs/overview.md) and the `compound-memory` driver skill.
The addon adds orchestration only; disabling it leaves the underlying wiki and
line-memory data independently usable.
