# From Fork to Project-Local

If you're already maintaining a fork of AIWG to inject custom rules,
agents, or skills, project-local bundles let you move that customization
**into your project repository** without giving up the customization or
the upstream sync workflow.

## When to migrate

| Stay on Path B (fork) | Migrate to Path A (project-local) |
|----------------------|-----------------------------------|
| You modify AIWG core (TS source, deploy pipeline, build) | You only add rules / skills / agents / templates |
| Your customizations are generally useful and you contribute most of them upstream | Your customizations are project-specific or team-specific |
| You want to live on bleeding-edge AIWG branches | You're fine with stable npm releases |
| You manage > 5 customized repos via the same fork | You only customize one or a few repos |

If you nodded at the right column more than the left, project-local is
probably the simpler path for the parts of your fork that aren't AIWG
core changes.

## What stays in the fork, what moves to project-local

A typical fork-based customization has three kinds of changes:

| Change | Migrate to project-local? |
|--------|---------------------------|
| New rules under `agentic/code/addons/<your>/rules/` | **Yes** — these are the easiest case |
| New skills under `agentic/code/addons/<your>/skills/` | **Yes** |
| New agents under `agentic/code/addons/<your>/agents/` | **Yes** |
| Edits to existing upstream rules / skills | **Yes, as overrides** — declare them in `manifest.json` `overrides:` |
| Edits to AIWG TypeScript source (`src/`) | **No** — keep in fork or PR upstream |
| New CLI commands | **No** — extend AIWG itself |
| Build / deploy pipeline changes | **No** |

The first four categories are exactly what `.aiwg/{extensions,addons,frameworks,plugins}/<name>/`
bundles are for. The last three need the fork.

You can mix: keep the fork for AIWG core changes, **and** use
project-local bundles in your repo for everything else. The two compose
cleanly.

## Migration walkthrough

Suppose your fork adds an addon `agentic/code/addons/my-team-helpers/`
with a couple of rules and a skill. Here's how to move it to
project-local in your project.

### 1. Scaffold an empty project-local addon

In your project (not your AIWG fork):

```bash
aiwg new-bundle my-team-helpers --type addon
```

This creates `.aiwg/addons/my-team-helpers/` with a valid manifest +
README + starter skill.

### 2. Copy your fork's content over

The directory structure is identical — copy file-for-file:

```bash
cp -r /path/to/your-fork/agentic/code/addons/my-team-helpers/rules \
      .aiwg/addons/my-team-helpers/

cp -r /path/to/your-fork/agentic/code/addons/my-team-helpers/skills \
      .aiwg/addons/my-team-helpers/

# Replace the scaffold's manifest with your fork's manifest:
cp /path/to/your-fork/agentic/code/addons/my-team-helpers/manifest.json \
   .aiwg/addons/my-team-helpers/
```

Because the on-disk layout is **byte-identical** between project-local
and upstream ([identical-form ADR](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/adr-identical-form-portability.md)),
no rewrite is needed.

### 3. Audit `@-references`

Open the rules and skills you copied and search for any `@.aiwg/...`
references. Those are project-output references — they only resolve in
the project that contains them. If your fork has any, you'll see them
because the fork's `.aiwg/` is the AIWG repo's own dogfooding output.

```bash
grep -r "@\.aiwg/" .aiwg/addons/my-team-helpers/
```

If you find any, decide:
- **Replace with `@$AIWG_ROOT/...`** if the reference points at upstream content
- **Leave it** if the reference is intentionally project-output (the bundle reads project artifacts)

The promote pre-flight refuses dangling `@.aiwg/` refs; project-local
deploy doesn't care.

### 4. Validate

```bash
aiwg doctor --project-local
```

Should report 0 validation errors. If anything fails, see
[Troubleshooting](project-local-troubleshooting.md).

### 5. Deploy and compare

```bash
aiwg use my-team-helpers
diff -r /path/to/your-fork/.claude/rules .claude/rules
diff -r /path/to/your-fork/.claude/skills .claude/skills
```

Files should match. If they don't, something in the bundle differed
from your fork — fix it.

### 6. Switch off the fork (for this project)

If you were running `aiwg --use-dev` to point at your fork, switch back
to stable:

```bash
aiwg --use-stable
aiwg use sdlc      # re-deploy upstream from npm
aiwg use my-team-helpers   # re-deploy your project-local addon
```

Both deploy together. Project-local artifacts shadow upstream cleanly.

### 7. Decide what to do with the fork

You have three reasonable options:

1. **Keep the fork** if you're still using it for AIWG core changes
2. **Archive the fork** if all your customization moved to project-local
3. **PR the addon back upstream** if it's generally useful — `aiwg promote my-team-helpers` graduates the project-local bundle to upstream form, then file a PR

## Per-repo migration

If you have many repos that all use the same forked addon, each repo
needs its own project-local copy. Three patterns:

### A. Manual per-repo copy

Best for ≤ 3 repos. Copy the bundle into each repo's `.aiwg/`. Each
repo's manifest can drift independently if needed.

### B. Corpus path (Path C)

Promote the bundle to a corpus path once, then point each repo's
`aiwg.config` at the corpus. The bundle lives in one place and updates
propagate.

```bash
aiwg promote my-team-helpers --to corpus ~/team-corpus/
```

In each repo's `aiwg.config`, register the corpus source. Updates to
the corpus apply on next `aiwg refresh` per repo.

### C. Git submodule

Add a submodule under `.aiwg/addons/` pointing at a private repo
containing the bundle. Heavier than a corpus path; better when you
want explicit version pinning per repo.

## Sync drift between fork and project-local

If you keep the fork as the canonical source of the addon and re-copy
into project-local from time to time, watch for:

- **Manifest version drift** — bump the version in both places when you
  publish a change
- **Schema additions** — if AIWG's manifest schema gains a required
  field, both copies need it
- **Hash drift** — `aiwg doctor --project-local` will report drift on
  the deployed files until you re-run `aiwg use` after the copy

The cleanest workflow is to pick **one** source of truth (either fork
or project-local) and not maintain both indefinitely.

## See also

- [Customization README](README.md) — Path A / B / C overview
- [Lifecycle reference](project-local-lifecycle.md)
- [Fork workflow](fork-workflow.md) — Path B specifics
- [Identical-form ADR](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/adr-identical-form-portability.md) — why copies just work
