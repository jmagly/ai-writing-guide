# Make AIWG Yours

Three paths, depending on what you're customizing and how you want it
shared.

| Path | When | Effort | Shareable? |
|------|------|--------|------------|
| **A — Project-local** | Per-project rules, agents, skills | 5 minutes — no fork | No (lives in your project) |
| **B — Fork** | Cross-project customization, contributing back | 30 minutes — fork + dev mode | Yes (PR upstream) |
| **C — Corpus** | Cross-project sharing without going public | One-time setup per corpus | Within your team / org |

If unsure, **start with Path A.** It's the lowest commitment and the
easiest to graduate later.

---

## Path A — Project-Local (recommended for most users)

Author bundles directly inside your project under `.aiwg/{type}/{name}/`.
No fork, no clone, no rebuild — just files in your repo. Discovered
automatically by `aiwg use`.

```bash
aiwg new-bundle my-team-rules --type extension --starter rule
# edit .aiwg/extensions/my-team-rules/rules/my-team-rules.md
aiwg use my-team-rules
aiwg doctor --project-local
```

The bundle deploys alongside upstream artifacts to whatever providers
your project targets (`.claude/`, `.cursor/`, `.codex/`, etc.). It
shadows upstream artifacts with the same id, with safety-critical
denylist enforcement so you can't accidentally override the wrong thing.

Graduate to upstream or to a private corpus when ready:

```bash
aiwg promote my-team-rules                          # → upstream
aiwg promote my-team-rules --to corpus ~/my-corpus/ # → private corpus
```

The graduate operation is a hash-verified copy — no rewrite, no migration
([identical-form ADR](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/adr-identical-form-portability.md)).

**See:**
- [Quickstart](project-local-quickstart.md) — first bundle in 5 minutes
- [Lifecycle reference](project-local-lifecycle.md) — full operator surface
- [Type disambiguation](extensions-vs-addons-vs-frameworks-vs-plugins.md) — pick the right type
- [Troubleshooting](project-local-troubleshooting.md) — common failures
- [From-fork migration](from-fork-to-project-local.md) — moving existing fork-based work

---

## Path B — Fork (for upstream contributions)

When you're building something you might contribute to AIWG itself, or
you want to live on the bleeding edge with custom branches, fork AIWG on
GitHub and run in dev mode. The Steward agent handles the setup.

> "Set up AIWG customization mode for me — I want to fork and contribute back"

What you get:
- Your own copy of AIWG on GitHub that you control
- Upstream sync via `"sync my AIWG"` — pulls new releases without overwriting your edits
- One command to PR a change back upstream

Use Path B when:
- You're modifying AIWG **core** (TypeScript source, build scripts, deploy pipeline)
- Your customization is generally useful and you want it merged
- You want bleeding-edge AIWG features before they're released

If you're "just" customizing rules / skills / agents, **Path A is
simpler** — you can always graduate to Path B later by promoting your
project-local bundles to upstream and PRing them.

**See:** [Fork workflow](fork-workflow.md) — how the fork/upstream sync works under the hood.

---

## Path C — Corpus (cross-project sharing)

When you have customizations to share across many of your own projects
without making them public:

1. Create a corpus directory: `mkdir ~/my-corpus`
2. Author bundles there directly, or promote project-local bundles into it:
   ```bash
   aiwg promote my-team-rules --to corpus ~/my-corpus/
   ```
3. Other projects pick up corpus bundles via `aiwg.config` registration
   (set `source: 'corpus'` paths in the project's installed config)

The corpus is **byte-identical** to both project-local and upstream
forms — same manifest, same layout — so a bundle moves between any of
the three locations by copy.

Use Path C when:
- You have several private repos that all need the same customizations
- The customization isn't public-marketplace-suitable but it isn't
  per-project either
- You want versioned, audited shared bundles without managing your own
  AIWG fork

---

## Decision tree

```
Are you modifying AIWG core (TS source, build, deploy pipeline)?
│
├─ Yes ──→ Path B (fork)
│
└─ No ──→ Are you sharing this across many of your projects?
          │
          ├─ Yes, privately ──→ Path C (corpus)
          ├─ Yes, publicly ──→ Path A first, then aiwg promote → Path B
          └─ No, single project ──→ Path A (project-local)
```

---

## Mixing paths

The three paths compose:

- A project on Path A can later promote a bundle to upstream (Path B) or
  to a corpus (Path C).
- A Path B fork can deploy alongside Path A project-local bundles —
  the project's `.aiwg/extensions/foo/` shadows the fork's
  `agentic/code/addons/foo/` cleanly.
- A corpus (Path C) is just another `source` in the registry — your
  project pulls bundled, project-local, **and** corpus artifacts
  together.

You don't have to commit to one path forever. Start where you are; move
when you outgrow it.

---

## Quick reference

| You want to... | Use |
|----------------|-----|
| Add one rule for one project | `aiwg new-bundle my-rule --starter rule` (Path A) |
| Add a feature pack of related skills | `aiwg new-bundle my-pack --type addon` (Path A) |
| Share customizations across your repos privately | `aiwg promote my-pack --to corpus ~/corpus/` (Path C) |
| Contribute a customization back to AIWG | `aiwg promote my-pack` (Path A → Path B + PR) |
| Modify AIWG itself (CLI, deploy, build) | Steward sets up a fork (Path B) |

---

## Next steps

- [Project-local quickstart](project-local-quickstart.md) — start here
- [Type disambiguation](extensions-vs-addons-vs-frameworks-vs-plugins.md) — extension vs addon vs framework vs plugin
- [Customization examples](examples.md) — real scenarios people customize
- [Fork workflow](fork-workflow.md) — Path B details
- [Plugin marketplace guide](../plugin-marketplace-guide.md) — public distribution (different from the three paths above)
