# Schema Governance

First-class schema discovery, authoring, validation, evolution, and SDLC normalization.

This addon gives people a task-oriented surface over `aiwg schema`. Users do
not need to understand schema theory: `schema-intake` recognizes when structured
data needs a contract, `schema-author` creates it, and `schema-review` proves it
is cataloged, compatible, tested, and safe. The SDLC framework consumes the same
skills and treats persistent or exchanged structured data as schema-bearing by
default.

## Use

```bash
aiwg use schema-governance
aiwg discover "define data shape"
aiwg discover "change an existing schema"
aiwg schema list
```

## Operating model

- `schema-steward` is the approachable entry point and routes the work.
- `schema-architect` owns identity, authority, lifecycle, and evolution design.
- `schema-reviewer` independently checks correctness and projection drift.
- `schema-lifecycle` covers discovery through publication.
- `schema-change` covers compatibility-aware evolution and migration.
- `schema-first` makes the safe default automatic while preserving an explicit,
  reviewed opt-out for truly ephemeral or unconstrained values.
