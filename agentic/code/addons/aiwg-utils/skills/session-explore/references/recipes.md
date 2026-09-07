# Session exploration recipes

These recipes use the public sessions CLI. Replace angle-bracket values with
actual authorized identifiers and quote shell arguments. Append the same
`--db <catalog-path>` throughout when using a non-default catalog. Examples
with mutations or forensic authorization are conditional actions, not part of
the default exploration flow. The complete contract is
[Session Catalog CLI](../../../../../../../docs/sessions/cli.md).

## Find a discussion or decision

```sh
aiwg sessions search '"release gate" OR rollback' --workspace <workspace> --limit 50 --json
aiwg sessions search 'timeout*' --workspace <workspace> --provider codex --role assistant --date-from <rfc3339> --date-to <rfc3339> --json
aiwg sessions show <session-id> --workspace <workspace> --json
```

Search supports `--participant` (normalized actor identity), `--role`, `--model`,
`--tool`, `--tag`, `--entity`, `--sensitivity`, and `--extraction-state`.
Filters use normalized fields, not arbitrary provider-native keys. A path or
identifier can be searched as a quoted phrase; it is not automatically a
semantic entity or proof the referenced file exists. Read adjacent events in
`show` to distinguish a suggestion, rejected option, and adopted decision.

## Recover context and compare periods

```sh
aiwg sessions timeline --workspace <workspace> --gap 30m --json
aiwg sessions search 'migration' --workspace <workspace> --date-from <rfc3339> --date-to <rfc3339> --json
```

Timeline has workspace/gap/coverage options, not search's date/provider filters.
Filter its returned segments locally for a period comparison. Preserve absolute
timestamps and boundary confidence; activity spans are not hours billed or
uninterrupted active work. For a handoff, list cited decisions, unfinished tasks,
failures, and the next state checks. Do not resume historical commands automatically.

For provider/model comparisons use matched periods, workspace scope and query
terms. Record coverage, sample sizes, missing normalized fields and truncation.
For comparisons across authorized workspaces, query each workspace separately and
retain workspace identity in every citation; never reuse a cursor across scopes.
Different providers expose different evidence; missing events do not mean fewer
failures. Session IDs and source/import citations are the join keys; titles and
nearby timestamps alone are insufficient to assert identity.

## Diagnose tool behavior and human intervention

```sh
aiwg sessions analytics summary --workspace <workspace> --date-from <rfc3339> --date-to <rfc3339> --json
aiwg sessions analytics tool-calls --workspace <workspace> --group-by tool --json
aiwg sessions analytics tool-calls --workspace <workspace> --session <session-id> --tool <name> --status failed --limit 500 --json
aiwg sessions analytics escalations --workspace <workspace> --status denied --json
aiwg sessions analytics hitl --workspace <workspace> --json
```

Analytics also supports provider, date, actor/participant, tag, sensitivity,
and extraction-state filters. Grouping supports tool/session/provider, not
model or arbitrary fields. Counts include distinct call/result facts and can
be limited; do not label them as complete request totals or prices. Use
normalized call identities and citations when analyzing retries. Match cost
records separately through `cost-history` only when a reliable identity link
exists. Denied/timed-out/unsupported/provider-unknown are separate outcomes.

## Inspect control traffic and forensic evidence

```sh
aiwg sessions search 'bootstrap' --workspace <workspace> --control-events only --json
```

For a user-authorized forensic investigation, each invocation requires the
explicit local authorization flag:

```sh
aiwg sessions forensics timeline <session-id> --workspace <workspace> --authorize-forensics --markdown
aiwg sessions forensics indicators --workspace <workspace> --authorize-forensics --json
aiwg sessions forensics evidence <event-id-or-fact-id> --workspace <workspace> --authorize-forensics --json
```

Timeline can also accept a lexical query; it resolves a bounded set of matching
sessions. Evidence returns bounded normalized metadata, not raw secrets or a
full provider log. Indicators identify observed patterns, not proof of compromise.
Pass evidence IDs and limitations to a forensic workflow when needed. Never add
`--authorize-forensics` merely to get around a denied ordinary query.

## Acquire missing history

Only when importing or refreshing history is within the user's requested scope:

```sh
aiwg sessions discover --workspace <workspace-path> --dry-run --json
aiwg sessions discover --workspace <workspace-path> --json
aiwg sessions import-discovered --workspace <workspace-path> --dry-run --json
aiwg sessions import-discovered --workspace <workspace-path> --confirm --json
```

Discovery writes a manifest unless dry-run. Shared roots require separately
established authorization: `--codex-root`, `--omp-root`, or `--dsh-root` as
applicable. Do not guess those roots or scan the user's whole home. Use
`sources` and the manifest dispositions for provider-specific supported/export
paths. Import the saved manifest exactly; changed content requires a fresh
preview. A missing SQLite runtime has an explicit `features install sqlite`
remediation; follow it when installation is authorized.

For one authorized export:

```sh
aiwg sessions import <file> --source-id <source-id> --provider <provider> --workspace <workspace> --dry-run --json
```

Remove `--dry-run` only for the approved import. Generic exports must use the
versioned interchange. Resume a live or failed batch only according to its
CLI/lease diagnostic; `import-discovered --resume --confirm` resumes the saved
run, while a live foreign-host lease must not be broken.

## Follow pagination and explain gaps

```sh
aiwg sessions list --workspace <workspace> --limit 50 --json
aiwg sessions search 'decision' --workspace <workspace> --limit 50 --json
aiwg sessions audit --workspace <workspace> --limit 50 --json
```

Use each response's own next cursor with unchanged filters. List and search
provide `data.page.nextCursor`; inspect the audit envelope for its cursor. A
new import needs a new traversal if it should enter the result set. Report
coverage status/range/manifest age and pending or rejected sources. Staged
imports and tombstoned sessions cannot appear in search. `doctor` checks catalog
integrity; it cannot prove that all providers' histories were collected.

## Tag, repair, or retire catalog data

These are explicit maintenance tasks, not search fallbacks:

```sh
aiwg sessions tag <session-id> <tag> --workspace <workspace> --dry-run --json
aiwg sessions reindex --workspace <workspace> --dry-run --json
aiwg sessions delete <session-id> --workspace <workspace> --dry-run --json
aiwg sessions restore <session-id> --workspace <workspace> --dry-run --json
```

A search error is not permission to reindex or delete. Follow the full CLI
contract for relocation, purge, and dependent disposition. Tombstones are
reversible; purge is terminal for the AIWG copy and has explicit actor/reason
and dependent-disposition requirements. Neither operation deletes provider
histories. Content-free mutation audit records remain separate from transcript
content and its retention.
