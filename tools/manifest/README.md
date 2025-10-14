# Manifest Linter

## Purpose
Validate that each directory with a `manifest.json` lists every non-hidden file in that directory.
Supports `--fix` to add missing entries automatically.

## Schema (manifest.json)
```json
{
  "name": "Directory name",
  "path": "relative/path",
  "files": ["README.md", "example.md", "manifest.json"],
  "ignore": [".DS_Store", "Thumbs.db", "manifest.json"]
}
```

## Usage
```bash
node tools/manifest/check-manifests.mjs                  # lint from repo root
node tools/manifest/check-manifests.mjs docs/sdlc --fix  # fix manifests under docs/sdlc
```

## Notes
- Only checks files in the directory (not subdirectories)
- Hidden files are ignored by default
- Add exceptions via `ignore`

