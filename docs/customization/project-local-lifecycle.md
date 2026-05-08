# Project-Local Artifact Lifecycle

Reference for managing project-local artifacts across all four bundle
types over their full lifetime: discovery → deploy → conflict resolution
→ inspection → graduation → removal.

## Layout

```
.aiwg/
├── extensions/<id>/    # Single-capability bundles
├── addons/<id>/        # Focused feature packs
├── frameworks/<id>/    # Complete workflow domains
└── plugins/<id>/       # Marketplace-packaged bundles
```

Each `<id>/` contains a `manifest.json` plus the artifacts (skills/,
rules/, agents/, commands/). The directory is **byte-identical** in
shape to its upstream counterpart at `agentic/code/{addons,frameworks}/`
so `aiwg promote` is a copy, not a migration.

## Lifecycle commands

| Command | Action |
|---------|--------|
| `aiwg new-bundle <name>` | Scaffold a new bundle with manifest + starter + README |
| `aiwg use <name>` | Deploy a single project-local bundle to configured providers |
| `aiwg use <framework>` | Deploys upstream + auto-deploys all project-local bundles |
| `aiwg list --project-local` | List discovered bundles + validation status |
| `aiwg doctor --project-local` | Health check: counts, validation, shadows, drift, matrix |
| `aiwg remove <name>` | Revert deployed files; preserves source under `.aiwg/` |
| `aiwg promote <name>` | Graduate a bundle to upstream or a corpus path |
| `aiwg activity-log show` | Audit the lifecycle event log |

## Discovery

`aiwg use`, `aiwg doctor`, and `aiwg list --project-local` all run the
same discovery scanner. It walks `.aiwg/{extensions,addons,frameworks,plugins}/`,
validates each `manifest.json` against the canonical Zod schema, and
returns structured results.

What discovery enforces:
- Manifest matches the JSON Schema (kebab-case ids, ≤ 64 KB, ≤ 200
  bundles per project)
- Bundle type matches its parent directory (`type: extension` lives
  under `extensions/`)
- No symlinked bundle directories (refused per threat model #1042)
- No case-collision ids within the same type
- Path-traversal attempts in entry paths are refused

Validation errors are surfaced — they never crash the operation.

## Deploy

`aiwg use <bundle-name>` deploys a specific project-local bundle.
`aiwg use <framework>` (e.g., `sdlc`) deploys the upstream framework
**and** all project-local bundles in the same pass.

Per-bundle deploy:
1. Resolve shadows against the upstream registry
2. Refuse to deploy bundles with safety-critical shadows that lack
   explicit `overrides:` declarations (or with phantom overrides, or
   with cross-bundle artifact-id collisions)
3. Run `tools/agents/deploy-agents.mjs` with `--source` pointing at the
   bundle directory
4. Compute SHA-256 of every artifact and persist as `artifactHashes`
   in the registry — used later by `aiwg remove` and `aiwg doctor` for
   drift detection
5. Emit `deploy` (or `deploy-failed`) to the activity log

`--dry-run` and `--no-project-local` are supported.

## Conflict resolution (shadow policy)

When a project-local artifact has the same id as an upstream artifact,
the resolver chooses one of seven verdicts ([ADR #1041](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/adr-override-shadow-policy.md)):

| # | Case | Default | `--force`? |
|---|------|---------|-----------|
| 1 | No collision | deploy | n/a |
| 2 | Non-safety-critical shadow | deploy + warn | n/a |
| 3 | Safety-critical shadow + explicit `overrides:` | deploy with prominent warning | n/a |
| 4 | Safety-critical shadow without `overrides:` | refuse | refuse (force does NOT bypass) |
| 5 | Phantom override (`overrides: ["nonexistent"]`) | refuse | refuse |
| 6 | Two project-local bundles export same artifact | refuse both | refuse both |
| 7 | Git-installed (cache) shadow | same as cases 2/3/4 against the cache | n/a |

To shadow a safety-critical upstream artifact intentionally, declare it:

```json
{
  "type": "extension",
  "id": "my-overrides",
  "overrides": ["human-authorization"],
  ...
}
```

The override is logged as `shadow-acknowledged` in the activity log and
prominently warned in deploy output and `aiwg doctor`.

## Inspection: `aiwg doctor`

```bash
aiwg doctor                       # general health + project-local section
aiwg doctor --project-local       # only the project-local section
aiwg doctor --quiet               # suppress informational subsections
```

The project-local section reports:
- Per-type counts with bundle id listing
- Validation errors (top 10 inline, "+N more" if longer)
- Active shadows (informational ⚠ for non-safety, !! for acknowledged)
- Denylist violations (✗)
- Drift — deployed file hash differs from registered `artifactHashes`
- Provider deployment matrix

Doctor exits **0** when there are no validation errors, no denylist
violations, and no drift. Shadows alone do not fail doctor (they're
informational).

## Removal: `aiwg remove`

```bash
aiwg remove <name>                          # default: refuse case-2 mutations
aiwg remove <name> --force                  # also delete operator-edited files
aiwg remove <name> --provider claude        # limit to one provider
aiwg remove <name> --dry-run                # plan only
aiwg remove <name> --keep-registry          # revert files but keep entry
```

Source under `.aiwg/<type>/<name>/` is **never deleted** by `aiwg
remove`. `--force` skips the case-2 prompt only — it does **not**
authorize destroying another bundle's deploy (case 4) and does **not**
bypass OS permission errors (case 5).

For the full per-case revert behavior, see [`design-aiwg-remove-revert.md`](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/design-aiwg-remove-revert.md).

## Graduation: `aiwg promote`

When a bundle proves out and you want to move it from project-local to
upstream (or to a private corpus path):

```bash
aiwg promote <name>                          # default: --to upstream
aiwg promote <name> --to corpus ~/my-corpus/ # to a private path
aiwg promote <name> --dry-run                # preview
aiwg promote <name> --cleanup                # remove .aiwg source after copy
aiwg promote <name> --force                  # override @-ref refusal
```

What promote does:
1. Discovers the bundle
2. Refuses if the destination already exists (must `aiwg remove` from
   upstream first)
3. Refuses if the bundle contains `@.aiwg/` references (they'd dangle
   after the move) — `--force` overrides
4. SHA-256 snapshots every source file
5. Recursive copy to the destination (`agentic/code/addons/<name>/` for
   extension/addon/plugin, `agentic/code/frameworks/<name>/` for framework)
6. Re-hashes every destination file; rolls back (deletes the dest
   directory) on any mismatch
7. Updates the registry: `source: 'project-local'` → `'bundled'` (or
   `'corpus'`)
8. Optionally removes the `.aiwg/<type>/<name>/` source (`--cleanup`)
9. Emits `promote` (or `promote-failed`) to the activity log

The hash-verify step makes the identical-form invariant a runtime
guarantee, not a convention.

## Activity log

Every project-local lifecycle event writes a single line to
`.aiwg/activity.log` in the canonical format:

```
## [YYYY-MM-DD HH:MM] <op> | <event>: <name>:<type> | <summary>
```

The 12 events:
- `discover` — new manifest detected (deduped)
- `deploy`, `deploy-failed`
- `conflict`, `shadow-acknowledged`, `shadow-refused`
- `remove`, `remove-mutated`, `remove-conflict`, `remove-force`
- `promote`, `promote-failed`

Query:
```bash
aiwg activity-log show              # full log
aiwg activity-log stats             # counts by op
```

Writes are non-blocking: if the log can't be written, the underlying
operation still succeeds.

## When project-local is the wrong answer

Project-local is the right answer for **personal or single-team
customization that you want to graduate later or never share**. It is
the wrong answer for:

- Customizations destined for the public AIWG marketplace — author
  upstream and use a plugin
- Cross-project customizations shared across many of your repositories —
  use a corpus path with `aiwg promote --to corpus <path>` and reference
  via aiwg config
- Forking AIWG itself — only when you need to change AIWG core, not when
  you're adding addons/extensions

For the migration story, see the [forking guide](fork-workflow.md).

## See also

- [Quickstart](project-local-quickstart.md) — first bundle in 5 minutes
- [Type disambiguation](extensions-vs-addons-vs-frameworks-vs-plugins.md) — which type to author
- Design: [`design-aiwg-remove-revert.md`](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/design-aiwg-remove-revert.md)
- Design: [`design-doctor-log-promote.md`](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/design-doctor-log-promote.md)
- ADR: [`adr-identical-form-portability.md`](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/adr-identical-form-portability.md)
