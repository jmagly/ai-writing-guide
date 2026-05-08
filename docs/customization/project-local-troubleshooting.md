# Project-Local Troubleshooting

Common failures and how to fix them. Pair with `aiwg doctor --project-local`
which surfaces most of these automatically.

## Manifest validation errors

### "Bundle in .aiwg/extensions/ must declare type: \"extension\""

The manifest's `type` field must match the parent directory it lives in.
A bundle under `.aiwg/extensions/foo/` must declare `"type": "extension"`,
not `"addon"` or `"framework"`.

**Fix:** edit the `type` field, or move the bundle to the matching
directory:

```bash
mv .aiwg/extensions/foo .aiwg/addons/foo   # if you meant addon
```

### "kebab-case alphanumeric, no leading/trailing hyphen"

Bundle ids must match `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`.

| Rejected | Why | Fix |
|----------|-----|-----|
| `Foo` | uppercase | `foo` |
| `foo_bar` | underscore | `foo-bar` |
| `-foo` / `foo-` | leading/trailing hyphen | `foo` |
| `café` | non-ASCII | `cafe` |

### "type 'addon' requires addonConfig"

Each bundle type requires its matching nested config block:

| `type` | Required block |
|--------|----------------|
| `addon` | `addonConfig` |
| `framework` | `frameworkConfig` |
| `plugin` | `pluginConfig` |
| `extension` | `extensionConfig` (optional — extensions may omit) |

**Fix:** add the missing block. The simplest valid stubs:

```jsonc
"addonConfig":     { "entry": { "skills": "skills/" } }
"frameworkConfig": { "path": "src/" }
"pluginConfig":    { "payloadType": "addon", "payloadPath": "payload/" }
```

Or scaffold a fresh bundle and copy the structure: `aiwg new-bundle <name> --type <type>`.

### "<= 64 KB" / "<= 200 bundles per project"

The threat model ([#1042](https://github.com/jmagly/aiwg/blob/main/.aiwg/security/threat-model-project-local-artifacts.md))
sets DoS limits. If you're hitting these you almost certainly want one
of:

- A single addon containing many artifacts, instead of many tiny extensions
- Compressing your manifest (the schema doesn't need verbose comments)
- Filing a fresh issue if your real use case needs higher limits

### "must be a relative path (no leading slash, no ..)"

Path-traversal is refused at validation time. Entry paths
(`addonConfig.entry.skills`, `frameworkConfig.path`,
`pluginConfig.payloadPath`) must be relative paths under the bundle.

**Rejected:** `../../etc/foo`, `/abs/path`, `safe/../escape`
**Fix:** use a clean relative path: `skills/`, `src/`, `payload/`.

## Shadow / override warnings

### "Refused to shadow safety-critical upstream..."

Your bundle exports an artifact with the same id as an upstream
**safety-critical** artifact. AIWG refuses to deploy without an explicit
acknowledgement.

**Fix (intentional override):** add the artifact id to your manifest's
`overrides` array:

```json
{
  "id": "my-overrides",
  "type": "extension",
  "overrides": ["human-authorization"],
  ...
}
```

Re-deploy: `aiwg use my-overrides`. The override is logged as
`shadow-acknowledged` in `.aiwg/activity.log` and surfaced prominently
in `aiwg doctor`.

**Fix (accidental):** rename your artifact id so it doesn't collide.

### "Phantom override: 'X' declared in manifest.json but no upstream artifact has that id"

The id in your `overrides` array doesn't match any upstream artifact.
Either you typo'd, the upstream artifact was renamed, or you're
declaring overrides defensively for things that don't exist.

**Fix:** remove the phantom entry, or correct the id.

### "Duplicate project-local <type> 'X' also exported by: <other-bundle>"

Two of your project-local bundles each export an artifact with the same
type+id. AIWG refuses both — there's no winner.

**Fix:** rename the artifact in one of the bundles, or delete the duplicate.

## Drift detection

### "Drift (N): foo :: rules/r1.md @ claude (deployed file differs from source)"

The deployed file at the provider path has a different SHA-256 than the
source `.aiwg/<type>/<name>/rules/r1.md` recorded at deploy time. This
usually means:

- An operator hand-edited the deployed file (most common)
- Another tool overwrote it
- The source file changed since the last `aiwg use`

**Fix:** re-deploy to overwrite the deployed file with the current source:

```bash
aiwg use <bundle-name>
```

Or, if you want to keep the deployed edits and discard the bundle source,
copy them back:

```bash
cp .claude/rules/r1.md .aiwg/extensions/<bundle>/rules/r1.md
aiwg use <bundle-name>   # re-records artifactHashes
```

### "(some entries lack artifactHashes — re-run aiwg use to record)"

Older deploys don't have `artifactHashes` recorded. The drift detector
can't run on those entries until they're re-deployed.

**Fix:** `aiwg use <bundle>` to refresh the registry entry with hashes.

## Remove failures

### "Refused: bundle already exists at .aiwg/extensions/foo/" (from new-bundle)

You can't scaffold over an existing bundle.

**Fix:** pick a different name, or remove the existing one first:

```bash
aiwg remove foo            # revert any deploys
rm -rf .aiwg/extensions/foo  # remove source (you have to do this explicitly)
aiwg new-bundle foo
```

### "Some artifacts skipped (see above). Use --force to override mutation refusal."

`aiwg remove` detected operator-edited deployed files (case 2 from the
[design](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/design-aiwg-remove-revert.md)) and
refused to delete them by default to avoid losing your edits.

**Fix (you really want them gone):**

```bash
aiwg remove <bundle> --force
```

The `.aiwg/<type>/<name>/` source is still preserved — `--force` only
overrides the case-2 prompt, not the source-preservation invariant.

### "owned by '<other-bundle>' — refusing to delete"

The deployed file at the path your bundle would target is registered as
owned by another project-local bundle. AIWG refuses to delete content
that belongs to another bundle, even with `--force`.

**Fix:** if you really want to take ownership, `aiwg remove <other-bundle>`
first, then `aiwg remove <your-bundle>`.

## Promote failures

### "destination-exists: 'agentic/code/addons/foo' already exists"

`aiwg promote` refuses to overwrite. Either you've promoted this bundle
before, or the upstream has an unrelated artifact with the same id.

**Fix:** remove the destination first, then re-promote:

```bash
# If the destination is a previous promotion of yours:
rm -rf agentic/code/addons/foo
aiwg promote foo

# If it's an upstream artifact with the same id, rename your bundle:
mv .aiwg/extensions/foo .aiwg/extensions/my-foo
aiwg promote my-foo
```

### "project-local-references: rules/r1.md, +2 more"

Your bundle contains `@.aiwg/...` references that would dangle once the
bundle moves to upstream (where `.aiwg/` is the project-output dir, not
a bundle-source dir).

**Fix (preferred):** edit the references to use upstream-safe paths:
`@$AIWG_ROOT/...` for upstream content, or in-bundle relative paths.

**Fix (escape hatch):** `aiwg promote <name> --force` — promotes anyway,
but the references will be broken in the destination. Only useful when
you plan to fix them up after the copy.

### "hash mismatch on rules/r1.md after copy. Rolled back."

The copy step succeeded but the SHA-256 of the destination didn't match
the source. AIWG rolled back the destination directory. This shouldn't
happen on a normal filesystem — usually it means another process wrote
to the destination during the copy.

**Fix:** investigate concurrent writes (e.g., a watcher script, another
shell session). Re-run promote once the source is undisturbed.

## Activity log issues

### "activity-log auto-append failed (non-fatal): ..."

The lifecycle event couldn't be written to `.aiwg/activity.log`. This is
non-blocking — your operation still succeeded. Common causes:

- Read-only filesystem
- `.aiwg/` directory permissions
- Storage backend misconfigured

**Fix:** `aiwg storage show` to see the configured backend; check write
permissions on `.aiwg/`.

### Discover events spam the log

`emitDiscoverEventsDeduped` deduplicates against the recent log tail by
`(name, type)` to prevent this. If you're still seeing duplicates:

- Your bundle id changed, so the dedupe key changed
- The log was rotated or truncated

Both are fine — the log will stabilize after the next round of normal
operations.

## See also

- [Lifecycle reference](project-local-lifecycle.md) — full operator surface
- [Remove revert design](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/design-aiwg-remove-revert.md) — case-by-case behavior
- [Doctor + log + promote design](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/design-doctor-log-promote.md)
- [Type disambiguation](extensions-vs-addons-vs-frameworks-vs-plugins.md)
