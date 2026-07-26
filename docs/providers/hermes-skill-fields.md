# Hermes-Specific Skill Frontmatter Fields

Hermes consumes additional skill frontmatter fields beyond the AIWG canonical set. The AIWG framework deployer for Hermes (`tools/agents/providers/hermes.mjs`, invoked by `aiwg use --provider hermes`) preserves frontmatter verbatim when copying SKILL.md files, so any of these fields declared on a source skill flow through to the deployed `~/.hermes/skills/<slug>/SKILL.md`.

Managed Agent Skills imports use a separate path: `aiwg skills deploy <name> --target hermes`. That command writes a strict Agent Skills projection to `~/.hermes/skills/<name>`, moves AIWG-only metadata to sidecars, and preserves resources exactly. Use the managed path for externally imported Agent Skills; use `aiwg use --provider hermes` for AIWG framework/kernel deployment.

This document is the authoritative reference for skill authors who want their AIWG skills to opt into Hermes-specific behavior.

## `platforms` — OS gating (PUW-034 / #1135)

```yaml
---
name: my-shell-skill
description: A skill that only makes sense on POSIX systems
platforms:
  - linux
  - macos
---
```

**Effect on Hermes:** the skill is excluded from invocation when Hermes is running on a platform not listed. Without the field, the skill is available on all platforms (status quo).

**Allowed values:** `linux`, `macos`, `windows` (Hermes-defined enum).

**AIWG validation:** none currently. Skill-author responsibility.

**Audit guidance:** review skills that shell out via `Bash:` or use platform-specific paths. If a skill calls `apt`, `brew`, `wsl`, or similar, declare the platform list explicitly.

## `${HERMES_SKILL_DIR}` — supporting-file template variable (PUW-032 / #1133)

```markdown
---
name: my-skill-with-data
description: Skill that loads a CSV from its bundle directory
---

Load reference data from `${HERMES_SKILL_DIR}/data/lookup.csv` and apply...
```

**Effect on Hermes:** at skill invocation time, Hermes substitutes `${HERMES_SKILL_DIR}` with the absolute path of the deployed skill directory (e.g., `~/.hermes/skills/my-skill-with-data/`). This lets a skill reference its own bundled supporting files without hard-coding paths.

**AIWG behavior:** the deployer copies the skill folder including any `data/`, `references/`, etc. subdirectories. The template variable in SKILL.md body is preserved verbatim and resolved by Hermes at runtime.

**Audit guidance:** any skill that reads bundled files should reference them via `${HERMES_SKILL_DIR}/<path>` rather than hard-coded `~/.hermes/skills/<slug>/<path>`. The latter works but breaks if Hermes ever relocates the skill root.

## `metadata.hermes.config` — skill-config injection (PUW-033 / #1134)

```yaml
---
name: my-configurable-skill
description: A skill with operator-tunable settings
metadata:
  hermes:
    config:
      api_endpoint:
        type: string
        default: 'https://api.example.com'
        description: API base URL
      max_retries:
        type: integer
        default: 3
        min: 0
        max: 10
---
```

**Effect on Hermes:** Hermes surfaces the declared config keys to the operator via its config UI. The values become available to the skill at invocation time as environment variables (`HERMES_CONFIG_API_ENDPOINT`, `HERMES_CONFIG_MAX_RETRIES`).

**AIWG behavior:** the deployer preserves the `metadata.hermes.config` block verbatim. AIWG validators do not yet enforce the schema, so authors are responsible for declaring valid Hermes config-field shape.

**Audit guidance:** skills that need operator-configurable values today typically use environment variables read at runtime. Declaring them in `metadata.hermes.config` makes them discoverable in the Hermes UI rather than tribal knowledge.

## Curator protection (Hermes v0.12.0+)

Hermes v0.12.0 introduced an autonomous **Curator** (`agent/curator.py`)
that periodically grades and archives skills it deems stale. By default,
the Curator runs every 7 days. Skills are **excluded** from archival when
either:

1. They appear in `~/.hermes/skills/.bundled_manifest` (one line per
   skill, format `<name>:<tag>` — only the name before `:` matters; the
   tag is decorative). Verified at `tools/skill_usage.py:155-176` in v0.13.0.
2. Their relative path's first component starts with `.` (e.g.
   `~/.hermes/skills/.aiwg/...`). Verified at `tools/skill_usage.py:241-243`.

**AIWG protection:**

- **Standard skills** deploy to `~/.hermes/skills/.aiwg/...` and are
  protected by rule (2) automatically — no manifest entry needed.
- **Kernel skills** land at the top level (`~/.hermes/skills/<name>/SKILL.md`)
  and need explicit (1) registration. The Hermes deployer
  (`tools/agents/providers/hermes.mjs`) writes/updates the bundled manifest
  on every `aiwg use --provider hermes` (or `aiwg refresh --provider hermes`)
  with one entry per AIWG-managed kernel skill: `<name>:aiwg-managed`.
- **Managed imported Agent Skills** land at the top level
  (`~/.hermes/skills/<name>/SKILL.md`) through `aiwg skills deploy --target
  hermes`, with `.aiwg-managed` and `.aiwg-agent-skill.json` ownership metadata
  outside portable frontmatter.

The deployer preserves any pre-existing manifest entries (Hermes's own
bundled skills, Skills Hub installs, other tools' entries) when it
updates AIWG entries. Re-deployment is idempotent.

If you ever need to inspect or hand-edit the manifest:

```bash
cat ~/.hermes/skills/.bundled_manifest
```

If a kernel skill is missing from the manifest after deployment (and the
Curator subsequently archives it), the recovery path is `aiwg refresh
--provider hermes` — the deploy is idempotent and restores both files and
manifest entries.

## Cross-provider portability

These fields are Hermes-specific. Other providers either ignore unknown frontmatter fields (Claude Code, Cursor, Codex) or strip them at deploy time via per-provider transforms (Factory droids). Declaring them on a skill does not break deploys to other providers.

The AIWG validator at `aiwg validate-metadata` does not currently check these fields. They are pass-through. A future PUW may add specific lint rules.

## References

- `tools/agents/providers/hermes.mjs` — the Hermes deployer (includes `updateBundledManifest()` and `migrateLegacySkillPath()`)
- `.aiwg/research/parity/hermes/assessment.md §6 gap 3, §7.3` — origin of these features in the parity research
- `.aiwg/architecture/sketch-hermes-mcp-parity.md` — three-layer parity model with the Curator protection plan (DD-9)
- `.aiwg/architecture/adr-agents-md-aggregation.md` — ADR-1 for related cross-platform context delivery
- Hermes upstream: `tools/skill_usage.py:155-176` (`.bundled_manifest` parser) and `agent/curator.py` (the Curator agent)
