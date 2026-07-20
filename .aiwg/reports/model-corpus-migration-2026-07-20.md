# Cheap-First Model Corpus Migration

**Date:** 2026-07-20  
**Issue:** Gitea #1806  
**Policy source:** `agentic/code/providers/premium-model-allowlist.v1.json`

## Result

The canonical agent and isolated-skill corpus now uses provider-neutral
role/tier policy with deterministic compatibility aliases. Inventory is keyed
by artifact kind and canonical name, so framework/plugin mirrors and aliases
are counted once and must resolve identically.

| Tier | Unique artifacts | Share |
| --- | ---: | ---: |
| Economy | 274 | 77.2% |
| Standard | 67 | 18.9% |
| Premium | 14 | 3.9% |
| **Governed total** | **355** | **100%** |

Three `*-compat` Markdown documents under an agents directory are explicitly
exempt because they are compatibility documentation without deployable
frontmatter. The migration scans 741 source and distribution-mirror files,
representing 358 unique names including the exemptions.

## Policy

- `economy` / `efficiency` is the default for bounded, routine, read-heavy,
  formatting, documentation, status, and support work.
- `standard` / `coding` is used for multi-step implementation, debugging,
  research, investigation, acquisition, and orchestration.
- `premium` / `reasoning` is restricted to the reviewed allowlist. Every
  premium artifact carries the exact short rationale recorded in the
  allowlist.

Pinned provider IDs were removed from the governed frontmatter. Bare
`haiku`/`sonnet`/`opus` values remain only as one-window compatibility aliases;
`model-role`/`model-tier` (agents) and `modelRole`/`modelTier` (skills) are the
canonical policy.

## Evaluation evidence

`agentic/code/providers/model-policy-evaluations.v1.json` records a
deterministic representative-fixture rubric for both an agent and a skill at
each tier. All six cases meet the 0.8 threshold on required instructions,
scope/work complexity, tool/output contracts, verification, or risk controls.
This is fixture evidence, not a claim of live provider portability; live
resolved-model smoke is tracked by #1807.

A clean controlled Codex deployment compiled 195 agents into three distinct
models:

| Compiled model | Count |
| --- | ---: |
| `gpt-5.1-codex-mini` | 156 |
| `gpt-5.3-codex` | 29 |
| `gpt-5.4` | 10 |

The deployed economy share was 80.0%, above the 60% gate, with no role
collapse.

## Enforcement

`test/unit/models/corpus-policy.test.ts` fails CI for:

- missing role/tier metadata without an approved exemption;
- inconsistent duplicate-name policy;
- economy share below 60%;
- premium policy absent from the reviewed rationale allowlist;
- provider-specific exact IDs in governed canonical policy; or
- missing/failing representative evaluation records.

`node tools/models/migrate-corpus-policy.mjs` is an idempotent check. Add
`--write` to apply the deterministic migration.
