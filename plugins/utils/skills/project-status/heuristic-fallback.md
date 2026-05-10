# Heuristic Project-Type Fallback

**This file is the agent-side companion to `src/contributors/heuristic.ts`.**

When `discoverContributors('status', ...)` returns zero in-use contributors,
the `project-status` aggregator falls back to heuristic project-type
inference. This file describes what the agent should do; the TS module
provides the same logic for programmatic consumers (validate-metadata, future
CLI status command).

Both paths must produce equivalent reports. If you change one, change the
other.

## When to invoke this fallback

Only invoke when `project-status` discovery has returned an empty record set
**and** project-local contributors at `.aiwg/contributors/status/*.md` are
also absent. If even one contributor matched, render its block instead — the
heuristic exists for projects that have not opted into AIWG contributors at
all, not as an augmentation.

## Algorithm

Run all dimension detectors and surface every dimension that fires. Stamp
every block with `origin: heuristic` so users know this is inference, not
contributor-reported state.

### Code dimension

Triggers when any of these manifest files exist at the project root:

| File | Label |
|------|-------|
| `package.json` | JS/TS |
| `pyproject.toml` | Python |
| `requirements.txt` | Python (pip) |
| `Cargo.toml` | Rust |
| `go.mod` | Go |
| `pom.xml` | Java (Maven) |
| `build.gradle` / `build.gradle.kts` | JVM (Gradle) |
| `Gemfile` | Ruby |
| `composer.json` | PHP |
| `mix.exs` | Elixir |

Reports:

- Detected manifests and their language labels
- Test directory presence (`test/`, `tests/`, `__tests__/`, `spec/`)
- README freshness (mtime of `README.md`, formatted as relative age)
- Git presence (`.git/`)

Confidence: `high` when manifest + test dir + git all agree; `medium` for two
of three; `low` for one.

### Docs / knowledge dimension

Triggers when there are at least 5 markdown files (excluding
`node_modules/`, `.git/`, `dist/`, `build/`, `target/`).

Reports:

- Total markdown file count
- Top-level docs directories (`docs/`, `doc/`, `documentation/`, `wiki/`)

Confidence:

- `high` when no code manifest is present and there are >50 markdown files
- `medium` when no manifest and 5–50 markdown files
- `low` when a code manifest **is** present (a code repo with docs is not a
  docs project — the docs dimension still surfaces, but its summary reads
  "code project with docs" so the caller can decide which is dominant)

### Assets dimension

Triggers when total media file count across audio/video/image extensions
≥ 25 (excluding `node_modules/`, `.git/`, `dist/`, `build/`).

Extensions counted:

- Audio: `mp3, flac, opus, m4a, wav, aac, ogg`
- Video: `mp4, mkv, webm, mov, avi`
- Image: `jpg, jpeg, png, webp, heic, tiff`

Reports:

- Total media file count
- Per-kind breakdown (audio/video/image)
- Dominant kind in the summary

Confidence: `high` when total >200, `medium` >50, `low` ≥25.

The threshold (25) is intentionally above "a few icons in docs" so that a
documentation-heavy repo with image assets does not get miscategorized as a
media archive.

## Output shape

Render the heuristic report inside the same tree structure the contributor
aggregator uses, so the visual format stays consistent regardless of whether
the data came from contributors or the heuristic:

```
Project: <basename of project root>
└─ heuristic inference (no AIWG status contributors active)
   ├─ Code: <summary>  (origin: heuristic)
   │  ├─ Manifests: package.json (JS/TS)
   │  ├─ Test directories: test
   │  └─ README: last edited 3 days ago
   ├─ Docs: <summary>  (origin: heuristic)
   │  ├─ Markdown files: 67
   │  └─ Docs directories: docs
   └─ Assets: <summary>  (origin: heuristic)
      ├─ Audio: 304
      ├─ Video: 12
      └─ Image: 0
```

When the project is genuinely empty (no signals fired at all), surface a
short and non-presumptive message:

```
Project: <basename>
└─ No project state detected. Run `/intake-wizard` to scaffold AIWG
   artifacts, or check `.aiwg/frameworks/registry.json` to see what's
   installed.
```

## Anti-patterns

- **Do not run the heuristic when contributors are present.** Contributors
  are authoritative; the heuristic is the fallback. Mixing them creates
  inconsistent reports.
- **Do not invent confidence.** If only one signal fires for a dimension,
  mark it `low` — don't upgrade to `medium` because the report would look
  more impressive.
- **Do not call out to network or expensive tools.** No `npm outdated`,
  no `git log --since`, no language-runtime probes. The heuristic is a
  courtesy that completes in O(few hundred ms); slow signals belong in
  proper contributors.
- **Do not enumerate full file lists.** The heuristic surfaces counts and
  categories; specific files belong in deep-dive skills.

## Reference

- `src/contributors/heuristic.ts` — TS implementation; `inferProjectType(projectRoot)` returns the same shape this skill describes
- `test/unit/contributors/heuristic.test.ts` — covers code/docs/assets/empty/mixed paths
- ADR-023 — the contributor convention this fallback complements
