# `aiwg schema`

The schema command discovers and operates on cataloged contracts.

```text
aiwg schema list [--domain ID] [--lifecycle STATE] [--format FORMAT]
aiwg schema show ID|NAME@VERSION|PATH
aiwg schema graph [ID] [--direction dependencies|dependents|both]
aiwg schema policy --effective ID
aiwg schema validate --schema ID INSTANCE.json
aiwg schema lint
aiwg schema check-refs
aiwg schema diff ID|PATH --against ID|PATH
aiwg schema compatibility ID|PATH --against ID|PATH
aiwg schema generate [ID] [--write]
aiwg schema verify-projections [ID]
```

All successful and failed operations return stable JSON envelopes. Validation is
offline and bounded; a missing catalog identity, unresolved dependency, remote
reference, projection drift, or resource-limit violation is reported as a stable
diagnostic code with a non-zero exit status.
