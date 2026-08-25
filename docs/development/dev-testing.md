# Dev Testing with `--use-dev`

> **Just want to customize AIWG for your own use?** That's a different (simpler) path — see [Make AIWG Yours](../customization/README.md). The Steward handles it end-to-end. This document is for contributors testing framework changes.

Test local framework changes by pointing the installed `aiwg` CLI at your development repository.

## Quick Start

```bash
# Switch to dev mode (uses this repo as framework source)
aiwg --use-dev

# Deploy from local source to verify changes
aiwg use all

# Check that dev mode is active
aiwg version

# Switch back to npm-installed package
aiwg --use-stable
```

## How It Works

`--use-dev` sets the channel config to `edge` with the `edgePath` pointing at the local repo root instead of the default `~/.local/share/ai-writing-guide` clone location. The existing `getFrameworkRoot()` function reads `edgePath` and returns it when channel is `edge`, so all framework operations (`aiwg use`, `aiwg list`, etc.) source from local files.

A `devMode: true` flag is also set in the config so `aiwg version` can distinguish dev mode from a regular edge install.

## Typical Workflow

1. Make changes to framework source (e.g., add a new skill in `agentic/code/`)
2. Run `aiwg --use-dev` to point at local repo
3. Run `aiwg use all` (or `aiwg use sdlc`, etc.) to deploy
4. Verify artifacts deployed correctly (check `.claude/skills/`, `.claude/agents/`, etc.)
5. Run `aiwg --use-stable` when done testing

## Verifying New Artifacts

After `aiwg use all`, check that your new artifacts appear:

```bash
# List deployed skills
ls .claude/skills/

# List deployed agents
ls .claude/agents/

# List deployed rules
ls .claude/rules/

# List deployed commands
ls .claude/commands/
```

## Storage backend conformance

Changes to scalable storage contracts, graph backends, or migration behavior
should run the common zero-service gate:

```bash
npm run test:conformance:storage
```

It executes the versioned golden dataset across the available JSON,
Graphology, and SQLite implementations, then runs backend-contract and
migration-protocol tests. Remote database/server certification is separate and
must run in a declared integration job against the corresponding adapter; a
local engine smoke test alone is not backend certification.

## Channel Comparison

| Flag | Channel | Source | Use Case |
|------|---------|--------|----------|
| `--use-stable` | stable | npm package | Normal usage |
| `--use-main` | edge | GitHub clone | Bleeding-edge updates |
| `--use-dev` | edge (dev) | Local repo | Testing local changes |
