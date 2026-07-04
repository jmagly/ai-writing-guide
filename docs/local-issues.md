# Local Issues

AIWG can keep a project-local issue tracker under `.aiwg/issues/` for projects that do not use Gitea or GitHub as the working tracker. The local tracker is a Git-friendly store: issue bodies live in markdown files, event metadata lives in JSONL files, and indexes are rebuildable.

During agent-led project setup, the assistant may use
`aiwg setup project --issue-provider local` to configure `.aiwg/aiwg.config` so
issue operations route to the local store by setting `remotes.issue_tracker` to
`local`. This does not migrate external issues by itself; use the import/export
commands below for explicit migration or synchronization work.

## Layout

```text
.aiwg/issues/
├── config.json
├── next-id
├── items/
│   └── ISSUE-0001.md
├── events/
│   ├── ISSUE-0001.jsonl
│   └── bodies/
│       └── evt-....md
├── index/
│   └── issues.index.json
└── locks/
```

The canonical files are `items/` and `events/`. The `index/` directory is a cache and can be rebuilt with `aiwg issue index rebuild`.

## Basic Commands

```bash
aiwg issue init --prefix PROJECT
aiwg issue new --title "Fix import flow" --body-file issue.md
aiwg issue list --status open --search import
aiwg issue show PROJECT-0001 --comments last:10
aiwg issue comment PROJECT-0001 --body "Started"
aiwg issue close PROJECT-0001 --reason "Done"
aiwg issue index rebuild
```

`aiwg issue list` can filter by status, label, type, priority, assignee, and
search text. `issue-audit --provider local` and `address-issues --provider
local` consume bounded slices from the same provider instead of reading the
whole backlog.

## Fortemi Core Migration Note

Local issue search remains served by the local issue provider in the Fortemi
Core migration preview. The rebuildable `.aiwg/issues/index/issues.index.json`
cache is still the source for `aiwg issue list --search` and related filters.
`aiwg issue` commands intentionally do not accept `--backend fortemi-core`; use
the local issue provider for issue operations and use `aiwg index` commands for
artifact-index Fortemi Core queries.
Fortemi exports may include `aiwg.issue` records if a later ADR joins local
issues into the shared artifact index, but this does not change the local issue
CLI contract or require a Fortemi backend for issue operations.

## Import And Export

Use snapshots to move issue state between local issues and external trackers:

```bash
aiwg issue import --from gitea --snapshot-file gitea-1463.json
aiwg issue import --from github --snapshot-file github-42.json
aiwg issue export PROJECT-0001 --to gitea --out project-0001.gitea.json
aiwg issue export PROJECT-0001 --to github --out project-0001.github.json
```

Use `--live` when the CLI should read from or write to the provider API directly instead of a snapshot file:

```bash
AIWG_GITEA_TOKEN=... aiwg issue import --from gitea --live --repo org/repo --external-id 1463
GITHUB_TOKEN=... aiwg issue import --from github --live --repo org/repo --external-id 42
AIWG_GITEA_TOKEN=... aiwg issue export PROJECT-0001 --to gitea --live --repo org/repo
GITHUB_TOKEN=... aiwg issue export PROJECT-0001 --to github --live --repo org/repo
```

Live export creates an external issue when the local issue has no matching `source.external_id`. If the local issue already points at the target provider, live export fetches the remote issue first and refuses to mutate when conflicts are present. Review conflicts with `aiwg issue sync conflicts` or pass `--force` only after choosing the local version as the winner. Posted comments are mapped back to local event metadata automatically.

An imported snapshot preserves the external issue ID and URL in the issue frontmatter:

```yaml
source:
  provider: gitea
  external_id: "1463"
  external_url: https://git.example.test/org/repo/issues/1463
links:
  external:
    - https://git.example.test/org/repo/issues/1463
```

Imported comments keep their external comment IDs on local event metadata. Exported comments include local event IDs so a later posting step can map external comment IDs back to local events.

```bash
aiwg issue sync map-comments PROJECT-0001 --map-file comment-map.json
```

`comment-map.json` is an array:

```json
[
  {
    "local_event_id": "evt-local",
    "external_comment_id": "51710"
  }
]
```

## Conflict Reports

Before any two-way sync mutates either side, generate and inspect a conflict report:

```bash
aiwg issue sync conflicts PROJECT-0001 --snapshot-file gitea-1463.json --out conflicts.json
```

The report compares local and external title, body, status, labels, and mapped comment bodies. A non-empty `conflicts` array means an operator or higher-level sync policy must choose the winner before writing changes.

## Backup Guidance

For local-only issue work, commit or stash canonical issue files before bulk operations:

```bash
git status -- .aiwg/issues
git add .aiwg/issues/items .aiwg/issues/events .aiwg/issues/config.json .aiwg/issues/next-id
git commit -m "backup local issue state before sync"
```

For one-off backups outside Git, archive the canonical files and skip transient locks:

```bash
zip -r aiwg-issues-backup.zip .aiwg/issues -x ".aiwg/issues/locks/*"
```

Do not store external tracker API tokens in `.aiwg/issues/`, `.aiwg/aiwg.config`, or snapshot files. Keep credentials in environment variables, the OS credential store, or provider-specific CLI configuration. Live sync reads `AIWG_GITEA_TOKEN` or `GITEA_TOKEN` for Gitea, and `AIWG_GITHUB_TOKEN` or `GITHUB_TOKEN` for GitHub. Use `--api-url` for non-default Gitea or GitHub Enterprise API endpoints.

## Git Conflict Guidance

Resolve conflicts by preserving canonical records first:

- `items/ISSUE-0001.md`: keep valid YAML frontmatter, then merge the markdown body normally.
- `events/ISSUE-0001.jsonl`: preserve every complete JSON line from both sides unless the same event ID appears twice.
- `events/bodies/*.md`: keep body files referenced by surviving JSONL events.
- `config.json` and `next-id`: keep the highest observed `next` value so IDs are not reused.
- `index/*`: rebuild after resolving canonical files.

After conflict resolution:

```bash
aiwg issue index rebuild
aiwg issue list --status open
```

If an event line is damaged, recover the body file first, then recreate the event as a new comment rather than hand-editing an uncertain event ID.
