# ADR — Configurable storage backends for `.aiwg/` subsystems

**Status:** Proposed
**Date:** 2026-04-28
**Issue:** #934
**Decision drivers:** user demand for PKM integration, hardcoded path assumptions multiplying across consumers, operational need to relocate heavy artifact trees.

## Context

Every AIWG subsystem that persists artifacts (`activity-log`, `kb-{ingest,health}`, `memory-{ingest,lint,log-append,query-capture}`, `ralph-memory`, `reflection-injection`, `ralph-reflect`, `sandbox-registry`, `research-acquire`, `provenance-create`) calls `fs.promises` directly against `.aiwg/<subsystem>/`. This produces three problems:

1. **Disk location is fixed.** Users cannot move heavy artifact trees (research corpus, media caches, large memory stores) to a secondary drive, network share, or encrypted volume while keeping small config/metadata in the repo.
2. **Memory artifacts are isolated from PKM systems.** Users who already run Obsidian, Logseq, Notion, AnythingLLM, or first-party Fortemi as their personal knowledge surface cannot have AIWG memory flow into those systems. The result is duplication, context switching, or manual copy-paste.
3. **No backend abstraction.** Every consumer hard-codes its persistence shape. Swapping a backend means rewriting each consumer, which is why no swap has happened despite repeated user requests.

The research note (`.aiwg/architecture/research/storage-backends.md`) confirms each major PKM target (Obsidian, Logseq, Notion, AnythingLLM, Fortemi) has a viable programmatic write path, and that direct file writes are *not* the right default for live PKM apps because their internal indexes won't reliably see external file changes.

## Decision

Introduce a `StorageAdapter` interface (`src/storage/`) with a `resolveStorage(subsystem)` registry, configured per-project via `.aiwg/storage.config` validated against the published JSON schema `aiwg.io/schemas/storage.config.v1.json`.

Migrate consumers from direct `fs.promises` calls to `resolveStorage(subsystem).{read,write,list,delete}` in three phases:

- **Phase 1**: schema + interface + `fs` backend + CLI surface (`aiwg storage show/test/list-backends`) + `aiwg doctor` validation. No consumer migration yet — the abstraction ships unused. Then the `activity-log` consumer migrates as a smallest-surface proof, with byte-identical behavior on `fs` backend.
- **Phase 2**: `obsidian`, `logseq`, `fortemi`, `notion`, `anythingllm` adapters land in that order. Consumer migrations: `kb`, `memory`, `ralph-memory` + `reflection-injection`, `provenance`, `sandbox_identity`.
- **Phase 3**: `s3` and `webdav` adapters; `research` and `media` consumers; `aiwg storage migrate` CLI.

Credentials never live in `storage.config`. The schema rejects `token`/`password`/`secret`/`apiKey`/`accessKey`/`accessKeyId`/`secretAccessKey` keys at every nesting depth, and `aiwg doctor` runs a recursive walk as defense-in-depth. Tokens come from environment variables or the OS keychain.

Absence of `storage.config` is a no-op: existing projects keep working unchanged with all subsystems on `fs` under `.aiwg/`.

## Consequences

### Positive

- Users can route memory/reflections into Obsidian or Logseq while keeping activity logs on local disk for compliance, exactly the heterogeneous setup they've been asking for.
- Heavy artifact trees can move off the project disk without touching consumer code.
- New backends become a one-class drop-in; consumers don't change.
- `aiwg doctor` catches misconfiguration earlier than runtime.
- The interface forces an explicit decision per subsystem, which makes the persistence model auditable.

### Negative

- Every persistence-touching consumer requires migration. ~7 consumers, each its own PR; tracked as sub-issues.
- Async backends (Notion, AnythingLLM, Fortemi) lose synchronous read-after-write parity for subsystems that depend on it. Fall-through to a local cache mitigates this but doubles disk usage for those backends.
- Schema versioning becomes load-bearing: adapters must refuse versions they don't understand.
- The local-cache fallback (`fallback: cache_and_warn`) hides backend outages from consumers by design — the wrong choice for compliance subsystems, which must opt into `fallback: block`.

### Neutral

- The CLI gains five commands (`storage show/list-backends/test/migrate` + `doctor` extension). Discoverable through `aiwg help`.
- `obsidian` and `logseq` adapters depend on tools the user installs separately (Obsidian CLI, Logseq HTTP API). The reachability probe in `aiwg doctor` makes this discoverable.

## Alternatives considered

### A. Symlinks only (no abstraction)

Tell users to `ln -s ~/vaults/aiwg-memory .aiwg/memory` and call it done.

Rejected: solves goal 1 (relocation) but not goals 2 (PKM integration) or 3 (abstraction). PKM apps with internal indexes (Obsidian, Logseq) need active coordination, not blind file writes.

### B. One env-var override per subsystem

`AIWG_MEMORY_DIR=~/vault/memory` etc.

Rejected: solves relocation but introduces per-subsystem env hygiene; doesn't address the abstraction goal; doesn't compose with PKM backends.

### C. A single global `storage.config` at `~/.config/aiwg/`

Move config out of the project.

Rejected: storage decisions are project-scoped (different projects have different sensitivity profiles). User-level defaults could be added later via merge precedence.

### D. Synchronous-only adapters (no `cache_and_warn` fallback)

Make every async backend block until acknowledged.

Rejected: Notion and AnythingLLM cannot meet this contract (rate limits, async embedding). The cache fallback is a deliberate choice, with `fallback: block` available for compliance subsystems.

## Risks and open questions

1. **Logseq DB version** — the Logseq DB-backed rewrite is in development as of April 2025. The `logseq` adapter targets the file-backed graph; needs re-validation when DB version stabilizes.
2. **Backend reachability at session start** — `aiwg session` should warn early if a declared backend is offline. Tracked as a follow-up.

Resolved during the design pass:
- "Forte" in #934 refers to Fortemi (the first-party AIWG semantic-memory project). Confirmed on #961.

## References

- Issue #934 (parent feature spec)
- `.aiwg/architecture/research/storage-backends.md` (research with citations)
- `.aiwg/architecture/schemas/storage.config.v1.json` (schema)
- `.aiwg/architecture/storage-design.md` (full design)
