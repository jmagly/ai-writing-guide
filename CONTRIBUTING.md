# Contributing

## Manifests and READMEs

We maintain a `manifest.json` and a README/manifest.md in every directory to help agents and humans
quickly understand contents without extra tooling.

- Add or update files? Update the directory's `manifest.json`.
- Need help? Use the generator:
  - `node tools/manifest/generate-manifest.mjs <dir> [--write-md]`
- Validate manifests before pushing:
  - `node tools/manifest/check-manifests.mjs`

## Optional pre-commit hook

Create `.git/hooks/pre-commit`:

```bash
#!/usr/bin/env bash
node tools/manifest/check-manifests.mjs || exit 1
```

Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

## Markdown Lint

Run `npm exec markdownlint-cli2 "**/*.md"` (Node ≥18) before PRs.

## Scope

- Keep SDLC templates under `docs/sdlc/templates/`
- Keep shared agents under `docs/agents/` (SDLC subset in `docs/agents/sdlc/`)
- Keep shared commands under `docs/commands/` (SDLC subset in `docs/commands/sdlc/`)
