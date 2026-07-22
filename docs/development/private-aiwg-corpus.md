# Private AIWG Corpus

AIWG's own project `.aiwg` corpus is maintained outside the public product
repository.

## Boundary

| Repository | Owns |
|---|---|
| `roctinam/aiwg` | Product code, public docs, public package/release workflows, provider bootstrap files |
| `roctinam/aiwg-web-release-ops` | Private `.aiwg` SDLC corpus, web-release repackaging plans, release-host operations, entitlement/monetization design |

The private corpus path is:

```text
../aiwg-web-release-ops/corpus/.aiwg
```

That relative path assumes adjacent local checkouts:

```text
~/dev/aiwg/
~/dev/aiwg-web-release-ops/
```

## Maintainer Setup

Public clones can build and test AIWG without private corpus access. Maintainers
who need AIWG SDLC workflows should point the CLI at the private corpus:

```bash
source aiwg-artifacts.env.example
aiwg config show --project
```

or set the path directly:

```bash
export AIWG_ARTIFACTS_PATH=../aiwg-web-release-ops/corpus/.aiwg
```

`AIWG_ARTIFACTS_PATH` points at the artifact directory itself. It can be
absolute, project-relative, or `~/`-relative.

## Migration Checkpoint

The initial corpus transfer copied the tracked public `.aiwg` tree from commit
`2f614c2c49b52cec2017530eb372e4cb28ff23f3` into the private repository.

The private migration manifest is:

```text
corpus/.aiwg/migration-manifest-2026-07-22.md
```

## Development Rules

- Do not commit AIWG's private `.aiwg` corpus to the public repo.
- Do not commit private release-host credentials or entitlement provider
  secrets to either repo.
- Keep public operator-facing docs in `docs/`.
- Keep monetization-sensitive ADRs, private CI topology, entitlement design, and
  release-host deployment details in `roctinam/aiwg-web-release-ops`.
- Use `AIWG_ARTIFACTS_PATH` for local maintainer sessions instead of symlinks or
  git submodules.
