# Storage & PKM Integration

By default AIWG persists everything under `.aiwg/` in your project. That's fine for most projects.
But when you want AIWG memory to flow into your existing personal-knowledge system — Obsidian,
Logseq, Fortemi — or you want to move heavy artifacts (research papers, media caches) onto a
secondary drive, AIWG has a pluggable storage system that handles this with one config file.

This guide walks through the common moves.

---

## When to set this up

Skip this if:

- You're new to AIWG and want to focus on the SDLC workflow first
- `.aiwg/` is fine where it lives (you're not running out of space, you don't use a separate PKM)

Set it up when:

- You already use Obsidian or Logseq daily and want AIWG memory in your graph
- You're acquiring a large research corpus and your project drive is filling up
- You're running multiple projects and want a single shared memory store

---

## Five-minute setup: route AIWG memory into Obsidian

You have an Obsidian vault at `~/vaults/main` and want AIWG memory pages to land in `AIWG/memory/` inside it.

1. Create `.aiwg/storage.config`:

   ```jsonc
   {
     "version": "1",
     "backends": {
       "memory": {
         "type": "obsidian",
         "vault": "~/vaults/main",
         "folder": "AIWG/memory"
       }
     }
   }
   ```

2. Verify:

   ```bash
   aiwg storage show              # confirms memory routes to Obsidian
   aiwg storage list-backends     # confirms obsidian is READY
   aiwg storage test memory       # round-trip write/read/list/delete probe
   ```

3. (Optional) Move existing AIWG memory into the vault:

   ```bash
   aiwg storage migrate memory \
     --from fs:.aiwg/memory \
     --to obsidian:~/vaults/main \
     --to-folder AIWG/memory \
     --dry-run

   # Re-run without --dry-run when the preview looks right
   ```

That's it. Every memory write from AIWG now lands in your vault. Obsidian's file watcher picks up changes within seconds.

The same pattern works for `kb`, `reflections`, `provenance`, etc. — just change the subsystem key in `backends`.

---

## Three-minute setup: relocate the research corpus to a different drive

You have a research corpus that's getting big. You want it on `/mnt/archive/` instead of taking space on the project drive.

1. Add a path override in `.aiwg/storage.config`:

   ```jsonc
   {
     "version": "1",
     "roots": {
       "research": "/mnt/archive/aiwg-research"
     }
   }
   ```

2. Migrate existing data:

   ```bash
   aiwg storage migrate research \
     --from fs:.aiwg/research \
     --to fs:/mnt/archive/aiwg-research
   ```

3. Verify:

   ```bash
   aiwg storage show           # research → /mnt/archive/aiwg-research
   aiwg research-store path    # confirms the new resolved path
   ```

The research corpus now lives on the secondary drive. Same access pattern from AIWG; nothing else changes.

---

## Subsystems you can route

| Subsystem          | What lives here                                     | Default location                       |
| ------------------ | --------------------------------------------------- | -------------------------------------- |
| `memory`           | Consumer-framework semantic memory (pages, lessons) | `.aiwg/memory/`                        |
| `reflections`      | Agent-loop reflections                              | `.aiwg/reflections/`                   |
| `kb`               | Knowledge-base pages                                | `.aiwg/kb/`                            |
| `activity_log`     | Cross-framework event log                           | `.aiwg/activity.log`                   |
| `provenance`       | W3C PROV records                                    | `.aiwg/provenance/`                    |
| `research`         | Research corpus                                     | `.aiwg/research/`                      |
| `media`            | Media artifacts                                     | `.aiwg/media/`                         |
| `sandbox_identity` | Persistent agent identities                         | `~/.config/aiwg/sandbox-agents.json`   |

Each subsystem can be configured independently. Mix and match.

---

## Backends available today

| Backend    | Status          | Use case                                                |
| ---------- | --------------- | ------------------------------------------------------- |
| `fs`       | READY (default) | Local filesystem. Free, fast, no external deps          |
| `obsidian` | READY           | You already use Obsidian as your PKM                    |
| `logseq`   | READY           | You already use Logseq as your PKM                      |
| `fortemi`  | READY (alpha)   | First-party AIWG semantic-memory; Postgres + pgvector   |

Stub-tracked (planned, refuses with a clear error if configured today):

- `notion` (#959), `anythingllm` (#960), `s3` (#962), `webdav` (#963)

---

## Security: tokens never go in storage.config

Every credential — API tokens, passwords, S3 keys — comes from environment
variables, never from `.aiwg/storage.config`. The schema actively rejects
credential-named properties at every nesting depth, and `aiwg doctor` does
a recursive walk as defense-in-depth.

This means: it's safe to commit `.aiwg/storage.config` to git. It's NOT safe to put credentials in it.

See `docs/storage/security.md` for the full security model.

---

## What to do next

- **Configure another subsystem** — repeat the five-minute setup with `kb`, `reflections`, etc.
- **Read the per-backend page** — `docs/storage/backends/<type>.md` covers env vars, caveats, and setup specifics.
- **Migrate in chunks** — `aiwg storage migrate` resumes on retry, so you can run it incrementally on a large corpus.
- **Verify with the doctor** — `aiwg doctor` validates `storage.config` and probes each declared backend.

For the full reference, see [`docs/storage/`](../storage/README.md).
