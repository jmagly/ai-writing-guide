# Compound Memory addon

Governed orchestration for persistent project memory across semantic-memory,
llm-wiki, line-memory, session candidates, and generated artifacts.

```bash
aiwg use compound-memory --provider <provider>
aiwg compound-memory status
```

See [docs/overview.md](docs/overview.md) and the `compound-memory` driver skill.
The addon adds orchestration only; disabling it leaves the underlying wiki and
line-memory data independently usable.
